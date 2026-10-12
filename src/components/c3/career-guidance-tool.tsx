"use client";

import { FormEvent, useEffect, useId, useMemo, useState } from "react";
import { Button } from "@/components/shared/Button";
import { Card } from "@/components/shared/Card";
import { useLanguage, type Language } from "@/context/language-context";
import { assessCareer, type CareerAssessment, type SkillSource } from "@/lib/c3/assessment";
import { extractSkills } from "@/lib/c3/extract";
import { proposedGaps, type SkillGap } from "@/lib/c3/gaps";
import { planForRole, type GapToActionPlan, type StepReason } from "@/lib/c3/graph";
import { fmt, getC3Text, label, type C3Text } from "@/lib/c3/i18n";
import { careerModel, getRole, getSkill, type ActionType, type RoleProfile } from "@/lib/c3/model";
import { proposedReadiness, readinessBand, type RoleReadiness, type SkillLevels } from "@/lib/c3/readiness";
import type { CareerProfile } from "@/lib/c3/validation";

const ring = "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-1";

const EXAMPLE: CareerProfile = {
  yearOfStudy: 3,
  targetRoleIds: ["qa_engineer", "business_analyst"],
  skills: {
    prog_oop: 2, databases_sql: 1, communication: 2, problem_solving: 1, version_control: 1, testing_manual: 2,
    test_automation: 1, agile: 1, business_analysis: 1, frontend: 1, javascript_ts: 1
  }
};

type Ctx = { t: C3Text; language: Language };

const skillName = (id: string, language: Language) => {
  const s = getSkill(id);
  return s ? label(s.label, language) : id;
};
const roleName = (id: string, language: Language) => {
  const r = getRole(id);
  return r ? label(r.label, language) : id;
};
const levelName = (level: number, language: Language) => {
  const l = careerModel.taxonomy.levels.find((x) => x.level === level);
  return l ? label(l.label, language) : String(level);
};
const one = (x: number) => (Math.round(x * 10) / 10).toFixed(1);
const pct = (x: number) => Math.round(x * 100);

function typeName(type: ActionType, t: C3Text) {
  return { Module: t.typeModule, Project: t.typeProject, Certification: t.typeCertification, Resource: t.typeResource }[type];
}

function reasonText(r: StepReason, roleId: string, { t, language }: Ctx): string {
  switch (r.code) {
    case "gap":
      return fmt(t.reasonGap, {
        role: roleName(roleId, language),
        required: levelName(r.requiredLevel, language),
        skill: skillName(r.skillId, language),
        level: levelName(r.level, language)
      });
    case "adEvidence":
      return fmt(t.reasonAdEvidence, { skill: skillName(r.skillId, language), pct: pct(r.adShare), n: r.adCount, role: roleName(roleId, language) });
    case "gain":
      return fmt(t.reasonGain, { points: one(r.points) });
    case "efficiency":
      return r.alternatives > 0
        ? fmt(t.reasonEfficiency, { k: r.alternatives + 1, hours: r.effortHours })
        : fmt(t.reasonOnlyOption, { hours: r.effortHours });
    case "prerequisite":
      return fmt(t.reasonPrerequisite, { skill: skillName(r.skillId, language), forSkill: skillName(r.forSkillId, language) });
    case "proof":
      return fmt(t.reasonProof, { type: typeName(r.actionType, t).toLowerCase() });
  }
}

const bandStyle = {
  strong: "bg-emerald-500",
  developing: "bg-amber-500",
  early: "bg-slate-400"
} as const;

type ToolProps = {
  initialProfile?: CareerProfile | null;
  /** Show the optional CV-text step (feature flag; off by default). */
  cvEnabled?: boolean;
  /** Called after each analysis with the answers (CV-found skills folded in) and the result. */
  onResult?: (profile: CareerProfile, assessment: CareerAssessment) => void;
};

