"use client";

/**
 * C3 - a job card in the same style as the Career job board cards
 * (src/components/career/part-time-job-board-full.tsx), plus the C3 match line.
 * Used by "Jobs that fit you" in the C3 results and by the sample jobs on the board.
 */
import { ArrowUpRight, Clock3, Globe2, MapPin } from "lucide-react";
import { Badge } from "@/components/shared/Badge";
import type { Language } from "@/context/language-context";
import { fmt, label, type C3Text } from "@/lib/c3/i18n";
import type { JobMatch } from "@/lib/c3/job-recommend";
import { getRole, getSkill } from "@/lib/c3/model";
import type { JobListing } from "@/types";

const typeAccentClass: Record<JobListing["type"], string> = {
  "part-time": "from-blue-500/20 to-blue-600/10 text-blue-700 dark:text-blue-300",
  internship: "from-emerald-500/20 to-emerald-600/10 text-emerald-700 dark:text-emerald-300",
  "full-time": "from-violet-500/20 to-violet-600/10 text-violet-700 dark:text-violet-300"
};

const typeBorderClass: Record<JobListing["type"], string> = {
  "part-time": "border-l-blue-500",
  internship: "border-l-emerald-500",
  "full-time": "border-l-violet-500"
};

const skillText = (id: string, language: Language) => {
  const s = getSkill(id);
  return s ? label(s.label, language) : id;
};

const roleText = (id: string, language: Language) => {
  const r = getRole(id);
  return r ? label(r.label, language) : id;
};

/** "Closest role: ..." - why the job is listed. */
export function ClosestRole({ m, t, language }: { m: JobMatch; t: C3Text; language: Language }) {
  return (
    <p data-testid="c3-job-closest" className="mt-1 text-xs font-medium text-slate-600 dark:text-slate-300">
      {fmt(t.jfClosestRole, { role: roleText(m.closestRoleId, language) })}
    </p>
  );
}

export function typeText(type: JobListing["type"], t: C3Text): string {
  return type === "internship" ? t.jfTypeInternship : type === "part-time" ? t.jfTypePartTime : type === "full-time" ? t.jfTypeFullTime : type;
}

/** "Missing: ..." (up to three skills) and the first step for the first gap that has one. */
export function MatchLines({ m, t, language }: { m: JobMatch; t: C3Text; language: Language }) {
  const missing = m.missingSkills;
  const gap = missing.find((s) => s.nextAction);
  return (
    <>
      {missing.length ? (
        <p className="mt-2 text-xs text-slate-600 dark:text-slate-300">
          {fmt(t.jmMissingShort, { skills: missing.slice(0, 3).map((s) => skillText(s.skillId, language)).join(", ") })}
        </p>
      ) : null}
      {gap?.nextAction ? (
        <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
          {fmt(t.acNext, { action: gap.nextAction.title, h: gap.nextAction.effortHours })}
        </p>
      ) : null}
      <p className="sr-only">
        {t.jfHave}: {m.haveSkills.map((s) => skillText(s.skillId, language)).join(", ") || "-"}.
      </p>
    </>
  );
}

export function C3JobCard({ m, t, language, boardHref }: { m: JobMatch; t: C3Text; language: Language; boardHref?: string }) {
  const { job } = m;
  const remote = /remote|anywhere/i.test(job.location || "");
  const href = job.externalUrl || boardHref;

  return (
    <article
      data-testid="c3-job"
      className={`flex flex-col rounded-2xl border border-l-4 border-slate-200 bg-white p-4 shadow-sm transition-all hover:-translate-y-0.5 hover:border-primary/40 hover:shadow-md dark:border-slate-700 dark:bg-slate-900 ${typeBorderClass[job.type] ?? ""}`}
    >
      <div className="mb-3 flex items-start justify-between gap-2">
        <h4 className="line-clamp-2 text-base font-semibold leading-snug text-slate-900 dark:text-white">{job.title}</h4>
        {job.source && !m.isDemo ? (
          <span className="shrink-0 rounded-md bg-slate-100 px-2 py-0.5 text-[11px] font-medium text-slate-600 dark:bg-slate-800 dark:text-slate-300">{job.source}</span>
        ) : null}
      </div>

      <p className="text-sm font-medium text-slate-700 dark:text-slate-300">{job.company}</p>
      <ClosestRole m={m} t={t} language={language} />
      {job.location ? (
        <p className="mt-2 flex items-center gap-1.5 text-xs text-slate-500 dark:text-slate-400">
          {remote ? <Globe2 className="h-3.5 w-3.5" aria-hidden="true" /> : <MapPin className="h-3.5 w-3.5" aria-hidden="true" />}
          {job.location}
        </p>
      ) : null}

      <div className="mt-3 flex items-center justify-between gap-2">
        <span className="flex flex-wrap items-center gap-1.5">
          <span className={`rounded-full bg-gradient-to-r px-2.5 py-1 text-[11px] font-semibold ${typeAccentClass[job.type] ?? ""}`}>{typeText(job.type, t)}</span>
          {m.isDemo ? (
            <span data-testid="c3-job-demo-badge" className="rounded-full bg-amber-100 px-2.5 py-1 text-[11px] font-semibold text-amber-800 dark:bg-amber-900/50 dark:text-amber-200">
              {t.jfDemoBadge}
            </span>
          ) : null}
        </span>
        <span className="shrink-0 whitespace-nowrap">
          <Badge variant="success">{fmt(t.jfMatch, { n: m.matchPercent })}</Badge>
        </span>
      </div>

      <MatchLines m={m} t={t} language={language} />

      <div className="mt-auto flex items-center justify-between gap-2 pt-4">
        {job.applicationDeadline ? (
          <span className="inline-flex items-center gap-1 text-xs text-slate-500 dark:text-slate-400">
            <Clock3 className="h-3.5 w-3.5" aria-hidden="true" />
            {fmt(t.jfDeadline, { date: job.applicationDeadline })}
          </span>
        ) : (
          <span />
        )}
        {!m.isDemo && href ? (
          <a
            href={href}
            {...(job.externalUrl ? { target: "_blank", rel: "noopener noreferrer" } : {})}
            className="inline-flex items-center gap-1.5 rounded-lg bg-primary px-3 py-1.5 text-sm font-medium text-white transition-colors hover:bg-primary/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-1"
          >
            {job.externalUrl ? t.jfOpenJob : t.jfBoard}
            <ArrowUpRight className="h-3.5 w-3.5" aria-hidden="true" />
          </a>
        ) : null}
      </div>
    </article>
  );
}

/** Small heading used above the sample jobs, in the board's "Featured roles" style. */
export function SampleJobsHeading({ t }: { t: C3Text }) {
  return (
    <div className="mb-3">
      <h4 className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-500 dark:text-slate-400">{t.jfDemoHeading}</h4>
      <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">{t.jfDemoNote}</p>
    </div>
  );
}
