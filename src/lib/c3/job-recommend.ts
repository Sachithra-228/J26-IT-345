/**
 * C3 - "Jobs that fit you": ranks the platform's employer job board for the student.
 *
 * Each job's title and requirements go through the same check as "Check me against a
 * job ad" (skill extraction, have / missing, first step from the Gap-to-Action graph).
 * A job is recommended for a role only when it FITS that role: the role is the job's
 * closest role, or within JOB_ROLE_MARGIN of it, and the similarity is at least
 * JOB_ROLE_MIN_SIMILARITY. A high match % alone is not enough - a QA job that shares
 * SQL / Agile / Git with a student must not be shown as a Data Analyst job, and a job
 * labelled "Closest role: QA Engineer" must not appear in a Data Analyst list.
 * Runs in the browser: the student's levels are never sent anywhere.
 * Display aid only: it never changes readiness scores, gaps or plans.
 */
import type { JobListing } from "@/types";
import { demoJobs } from "@/lib/demo-data";
import { checkAgainstAd, roleSimilarity, type AdSkill } from "./ad-check";
import { DEMO_IT_JOBS } from "./demo-it-jobs";
import { careerModel, getRole } from "./model";
import type { SkillLevels } from "./readiness";

/** A job must name at least this many taxonomy skills to be ranked. */
export const MIN_JOB_SKILLS = 2;
/** The selected role must be the job's closest role or at most this much less similar than it... */
export const JOB_ROLE_MARGIN = 0.1;
/** ...and at least this similar (cosine) to the job's skills. */
export const JOB_ROLE_MIN_SIMILARITY = 0.35;

export type JobMatch = {
  job: JobListing;
  matchPercent: number;
  haveSkills: AdSkill[];
  missingSkills: AdSkill[];
  /** Similarity to the role the job was scored for. */
  similarity: number;
  /** The role the job's skills are closest to (shown as "Closest role"). */
  closestRoleId: string;
  /** The role the job was scored for, and whether the job fits it. */
  roleId: string;
  fitsRole: boolean;
  /** Fictional sample job (C3 demo list or the platform's built-in demo jobs). */
  isDemo: boolean;
};

const PLATFORM_DEMO_IDS = new Set(demoJobs.map((j) => j._id));
const C3_DEMO_IDS = new Set(DEMO_IT_JOBS.map((j) => j._id));

export function isDemoJob(job: JobListing): boolean {
  return PLATFORM_DEMO_IDS.has(job._id) || C3_DEMO_IDS.has(job._id);
}

const localDay = (d: Date) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;

/** Open unless the deadline is a valid date before today. A missing or invalid deadline counts as open. */
export function isOpen(job: JobListing, today: Date): boolean {
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec((job.applicationDeadline ?? "").trim());
  if (!m || Number.isNaN(Date.parse(`${m[1]}-${m[2]}-${m[3]}T00:00:00Z`))) return true;
  return `${m[1]}-${m[2]}-${m[3]}` >= localDay(today);
}

/** All roles ranked by similarity to a job's skills (highest first; ties by role id). */
function rankRolesForJob(skillIds: string[]): Array<{ roleId: string; similarity: number }> {
  return careerModel.roles
    .map((r) => ({ roleId: r.id, similarity: roleSimilarity(skillIds, r) }))
    .sort((a, b) => b.similarity - a.similarity || a.roleId.localeCompare(b.roleId));
}

/** Does a job (given its skill ids) fit the role? Closest role (or within the margin of it) AND similarity >= threshold. */
export function jobFitsRole(skillIds: string[], roleId: string): { fits: boolean; similarity: number; closestRoleId: string } {
  const ranked = rankRolesForJob(skillIds);
  const pos = ranked.findIndex((r) => r.roleId === roleId);
  const similarity = pos >= 0 ? ranked[pos].similarity : 0;
  const best = ranked[0]?.similarity ?? 0;
  return {
    fits: pos >= 0 && best - similarity <= JOB_ROLE_MARGIN + 1e-9 && similarity >= JOB_ROLE_MIN_SIMILARITY,
    similarity,
    closestRoleId: ranked[0]?.roleId ?? roleId
  };
}

/** The check for one job against one role, WITHOUT the fit rule; null when it names too few skills. */
export function annotateJob(job: JobListing, levels: SkillLevels, roleId: string): JobMatch | null {
  if (!getRole(roleId)) return null;
  const check = checkAgainstAd([job.title, ...(job.requirements ?? [])].join(". "), levels);
  if (check.skills.length < MIN_JOB_SKILLS || check.match === null) return null;
  const fit = jobFitsRole(check.skills.map((s) => s.skillId), roleId);
  return {
    job,
    matchPercent: Math.round(check.match * 100),
    haveSkills: check.skills.filter((s) => s.have),
    missingSkills: check.skills.filter((s) => !s.have),
    similarity: fit.similarity,
    closestRoleId: fit.closestRoleId,
    roleId,
    fitsRole: fit.fits,
    isDemo: isDemoJob(job)
  };
}

/** A recommendation: open, enough skills, and fits the role. Null otherwise. */
export function scoreJob(job: JobListing, levels: SkillLevels, roleId: string, today: Date): JobMatch | null {
  if (!isOpen(job, today)) return null;
  const m = annotateJob(job, levels, roleId);
  return m && m.fitsRole ? m : null;
}