export function CareerGuidanceTool({ initialProfile, cvEnabled = false, onResult }: ToolProps) {
  const { language } = useLanguage();
  const t = getC3Text(language);
  const ctx: Ctx = { t, language };
  const uid = useId();
  const [year, setYear] = useState<3 | 4>(3);
  const [targets, setTargets] = useState<string[]>([]);
  const [skills, setSkills] = useState<SkillLevels>({});
  const [targetError, setTargetError] = useState(false);
  const [cvConsent, setCvConsent] = useState(false);
  const [cvText, setCvText] = useState("");
  const [cv, setCv] = useState<{ skillIds: string[]; redacted: number } | null>(null);
  const [result, setResult] = useState<CareerAssessment | null>(null);
  const [selected, setSelected] = useState<string | null>(null);

  function load(profile: CareerProfile) {
    setYear(profile.yearOfStudy);
    setTargets(profile.targetRoleIds);
    setSkills(profile.skills);
    setTargetError(false);
  }

  useEffect(() => {
    if (initialProfile) load(initialProfile);
  }, [initialProfile]);

  function toggleTarget(id: string) {
    setTargets((cur) => (cur.includes(id) ? cur.filter((x) => x !== id) : cur.length >= 3 ? cur : [...cur, id]));
  }

  function runCv() {
    if (!cvConsent || !cvText.trim()) return;
    const ext = extractSkills(cvText);
    setCv({ skillIds: ext.skills.map((s) => s.skillId), redacted: Object.values(ext.redactions).reduce((a, b) => a + b, 0) });
  }

  function clearAll() {
    setTargets([]);
    setSkills({});
    setCvText("");
    setCv(null);
    setCvConsent(false);
    setResult(null);
    setSelected(null);
  }

  function analyse(e: FormEvent) {
    e.preventDefault();
    if (targets.length < 1 || targets.length > 3) {
      setTargetError(true);
      return;
    }
    setTargetError(false);
    const answers = Object.fromEntries(Object.entries(skills).filter(([, v]) => v > 0));
    const profile: CareerProfile = { yearOfStudy: year, targetRoleIds: targets, skills: answers };
    const res = assessCareer(profile, cv?.skillIds ?? []);
    setResult(res);
    setSelected(targets[0]);
    const merged = Object.fromEntries(Object.entries(res.levels).filter(([, v]) => v > 0));
    onResult?.({ ...profile, skills: merged }, res);
  }

  return (
    <div className="space-y-6">
      <div className="space-y-2 rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900 dark:border-amber-900 dark:bg-amber-950/40 dark:text-amber-100">
        <p>{t.guidanceNote}</p>
        <p>{t.syntheticNote}</p>
        <p className="text-amber-800/80 dark:text-amber-200/80">{t.privacyNote}</p>
      </div>

      <form onSubmit={analyse} className="space-y-6" noValidate>
        <Card>
          <h3 className="text-base font-semibold">{t.sectionAbout}</h3>
          <div className="mt-3 max-w-xs">
            <label htmlFor={`${uid}-year`} className="mb-1 block text-sm font-medium text-slate-700 dark:text-slate-200">
              {t.yearOfStudy}
            </label>
            <select
              id={`${uid}-year`}
              value={year}
              onChange={(e) => setYear(Number(e.target.value) === 4 ? 4 : 3)}
              className={`w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-900 ${ring}`}
            >
              <option value={3}>{t.year3}</option>
              <option value={4}>{t.year4}</option>
            </select>
          </div>
          <fieldset className="mt-4" aria-describedby={targetError ? `${uid}-target-error` : undefined}>
            <legend className="mb-2 text-sm font-medium text-slate-700 dark:text-slate-200">{t.targetRoles}</legend>
            <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
              {careerModel.roles.map((r) => {
                const checked = targets.includes(r.id);
                return (
                  <label key={r.id} className="flex items-center gap-2 text-sm">
                    <input
                      type="checkbox"
                      checked={checked}
                      disabled={!checked && targets.length >= 3}
                      onChange={() => toggleTarget(r.id)}
                      className={`h-4 w-4 rounded border-slate-300 text-primary ${ring}`}
                    />
                    <span>{label(r.label, language)}</span>
                  </label>
                );
              })}
            </div>
            {targetError ? (
              <p id={`${uid}-target-error`} role="alert" className="mt-2 text-xs font-medium text-red-600">
                ▲ {t.targetError}
              </p>
            ) : null}
          </fieldset>
        </Card>

        <Card>
          <h3 className="text-base font-semibold">{t.sectionSkills}</h3>
          <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">{t.skillsHint}</p>
          <div className="mt-4 space-y-5">
            {careerModel.taxonomy.areas.map((area) => (
              <fieldset key={area.id}>
                <legend className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500">{label(area.label, language)}</legend>
                <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                  {careerModel.taxonomy.skills
                    .filter((s) => s.area === area.id)
                    .map((s) => (
                      <div key={s.id}>
                        <label htmlFor={`${uid}-skill-${s.id}`} className="mb-1 block text-sm text-slate-700 dark:text-slate-200">
                          {label(s.label, language)}
                        </label>
                        <select
                          id={`${uid}-skill-${s.id}`}
                          value={skills[s.id] ?? 0}
                          onChange={(e) => setSkills((cur) => ({ ...cur, [s.id]: Number(e.target.value) }))}
                          className={`w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-900 ${ring}`}
                        >
                          {careerModel.taxonomy.levels.map((lv) => (
                            <option key={lv.level} value={lv.level}>
                              {lv.level} - {label(lv.label, language)}
                            </option>
                          ))}
                        </select>
                      </div>
                    ))}
                </div>
              </fieldset>
            ))}
          </div>
        </Card>

        {cvEnabled ? (
          <Card>
            <h3 className="text-base font-semibold">{t.cvTitle}</h3>
            <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">{t.cvBody}</p>
            <label className="mt-3 flex items-start gap-2 text-sm">
              <input
                type="checkbox"
                checked={cvConsent}
                onChange={(e) => {
                  setCvConsent(e.target.checked);
                  if (!e.target.checked) {
                    setCvText("");
                    setCv(null);
                  }
                }}
                className={`mt-0.5 h-4 w-4 rounded border-slate-300 text-primary ${ring}`}
              />
              <span>{t.cvConsent}</span>
            </label>
            <label htmlFor={`${uid}-cv`} className="mb-1 mt-3 block text-sm font-medium text-slate-700 dark:text-slate-200">
              {t.cvLabel}
            </label>
            <textarea
              id={`${uid}-cv`}
              value={cvText}
              onChange={(e) => setCvText(e.target.value)}
              disabled={!cvConsent}
              rows={6}
              maxLength={20_000}
              autoComplete="off"
              className={`w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm disabled:opacity-50 dark:border-slate-700 dark:bg-slate-900 ${ring}`}
            />
            <Button type="button" variant="secondary" onClick={runCv} disabled={!cvConsent || !cvText.trim()} className="mt-3 disabled:opacity-50">
              {t.cvAnalyse}
            </Button>
            {cv ? (
              <div data-testid="c3-cv-found" className="mt-3 text-sm">
                <p className="text-slate-600 dark:text-slate-300">{fmt(t.cvRedacted, { n: cv.redacted })}</p>
                <p className="mt-1 font-medium">{cv.skillIds.length ? t.cvFound : t.cvNone}</p>
                <p className="mt-1">{cv.skillIds.map((id) => skillName(id, language)).join(", ")}</p>
              </div>
            ) : null}
          </Card>
        ) : null}

        <div className="flex flex-wrap gap-3">
          <Button type="submit">{t.analyse}</Button>
          <Button type="button" variant="secondary" onClick={() => load(EXAMPLE)}>
            {t.loadExample}
          </Button>
          <Button type="button" variant="ghost" onClick={clearAll}>
            {t.clear}
          </Button>
        </div>
      </form>

      {result ? (
        <Results result={result} selected={selected} onSelect={setSelected} targets={targets} ctx={ctx} />
      ) : null}
    </div>
  );
}

