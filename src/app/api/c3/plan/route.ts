import { NextRequest } from "next/server";
import { jsonResponse } from "@/lib/api";
import { proposedGaps } from "@/lib/c3/gaps";
import { planForRole } from "@/lib/c3/graph";
import { careerModel, getRole, isSyntheticModel, type RoleProfile } from "@/lib/c3/model";
import { checkRateLimit, rateLimitedResponse } from "@/lib/c3/rate-limit";
import { proposedReadiness } from "@/lib/c3/readiness";
import { planRequestSchema } from "@/lib/c3/validation";
import { requireRole, requireSession } from "@/lib/session-auth";

export const dynamic = "force-dynamic";

/**
 * POST /api/c3/plan - readiness breakdown, ranked gaps and the Gap-to-Action plan for
 * one role. Compute-only: nothing is stored, so no consent is needed.
 */
export async function POST(request: NextRequest) {
  const authResult = await requireSession(request);
  if (authResult.error) return authResult.error;
  const { session } = authResult;
  const roleCheck = requireRole(session.user?.role, ["student"]);
  if (roleCheck) return roleCheck;
  const limit = checkRateLimit(`c3-plan:${session.user?._id ?? session.firebase?.uid ?? "anon"}`);
  if (!limit.ok) return rateLimitedResponse(limit.retryAfterSeconds);

  const body = await request.json().catch(() => null);
  const parsed = planRequestSchema.safeParse(body);
  if (!parsed.success) {
    return jsonResponse({ message: "Invalid plan request.", issues: parsed.error.issues.map((i) => i.path.join(".")) }, 400);
  }
  const { profile, roleId } = parsed.data;
  const role = getRole(roleId) as RoleProfile;
  return jsonResponse({
    roleId,
    readiness: proposedReadiness(profile.skills, role),
    gaps: proposedGaps(profile.skills, role),
    plan: planForRole(profile.skills, role),
    modelVersion: careerModel.version,
    syntheticTraining: isSyntheticModel,
    warning: careerModel.warning
  });
}
