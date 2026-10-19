/**
 * C3 - hands the student's result to the Career job board ("See jobs that match you in
 * Career"). Stored only in this browser tab's sessionStorage - never sent to a server or
 * put in the URL - and ignored when it is older than 24 hours, invalid, or from another
 * model version. "Clear" on the board and "Erase saved data" in C3 remove it.
 */
import { careerModel, getRole, getSkill } from "./model";
import type { SkillLevels } from "./readiness";

export const JOB_MATCH_KEY = "c3.jobMatchContext";
export const JOB_MATCH_MAX_AGE_MS = 24 * 60 * 60 * 1000;

export type JobMatchContext = { roleId: string; levels: SkillLevels; modelVersion: string; savedAt: number };

function storage(): Storage | null {
  try {
    return typeof window === "undefined" ? null : window.sessionStorage;
  } catch {
    return null;
  }
}

export function clearJobMatchContext(): void {
  try {
    storage()?.removeItem(JOB_MATCH_KEY);
  } catch {
    /* storage blocked: nothing to clear */
  }
}

/** Keeps only known skills with levels 1-3. */
function cleanLevels(levels: unknown): SkillLevels | null {
  if (typeof levels !== "object" || levels === null || Array.isArray(levels)) return null;
  const out: SkillLevels = {};
  for (const [id, v] of Object.entries(levels)) {
    if (!getSkill(id) || typeof v !== "number" || !Number.isInteger(v) || v < 0 || v > 3) return null;
    if (v > 0) out[id] = v;
  }
  return out;
}

export function saveJobMatchContext(roleId: string, levels: SkillLevels, now = Date.now()): boolean {
  const clean = cleanLevels(levels);
  if (!getRole(roleId) || !clean) return false;
  const ctx: JobMatchContext = { roleId, levels: clean, modelVersion: careerModel.version, savedAt: now };
  try {
    const s = storage();
    if (!s) return false;
    s.setItem(JOB_MATCH_KEY, JSON.stringify(ctx));
    return true;
  } catch {
    return false;
  }
}

export function readJobMatchContext(now = Date.now()): JobMatchContext | null {
  let raw: string | null = null;
  try {
    raw = storage()?.getItem(JOB_MATCH_KEY) ?? null;
  } catch {
    return null;
  }
  if (!raw) return null;
  try {
    const v = JSON.parse(raw) as Partial<JobMatchContext>;
    const levels = cleanLevels(v.levels);
    const age = typeof v.savedAt === "number" ? now - v.savedAt : NaN;
    const ok =
      typeof v.roleId === "string" &&
      getRole(v.roleId) !== undefined &&
      levels !== null &&
      v.modelVersion === careerModel.version &&
      age >= 0 &&
      age <= JOB_MATCH_MAX_AGE_MS;
    if (ok) return { roleId: v.roleId as string, levels: levels as SkillLevels, modelVersion: careerModel.version, savedAt: v.savedAt as number };
  } catch {
    /* invalid JSON: fall through */
  }
  clearJobMatchContext();
  return null;
}
