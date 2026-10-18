/**
 * C3 - "Jobs that fit you": ranks the platform's employer job board for the student.
 *
 * Each job's title and requirements go through the same check as "Check me against a
 * job ad" (skill extraction, have / missing, first step from the Gap-to-Action graph).
 * A job is kept only if it names at least two taxonomy skills and is close enough to the
 * selected role. Runs in the browser: the student's levels are never sent anywhere.
 * Display aid only: it never changes readiness scores, gaps or plans.
 */
import type { JobListing } from "@/types";
import { demoJobs } from "@/lib/demo-data";
import { checkAgainstAd, MIN_ROLE_SIMILARITY, roleSimilarity, type AdSkill } from "./ad-check";
import { DEMO_IT_JOBS } from "./demo-it-jobs";
import { getRole } from "./model";
import type { SkillLevels } from "./readiness";

/** A job must name at least this many taxonomy skills to be ranked. */
export const MIN_JOB_SKILLS = 2;
/** Fewer real matches than this and the clearly labelled sample jobs are shown as well. */
export const MIN_REAL_MATCHES = 3;

export type JobMatch = {
  job: JobListing;
  matchPercent: number;
  haveSkills: AdSkill[];
  missingSkills: AdSkill[];
  similarity: number;
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

/** The check for one job; null when it is closed, names too few skills or is not close to the role. */
export function scoreJob(job: JobListing, levels: SkillLevels, roleId: string, today: Date): JobMatch | null {
  const role = getRole(roleId);
  if (!role || !isOpen(job, today)) return null;
  const text = [job.title, ...(job.requirements ?? [])].join(". ");
  const check = checkAgainstAd(text, levels);
  if (check.skills.length < MIN_JOB_SKILLS || check.match === null) return null;
  const similarity = roleSimilarity(check.skills.map((s) => s.skillId), role);
  if (similarity < MIN_ROLE_SIMILARITY) return null;
  return {
    job,
    matchPercent: Math.round(check.match * 100),
    haveSkills: check.skills.filter((s) => s.have),
    missingSkills: check.skills.filter((s) => !s.have),
    similarity,
    isDemo: isDemoJob(job)
  };
}

function byFit(a: JobMatch, b: JobMatch): number {
  return (
    b.matchPercent - a.matchPercent ||
    b.similarity - a.similarity ||
    a.job.title.localeCompare(b.job.title, "en") ||
    a.job._id.localeCompare(b.job._id, "en")
  );
}

/** The best-fitting open jobs for the selected role, highest match first. Deterministic. */
export function recommendJobs(jobs: JobListing[], levels: SkillLevels, roleId: string, today: Date, top = 5): JobMatch[] {
  return jobs
    .map((job) => scoreJob(job, levels, roleId, today))
    .filter((m): m is JobMatch => m !== null)
    .sort(byFit)
    .slice(0, top);
}

/**
 * Real jobs first. Sample jobs are added (as a separate list) only when fewer than
 * MIN_REAL_MATCHES real jobs fit. Platform demo jobs count as samples, never as real.
 */
export function recommendWithFallback(
  jobs: JobListing[],
  levels: SkillLevels,
  roleId: string,
  today: Date,
  top = 5,
  samples: JobListing[] = DEMO_IT_JOBS
): { real: JobMatch[]; demo: JobMatch[] } {
  const ranked = recommendJobs(jobs, levels, roleId, today, jobs.length);
  const real = ranked.filter((m) => !m.isDemo).slice(0, top);
  if (real.length >= MIN_REAL_MATCHES) return { real, demo: [] };
  const fromBoard = ranked.filter((m) => m.isDemo);
  const fromSamples = recommendJobs(samples, levels, roleId, today, samples.length).map((m) => ({ ...m, isDemo: true }));
  const demo = [...fromBoard, ...fromSamples].sort(byFit).slice(0, top - real.length);
  return { real, demo };
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
