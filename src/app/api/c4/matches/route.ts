import { NextRequest } from "next/server";
import { z } from "zod";
import { jsonResponse } from "@/lib/api";
import { isSyntheticModel, matchingModel, rankMentors } from "@/lib/c4/matching";
import { requireRole, requireSession } from "@/lib/session-auth";

export const dynamic = "force-dynamic";

const ids = (items: { id: string }[]) => items.map((i) => i.id) as [string, ...string[]];
const { skills, interests, languages, slots } = matchingModel.taxonomy;

const needsSchema = z
  .object({
    needs: z.record(z.enum(ids(skills)), z.number().int().min(1).max(3)),
    interests: z.array(z.enum(ids(interests))).max(10),
    preferredLanguage: z.enum(ids(languages)),
    languages: z.array(z.enum(ids(languages))).min(1).max(3),
    slots: z.array(z.enum(ids(slots))).min(1).max(5)
  })
  .strict()
  .refine((v) => Object.keys(v.needs).length >= 1 && Object.keys(v.needs).length <= 5, { path: ["needs"] });

/**
 * POST /api/c4/matches - top mentors for the signed-in student, with the score of every
 * criterion and plain-language reasons. Compute-only: nothing is stored.
 */
export async function POST(request: NextRequest) {
  const authResult = await requireSession(request);
  if (authResult.error) return authResult.error;
  const roleCheck = requireRole(authResult.session.user?.role, ["student"]);
  if (roleCheck) return roleCheck;

  const body = await request.json().catch(() => null);
  const parsed = needsSchema.safeParse(body);
  if (!parsed.success) {
    return jsonResponse({ message: "Invalid matching request.", issues: parsed.error.issues.map((i) => i.path.join(".")) }, 400);
  }

  const matches = rankMentors(parsed.data).slice(0, 3).map((m) => ({
    mentorId: m.mentor.id,
    name: m.mentor.name,
    headline: m.mentor.headline,
    score: m.score,
    criteria: m.criteria,
    reasons: m.reasons
  }));
  return jsonResponse({
    matches,
    weights: matchingModel.weights,
    modelVersion: matchingModel.version,
    syntheticTraining: isSyntheticModel,
    warning: matchingModel.warning
  });
}
