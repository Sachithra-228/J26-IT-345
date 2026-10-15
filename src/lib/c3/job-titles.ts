/**
 * C3 - "Search job sites for": the job titles real ads use for each role.
 *
 * `model/job-titles.json` is written by `python ml/c3/run_pipeline.py real` from the
 * manually collected job-ads sheet: title counts per role only (no company names, URLs
 * or ad text). Display aid for students; never a model input.
 */
import titlesJson from "./model/job-titles.json";

export type JobTitleCount = { title: string; ads: number };

export type JobTitles = {
  generatedAt: string;
  adsUsed: number;
  roles: Record<string, { ads: number; titles: JobTitleCount[] }>;
};

export const jobTitles = titlesJson as unknown as JobTitles;

export function titlesForRole(roleId: string, data: JobTitles = jobTitles): { ads: number; titles: JobTitleCount[] } {
  return data.roles[roleId] ?? { ads: 0, titles: [] };
}
