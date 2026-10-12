import { NextRequest } from "next/server";
import { isDemoMode, isMongoConnectionError, jsonResponse } from "@/lib/api";
import { assessCareer, cvSkillIdsFromText, mergeLevels } from "@/lib/c3/assessment";
import {
  buildAggregate,
  deleteDemoCareerAssessment,
  demoAggregateProfiles,
  getDemoCareerAssessment,
  saveDemoCareerAssessment,
  type StoredCareerAssessment
} from "@/lib/c3/assessment-store";
import { isCvFeatureEnabled } from "@/lib/c3/config";
import { careerModel, isSyntheticModel } from "@/lib/c3/model";
import { checkRateLimit, rateLimitedResponse } from "@/lib/c3/rate-limit";
import { assessmentRequestSchema, parseCareerProfile, type CareerProfile } from "@/lib/c3/validation";
import { getMongoDatabase } from "@/lib/mongodb";
import { requireRole, requireSession } from "@/lib/session-auth";

export const dynamic = "force-dynamic";

const STAFF_ROLES = ["admin", "faculty", "super_admin"];
const COLLECTION = "c3_career_assessments";
const DB_UNAVAILABLE = { message: "Database temporarily unavailable." };

type Identity = { userId?: string; firebaseUid?: string };

function identityFilter(identity: Identity) {
  const ors = [
    ...(identity.userId ? [{ userId: identity.userId }] : []),
    ...(identity.firebaseUid ? [{ firebaseUid: identity.firebaseUid }] : [])
  ];
  return ors.length ? { $or: ors } : null;
}

function present(record: StoredCareerAssessment) {
  // Always recomputed from the stored answers with the current model; stored scores are never trusted.
  return { profile: record.profile, assessment: assessCareer(record.profile), savedAt: record.updatedAt };
}

/**
 * GET /api/c3/assessment
 *   student                  -> their own saved answers + recomputed results
 *   admin / faculty          -> ?scope=aggregate : anonymous cohort statistics only
 */
export async function GET(request: NextRequest) {
  const authResult = await requireSession(request);
  if (authResult.error) return authResult.error;
  const { session } = authResult;
  const role = session.user?.role;
  const identity: Identity = { userId: session.user?._id, firebaseUid: session.firebase?.uid };
  const limit = checkRateLimit(`c3-assessment-get:${identity.userId ?? identity.firebaseUid ?? "anon"}`);
  if (!limit.ok) return rateLimitedResponse(limit.retryAfterSeconds);

  if (request.nextUrl.searchParams.get("scope") === "aggregate") {
    const roleCheck = requireRole(role, STAFF_ROLES);
    if (roleCheck) return roleCheck;
    if (isDemoMode()) return jsonResponse(buildAggregate(demoAggregateProfiles(), "synthetic-demo"));
    try {
      const database = await getMongoDatabase();
      const docs = await database.collection(COLLECTION).find({}, { projection: { profile: 1 } }).limit(5000).toArray();
      const profiles = docs.map((d) => parseCareerProfile(d.profile)).filter((p): p is CareerProfile => p !== null);
      return jsonResponse(buildAggregate(profiles, "stored"));
    } catch (error) {
      if (isMongoConnectionError(error)) return jsonResponse(DB_UNAVAILABLE, 503);
      throw error;
    }
  }

  const roleCheck = requireRole(role, ["student"]);
  if (roleCheck) return roleCheck;
  if (isDemoMode()) {
    const record = getDemoCareerAssessment(identity);
    return jsonResponse(record ? present(record) : { assessment: null });
  }
  try {
    const filter = identityFilter(identity);
    if (!filter) return jsonResponse({ assessment: null });
    const database = await getMongoDatabase();
    const doc = await database.collection(COLLECTION).findOne(filter);
    const profile = doc ? parseCareerProfile(doc.profile) : null;
    if (!doc || !profile) return jsonResponse({ assessment: null });
    return jsonResponse(present({ ...(doc as unknown as StoredCareerAssessment), profile }));
  } catch (error) {
    if (isMongoConnectionError(error)) return jsonResponse(DB_UNAVAILABLE, 503);
    throw error;
  }
}

/**
 * POST /api/c3/assessment - a student saves their answers (explicit consent required).
 * Optional CV text is accepted only when the CV feature flag is on and with separate
 * consent; it is processed in memory and never stored or logged.
 */
export async function POST(request: NextRequest) {
  const authResult = await requireSession(request);
  if (authResult.error) return authResult.error;
  const { session } = authResult;
  const roleCheck = requireRole(session.user?.role, ["student"]);
  if (roleCheck) return roleCheck;
  const identity: Identity = { userId: session.user?._id, firebaseUid: session.firebase?.uid };
  const limit = checkRateLimit(`c3-assessment-post:${identity.userId ?? identity.firebaseUid ?? "anon"}`, 10);
  if (!limit.ok) return rateLimitedResponse(limit.retryAfterSeconds);

  const body = await request.json().catch(() => null);
  const parsed = assessmentRequestSchema.safeParse(body);
  if (!parsed.success) {
    return jsonResponse(
      {
        message: "Invalid request. Consent is required, values must be in range, and CV text needs its own consent.",
        issues: parsed.error.issues.map((i) => i.path.join("."))
      },
      400
    );
  }
  if (parsed.data.cvText !== undefined && !isCvFeatureEnabled()) {
    return jsonResponse({ message: "CV analysis is not enabled." }, 400);
  }

  // CV text (if any) only contributes skill ids; the text itself goes out of scope here.
  const cvSkillIds = cvSkillIdsFromText(parsed.data.cvText);
  const { levels } = mergeLevels(parsed.data.profile.skills, cvSkillIds);
  const skills = Object.fromEntries(Object.entries(levels).filter(([, v]) => v > 0));
  const now = new Date().toISOString();
  const record: StoredCareerAssessment = {
    userId: identity.userId,
    firebaseUid: identity.firebaseUid,
    profile: { ...parsed.data.profile, skills },
    modelVersion: careerModel.version,
    syntheticTraining: isSyntheticModel,
    consentAt: now,
    updatedAt: now
  };

  if (isDemoMode()) {
    saveDemoCareerAssessment(record);
    return jsonResponse(present(record), 201);
  }
  try {
    const database = await getMongoDatabase();
    const filter = record.userId ? { userId: record.userId } : { firebaseUid: record.firebaseUid };
    await database.collection(COLLECTION).replaceOne(filter, record, { upsert: true });
    return jsonResponse(present(record), 201);
  } catch (error) {
    if (isMongoConnectionError(error)) return jsonResponse(DB_UNAVAILABLE, 503);
    throw error;
  }
}

/** DELETE /api/c3/assessment - a student withdraws consent and erases their saved answers. */
export async function DELETE(request: NextRequest) {
  const authResult = await requireSession(request);
  if (authResult.error) return authResult.error;
  const { session } = authResult;
  const roleCheck = requireRole(session.user?.role, ["student"]);
  if (roleCheck) return roleCheck;
  const identity: Identity = { userId: session.user?._id, firebaseUid: session.firebase?.uid };

  if (isDemoMode()) {
    deleteDemoCareerAssessment(identity);
    return jsonResponse({ message: "Career assessment deleted." });
  }
  try {
    const filter = identityFilter(identity);
    if (filter) {
      const database = await getMongoDatabase();
      await database.collection(COLLECTION).deleteMany(filter);
    }
    return jsonResponse({ message: "Career assessment deleted." });
  } catch (error) {
    if (isMongoConnectionError(error)) return jsonResponse(DB_UNAVAILABLE, 503);
    throw error;
  }
}
