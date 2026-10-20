import { NextRequest } from "next/server";
import { isDemoMode, isMongoConnectionError, jsonResponse } from "@/lib/api";
import {
  deleteDemoAssessment,
  fromEncryptedAssessmentDoc,
  getDemoAssessment,
  listDemoAssessments,
  saveDemoAssessment,
  toAdminQueueItem,
  toEncryptedAssessmentDoc,
  type EncryptedAssessmentDoc,
  type StoredAssessment
} from "@/lib/c1/assessment-store";
import { illustrativeScholarships } from "@/lib/c1/demo-scholarships";
import { rankScholarships, type ScholarshipCriteria } from "@/lib/c1/matching";
import { assessmentRequestSchema, scholarshipDocToCriteria } from "@/lib/c1/validation";
import { assessVulnerability } from "@/lib/c1/vulnerability";
import { getMongoDatabase } from "@/lib/mongodb";
import { requireRole, requireSession } from "@/lib/session-auth";

export const dynamic = "force-dynamic";

const ADMIN_ROLES = ["admin", "faculty", "super_admin"];
const COLLECTION = "c1_assessments";

async function loadCatalogue(): Promise<ScholarshipCriteria[]> {
  if (isDemoMode()) return illustrativeScholarships;
  try {
    const database = await getMongoDatabase();
    const docs = await database.collection("scholarships").find({}).toArray();
    const real = docs
      .map((d) => scholarshipDocToCriteria({ ...d, _id: d._id?.toString?.() }))
      .filter((c): c is ScholarshipCriteria => c !== null);
    return real.length > 0 ? real : illustrativeScholarships;
  } catch {
    return illustrativeScholarships;
  }
}

function present(record: StoredAssessment, catalogue: ScholarshipCriteria[]) {
  return {
    assessment: record.assessment,
    recommendations: rankScholarships(record.profile, record.assessment, catalogue).slice(0, 8),
    profile: record.profile,
    savedAt: record.updatedAt,
    catalogueIsIllustrative: catalogue === illustrativeScholarships
  };
}

/**
 * GET /api/c1/assessments
 *   student            -> their own latest assessment + recommendations
 *   admin / faculty    -> ?scope=queue : students ranked by financial need (derived fields only)
 */
export async function GET(request: NextRequest) {
  const authResult = await requireSession(request);
  if (authResult.error) return authResult.error;
  const { session } = authResult;
  const role = session.user?.role;
  const scope = request.nextUrl.searchParams.get("scope");

  if (scope === "catalogue") {
    // Rankable scholarships, so the student's device can match them locally without sending its profile.
    const roleCheck = requireRole(role, ["student"]);
    if (roleCheck) return roleCheck;
    const catalogue = await loadCatalogue();
    return jsonResponse({ scholarships: catalogue, illustrative: catalogue === illustrativeScholarships });
  }

  if (scope === "queue") {
    const roleCheck = requireRole(role, ADMIN_ROLES);
    if (roleCheck) return roleCheck;

    if (isDemoMode()) {
      const items = listDemoAssessments()
        .map(({ id, record }) => toAdminQueueItem(record, id))
        .sort((a, b) => b.vulnerabilityIndex - a.vulnerabilityIndex);
      return jsonResponse({ items });
    }
    try {
      const database = await getMongoDatabase();
      const docs = await database.collection(COLLECTION).find({}).sort({ "assessment.vulnerabilityIndex": -1 }).limit(200).toArray();
      const items = docs.map((d) => toAdminQueueItem(d as unknown as EncryptedAssessmentDoc, String(d._id)));
      return jsonResponse({ items });
    } catch (error) {
      if (isMongoConnectionError(error)) return jsonResponse({ message: "Database temporarily unavailable." }, 503);
      throw error;
    }
  }

  const roleCheck = requireRole(role, ["student"]);
  if (roleCheck) return roleCheck;
  const identity = { userId: session.user?._id, firebaseUid: session.firebase?.uid };
  const catalogue = await loadCatalogue();

  if (isDemoMode()) {
    const record = getDemoAssessment(identity);
    return jsonResponse(record ? present(record, catalogue) : { assessment: null });
  }
  try {
    const database = await getMongoDatabase();
    const ors = [
      ...(identity.userId ? [{ userId: identity.userId }] : []),
      ...(identity.firebaseUid ? [{ firebaseUid: identity.firebaseUid }] : [])
    ];
    if (ors.length === 0) return jsonResponse({ assessment: null });
    const doc = await database.collection(COLLECTION).findOne({ $or: ors });
    const record = doc ? fromEncryptedAssessmentDoc(doc as unknown as EncryptedAssessmentDoc) : null;
    return jsonResponse(record ? present(record, catalogue) : { assessment: null });
  } catch (error) {
    if (isMongoConnectionError(error)) return jsonResponse({ message: "Database temporarily unavailable." }, 503);
    throw error;
  }
}

