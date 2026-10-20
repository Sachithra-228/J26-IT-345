"use client";

/**
 * C3 - "My Career Readiness Report": a print-ready view of the current results.
 *
 * Built in the browser from the results already on screen; nothing is fetched, sent or
 * stored (the optional name lives only in this component's state). The student saves it
 * as a PDF with the browser's print dialog, so Sinhala and Tamil render with the same
 * fonts as the app. The view is a portal on document.body with a scoped @media print
 * style that hides the rest of the page - no shared CSS is changed.
 * Charts are inline SVG with text labels and patterns, so they work in black and white.
 */
import { useEffect, useId, useRef, useState } from "react";
import { createPortal } from "react-dom";
import type { Language } from "@/context/language-context";
import type { CareerAssessment } from "@/lib/c3/assessment";
import type { SkillGap } from "@/lib/c3/gaps";
import type { GapToActionPlan } from "@/lib/c3/graph";
import { fmt, label, type C3Text } from "@/lib/c3/i18n";
import type { JobLists } from "@/lib/c3/job-recommend";
import { careerModel, getRole, getSkill, type ActionType } from "@/lib/c3/model";
import { readinessBand, type RoleReadiness } from "@/lib/c3/readiness";

const ROOT_ID = "c3-report-root";
const LOCALE: Record<Language, string> = { en: "en-GB", si: "si-LK", ta: "ta-LK" };
const MAX_CHART_SKILLS = 10;

const PRINT_CSS = `
#${ROOT_ID} { position: fixed; inset: 0; z-index: 1000; overflow: auto; background: #fff; color: #111827; }
#${ROOT_ID} .c3-report-page { max-width: 190mm; margin: 0 auto; padding: 12mm 10mm; }
@media print {
  @page { size: A4; margin: 12mm; }
  body > *:not(#${ROOT_ID}) { display: none !important; }
  /* globals.css hides "body *" when printing (for the resume builder); show the report again */
  #${ROOT_ID}, #${ROOT_ID} * { visibility: visible !important; }
  #${ROOT_ID} { position: absolute !important; left: 0; top: 0; width: 100%; overflow: visible !important; }
  #${ROOT_ID} .c3-report-page { padding: 0; max-width: none; }
  #${ROOT_ID} .c3-no-print { display: none !important; }
  #${ROOT_ID} .c3-page-break { break-before: page; }
  #${ROOT_ID} .c3-avoid-break { break-inside: avoid; }
  #${ROOT_ID} * { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
}
`;

export type ReportProps = {
  result: CareerAssessment;
  roleId: string;
  readiness: RoleReadiness;
  gaps: SkillGap[];
  plan: GapToActionPlan;
  /** Jobs already loaded in "Jobs that fit you"; null when the student has not loaded them. */
  jobs: JobLists | null;
  t: C3Text;
  language: Language;
  onClose: () => void;
  /** For tests: a fixed date. */
  now?: Date;
};

export function CareerReport(props: ReportProps) {
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  if (!mounted || typeof document === "undefined") return null;
  return createPortal(<ReportView {...props} />, document.body);
}

