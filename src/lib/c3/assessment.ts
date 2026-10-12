/**
 * C3 - one call that turns questionnaire answers (and optionally CV-derived skills)
 * into readiness per role, ranked gaps and Gap-to-Action plans for the target roles.
 * Pure and deterministic: used by the browser (on-device) and by the API (server
 * recomputes; client-supplied scores are never trusted).
 */
import { extractSkills } from "./extract";
import { proposedGaps, type SkillGap } from "./gaps";
import { planForRole, type GapToActionPlan } from "./graph";
import { SKILL_IDS, careerModel, getRole, isSyntheticModel } from "./model";
import { rankRoles, rankRolesBaseline, type BaselineReadiness, type RoleReadiness, type SkillLevels } from "./readiness";
import type { CareerProfile } from "./validation";

export const CV_EVIDENCE_LEVEL = 1;
export const MAX_GAPS_SHOWN = 8;

export type SkillSource = "questionnaire" | "cv" | "both";

export type TargetAnalysis = { roleId: string; readiness: RoleReadiness; gaps: SkillGap[]; plan: GapToActionPlan };

export type CareerAssessment = {
  levels: SkillLevels;
  sources: Record<string, SkillSource>;
  cvSkillIds: string[];
  roles: RoleReadiness[];
  baselineRoles: BaselineReadiness[];
  targets: TargetAnalysis[];
  modelVersion: string;
  syntheticTraining: boolean;
};

/**
 * A skill found in CV text counts as evidence of at least Basic (level 1); the
 * questionnaire answer wins when it is higher. The UI shows which source each level came from.
 */
export function mergeLevels(questionnaire: SkillLevels, cvSkillIds: string[]) {
  const levels: SkillLevels = {};
  const sources: Record<string, SkillSource> = {};
  const fromCv = new Set(cvSkillIds);
  for (const id of SKILL_IDS) {
    const q = questionnaire[id] ?? 0;
    const c = fromCv.has(id) ? CV_EVIDENCE_LEVEL : 0;
    levels[id] = Math.max(q, c);
    if (q > 0 && c > 0) sources[id] = "both";
    else if (c > 0) sources[id] = "cv";
    else if (q > 0) sources[id] = "questionnaire";
  }
  return { levels, sources };
}

export function cvSkillIdsFromText(cvText: string | undefined): string[] {
  if (!cvText || !cvText.trim()) return [];
  return extractSkills(cvText).skills.map((s) => s.skillId);
}

export function assessCareer(profile: CareerProfile, cvSkillIds: string[] = []): CareerAssessment {
  const { levels, sources } = mergeLevels(profile.skills, cvSkillIds);
  const targets: TargetAnalysis[] = profile.targetRoleIds.flatMap((roleId) => {
    const role = getRole(roleId);
    if (!role) return [];
    const plan = planForRole(levels, role);
    const roles = rankRoles(levels, [role]);
    return [{ roleId, readiness: roles[0], gaps: proposedGaps(levels, role).slice(0, MAX_GAPS_SHOWN), plan }];
  });
  return {
    levels,
    sources,
    cvSkillIds,
    roles: rankRoles(levels),
    baselineRoles: rankRolesBaseline(levels),
    targets,
    modelVersion: careerModel.version,
    syntheticTraining: isSyntheticModel
  };
}
