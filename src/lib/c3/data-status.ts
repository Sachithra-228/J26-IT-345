/**
 * C3 - model and data status for the admin "Career Readiness Insights" page.
 *
 * `model/data-status.json` is written by `python ml/c3/run_pipeline.py real` from the
 * manually collected job-ads sheet. It holds aggregate numbers only (counts per role,
 * source mix, extraction metrics) - never ad text, company names or URLs.
 */
import statusJson from "./model/data-status.json";
import { careerModelInfo } from "./model";

export type DataStatus = {
  generatedAt: string;
  taxonomyVersion: string;
  realAds: {
    rowsInSheet: number;
    adsUsed: number;
    rowsSkipped: number;
    issuesToFix: number;
    other: number;
    rolesAtTarget: number;
    perRole: Array<{ roleId: string; ads: number; target: number }>;
    sources: Record<string, number>;
  };
  realEvaluation: {
    ads: number;
    annotators: number;
    developmentSet: boolean;
    precision: number;
    recall: number;
    f1: number;
    f1Ci95: [number, number];
    roleFromTitleAccuracy: number | null;
    seniorityAccuracy: number | null;
  };
};

export const dataStatus = statusJson as unknown as DataStatus;

/** Totals the admin card shows next to the per-role table. */
export function collectionProgress(status: DataStatus = dataStatus) {
  const target = status.realAds.perRole.reduce((sum, r) => sum + r.target, 0);
  const counted = status.realAds.perRole.reduce((sum, r) => sum + Math.min(r.ads, r.target), 0);
  return {
    target,
    share: target ? counted / target : 0,
    roles: status.realAds.perRole.length,
    profilesFrom: careerModelInfo.syntheticTraining ? ("synthetic" as const) : ("real" as const)
  };
}