function ReportView({ result, roleId, readiness, gaps, plan, jobs, t, language, onClose, now }: ReportProps) {
  const uid = useId();
  const [name, setName] = useState("");
  const titleRef = useRef<HTMLHeadingElement>(null);
  const skill = (id: string) => {
    const s = getSkill(id);
    return s ? label(s.label, language) : id;
  };
  const role = (id: string) => {
    const r = getRole(id);
    return r ? label(r.label, language) : id;
  };
  const level = (n: number) => {
    const l = careerModel.taxonomy.levels.find((x) => x.level === n);
    return l ? label(l.label, language) : String(n);
  };
  const typeName = (type: ActionType) =>
    ({ Module: t.typeModule, Project: t.typeProject, Certification: t.typeCertification, Resource: t.typeResource })[type];

  useEffect(() => {
    titleRef.current?.focus();
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  const score = Math.round(readiness.score);
  const band = readinessBand(readiness.score);
  const bandLabel = band === "strong" ? t.bandStrong : band === "developing" ? t.bandDeveloping : t.bandEarly;
  const bandMsg = band === "strong" ? t.heroStrong : band === "developing" ? t.heroDeveloping : t.heroEarly;
  const topContrib = [...readiness.contributions].filter((c) => c.points > 0).sort((a, b) => b.points - a.points).slice(0, 2);
  const topRoles = result.roles.slice(0, 3);
  const profile = getRole(roleId);
  const chartSkills = (profile?.skills ?? []).slice(0, MAX_CHART_SKILLS);
  const date = (now ?? new Date()).toLocaleDateString(LOCALE[language], { year: "numeric", month: "long", day: "numeric" });
  const shownJobs = jobs ? (jobs.real.length ? jobs.real.slice(0, 3) : jobs.demo.slice(0, 3)) : [];
  const role0 = role(roleId);

  return (
    <div id={ROOT_ID} role="dialog" aria-modal="true" aria-labelledby={`${uid}-title`} data-testid="c3-report">
      <style>{PRINT_CSS}</style>
      <div className="c3-report-page text-[10.5pt] leading-relaxed">
        {/* screen-only controls */}
        <div className="c3-no-print mb-6 rounded-xl border border-slate-200 bg-slate-50 p-4 text-sm">
          <label htmlFor={`${uid}-name`} className="block font-medium text-slate-700">
            {t.rpNameLabel}
          </label>
          <input
            id={`${uid}-name`}
            value={name}
            onChange={(e) => setName(e.target.value)}
            maxLength={80}
            autoComplete="off"
            className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm"
          />
          <p className="mt-2 text-xs text-slate-500">{t.rpHowTo}</p>
          <div className="mt-3 flex gap-2">
            <button type="button" onClick={() => window.print()} className="rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-white">
              {t.rpPrint}
            </button>
            <button type="button" onClick={onClose} className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-semibold">
              {t.rpClose}
            </button>
          </div>
        </div>

        {/* 1. title and metadata */}
        <header className="border-b-2 border-slate-800 pb-3">
          <h1 id={`${uid}-title`} ref={titleRef} tabIndex={-1} className="text-2xl font-bold outline-none">
            {t.rpTitle}
          </h1>
          {name.trim() ? (
            <p data-testid="c3-report-name" className="mt-1 font-medium">
              {fmt(t.rpPreparedFor, { name: name.trim() })}
            </p>
          ) : null}
          <p className="mt-1 text-xs text-slate-600">{fmt(t.rpMeta, { date, lang: t.rpLangName, model: result.modelVersion })}</p>
          <p className="mt-1 text-xs font-medium text-slate-700">{t.rpSynthetic}</p>
        </header>

        {/* 2. main role */}
        <section className="c3-avoid-break mt-5 flex items-center gap-5" data-testid="c3-report-main">
          <ScoreRing score={score} />
          <div>
            <h2 className="text-lg font-semibold">{fmt(t.rpMainRole, { role: role0 })}</h2>
            <p className="text-2xl font-bold">
              {score}/100 <span className="ml-1 rounded border border-slate-700 px-2 py-0.5 text-xs font-semibold align-middle">{bandLabel}</span>
            </p>
            <p className="mt-1 text-sm">{bandMsg}</p>
            {topContrib.length ? <p className="mt-1 text-sm">{fmt(t.rpReason, { skills: topContrib.map((c) => skill(c.skillId)).join(", ") })}</p> : null}
          </div>
        </section>

        {/* 3. chart 1: top 3 roles */}
        <section className="c3-avoid-break mt-6">
          <h3 className="mb-2 font-semibold">{t.rpTopRoles}</h3>
          <TopRolesChart roles={topRoles.map((r) => ({ id: r.roleId, name: role(r.roleId), score: Math.round(r.score) }))} selected={roleId} />
        </section>

        {/* 4. chart 2: student level vs required level */}
        <section className="c3-avoid-break mt-6">
          <h3 className="mb-2 font-semibold">{fmt(t.rpSkillsChart, { role: role0 })}</h3>
          <SkillLevelChart
            rows={chartSkills.map((s) => ({
              id: s.skillId,
              name: skill(s.skillId),
              you: result.levels[s.skillId] ?? 0,
              needed: s.requiredLevel,
              youText: fmt(t.rpYou, { level: level(result.levels[s.skillId] ?? 0) }),
              neededText: fmt(t.rpNeeded, { level: level(s.requiredLevel) })
            }))}
          />
          <p className="mt-1 text-xs text-slate-600">{t.rpLegend}</p>
        </section>

        {/* 5. top gaps */}
        <section className="c3-page-break mt-6" data-testid="c3-report-gaps">
          <h3 className="mb-2 font-semibold">{t.rpGaps}</h3>
          {gaps.length === 0 ? (
            <p className="text-sm">{t.rpNoGaps}</p>
          ) : (
            <ol className="list-decimal space-y-1.5 pl-5 text-sm">
              {gaps.slice(0, 5).map((g) => {
                const tf = profile?.skills.find((s) => s.skillId === g.skillId)?.tf ?? 0;
                return (
                  <li key={g.skillId} className="c3-avoid-break">
                    <span className="font-medium">{fmt(t.levelArrow, { skill: skill(g.skillId), from: level(g.level), to: level(g.requiredLevel) })}</span>
                    {" - "}
                    {fmt(t.gapGain, { points: (Math.round(g.gainToRequired * 10) / 10).toFixed(1), level: level(g.requiredLevel) })}
                    <br />
                    <span className="text-xs text-slate-600">{fmt(t.gapEvidence, { pct: Math.round(tf * 100), role: role0 })}</span>
                  </li>
                );
              })}
            </ol>
          )}
        </section>

        {/* 6. plan */}
        {plan.steps.length ? (
          <section className="mt-6" data-testid="c3-report-plan">
            <h3 className="mb-1 font-semibold">{t.rpPlan}</h3>
            <p className="mb-2 text-sm">
              {fmt(t.planSummary, { n: plan.steps.length, hours: plan.totalEffortHours, from: Math.round(plan.readiness), to: Math.round(plan.projectedReadiness) })}
            </p>
            <ol className="space-y-1 text-sm">
              {plan.steps.map((s) => (
                <li key={s.actionId} className="c3-avoid-break">
                  {fmt(t.rpStep, { n: s.order, title: s.action.title, type: typeName(s.actionType), hours: s.effortHours })}
                  <span className="text-xs text-slate-600"> ({fmt(t.levelArrow, { skill: skill(s.skillId), from: level(s.fromLevel), to: level(s.toLevel) })})</span>
                </li>
              ))}
            </ol>
          </section>
        ) : null}

        {/* 7. jobs (only if already loaded; the report never fetches) */}
        {shownJobs.length ? (
          <section className="c3-avoid-break mt-6" data-testid="c3-report-jobs">
            <h3 className="mb-2 font-semibold">{fmt(t.rpJobs, { role: role0 })}</h3>
            <ul className="space-y-1.5 text-sm">
              {shownJobs.map((m) => (
                <li key={m.job._id}>
                  <span className="font-medium">{m.job.title}</span>
                  {m.job.company ? ` - ${m.job.company}` : ""} · {fmt(t.jfMatch, { n: m.matchPercent })}
                  {m.isDemo ? <span data-testid="c3-report-demo" className="ml-1 rounded border border-slate-600 px-1 text-xs">{t.jfDemoBadge}</span> : null}
                  {m.missingSkills.length ? (
                    <span className="block text-xs text-slate-600">
                      {fmt(t.jmMissingShort, { skills: m.missingSkills.slice(0, 3).map((x) => skill(x.skillId)).join(", ") })}
                    </span>
                  ) : null}
                </li>
              ))}
            </ul>
          </section>
        ) : null}

        {/* 8. footer */}
        <footer className="mt-8 border-t border-slate-400 pt-2 text-xs text-slate-700" data-testid="c3-report-footer">
          {t.rpFooter}
        </footer>
      </div>
    </div>
  );
}

/** Readiness ring: dark arc on a light track, with the number in the middle (readable in black and white). */
function ScoreRing({ score }: { score: number }) {
  const r = 38;
  const c = 2 * Math.PI * r;
  return (
    <svg width="96" height="96" viewBox="0 0 96 96" role="img" aria-label={`${score}/100`}>
      <circle cx="48" cy="48" r={r} fill="none" stroke="#d1d5db" strokeWidth="10" />
      <circle cx="48" cy="48" r={r} fill="none" stroke="#1f2937" strokeWidth="10" strokeDasharray={`${(c * score) / 100} ${c}`} transform="rotate(-90 48 48)" />
      <text x="48" y="54" textAnchor="middle" fontSize="20" fontWeight="700" fill="#111827">
        {score}
      </text>
    </svg>
  );
}

function TopRolesChart({ roles, selected }: { roles: Array<{ id: string; name: string; score: number }>; selected: string }) {
  const rowH = 26;
  const labelW = 210;
  const barW = 330;
  return (
    <svg width="100%" viewBox={`0 0 ${labelW + barW + 60} ${roles.length * rowH + 6}`} role="img" aria-label={roles.map((r) => `${r.name} ${r.score}/100`).join(", ")} data-testid="c3-report-chart-roles">
      {roles.map((r, i) => {
        const y = i * rowH + 3;
        return (
          <g key={r.id}>
            <text x="0" y={y + 15} fontSize="11" fontWeight={r.id === selected ? 700 : 400} fill="#111827">
              {r.name}
            </text>
            <rect x={labelW} y={y + 3} width={barW} height="16" fill="none" stroke="#9ca3af" />
            <rect x={labelW} y={y + 3} width={(barW * r.score) / 100} height="16" fill={r.id === selected ? "#111827" : "#6b7280"} />
            <text x={labelW + barW + 6} y={y + 15} fontSize="11" fill="#111827">
              {r.score}/100
            </text>
          </g>
        );
      })}
    </svg>
  );
}

function SkillLevelChart({ rows }: { rows: Array<{ id: string; name: string; you: number; needed: number; youText: string; neededText: string }> }) {
  const rowH = 30;
  const labelW = 200;
  const unit = 70; // px per level, 0-3
  const textX = labelW + unit * 3 + 10;
  const pid = useId().replace(/:/g, "");
  return (
    <svg width="100%" viewBox={`0 0 ${textX + 210} ${rows.length * rowH + 22}`} role="img" aria-label={rows.map((r) => `${r.name}: ${r.youText}, ${r.neededText}`).join("; ")} data-testid="c3-report-chart-skills">
      <defs>
        <pattern id={`hatch-${pid}`} width="5" height="5" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
          <line x1="0" y1="0" x2="0" y2="5" stroke="#374151" strokeWidth="1.2" />
        </pattern>
      </defs>
      {[0, 1, 2, 3].map((n) => (
        <g key={n}>
          <line x1={labelW + n * unit} y1="0" x2={labelW + n * unit} y2={rows.length * rowH} stroke="#e5e7eb" />
          <text x={labelW + n * unit} y={rows.length * rowH + 14} fontSize="9" textAnchor="middle" fill="#374151">
            {n}
          </text>
        </g>
      ))}
      {rows.map((r, i) => {
        const y = i * rowH;
        return (
          <g key={r.id}>
            <text x="0" y={y + 18} fontSize="10.5" fill="#111827">
              {r.name.length > 34 ? `${r.name.slice(0, 33)}…` : r.name}
            </text>
            <rect x={labelW} y={y + 5} width={Math.max(r.needed * unit, 0)} height="9" fill={`url(#hatch-${pid})`} stroke="#374151" />
            <rect x={labelW} y={y + 16} width={Math.max(r.you * unit, 2)} height="9" fill="#111827" />
            <text x={textX} y={y + 18} fontSize="9.5" fill="#111827">
              {r.youText} · {r.neededText}
            </text>
          </g>
        );
      })}
    </svg>
  );
}