function Results({
  result,
  selected,
  onSelect,
  targets,
  ctx
}: {
  result: CareerAssessment;
  selected: string | null;
  onSelect: (id: string) => void;
  targets: string[];
  ctx: Ctx;
}) {
  const { t, language } = ctx;
  const baseline = new Map(result.baselineRoles.map((b) => [b.roleId, b.score]));
  const detail = useMemo(() => {
    if (!selected) return null;
    const fromTarget = result.targets.find((x) => x.roleId === selected);
    if (fromTarget) return fromTarget;
    const role = getRole(selected) as RoleProfile;
    return { roleId: selected, readiness: proposedReadiness(result.levels, role), gaps: proposedGaps(result.levels, role).slice(0, 8), plan: planForRole(result.levels, role) };
  }, [result, selected]);

  return (
    <section data-testid="c3-results" className="space-y-6" aria-live="polite">
      <Card>
        <h3 className="text-base font-semibold">{t.resultsTitle}</h3>
        <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">{t.resultsHint}</p>
        <ul className="mt-4 space-y-2">
          {result.roles.map((r) => {
            const band = readinessBand(r.score);
            const isTarget = targets.includes(r.roleId);
            return (
              <li key={r.roleId}>
                <button
                  type="button"
                  data-testid={`c3-role-${r.roleId}`}
                  aria-pressed={selected === r.roleId}
                  onClick={() => onSelect(r.roleId)}
                  className={`w-full rounded-xl border px-3 py-2 text-left transition ${ring} ${
                    selected === r.roleId
                      ? "border-primary bg-primary/5"
                      : "border-slate-200 hover:bg-slate-50 dark:border-slate-800 dark:hover:bg-slate-800/50"
                  }`}
                >
                  <div className="flex flex-wrap items-center justify-between gap-2 text-sm">
                    <span className="font-medium">
                      {roleName(r.roleId, language)}
                      {isTarget ? (
                        <span className="ml-2 rounded-full bg-primary/10 px-2 py-0.5 text-xs text-primary">{t.targetTag}</span>
                      ) : null}
                    </span>
                    <span>
                      <span data-testid={`c3-score-${r.roleId}`} className="font-semibold">
                        {Math.round(r.score)}
                      </span>
                      <span className="text-slate-500">/100 · {band === "strong" ? t.bandStrong : band === "developing" ? t.bandDeveloping : t.bandEarly}</span>
                    </span>
                  </div>
                  <div className="mt-1.5 h-2 w-full overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800" aria-hidden="true">
                    <div className={`h-full ${bandStyle[band]}`} style={{ width: `${Math.max(2, r.score)}%` }} />
                  </div>
                  <p className="mt-1 text-xs text-slate-500" title={t.baselineHint}>
                    {fmt(t.baselineLabel, { n: Math.round(baseline.get(r.roleId) ?? 0) })}
                  </p>
                </button>
              </li>
            );
          })}
        </ul>
      </Card>

      {detail ? (
        <>
          <Breakdown readiness={detail.readiness} sources={result.sources} ctx={ctx} />
          <Gaps gaps={detail.gaps} roleId={detail.roleId} ctx={ctx} />
          <Plan plan={detail.plan} ctx={ctx} />
        </>
      ) : null}
    </section>
  );
}

