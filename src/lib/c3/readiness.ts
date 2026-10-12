/**
 * C3 - readiness scoring (mirror of `ml/c3/src/recommender/readiness.py`).
 *
 * PROPOSED (weighted, explainable):
 *   attainment a = min(L / Q, 1), shortfall g = max(Q - L, 0) / Q
 *   points       = 100 x w x (a - lambda x g^2)
 *   readiness    = clamp(sum of points, 0, 100)
 * The per-skill points are the explanation: they add up to the score (before the clamp).
 *
 * BASELINE (unweighted content-based matching): share of the role's skills the
 * student has at level >= 1.
 *
 * The arithmetic order matches Python exactly so the parity test can compare results.
 */
import { careerModel, type RoleProfile } from "./model";

export type SkillLevels = Record<string, number>;

export type Contribution = {
  skillId: string;
  level: number;
  requiredLevel: number;
  weight: number;
  attainment: number;
  shortfall: number;
  /** Points this skill adds to (or, if missing, subtracts from) the readiness score. */
  points: number;
  /** Points available if the required level is reached (100 x weight). */
  maxPoints: number;
};

export type RoleReadiness = { roleId: string; score: number; rawScore: number; contributions: Contribution[] };
export type BaselineReadiness = { roleId: string; score: number; covered: number; required: number };

export const LAMBDA = careerModel.params.lambdaGapPenalty;

export function skillPoints(level: number, required: number, weight: number, lambda = LAMBDA) {
  const attainment = Math.min(level / required, 1.0);
  const shortfall = Math.max(required - level, 0) / required;
  return { attainment, shortfall, points: 100.0 * weight * (attainment - lambda * shortfall * shortfall) };
}

export function proposedReadiness(levels: SkillLevels, profile: RoleProfile, lambda = LAMBDA): RoleReadiness {
  let total = 0.0;
  const contributions: Contribution[] = [];
  for (const item of profile.skills) {
    const level = levels[item.skillId] ?? 0;
    const { attainment, shortfall, points } = skillPoints(level, item.requiredLevel, item.weight, lambda);
    total += points;
    contributions.push({
      skillId: item.skillId,
      level,
      requiredLevel: item.requiredLevel,
      weight: item.weight,
      attainment,
      shortfall,
      points,
      maxPoints: 100.0 * item.weight
    });
  }
  return { roleId: profile.id, score: Math.min(Math.max(total, 0.0), 100.0), rawScore: total, contributions };
}

export function baselineReadiness(levels: SkillLevels, profile: RoleProfile): BaselineReadiness {
  const required = profile.skills.map((s) => s.skillId);
  const covered = required.filter((s) => (levels[s] ?? 0) >= 1).length;
  return { roleId: profile.id, score: required.length ? (100.0 * covered) / required.length : 0.0, covered, required: required.length };
}

/** Roles ranked by proposed readiness; ties keep catalogue order. */
export function rankRoles(levels: SkillLevels, profiles: RoleProfile[] = careerModel.roles, lambda = LAMBDA): RoleReadiness[] {
  return profiles
    .map((p, i) => ({ r: proposedReadiness(levels, p, lambda), i }))
    .sort((a, b) => b.r.score - a.r.score || a.i - b.i)
    .map(({ r }) => r);
}

export function rankRolesBaseline(levels: SkillLevels, profiles: RoleProfile[] = careerModel.roles): BaselineReadiness[] {
  return profiles
    .map((p, i) => ({ r: baselineReadiness(levels, p), i }))
    .sort((a, b) => b.r.score - a.r.score || a.i - b.i)
    .map(({ r }) => r);
}

/** Readiness band used by the UI wording only (not a decision threshold). */
export function readinessBand(score: number): "strong" | "developing" | "early" {
  if (score >= 70) return "strong";
  if (score >= 40) return "developing";
  return "early";
}
