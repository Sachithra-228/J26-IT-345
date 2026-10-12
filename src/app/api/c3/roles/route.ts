import { NextRequest } from "next/server";
import { jsonResponse } from "@/lib/api";
import { careerModel, careerModelInfo } from "@/lib/c3/model";
import { checkRateLimit, rateLimitedResponse } from "@/lib/c3/rate-limit";
import { requireRole, requireSession } from "@/lib/session-auth";

export const dynamic = "force-dynamic";

const ALLOWED_ROLES = ["student", "admin", "faculty", "super_admin", "mentor"];

/**
 * GET /api/c3/roles - the evidence-based role profiles and competency taxonomy.
 * Contains no personal data: weights, required levels and ad counts come from the
 * (currently SYNTHETIC) job-advertisement corpus.
 */
export async function GET(request: NextRequest) {
  const authResult = await requireSession(request);
  if (authResult.error) return authResult.error;
  const { session } = authResult;
  const roleCheck = requireRole(session.user?.role, ALLOWED_ROLES);
  if (roleCheck) return roleCheck;
  const limit = checkRateLimit(`c3-roles:${session.user?._id ?? session.firebase?.uid ?? "anon"}`);
  if (!limit.ok) return rateLimitedResponse(limit.retryAfterSeconds);

  return jsonResponse({
    model: careerModelInfo,
    taxonomy: {
      version: careerModel.taxonomy.version,
      levels: careerModel.taxonomy.levels,
      areas: careerModel.taxonomy.areas,
      skills: careerModel.taxonomy.skills.map(({ id, area, label }) => ({ id, area, label }))
    },
    roles: careerModel.roles.map((r) => ({
      id: r.id,
      label: r.label,
      adCount: r.adCount,
      skills: r.skills.map(({ skillId, weight, tf, requiredLevel }) => ({ skillId, weight, adShare: tf, requiredLevel }))
    }))
  });
}