/** Role fit first, then how much of the job the student already has, then title. */
function byFit(a: JobMatch, b: JobMatch): number {
  return (
    b.similarity - a.similarity ||
    b.matchPercent - a.matchPercent ||
    a.job.title.localeCompare(b.job.title, "en") ||
    a.job._id.localeCompare(b.job._id, "en")
  );
}

/** Open jobs that fit the selected role, best fit first. Deterministic. */
export function recommendJobs(jobs: JobListing[], levels: SkillLevels, roleId: string, today: Date, top = 5): JobMatch[] {
  return jobs
    .map((job) => scoreJob(job, levels, roleId, today))
    .filter((m): m is JobMatch => m !== null)
    .sort(byFit)
    .slice(0, top);
}

/** Open jobs that fit one of the other suggested roles (in their order), each listed once, up to `top`. */
export function recommendForOtherRoles(jobs: JobListing[], levels: SkillLevels, otherRoleIds: string[], today: Date, top = 3): JobMatch[] {
  const out: JobMatch[] = [];
  const seen = new Set<string>();
  for (const roleId of otherRoleIds) {
    for (const m of recommendJobs(jobs, levels, roleId, today, jobs.length)) {
      if (out.length >= top) return out;
      if (!seen.has(m.job._id)) {
        seen.add(m.job._id);
        out.push(m);
      }
    }
  }
  return out;
}

export type JobLists = {
  /** Real jobs that fit the selected role. */
  real: JobMatch[];
  /** When none fit: real jobs for the student's other suggested roles. */
  other: JobMatch[];
  /** Clearly labelled sample jobs - only when no real job fits any of these roles. */
  demo: JobMatch[];
};

/**
 * Real jobs for the selected role; if there are none, real jobs for the other suggested
 * roles; sample jobs only when no real job fits any of them. Platform demo jobs count as
 * samples, never as real.
 */
export function recommendWithFallback(
  jobs: JobListing[],
  levels: SkillLevels,
  roleId: string,
  today: Date,
  { top = 5, otherRoleIds = [], samples = DEMO_IT_JOBS }: { top?: number; otherRoleIds?: string[]; samples?: JobListing[] } = {}
): JobLists {
  const realJobs = jobs.filter((j) => !isDemoJob(j));
  const real = recommendJobs(realJobs, levels, roleId, today, top);
  if (real.length) return { real, other: [], demo: [] };
  const others = otherRoleIds.filter((r) => r !== roleId);
  const other = recommendForOtherRoles(realJobs, levels, others, today, Math.min(top, 3));
  if (other.length) return { real, other, demo: [] };
  const sampleJobs = [...jobs.filter(isDemoJob), ...samples];
  let demo = recommendJobs(sampleJobs, levels, roleId, today, top);
  if (!demo.length) demo = recommendForOtherRoles(sampleJobs, levels, others, today, Math.min(top, 3));
  return { real, other, demo: demo.map((m) => ({ ...m, isDemo: true })) };
}

/** Keeps only well-formed jobs from the /api/jobs response (anything else is ignored, not an error). */
export function normaliseJobs(data: unknown): JobListing[] {
  if (!Array.isArray(data)) return [];
  return data
    .filter((j): j is Record<string, unknown> => typeof j === "object" && j !== null && typeof (j as { title?: unknown }).title === "string")
    .map((j) => ({
      ...(j as unknown as JobListing),
      _id: String(j._id ?? j.title),
      company: typeof j.company === "string" ? j.company : "",
      location: typeof j.location === "string" ? j.location : "",
      requirements: Array.isArray(j.requirements) ? j.requirements.filter((r): r is string => typeof r === "string") : [],
      applicationDeadline: typeof j.applicationDeadline === "string" ? j.applicationDeadline : ""
    }));
}

/**
 * "Best match" order for the Career job board. Never removes a job (the deadline is
 * ignored: feed jobs carry their publication date there). Real jobs before demo jobs;
 * within each, jobs that fit the role first (by similarity, then match %), then other
 * scored jobs, then unscored jobs; ties keep the original order.
 */
export function bestMatchOrder(jobs: JobListing[], scores: Map<string, JobMatch | null>): JobListing[] {
  const rank = (s: JobMatch | null) => (s === null ? 2 : s.fitsRole ? 0 : 1);
  return jobs
    .map((job, index) => ({ job, index, score: scores.get(job._id) ?? null, demo: isDemoJob(job) }))
    .sort(
      (a, b) =>
        Number(a.demo) - Number(b.demo) ||
        rank(a.score) - rank(b.score) ||
        (b.score?.similarity ?? 0) - (a.score?.similarity ?? 0) ||
        (b.score?.matchPercent ?? 0) - (a.score?.matchPercent ?? 0) ||
        a.index - b.index
    )
    .map((x) => x.job);
}

/** True when at least one real (non-demo) job fits the role. */
export function hasRealMatch(jobs: JobListing[], scores: Map<string, JobMatch | null>): boolean {
  return jobs.some((j) => !isDemoJob(j) && scores.get(j._id)?.fitsRole === true);
}
