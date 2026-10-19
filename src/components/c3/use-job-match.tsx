"use client";

/**
 * C3 - the student's C3 result on the Career job board.
 *
 * All C3 logic for the board lives here; part-time-job-board-full.tsx only places the
 * pieces this hook returns (banner, sort control, one badge per card, sample jobs).
 * Without a saved context (see src/lib/c3/job-match-context.ts) every piece is null and
 * order() returns the list unchanged, so the board behaves exactly as before.
 */
import { useCallback, useEffect, useMemo, useState, type ReactNode } from "react";
import { Target } from "lucide-react";
import { Badge } from "@/components/shared/Badge";
import { useLanguage, type Language } from "@/context/language-context";
import { fmt, getC3Text, label, type C3Text } from "@/lib/c3/i18n";
import { clearJobMatchContext, readJobMatchContext, type JobMatchContext } from "@/lib/c3/job-match-context";
import { DEMO_IT_JOBS } from "@/lib/c3/demo-it-jobs";
import { annotateJob, bestMatchOrder, hasRealMatch, isDemoJob, recommendJobs, type JobMatch } from "@/lib/c3/job-recommend";
import { getRole } from "@/lib/c3/model";
import type { JobListing } from "@/types";
import { C3JobCard, ClosestRole, MatchLines, SampleJobsHeading } from "./c3-job-card";

type Sort = "default" | "best";

const roleText = (id: string, language: Language) => {
  const r = getRole(id);
  return r ? label(r.label, language) : id;
};

export type JobMatchView = {
  active: boolean;
  order: (jobs: JobListing[]) => JobListing[];
  banner: ReactNode;
  sortControl: ReactNode;
  badge: (job: JobListing) => ReactNode;
  samples: ReactNode;
};

export function useJobMatch(jobs: JobListing[]): JobMatchView {
  const { language } = useLanguage();
  const t = getC3Text(language);
  const [context, setContext] = useState<JobMatchContext | null>(null);
  const [sort, setSort] = useState<Sort>("default");

  useEffect(() => {
    const c = readJobMatchContext();
    setContext(c);
    if (c) setSort("best");
  }, []);

  const scores = useMemo(
    () => (context ? new Map(jobs.map((j) => [j._id, annotateJob(j, context.levels, context.roleId)] as const)) : null),
    [jobs, context]
  );
  const order = useCallback((list: JobListing[]) => (scores && sort === "best" ? bestMatchOrder(list, scores) : list), [scores, sort]);

  const clear = useCallback(() => {
    clearJobMatchContext();
    setContext(null);
    setSort("default");
  }, []);

  const samples = useMemo(() => {
    if (!context || !scores || hasRealMatch(jobs, scores)) return [];
    return recommendJobs(DEMO_IT_JOBS, context.levels, context.roleId, new Date(), 3).map((m) => ({ ...m, isDemo: true }));
  }, [context, scores, jobs]);

  if (!context || !scores) {
    return { active: false, order, banner: null, sortControl: null, badge: () => null, samples: null };
  }
  const role = roleText(context.roleId, language);

  return {
    active: true,
    order,
    banner: (
      <div data-testid="c3-jm-banner" role="status" className="mb-5 flex flex-wrap items-center justify-between gap-2 rounded-xl border border-primary/20 bg-primary/5 px-4 py-2.5 text-sm text-slate-700 dark:text-slate-200">
        <span className="inline-flex items-center gap-2">
          <Target className="h-4 w-4 text-primary" aria-hidden="true" />
          {fmt(t.jmBanner, { role })}
        </span>
        <button type="button" onClick={clear} className="rounded-md px-2 py-0.5 text-xs font-semibold text-primary underline-offset-2 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary">
          {t.jmClear}
        </button>
      </div>
    ),
    sortControl: (
      <label className="ml-auto inline-flex items-center gap-1.5 text-xs font-medium text-blue-100">
        {t.jmSort}
        <select
          data-testid="c3-jm-sort"
          value={sort}
          onChange={(e) => setSort(e.target.value as Sort)}
          className="rounded-md border border-slate-600 bg-slate-900 px-2 py-1 text-xs text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
        >
          <option value="best">{t.jmSortBest}</option>
          <option value="default">{t.jmSortDefault}</option>
        </select>
      </label>
    ),
    badge: (job: JobListing) => <JobMatchBadge demo={isDemoJob(job)} m={scores.get(job._id) ?? null} t={t} language={language} />,
    samples: samples.length ? (
      <section data-testid="c3-jm-samples" className="mt-8">
        <SampleJobsHeading t={t} />
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {samples.map((m) => (
            <C3JobCard key={m.job._id} m={m} t={t} language={language} />
          ))}
        </div>
      </section>
    ) : null
  };
}

/** Inside each board card: the match %, the demo badge when relevant, and the missing skills / first step. */
function JobMatchBadge({ demo, m, t, language }: { demo: boolean; m: JobMatch | null; t: C3Text; language: Language }) {
  if (!demo && !m) return null;
  return (
    <div data-testid="c3-jm-badge" className="mt-2">
      <div className="flex flex-wrap items-center gap-1.5">
        {m?.fitsRole ? (
          <span data-testid="c3-jm-match">
            <Badge variant="success">{fmt(t.jfMatch, { n: m.matchPercent })}</Badge>
          </span>
        ) : null}
        {demo ? (
          <span data-testid="c3-jm-demo">
            <Badge variant="warning">{t.jfDemoBadge}</Badge>
          </span>
        ) : null}
      </div>
      {m ? <ClosestRole m={m} t={t} language={language} /> : null}
      {m?.fitsRole ? <MatchLines m={m} t={t} language={language} /> : null}
    </div>
  );
}