/** POST /api/c1/assessments - a student saves their assessment (explicit consent required; encrypted at rest with AES-256-GCM). */
export async function POST(request: NextRequest) {
  const authResult = await requireSession(request);
  if (authResult.error) return authResult.error;
  const { session } = authResult;
  const roleCheck = requireRole(session.user?.role, ["student"]);
  if (roleCheck) return roleCheck;

  const body = await request.json().catch(() => null);
  const parsed = assessmentRequestSchema.safeParse(body);
  if (!parsed.success) {
    return jsonResponse(
      { message: "Invalid assessment request. Consent is required and all values must be in range.", issues: parsed.error.issues.map((i) => i.path.join(".")) },
      400
    );
  }

  const { profile } = parsed.data;
  // The server recomputes the score so a client can never submit a fabricated index.
  const assessment = assessVulnerability(profile);
  const now = new Date().toISOString();
  const record: StoredAssessment = {
    userId: session.user?._id,
    firebaseUid: session.firebase?.uid,
    studentName: session.user?.name ?? session.firebase?.displayName ?? "Student",
    university: session.user?.university,
    profile,
    assessment,
    consentAt: now,
    updatedAt: now
  };
  const catalogue = await loadCatalogue();

  if (isDemoMode()) {
    saveDemoAssessment(record);
    return jsonResponse(present(record, catalogue), 201);
  }
  try {
    const database = await getMongoDatabase();
    const filter = record.userId ? { userId: record.userId } : { firebaseUid: record.firebaseUid };
    await database.collection(COLLECTION).replaceOne(filter, toEncryptedAssessmentDoc(record), { upsert: true });
    return jsonResponse(present(record, catalogue), 201);
  } catch (error) {
    if (isMongoConnectionError(error)) return jsonResponse({ message: "Database temporarily unavailable." }, 503);
    throw error;
  }
}

/** DELETE /api/c1/assessments - a student withdraws consent and erases their stored assessment. */
export async function DELETE(request: NextRequest) {
  const authResult = await requireSession(request);
  if (authResult.error) return authResult.error;
  const { session } = authResult;
  const roleCheck = requireRole(session.user?.role, ["student"]);
  if (roleCheck) return roleCheck;

  const identity = { userId: session.user?._id, firebaseUid: session.firebase?.uid };
  if (isDemoMode()) {
    deleteDemoAssessment(identity);
    return jsonResponse({ message: "Assessment deleted." });
  }
  try {
    const database = await getMongoDatabase();
    const ors = [
      ...(identity.userId ? [{ userId: identity.userId }] : []),
      ...(identity.firebaseUid ? [{ firebaseUid: identity.firebaseUid }] : [])
    ];
    if (ors.length > 0) await database.collection(COLLECTION).deleteMany({ $or: ors });
    return jsonResponse({ message: "Assessment deleted." });
  } catch (error) {
    if (isMongoConnectionError(error)) return jsonResponse({ message: "Database temporarily unavailable." }, 503);
    throw error;
  }
}
