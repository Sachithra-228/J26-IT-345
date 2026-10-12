/**
 * C3 - skill-gap ranking (mirror of `proposed_gaps` / `baseline_gaps` in
 * `ml/c3/src/recommender/readiness.py`).
 *
 * Proposed: every skill below the role's required level, ranked by the readiness
 * points the student would gain by reaching it (then weight, then taxonomy order).
 * Baseline: largest level shortfall first, ignoring how much the role values the skill.
 */
import { SKILL_IDS, type RoleProfile } from "./model";
import { LAMBDA, skillPoints, type SkillLevels } from "./readiness";

export type SkillGap = {
  skillId: string;
  level: number;
  requiredLevel: number;
  weight: number;
  shortfall: number;
  /** Readiness points gained by reaching the required level. */
  gainToRequired: number;
  /** Readiness points gained by moving up one level. */
  gainNextLevel: number;
};

export type BaselineGap = { skillId: string; level: number; requiredLevel: number };

const skillIndex = new Map(SKILL_IDS.map((id, i) => [id, i]));
const orderOf = (id: string) => skillIndex.get(id) ?? Number.MAX_SAFE_INTEGER;

export function proposedGaps(levels: SkillLevels, profile: RoleProfile, lambda = LAMBDA): SkillGap[] {
  const gaps: SkillGap[] = [];
  for (const item of profile.skills) {
    const level = levels[item.skillId] ?? 0;
    if (level >= item.requiredLevel) continue;
    const { shortfall, points } = skillPoints(level, item.requiredLevel, item.weight, lambda);
    const next = skillPoints(level + 1, item.requiredLevel, item.weight, lambda).points;
    gaps.push({
      skillId: item.skillId,
      level,
      requiredLevel: item.requiredLevel,
      weight: item.weight,
      shortfall,
      gainToRequired: 100.0 * item.weight - points,
      gainNextLevel: next - points
    });
  }
  return gaps.sort((a, b) => b.gainToRequired - a.gainToRequired || b.weight - a.weight || orderOf(a.skillId) - orderOf(b.skillId));
}

export function baselineGaps(levels: SkillLevels, profile: RoleProfile): BaselineGap[] {
  return profile.skills
    .filter((item) => (levels[item.skillId] ?? 0) < item.requiredLevel)
    .map((item) => ({ skillId: item.skillId, level: levels[item.skillId] ?? 0, requiredLevel: item.requiredLevel }))
    .sort(
      (a, b) => b.requiredLevel - b.level - (a.requiredLevel - a.level) || orderOf(a.skillId) - orderOf(b.skillId)
    );
}