function Breakdown({ readiness, sources, ctx }: { readiness: RoleReadiness; sources: Record<string, SkillSource>; ctx: Ctx }) {
  const { t, language } = ctx;
  const role = roleName(readiness.roleId, language);
  return (
    <Card>
      <h3 className="text-base font-semibold">{fmt(t.breakdownTitle, { role, score: Math.round(readiness.score) })}</h3>
      <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">{fmt(t.breakdownBody, { role })}</p>
      <div className="mt-4 overflow-x-auto">
        <table data-testid="c3-breakdown" className="w-full min-w-[34rem] text-left text-sm">
          <thead className="text-xs uppercase text-slate-500">
            <tr>
              <th className="py-2 pr-3">{t.colSkill}</th>
              <th className="py-2 pr-3">{t.colYou}</th>
              <th className="py-2 pr-3">{t.colNeeded}</th>
              <th className="py-2 pr-3">{t.colImportance}</th>
              <th className="py-2 text-right">{t.colPoints}</th>
            </tr>
          </thead>
          <tbody>
            {readiness.contributions.map((c) => (
              <tr key={c.skillId} className="border-t border-slate-100 dark:border-slate-800">
                <td className="py-2 pr-3">
                  {skillName(c.skillId, language)}
                  {sources[c.skillId] === "cv" ? <span className="ml-2 text-xs text-primary">({t.fromCv})</span> : null}
                </td>
                <td className="py-2 pr-3">{levelName(c.level, language)}</td>
                <td className="py-2 pr-3">{levelName(c.requiredLevel, language)}</td>
                <td className="py-2 pr-3">{pct(c.weight)}%</td>
                <td className={`py-2 text-right font-medium ${c.points < 0 ? "text-red-600" : "text-emerald-700 dark:text-emerald-400"}`}>
                  {c.points >= 0 ? "+" : ""}
                  {one(c.points)} / {one(c.maxPoints)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Card>
  );
}

function Gaps({ gaps, roleId, ctx }: { gaps: SkillGap[]; roleId: string; ctx: Ctx }) {
  const { t, language } = ctx;
  const role = getRole(roleId) as RoleProfile;
  return (
    <Card>
      <h3 className="text-base font-semibold">{t.gapsTitle}</h3>
      {gaps.length === 0 ? (
        <p className="mt-2 text-sm">{fmt(t.noGaps, { role: roleName(roleId, language) })}</p>
      ) : (
        <ol data-testid="c3-gaps" className="mt-3 space-y-2">
          {gaps.map((g) => {
            const tf = role.skills.find((s) => s.skillId === g.skillId)?.tf ?? 0;
            return (
              <li key={g.skillId} className="rounded-xl border border-slate-200 p-3 text-sm dark:border-slate-800">
                <div className="flex flex-wrap justify-between gap-2">
                  <span className="font-medium">
                    {fmt(t.levelArrow, { skill: skillName(g.skillId, language), from: levelName(g.level, language), to: levelName(g.requiredLevel, language) })}
                  </span>
                  <span className="font-semibold text-primary">
                    {fmt(t.gapGain, { points: one(g.gainToRequired), level: levelName(g.requiredLevel, language) })}
                  </span>
                </div>
                <p className="mt-1 text-xs text-slate-500">
                  {fmt(t.gapEvidence, { pct: pct(tf), role: roleName(roleId, language) })} · {fmt(t.gapNext, { points: one(g.gainNextLevel) })}
                </p>
              </li>
            );
          })}
        </ol>
      )}
    </Card>
  );
}

function Plan({ plan, ctx }: { plan: GapToActionPlan; ctx: Ctx }) {
  const { t, language } = ctx;
  return (
    <Card>
      <h3 className="text-base font-semibold">{t.planTitle}</h3>
      {plan.steps.length === 0 ? (
        <p className="mt-2 text-sm">{t.planEmpty}</p>
      ) : (
        <>
          <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">
            {fmt(t.planSummary, {
              n: plan.steps.length,
              hours: plan.totalEffortHours,
              from: Math.round(plan.readiness),
              to: Math.round(plan.projectedReadiness)
            })}
          </p>
          <ol data-testid="c3-plan" className="mt-4 space-y-3">
            {plan.steps.map((s) => (
              <li key={s.actionId} className="rounded-xl border border-slate-200 p-3 text-sm dark:border-slate-800">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs dark:bg-slate-800">
                    {s.order}. {typeName(s.actionType, t)}
                  </span>
                  {s.isPrerequisite ? (
                    <span className="rounded-full bg-amber-100 px-2 py-0.5 text-xs text-amber-800 dark:bg-amber-950 dark:text-amber-200">{t.doFirst}</span>
                  ) : null}
                  <span className="font-medium">
                    {s.action.url ? (
                      <a href={s.action.url} target="_blank" rel="noopener noreferrer" className={`underline ${ring}`}>
                        {s.action.title}
                      </a>
                    ) : (
                      s.action.title
                    )}
                  </span>
                </div>
                <p className="mt-1 text-xs text-slate-500">
                  {fmt(t.levelArrow, { skill: skillName(s.skillId, language), from: levelName(s.fromLevel, language), to: levelName(s.toLevel, language) })} ·{" "}
                  {fmt(t.hours, { n: s.effortHours })}
                  {s.gain > 0 ? ` · +${one(s.gain)}` : ""}
                </p>
                <details className="mt-2">
                  <summary className={`cursor-pointer text-xs font-medium text-primary ${ring}`}>{t.whyThis}</summary>
                  <ul className="mt-1 list-disc space-y-0.5 pl-5 text-xs text-slate-600 dark:text-slate-300">
                    {s.reasons.map((r, i) => (
                      <li key={i}>{reasonText(r, plan.roleId, ctx)}</li>
                    ))}
                  </ul>
                </details>
              </li>
            ))}
          </ol>
          {plan.unplannedGaps.length ? (
            <p className="mt-3 text-xs text-slate-500">
              {fmt(t.planUnplanned, { skills: plan.unplannedGaps.map((id) => skillName(id, language)).join(", ") })}
            </p>
          ) : null}
          <p className="mt-3 text-xs text-slate-500">
            {t.moduleNote} {t.effortNote}
          </p>
        </>
      )}
    </Card>
  );
}
