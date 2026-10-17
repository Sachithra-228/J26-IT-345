/**
 * C3 - "Check me against this job ad".
 *
 * A student pastes the text of one job ad they found. The same extractor that reads
 * CVs (PII stripped first) finds the taxonomy skills the ad mentions; each one is
 * compared with the student's levels, and the ad is matched to the closest role
 * profile, so a title the student has never seen ("Software Engineer in Test",
 * "Associate Consultant") still maps to a role family.
 *
 * Runs in the browser only. The ad text is never stored, sent or logged. Display aid:
 * it never changes readiness scores, gaps or plans.
 */
import { extractSkills } from "./extract";
import type { ActionNode } from "./graph";
import { careerModel, knowledgeGraph, type RoleProfile } from "./model";
import type { SkillLevels } from "./readiness";

/** Below this the ad is too short or too vague to say anything useful. */
export const MIN_AD_SKILLS = 3;
/** Cosine similarity below this is reported as "no clear role". */
export const MIN_ROLE_SIMILARITY = 0.2;

export type AdSkill = { skillId: string; level: number; have: boolean; nextAction: ActionNode | null };

export type AdCheck = {
  /** Skills the ad mentions, in taxonomy order. */
  skills: AdSkill[];
  have: number;
  missing: number;
  /** Share of the ad's skills the student has at Basic or above; null when the ad names no skills. */
  match: number | null;
  /** Up to three closest role profiles (cosine similarity, highest first). */
  closestRoles: Array<{ roleId: string; similarity: number }>;
  enoughSkills: boolean;
  redacted: number;
};

const teaching = new Map<string, Array<{ action: ActionNode; level: number }>>();
{
  const actions = new Map<string, ActionNode>();
  for (const n of knowledgeGraph.nodes) if ("effortHours" in n) actions.set(n.id, n);
  for (const e of knowledgeGraph.edges) {
    if (e.type !== "teaches") continue;
    const action = actions.get(e.from);
    if (!action) continue;
    const skill = e.to.slice(6);
    const list = teaching.get(skill) ?? [];
    list.push({ action, level: e.level });
    teaching.set(skill, list);
  }
}

/** The least-effort action that teaches the skill above the current level (ties: id). */
export function firstActionFor(skillId: string, level: number): ActionNode | null {
  const options = (teaching.get(skillId) ?? []).filter((o) => o.level > level);
  options.sort((a, b) => a.action.effortHours - b.action.effortHours || a.action.ref.localeCompare(b.action.ref));
  return options[0]?.action ?? null;
}

/** Cosine similarity between the ad (binary skill vector) and a role (TF-IDF weights). */
export function roleSimilarity(adSkillIds: string[], role: RoleProfile): number {
  if (adSkillIds.length === 0) return 0;
  const ad = new Set(adSkillIds);
  let dot = 0;
  let norm = 0;
  for (const s of role.skills) {
    norm += s.weight * s.weight;
    if (ad.has(s.skillId)) dot += s.weight;
  }
  return norm === 0 ? 0 : dot / (Math.sqrt(norm) * Math.sqrt(ad.size));
}

export function closestRoles(adSkillIds: string[], roles: RoleProfile[] = careerModel.roles, top = 3) {
  return roles
    .map((r) => ({ roleId: r.id, similarity: roleSimilarity(adSkillIds, r) }))
    .filter((r) => r.similarity >= MIN_ROLE_SIMILARITY)
    .sort((a, b) => b.similarity - a.similarity || a.roleId.localeCompare(b.roleId))
    .slice(0, top);
}

export function checkAgainstAd(adText: string, levels: SkillLevels): AdCheck {
  const ext = extractSkills(adText);
  const ids = ext.skills.map((s) => s.skillId);
  const skills = ids.map((skillId) => {
    const level = levels[skillId] ?? 0;
    const have = level >= 1;
    return { skillId, level, have, nextAction: have ? null : firstActionFor(skillId, level) };
  });
  const have = skills.filter((s) => s.have).length;
  return {
    skills,
    have,
    missing: skills.length - have,
    match: skills.length ? have / skills.length : null,
    closestRoles: closestRoles(ids),
    enoughSkills: skills.length >= MIN_AD_SKILLS,
    redacted: Object.values(ext.redactions).reduce((a, b) => a + b, 0)
  };
}
