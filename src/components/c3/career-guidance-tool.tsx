"use client";

import { memo, useCallback, useEffect, useId, useMemo, useRef, useState, type ChangeEvent, type KeyboardEvent, type ReactNode } from "react";
import { Button } from "@/components/shared/Button";
import { Card } from "@/components/shared/Card";
import { useLanguage, type Language } from "@/context/language-context";
import { assessCareer, type CareerAssessment, type SkillSource } from "@/lib/c3/assessment";
import { CV_FILE_ACCEPT, CvFileError, readCvFile, type CvFileErrorCode } from "@/lib/c3/cv-file";
import { extractSkills } from "@/lib/c3/extract";
import { proposedGaps, type SkillGap } from "@/lib/c3/gaps";
import { planForRole, type GapToActionPlan, type StepReason } from "@/lib/c3/graph";
import { fmt, getC3Text, label, type C3Text } from "@/lib/c3/i18n";
import { careerModel, getRole, getSkill, type ActionType, type RoleProfile } from "@/lib/c3/model";
import { proposedReadiness, readinessBand, type RoleReadiness, type SkillLevels } from "@/lib/c3/readiness";
import {
  backgroundTips,
  backgroundTipText,
  commonRolesFor,
  orderRolesForSpecialisation,
  specialisationName
} from "@/lib/c3/specialisation-roles";
import { INTERNSHIP_STATUSES, PROJECT_COUNTS, SPECIALISATIONS, type Background, type CareerProfile } from "@/lib/c3/validation";

const ring = "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-1 dark:focus-visible:ring-offset-slate-900";

const EXAMPLE: CareerProfile = {
  yearOfStudy: 3,
  targetRoleIds: ["qa_engineer", "business_analyst"],
  skills: {
    prog_oop: 2, databases_sql: 1, communication: 2, problem_solving: 1, version_control: 1, testing_manual: 2,
    test_automation: 1, agile: 1, business_analysis: 1, frontend: 1, javascript_ts: 1
  }
};

/** Decorative icons for the role chips (aria-hidden; the role name is the label). */
const ROLE_ICONS: Record<string, string> = {
  software_engineer: "💻",
  frontend_engineer: "🖥️",
  mobile_developer: "📱",
  qa_engineer: "🧪",
  devops_engineer: "☁️",
  data_analyst: "📊",
  data_scientist: "🤖",
  business_analyst: "📋",
  ui_ux_designer: "🎨",
  network_engineer: "🌐",
  cybersecurity_analyst: "🛡️",
  project_coordinator: "🗂️"
};

/** One hue that deepens with the level: a higher level reads as "more". */
const LEVEL_ON = [
  "bg-slate-400 text-white border-slate-400 dark:bg-slate-500 dark:border-slate-500",
  "bg-sky-500 text-white border-sky-500",
  "bg-blue-600 text-white border-blue-600",
  "bg-indigo-700 text-white border-indigo-700 dark:bg-indigo-500 dark:border-indigo-500"
];
const LEVEL_DOT = ["bg-slate-400", "bg-sky-500", "bg-blue-600", "bg-indigo-700 dark:bg-indigo-500"];

const BAND = {
  strong: { bar: "bg-emerald-500", ring: "text-emerald-500", chip: "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/50 dark:text-emerald-200" },
  developing: { bar: "bg-amber-500", ring: "text-amber-500", chip: "bg-amber-100 text-amber-800 dark:bg-amber-900/50 dark:text-amber-200" },
  early: { bar: "bg-sky-500", ring: "text-sky-500", chip: "bg-sky-100 text-sky-800 dark:bg-sky-900/50 dark:text-sky-200" }
} as const;

const ACTION_STYLE: Record<ActionType, string> = {
  Module: "bg-blue-100 text-blue-800 dark:bg-blue-900/50 dark:text-blue-200",
  Project: "bg-violet-100 text-violet-800 dark:bg-violet-900/50 dark:text-violet-200",
  Certification: "bg-amber-100 text-amber-800 dark:bg-amber-900/50 dark:text-amber-200",
  Resource: "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/50 dark:text-emerald-200"
};
const ACTION_DOT: Record<ActionType, string> = {
  Module: "bg-blue-600",
  Project: "bg-violet-600",
  Certification: "bg-amber-500",
  Resource: "bg-emerald-600"
};

type Ctx = { t: C3Text; language: Language };
type StepId = "about" | "cv" | "skills" | "results";

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
const bandText = (score: number, t: C3Text) => {
  const b = readinessBand(score);
  return b === "strong" ? t.bandStrong : b === "developing" ? t.bandDeveloping : t.bandEarly;
};

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

type ToolProps = {
  initialProfile?: CareerProfile | null;
  /** Show the optional CV step. */
  cvEnabled?: boolean;
  /** Called after each analysis with the answers (CV-found skills folded in) and the result. */
  onResult?: (profile: CareerProfile, assessment: CareerAssessment) => void;
  /** Rendered directly under the results (the section's save / consent card). */
  resultsFooter?: ReactNode;
};

export function CareerGuidanceTool({ initialProfile, cvEnabled = false, onResult, resultsFooter }: ToolProps) {
  const { language } = useLanguage();
  const t = getC3Text(language);
  const ctx: Ctx = useMemo(() => ({ t, language }), [t, language]);
  const uid = useId();
  const [year, setYear] = useState<3 | 4>(3);
  const [background, setBackground] = useState<Background>({});
  const [targets, setTargets] = useState<string[]>([]);
  const [skills, setSkills] = useState<SkillLevels>({});
  const [targetError, setTargetError] = useState(false);
  const [cvConsent, setCvConsent] = useState(false);
  const [cvText, setCvText] = useState("");
  const [cv, setCv] = useState<{ skillIds: string[]; redacted: number } | null>(null);
  const [cvFile, setCvFile] = useState<
    { state: "reading" } | { state: "loaded"; name: string; truncated: boolean } | { state: "error"; code: CvFileErrorCode } | null
  >(null);
  const [result, setResult] = useState<CareerAssessment | null>(null);
  const [selected, setSelected] = useState<string | null>(null);
  const [researchView, setResearchView] = useState(false);
  const [openAreas, setOpenAreas] = useState<string[]>([careerModel.taxonomy.areas[0]?.id ?? ""]);

  const steps: StepId[] = cvEnabled ? ["about", "cv", "skills", "results"] : ["about", "skills", "results"];
  const [step, setStep] = useState<StepId>("about");
  const stepIndex = steps.indexOf(step);
  const headings = useRef<Partial<Record<StepId, HTMLHeadingElement | null>>>({});
  const focusOnStep = useRef(false);

  const cvSkills = useMemo(() => new Set(cv?.skillIds ?? []), [cv]);
  const rate = useCallback((skillId: string, level: number) => setSkills((cur) => ({ ...cur, [skillId]: level })), []);

  function goTo(next: StepId) {
    focusOnStep.current = true;
    setStep(next);
  }

  useEffect(() => {
    if (!focusOnStep.current) return;
    focusOnStep.current = false;
    const el = headings.current[step];
    el?.focus();
    el?.scrollIntoView?.({ behavior: "smooth", block: "start" });
  }, [step]);

  function load(profile: CareerProfile) {
    setYear(profile.yearOfStudy);
    setBackground(profile.background ?? {});
    setTargets(profile.targetRoleIds);
    setSkills(profile.skills);
    setTargetError(false);
  }

  useEffect(() => {
    if (initialProfile) {
      load(initialProfile);
      setStep("skills");
    }
  }, [initialProfile]);

  function toggleTarget(id: string) {
    setTargetError(false);
    setTargets((cur) => (cur.includes(id) ? cur.filter((x) => x !== id) : cur.length >= 3 ? cur : [...cur, id]));
  }

  function validTargets() {
    const ok = targets.length >= 1 && targets.length <= 3;
    setTargetError(!ok);
    return ok;
  }

  function nextFromAbout() {
    if (validTargets()) goTo(cvEnabled ? "cv" : "skills");
  }

  function runCv() {
    if (!cvConsent || !cvText.trim()) return;
    const ext = extractSkills(cvText);
    setCv({ skillIds: ext.skills.map((s) => s.skillId), redacted: Object.values(ext.redactions).reduce((a, b) => a + b, 0) });
  }

  async function onCvFile(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = ""; // the same file can be chosen again
    if (!file || !cvConsent) return;
    setCvFile({ state: "reading" });
    try {
      const { text, truncated } = await readCvFile(file);
      setCvText(text);
      setCv(null);
      setCvFile({ state: "loaded", name: file.name, truncated });
    } catch (err) {
      setCvFile({ state: "error", code: err instanceof CvFileError ? err.code : "read" });
    }
  }

  function clearAll() {
    setTargets([]);
    setBackground({});
    setSkills({});
    setCvText("");
    setCv(null);
    setCvFile(null);
    setCvConsent(false);
    setResult(null);
    setSelected(null);
    setTargetError(false);
    goTo("about");
  }

  function loadExample() {
    load(EXAMPLE);
    goTo("skills");
  }

  /**
   * The level shown for a skill. A skill found in the CV that the student has not rated
   * shows Basic, but it is NOT stored as a questionnaire answer: assessCareer() still
   * receives it only through the CV skill ids, exactly as before, so its source stays "cv".
   */
  const shownLevel = (id: string) => (skills[id] ?? 0) > 0 ? (skills[id] as number) : cvSkills.has(id) ? 1 : 0;

  function analyse() {
    if (!validTargets()) {
      goTo("about");
      return;
    }
    const answers = Object.fromEntries(Object.entries(skills).filter(([, v]) => v > 0));
    const chosen = Object.fromEntries(Object.entries(background).filter(([, v]) => v !== undefined)) as Background;
    const profile: CareerProfile = {
      yearOfStudy: year,
      targetRoleIds: targets,
      skills: answers,
      ...(Object.keys(chosen).length ? { background: chosen } : {})
    };
    const res = assessCareer(profile, cv?.skillIds ?? []);
    setResult(res);
    setSelected(targets[0]);
    const merged = Object.fromEntries(Object.entries(res.levels).filter(([, v]) => v > 0));
    onResult?.({ ...profile, skills: merged }, res);
    goTo("results");
  }

  /** Optional single-choice chips: click again to clear. A render function (not a component) so focus survives re-renders. */
  function chipGroup<K extends keyof Background>(field: K, groupLabel: string, options: ReadonlyArray<{ value: NonNullable<Background[K]>; text: string }>) {
    const id = `${uid}-bg-${String(field)}`;
    return (
      <div className="mt-4">
        <p id={id} className="mb-2 text-sm font-medium text-slate-700 dark:text-slate-200">
          {groupLabel}
        </p>
        <div role="radiogroup" aria-labelledby={id} className="flex flex-wrap gap-2">
          {options.map((o) => {
            const on = background[field] === o.value;
            return (
              <button
                key={String(o.value)}
                type="button"
                role="radio"
                aria-checked={on}
                onClick={() => setBackground((cur) => ({ ...cur, [field]: on ? undefined : o.value }))}
                className={`rounded-full border px-3 py-1.5 text-xs font-medium transition ${ring} ${
                  on
                    ? "border-violet-500 bg-violet-600 text-white shadow-sm dark:border-violet-400 dark:bg-violet-500"
                    : "border-slate-200 bg-white text-slate-700 hover:border-violet-300 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200"
                }`}
              >
                {o.text}
              </button>
            );
          })}
        </div>
      </div>
    );
  }

  const common = new Set(commonRolesFor(background.specialisation));
  const orderedRoles = orderRolesForSpecialisation(
    careerModel.roles.map((r) => r.id),
    background.specialisation
  ).map((id) => getRole(id) as RoleProfile);

  const headingProps = (id: StepId) => ({
    ref: (el: HTMLHeadingElement | null) => {
      headings.current[id] = el;
    },
    tabIndex: -1,
    className: "text-lg font-semibold focus:outline-none"
  });

  const stepTitle: Record<StepId, string> = { about: t.stepAbout, cv: t.stepCv, skills: t.stepSkills, results: t.stepResults };
  const reachable = (id: StepId) => (id === "results" ? result !== null : steps.indexOf(id) <= stepIndex || targets.length > 0);

  return (
    <div className="space-y-5">
      {/* One short, always-visible line keeps the essential caveats; the full text is one click away. */}
      <div className="rounded-2xl border border-indigo-100 bg-gradient-to-r from-indigo-50 via-sky-50 to-emerald-50 px-4 py-3 text-sm text-slate-700 dark:border-slate-700 dark:from-slate-800 dark:via-slate-800 dark:to-slate-800 dark:text-slate-200">
        <p className="flex items-start gap-2">
          <span aria-hidden="true">ℹ️</span>
          <span>{t.notesShort}</span>
        </p>
        <details className="mt-1 pl-6">
          <summary className={`cursor-pointer text-xs font-medium text-primary ${ring}`}>{t.moreInfo}</summary>
          <div className="mt-2 space-y-1.5 text-xs text-slate-600 dark:text-slate-300">
            <p>{t.guidanceNote}</p>
            <p>{t.syntheticNote}</p>
            <p>{t.privacyNote}</p>
          </div>
        </details>
      </div>

      {/* Progress */}
      <nav aria-label={t.stepsLabel} className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <p className="text-xs font-medium uppercase tracking-wide text-slate-500 dark:text-slate-400">
            {fmt(t.stepOf, { n: stepIndex + 1, total: steps.length })}
          </p>
          <div className="flex gap-2">
            <Button type="button" variant="secondary" onClick={loadExample} className="px-3 py-1.5 text-xs">
              {t.loadExample}
            </Button>
            <Button type="button" variant="ghost" onClick={clearAll} className="px-3 py-1.5 text-xs">
              {t.clear}
            </Button>
          </div>
        </div>
        <div
          className="mt-3 h-2 w-full overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800"
          role="progressbar"
          aria-label={t.stepsLabel}
          aria-valuemin={1}
          aria-valuemax={steps.length}
          aria-valuenow={stepIndex + 1}
          aria-valuetext={fmt(t.stepOf, { n: stepIndex + 1, total: steps.length })}
        >
          <div
            className="h-full rounded-full bg-gradient-to-r from-sky-500 via-indigo-500 to-violet-500 transition-all duration-500"
            style={{ width: `${((stepIndex + 1) / steps.length) * 100}%` }}
          />
        </div>
        <ol className="mt-3 grid gap-2" style={{ gridTemplateColumns: `repeat(${steps.length}, minmax(0, 1fr))` }}>
          {steps.map((id, i) => {
            const done = i < stepIndex || (id === "results" && result !== null && step === "results");
            const current = id === step;
            return (
              <li key={id}>
                <button
                  type="button"
                  disabled={!reachable(id)}
                  aria-current={current ? "step" : undefined}
                  onClick={() => (id === "results" || id === "about" || validTargets() ? goTo(id) : goTo("about"))}
                  className={`flex w-full items-center gap-2 rounded-xl px-2 py-1.5 text-left text-xs transition disabled:cursor-not-allowed disabled:opacity-50 ${ring} ${
                    current ? "bg-indigo-50 font-semibold text-indigo-700 dark:bg-indigo-950/60 dark:text-indigo-200" : "text-slate-600 hover:bg-slate-50 dark:text-slate-300 dark:hover:bg-slate-800"
                  }`}
                >
                  <span
                    aria-hidden="true"
                    className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-[11px] font-bold ${
                      current ? "bg-indigo-600 text-white" : done ? "bg-emerald-500 text-white" : "bg-slate-200 text-slate-600 dark:bg-slate-700 dark:text-slate-200"
                    }`}
                  >
                    {done && !current ? "✓" : i + 1}
                  </span>
                  <span className="hidden truncate sm:inline">{stepTitle[id]}</span>
                </button>
              </li>
            );
          })}
        </ol>
      </nav>

      {/* Step 1 - goals */}
      {step === "about" ? (
      <section aria-labelledby={`${uid}-h-about`}>
        <Card>
          <h3 id={`${uid}-h-about`} {...headingProps("about")}>
            {t.stepAbout}
          </h3>
          <div className="mt-4">
            <p id={`${uid}-year-label`} className="mb-2 text-sm font-medium text-slate-700 dark:text-slate-200">
              {t.yearOfStudy}
            </p>
            <div role="radiogroup" aria-labelledby={`${uid}-year-label`} className="inline-flex rounded-xl bg-slate-100 p-1 dark:bg-slate-800">
              {([3, 4] as const).map((y) => (
                <button
                  key={y}
                  type="button"
                  role="radio"
                  aria-checked={year === y}
                  onClick={() => setYear(y)}
                  className={`rounded-lg px-4 py-1.5 text-sm font-medium transition ${ring} ${
                    year === y ? "bg-white text-indigo-700 shadow-sm dark:bg-slate-900 dark:text-indigo-300" : "text-slate-600 dark:text-slate-300"
                  }`}
                >
                  {y === 3 ? t.year3 : t.year4}
                </button>
              ))}
            </div>
          </div>
          <div className="mt-5 rounded-2xl border border-violet-100 bg-violet-50/50 p-4 dark:border-violet-900/60 dark:bg-violet-950/20">
            <h4 className="text-sm font-semibold text-slate-800 dark:text-slate-100">{t.bgTitle}</h4>
            <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">{t.bgHint}</p>
            {chipGroup("specialisation", t.bgSpecialisation, SPECIALISATIONS.map((v) => ({ value: v, text: specialisationName(v, t) })))}
            {chipGroup(
              "internship",
              t.bgInternship,
              INTERNSHIP_STATUSES.map((v) => ({ value: v, text: { completed: t.intCompleted, doing: t.intDoing, notStarted: t.intNotStarted }[v] }))
            )}
            {chipGroup("projects", t.bgProjects, PROJECT_COUNTS.map((v) => ({ value: v, text: v })))}
          </div>
          <fieldset className="mt-5" aria-describedby={`${uid}-roles-help${targetError ? ` ${uid}-target-error` : ""}`}>
            <legend className="text-sm font-medium text-slate-700 dark:text-slate-200">{t.targetRoles}</legend>
            <p id={`${uid}-roles-help`} className="mt-1 text-xs text-slate-500 dark:text-slate-400">
              {t.rolesHelp} <span className="font-semibold text-indigo-600 dark:text-indigo-300">{fmt(t.rolesChosen, { n: targets.length })}</span>
            </p>
            <div className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-3">
              {orderedRoles.map((r) => {
                const checked = targets.includes(r.id);
                const order = targets.indexOf(r.id);
                const disabled = !checked && targets.length >= 3;
                const isCommon = common.has(r.id);
                return (
                  <button
                    key={r.id}
                    type="button"
                    role="checkbox"
                    aria-checked={checked}
                    aria-label={label(r.label, language)}
                    aria-describedby={isCommon ? `${uid}-common-badge` : undefined}
                    data-testid={`c3-role-chip-${r.id}`}
                    disabled={disabled}
                    onClick={() => toggleTarget(r.id)}
                    className={`flex items-center gap-2 rounded-xl border px-3 py-2.5 text-left text-sm transition disabled:cursor-not-allowed disabled:opacity-40 ${ring} ${
                      checked
                        ? "border-indigo-500 bg-indigo-50 text-indigo-900 shadow-sm dark:border-indigo-400 dark:bg-indigo-950/50 dark:text-indigo-100"
                        : "border-slate-200 bg-white hover:border-indigo-300 hover:bg-indigo-50/40 dark:border-slate-700 dark:bg-slate-900 dark:hover:border-indigo-500"
                    }`}
                  >
                    <span aria-hidden="true" className="text-lg leading-none">
                      {ROLE_ICONS[r.id] ?? "💼"}
                    </span>
                    <span className="flex-1">
                      {label(r.label, language)}
                      {isCommon ? (
                        <span className="mt-0.5 block text-[11px] font-medium text-violet-700 dark:text-violet-300">★ {t.commonBadge}</span>
                      ) : null}
                    </span>
                    {checked ? (
                      <span aria-hidden="true" className="flex h-5 w-5 items-center justify-center rounded-full bg-indigo-600 text-[11px] font-bold text-white">
                        {order + 1}
                      </span>
                    ) : null}
                  </button>
                );
              })}
            </div>
            {common.size ? (
              <span id={`${uid}-common-badge`} hidden>
                {t.commonBadge}
              </span>
            ) : null}
            {targetError ? (
              <p id={`${uid}-target-error`} role="alert" className="mt-3 text-sm font-medium text-red-600 dark:text-red-400">
                ▲ {t.targetError}
              </p>
            ) : null}
          </fieldset>
          <div className="mt-6 flex justify-end">
            <Button type="button" onClick={nextFromAbout}>
              {t.next} →
            </Button>
          </div>
        </Card>
      </section>
      ) : null}

      {/* Step 2 - optional CV */}
      {cvEnabled && step === "cv" ? (
        <section aria-labelledby={`${uid}-h-cv`}>
          <Card>
            <h3 id={`${uid}-h-cv`} {...headingProps("cv")}>
              {t.stepCv}
            </h3>
            <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">{t.cvStepIntro}</p>
            <div className="mt-4 rounded-2xl border border-dashed border-sky-300 bg-sky-50/50 p-4 dark:border-sky-800 dark:bg-sky-950/20">
              <h4 className="text-sm font-semibold">{t.cvTitle}</h4>
              <p className="mt-1 text-xs text-slate-600 dark:text-slate-300">{t.cvBody}</p>
              <label className="mt-3 flex items-start gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={cvConsent}
                  onChange={(e) => {
                    setCvConsent(e.target.checked);
                    if (!e.target.checked) {
                      setCvText("");
                      setCv(null);
                      setCvFile(null);
                    }
                  }}
                  className={`mt-0.5 h-4 w-4 rounded border-slate-300 text-primary ${ring}`}
                />
                <span>{t.cvConsent}</span>
              </label>
              <label htmlFor={`${uid}-cv-file`} className="mb-1 mt-4 block text-sm font-medium text-slate-700 dark:text-slate-200">
                {t.cvUpload}
              </label>
              <input
                id={`${uid}-cv-file`}
                type="file"
                accept={CV_FILE_ACCEPT}
                onChange={(e) => void onCvFile(e)}
                disabled={!cvConsent || cvFile?.state === "reading"}
                aria-describedby={`${uid}-cv-file-note`}
                className={`block w-full text-sm text-slate-600 file:mr-3 file:rounded-lg file:border-0 file:bg-sky-600 file:px-3 file:py-2 file:text-sm file:font-medium file:text-white hover:file:bg-sky-700 disabled:opacity-50 dark:text-slate-300 ${ring}`}
              />
              <p id={`${uid}-cv-file-note`} className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                {t.cvUploadNote}
              </p>
              {cvFile ? (
                <p
                  role={cvFile.state === "error" ? "alert" : "status"}
                  data-testid="c3-cv-file-status"
                  className={`mt-2 text-sm ${cvFile.state === "error" ? "text-red-600 dark:text-red-400" : "text-slate-600 dark:text-slate-300"}`}
                >
                  {cvFile.state === "reading" ? t.cvReading : null}
                  {cvFile.state === "loaded" ? fmt(t.cvFileLoaded, { name: cvFile.name }) : null}
                  {cvFile.state === "loaded" && cvFile.truncated ? ` ${t.cvTruncated}` : null}
                  {cvFile.state === "error"
                    ? { type: t.cvErrType, size: t.cvErrSize, empty: t.cvErrEmpty, read: t.cvErrRead }[cvFile.code]
                    : null}
                </p>
              ) : null}
              <label htmlFor={`${uid}-cv`} className="mb-1 mt-4 block text-sm font-medium text-slate-700 dark:text-slate-200">
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
                className={`w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm disabled:opacity-50 dark:border-slate-700 dark:bg-slate-900 ${ring}`}
              />
              <Button type="button" variant="secondary" onClick={runCv} disabled={!cvConsent || !cvText.trim()} className="mt-3 disabled:opacity-50">
                {t.cvAnalyse}
              </Button>
              {cv ? (
                <div data-testid="c3-cv-found" className="mt-4 rounded-xl bg-white p-3 text-sm shadow-sm dark:bg-slate-900">
                  <p className="text-slate-600 dark:text-slate-300">{fmt(t.cvRedacted, { n: cv.redacted })}</p>
                  <p className="mt-1 font-medium">{cv.skillIds.length ? t.cvFound : t.cvNone}</p>
                  <ul className="mt-2 flex flex-wrap gap-1.5">
                    {cv.skillIds.map((id) => (
                      <li key={id} className="rounded-full bg-sky-100 px-2.5 py-0.5 text-xs text-sky-800 dark:bg-sky-900/50 dark:text-sky-200">
                        {skillName(id, language)}
                      </li>
                    ))}
                  </ul>
                  {cv.skillIds.length ? <p className="mt-2 text-xs text-slate-500 dark:text-slate-400">{t.cvPrefilled}</p> : null}
                </div>
              ) : null}
            </div>
            <div className="mt-6 flex justify-between gap-3">
              <Button type="button" variant="ghost" onClick={() => goTo("about")}>
                ← {t.back}
              </Button>
              <Button type="button" onClick={() => goTo("skills")}>
                {t.next} →
              </Button>
            </div>
          </Card>
        </section>
      ) : null}

      {/* Step 3 - skills */}
      {step === "skills" ? (
      <section aria-labelledby={`${uid}-h-skills`}>
        <Card>
          <h3 id={`${uid}-h-skills`} {...headingProps("skills")}>
            {t.stepSkills}
          </h3>
          <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">{t.skillsHint}</p>
          <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
            <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-slate-600 dark:text-slate-300" aria-label={t.levelGuide}>
              {careerModel.taxonomy.levels.map((lv) => (
                <span key={lv.level} className="flex items-center gap-1.5">
                  <span aria-hidden="true" className={`h-2.5 w-2.5 rounded-full ${LEVEL_DOT[lv.level]}`} />
                  {lv.level} · {label(lv.label, language)}
                </span>
              ))}
            </div>
            <Button
              type="button"
              variant="ghost"
              className="px-3 py-1.5 text-xs"
              onClick={() => setOpenAreas((cur) => (cur.length === careerModel.taxonomy.areas.length ? [] : careerModel.taxonomy.areas.map((a) => a.id)))}
            >
              {openAreas.length === careerModel.taxonomy.areas.length ? t.closeAll : t.openAll}
            </Button>
          </div>
          <div className="mt-4 space-y-3">
            {careerModel.taxonomy.areas.map((area) => {
              const areaSkills = careerModel.taxonomy.skills.filter((s) => s.area === area.id);
              const rated = areaSkills.filter((s) => shownLevel(s.id) > 0).length;
              const open = openAreas.includes(area.id);
              const panelId = `${uid}-area-${area.id}`;
              return (
                <div key={area.id} className="overflow-hidden rounded-2xl border border-slate-200 dark:border-slate-800">
                  <h4>
                    <button
                      type="button"
                      aria-expanded={open}
                      aria-controls={panelId}
                      onClick={() => setOpenAreas((cur) => (cur.includes(area.id) ? cur.filter((x) => x !== area.id) : [...cur, area.id]))}
                      className={`flex w-full items-center justify-between gap-3 bg-slate-50 px-4 py-3 text-left text-sm font-semibold hover:bg-slate-100 dark:bg-slate-800/60 dark:hover:bg-slate-800 ${ring}`}
                    >
                      <span>{label(area.label, language)}</span>
                      <span className="flex items-center gap-2">
                        <span
                          className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                            rated === areaSkills.length
                              ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/50 dark:text-emerald-200"
                              : "bg-white text-slate-600 dark:bg-slate-900 dark:text-slate-300"
                          }`}
                        >
                          {fmt(t.rated, { x: rated, y: areaSkills.length })}
                        </span>
                        <span aria-hidden="true" className={`transition-transform ${open ? "rotate-180" : ""}`}>
                          ▾
                        </span>
                      </span>
                    </button>
                  </h4>
                  <div id={panelId} hidden={!open} className="divide-y divide-slate-100 dark:divide-slate-800">
                    {areaSkills.map((s) => (
                      <SkillRow
                        key={s.id}
                        id={`${uid}-skill-${s.id}`}
                        skillId={s.id}
                        name={label(s.label, language)}
                        value={shownLevel(s.id)}
                        fromCv={cvSkills.has(s.id) && !((skills[s.id] ?? 0) > 0)}
                        onRate={rate}
                        ctx={ctx}
                      />
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
          <div className="mt-6 flex flex-wrap justify-between gap-3">
            <Button type="button" variant="ghost" onClick={() => goTo(cvEnabled ? "cv" : "about")}>
              ← {t.back}
            </Button>
            <Button type="button" onClick={analyse} className="bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-700 hover:to-violet-700">
              {t.analyse}
            </Button>
          </div>
        </Card>
      </section>
      ) : null}

      {/* Step 4 - results */}
      {step === "results" ? (
      <section aria-labelledby={`${uid}-h-results`}>
        <h3 id={`${uid}-h-results`} {...headingProps("results")} className="sr-only">
          {t.stepResults}
        </h3>
        {result ? (
          <div className="space-y-5">
            <Results
              year={year}
              background={background}
              result={result}
              selected={selected}
              onSelect={setSelected}
              targets={targets}
              researchView={researchView}
              onResearchView={setResearchView}
              ctx={ctx}
            />
            {resultsFooter}
            <div className="flex justify-start">
              <Button type="button" variant="secondary" onClick={() => goTo("skills")}>
                ← {t.editAnswers}
              </Button>
            </div>
          </div>
        ) : null}
      </section>
      ) : null}
    </div>
  );
}

/** A 0-3 rating as a radio group: click, or use the arrow keys. Memoised: a click re-renders one row. */
const SkillRow = memo(function SkillRow({ id, skillId, name, value, fromCv, onRate, ctx }: {
  id: string;
  skillId: string;
  name: string;
  value: number;
  fromCv: boolean;
  onRate: (skillId: string, level: number) => void;
  ctx: Ctx;
}) {
  const { t, language } = ctx;
  const onChange = (v: number) => onRate(skillId, v);
  const levels = careerModel.taxonomy.levels;
  const buttons = useRef<Array<HTMLButtonElement | null>>([]);

  function onKey(e: KeyboardEvent<HTMLButtonElement>, level: number) {
    const max = levels.length - 1;
    let next: number | null = null;
    if (e.key === "ArrowRight" || e.key === "ArrowUp") next = Math.min(level + 1, max);
    if (e.key === "ArrowLeft" || e.key === "ArrowDown") next = Math.max(level - 1, 0);
    if (e.key === "Home") next = 0;
    if (e.key === "End") next = max;
    if (next === null) return;
    e.preventDefault();
    onChange(next);
    buttons.current[next]?.focus();
  }

  return (
    <div className="flex flex-col gap-2 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
      <p id={`${id}-label`} className="text-sm text-slate-800 dark:text-slate-100">
        {name}
        {fromCv ? (
          <span className="ml-2 rounded-full bg-sky-100 px-2 py-0.5 text-[11px] font-medium text-sky-800 dark:bg-sky-900/50 dark:text-sky-200">
            {t.cvBadge}
          </span>
        ) : null}
      </p>
      <div role="radiogroup" aria-labelledby={`${id}-label`} className="grid shrink-0 grid-cols-4 gap-1 rounded-xl bg-slate-100 p-1 dark:bg-slate-800 sm:w-[22rem]">
        {levels.map((lv) => {
          const on = value === lv.level;
          const levelLabel = `${lv.level} - ${label(lv.label, language)}`;
          return (
            <button
              key={lv.level}
              ref={(el) => {
                buttons.current[lv.level] = el;
              }}
              type="button"
              role="radio"
              aria-checked={on}
              aria-label={levelLabel}
              title={levelLabel}
              tabIndex={on ? 0 : -1}
              onClick={() => onChange(lv.level)}
              onKeyDown={(e) => onKey(e, lv.level)}
              className={`rounded-lg border px-0.5 py-1.5 text-center transition ${ring} ${
                on ? LEVEL_ON[lv.level] : "border-transparent text-slate-600 hover:bg-white dark:text-slate-300 dark:hover:bg-slate-900"
              }`}
            >
              <span className="block text-sm font-semibold leading-none">{lv.level}</span>
              <span className="mt-0.5 block truncate text-[10px] leading-tight tracking-tight opacity-90 sm:text-[11px] sm:tracking-normal">{label(lv.label, language)}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
});

function ScoreRing({ score, size = 112 }: { score: number; size?: number }) {
  const band = BAND[readinessBand(score)];
  const r = 42;
  const c = 2 * Math.PI * r;
  return (
    <svg width={size} height={size} viewBox="0 0 100 100" aria-hidden="true" className="shrink-0">
      <circle cx="50" cy="50" r={r} fill="none" strokeWidth="10" className="stroke-slate-100 dark:stroke-slate-800" />
      <circle
        cx="50"
        cy="50"
        r={r}
        fill="none"
        strokeWidth="10"
        strokeLinecap="round"
        stroke="currentColor"
        className={band.ring}
        strokeDasharray={`${(Math.max(score, 1) / 100) * c} ${c}`}
        transform="rotate(-90 50 50)"
      />
      <text x="50" y="55" textAnchor="middle" className="fill-slate-900 text-[22px] font-bold dark:fill-white">
        {Math.round(score)}
      </text>
    </svg>
  );
}

const Results = memo(function Results({
  year,
  background,
  result,
  selected,
  onSelect,
  targets,
  researchView,
  onResearchView,
  ctx
}: {
  year: 3 | 4;
  background: Background;
  result: CareerAssessment;
  selected: string | null;
  onSelect: (id: string) => void;
  targets: string[];
  researchView: boolean;
  onResearchView: (v: boolean) => void;
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
  const heroBand = detail ? readinessBand(detail.readiness.score) : "early";
  const heroMsg = heroBand === "strong" ? t.heroStrong : heroBand === "developing" ? t.heroDeveloping : t.heroEarly;

  return (
    <section data-testid="c3-results" className="space-y-5" aria-live="polite">
      {detail ? (
        <div className="overflow-hidden rounded-2xl bg-gradient-to-br from-indigo-600 via-blue-600 to-sky-500 p-5 text-white shadow-md">
          <div className="flex flex-col items-center gap-4 sm:flex-row">
            <div className="rounded-full bg-white p-1.5 shadow-inner dark:bg-slate-900">
              <ScoreRing score={detail.readiness.score} />
            </div>
            <div className="text-center sm:text-left">
              <p className="text-sm text-white/80">{fmt(t.heroTitle, { role: roleName(detail.roleId, language) })}</p>
              <p className="mt-1 text-3xl font-bold">
                {Math.round(detail.readiness.score)}
                <span className="text-lg font-medium text-white/80">/100</span>
              </p>
              <span className="mt-2 inline-block rounded-full bg-white/20 px-3 py-0.5 text-xs font-semibold">{bandText(detail.readiness.score, t)}</span>
              <p className="mt-2 max-w-md text-sm text-white/90">{heroMsg}</p>
            </div>
          </div>
          <p data-testid="c3-year-context" className="mt-4 rounded-xl bg-white/15 px-3 py-2 text-xs text-white">
            🎓 {year === 3 ? t.yearContext3 : t.yearContext4}
          </p>
        </div>
      ) : null}

      <Card>
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h3 className="text-base font-semibold">{t.resultsTitle}</h3>
            <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">{t.resultsHint}</p>
          </div>
          <div className="flex items-center gap-2 text-xs text-slate-600 dark:text-slate-300" title={t.researchHint}>
            <span>{t.researchView}</span>
            <button
              type="button"
              role="switch"
              aria-checked={researchView}
              aria-label={t.researchView}
              onClick={() => onResearchView(!researchView)}
              className={`relative h-5 w-9 rounded-full transition ${ring} ${researchView ? "bg-indigo-600" : "bg-slate-300 dark:bg-slate-600"}`}
            >
              <span className={`absolute top-0.5 h-4 w-4 rounded-full bg-white shadow transition-all ${researchView ? "left-[18px]" : "left-0.5"}`} />
            </button>
          </div>
        </div>
        {researchView ? <p className="mt-2 text-xs text-slate-500 dark:text-slate-400">{t.baselineHint}</p> : null}
        <ul className="mt-4 grid grid-cols-1 gap-2 md:grid-cols-2">
          {result.roles.map((r) => {
            const band = readinessBand(r.score);
            const isTarget = targets.includes(r.roleId);
            const active = selected === r.roleId;
            return (
              <li key={r.roleId}>
                <button
                  type="button"
                  data-testid={`c3-role-${r.roleId}`}
                  aria-pressed={active}
                  onClick={() => onSelect(r.roleId)}
                  className={`w-full rounded-xl border px-3 py-2.5 text-left transition ${ring} ${
                    active
                      ? "border-indigo-500 bg-indigo-50 shadow-sm dark:border-indigo-400 dark:bg-indigo-950/40"
                      : "border-slate-200 hover:border-indigo-300 hover:bg-slate-50 dark:border-slate-800 dark:hover:bg-slate-800/50"
                  }`}
                >
                  <div className="flex items-center justify-between gap-2 text-sm">
                    <span className="flex min-w-0 items-center gap-2 font-medium">
                      <span aria-hidden="true">{ROLE_ICONS[r.roleId] ?? "💼"}</span>
                      <span className="truncate">{roleName(r.roleId, language)}</span>
                      {isTarget ? (
                        <span className="shrink-0 rounded-full bg-indigo-100 px-2 py-0.5 text-[11px] text-indigo-700 dark:bg-indigo-900/60 dark:text-indigo-200">
                          {t.targetTag}
                        </span>
                      ) : null}
                    </span>
                    <span className="shrink-0">
                      <span data-testid={`c3-score-${r.roleId}`} className="font-semibold">
                        {Math.round(r.score)}
                      </span>
                      <span className="text-slate-500">/100</span>
                    </span>
                  </div>
                  <div className="mt-2 flex items-center gap-2">
                    <div className="h-2 flex-1 overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800" aria-hidden="true">
                      <div className={`h-full rounded-full ${BAND[band].bar}`} style={{ width: `${Math.max(2, r.score)}%` }} />
                    </div>
                    <span className={`shrink-0 rounded-full px-2 py-0.5 text-[11px] font-medium ${BAND[band].chip}`}>{bandText(r.score, t)}</span>
                  </div>
                  {researchView ? (
                    <p className="mt-1 text-xs text-slate-500" title={t.baselineHint}>
                      {fmt(t.baselineLabel, { n: Math.round(baseline.get(r.roleId) ?? 0) })}
                    </p>
                  ) : null}
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
          <BackgroundTips background={background} roleId={detail.roleId} topGapSkillId={detail.gaps[0]?.skillId ?? null} ctx={ctx} />
          <Plan plan={detail.plan} ctx={ctx} />
        </>
      ) : null}
    </section>
  );
});

/** Levels 1-3 as blocks: filled = you have it, amber = still needed, empty = not needed. */
function LevelBar({ you, needed, ctx }: { you: number; needed: number; ctx: Ctx }) {
  const { t, language } = ctx;
  const met = you >= needed;
  return (
    <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
      <div className="flex gap-1" aria-hidden="true">
        {[1, 2, 3].map((i) => (
          <span
            key={i}
            className={`h-2.5 w-6 rounded-sm ${
              i <= you ? (met ? "bg-emerald-500" : "bg-blue-600") : i <= needed ? "bg-amber-300 dark:bg-amber-600" : "bg-slate-100 dark:bg-slate-800"
            } ${i === needed ? "ring-2 ring-slate-400 ring-offset-1 dark:ring-slate-500 dark:ring-offset-slate-900" : ""}`}
          />
        ))}
      </div>
      <span className="text-xs text-slate-600 dark:text-slate-300">
        {levelName(you, language)} → {levelName(needed, language)}
        <span className="sr-only">
          {" "}
          ({t.levelYou}: {you}, {t.levelNeeded}: {needed})
        </span>
      </span>
    </div>
  );
}

function Breakdown({ readiness, sources, ctx }: { readiness: RoleReadiness; sources: Record<string, SkillSource>; ctx: Ctx }) {
  const { t, language } = ctx;
  const role = roleName(readiness.roleId, language);
  return (
    <Card>
      <h3 className="text-base font-semibold">{fmt(t.breakdownTitle, { role, score: Math.round(readiness.score) })}</h3>
      <div className="mt-4 overflow-x-auto">
        <table data-testid="c3-breakdown" className="w-full text-left text-sm sm:min-w-[22rem]">
          <thead className="text-xs uppercase text-slate-500">
            <tr>
              <th className="py-2 pr-3">{t.colSkill}</th>
              <th className="py-2 pr-3">{t.youNeeded}</th>
              <th className="py-2 text-right">{t.colPoints}</th>
            </tr>
          </thead>
          <tbody>
            {readiness.contributions.map((c) => (
              <tr key={c.skillId} className="border-t border-slate-100 dark:border-slate-800">
                <td className="py-2.5 pr-3">
                  {skillName(c.skillId, language)}
                  {sources[c.skillId] === "cv" ? (
                    <span className="ml-2 rounded-full bg-sky-100 px-2 py-0.5 text-[11px] text-sky-800 dark:bg-sky-900/50 dark:text-sky-200">{t.fromCv}</span>
                  ) : null}
                </td>
                <td className="py-2.5 pr-3">
                  <LevelBar you={c.level} needed={c.requiredLevel} ctx={ctx} />
                </td>
                <td className={`whitespace-nowrap py-2.5 text-right text-xs font-semibold tabular-nums ${c.points < 0 ? "text-red-600 dark:text-red-400" : "text-emerald-700 dark:text-emerald-400"}`}>
                  {fmt(t.ptsShort, { sign: c.points >= 0 ? "+" : "", points: one(c.points) })}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <details className="mt-4 rounded-xl bg-slate-50 p-3 dark:bg-slate-800/50">
        <summary className={`cursor-pointer text-sm font-medium text-primary ${ring}`}>{t.calcTitle}</summary>
        <p className="mt-2 text-sm text-slate-600 dark:text-slate-300">{fmt(t.breakdownBody, { role })}</p>
        <p className="mt-2 text-xs text-slate-600 dark:text-slate-300">{t.calcFormula}</p>
        <div className="mt-3 overflow-x-auto">
          <table className="w-full min-w-[22rem] text-left text-xs">
            <thead className="uppercase text-slate-500">
              <tr>
                <th className="py-1.5 pr-3">{t.colSkill}</th>
                <th className="py-1.5 pr-3">{t.colImportance}</th>
                <th className="py-1.5 text-right">{t.colPoints}</th>
              </tr>
            </thead>
            <tbody>
              {readiness.contributions.map((c) => (
                <tr key={c.skillId} className="border-t border-slate-200 dark:border-slate-700">
                  <td className="py-1.5 pr-3">{skillName(c.skillId, language)}</td>
                  <td className="py-1.5 pr-3">{pct(c.weight)}%</td>
                  <td className="py-1.5 text-right tabular-nums">
                    {c.points >= 0 ? "+" : ""}
                    {one(c.points)} / {one(c.maxPoints)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </details>
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
        <p className="mt-2 rounded-xl bg-emerald-50 p-3 text-sm text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-200">
          🎉 {fmt(t.noGaps, { role: roleName(roleId, language) })}
        </p>
      ) : (
        <ol data-testid="c3-gaps" className="mt-3 space-y-2">
          {gaps.map((g, i) => {
            const tf = role.skills.find((s) => s.skillId === g.skillId)?.tf ?? 0;
            return (
              <li key={g.skillId} className="rounded-xl border border-slate-200 border-l-4 border-l-amber-400 p-3 text-sm dark:border-slate-800 dark:border-l-amber-500">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <span className="flex items-center gap-2 font-medium">
                    <span aria-hidden="true" className="flex h-5 w-5 items-center justify-center rounded-full bg-amber-100 text-[11px] font-bold text-amber-800 dark:bg-amber-900/60 dark:text-amber-200">
                      {i + 1}
                    </span>
                    {fmt(t.levelArrow, { skill: skillName(g.skillId, language), from: levelName(g.level, language), to: levelName(g.requiredLevel, language) })}
                  </span>
                  <span className="rounded-full bg-emerald-100 px-2.5 py-0.5 text-xs font-semibold text-emerald-800 dark:bg-emerald-900/50 dark:text-emerald-200">
                    {fmt(t.gapGain, { points: one(g.gainToRequired), level: levelName(g.requiredLevel, language) })}
                  </span>
                </div>
                <p className="mt-1.5 text-xs text-slate-500 dark:text-slate-400">
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

/** Text tips from the academic background. Context only: the plan below is unchanged. */
function BackgroundTips({ background, roleId, topGapSkillId, ctx }: { background: Background; roleId: string; topGapSkillId: string | null; ctx: Ctx }) {
  const { t, language } = ctx;
  const tips = backgroundTips(background, roleId, topGapSkillId);
  if (tips.length === 0) return null;
  return (
    <section data-testid="c3-background-tips" className="rounded-2xl border border-violet-200 bg-gradient-to-br from-violet-50 to-indigo-50 p-4 dark:border-violet-900 dark:from-violet-950/40 dark:to-indigo-950/40">
      <h3 className="flex items-center gap-2 text-base font-semibold text-violet-900 dark:text-violet-100">
        <span aria-hidden="true">🎓</span>
        {t.bgTipsTitle}
      </h3>
      <ul className="mt-2 space-y-1.5 text-sm text-slate-700 dark:text-slate-200">
        {tips.map((tip) => (
          <li key={tip.code} className="flex gap-2">
            <span aria-hidden="true" className="text-violet-500">
              •
            </span>
            <span>{backgroundTipText(tip, t, language)}</span>
          </li>
        ))}
      </ul>
      <p className="mt-2 text-xs text-slate-500 dark:text-slate-400">{t.bgTipsNote}</p>
    </section>
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
          <div className="mt-3 flex flex-wrap items-center gap-3 rounded-xl bg-gradient-to-r from-emerald-50 to-sky-50 p-3 text-sm dark:from-emerald-950/30 dark:to-sky-950/30">
            <span className="text-2xl" aria-hidden="true">
              🚀
            </span>
            <p className="flex-1 text-slate-700 dark:text-slate-200">
              {fmt(t.planSummary, {
                n: plan.steps.length,
                hours: plan.totalEffortHours,
                from: Math.round(plan.readiness),
                to: Math.round(plan.projectedReadiness)
              })}
            </p>
          </div>
          <ol data-testid="c3-plan" className="relative mt-5 space-y-4 border-l-2 border-slate-200 pl-6 dark:border-slate-700">
            {plan.steps.map((s) => (
              <li key={s.actionId} className="relative">
                <span
                  aria-hidden="true"
                  className={`absolute -left-[35px] top-2 flex h-6 w-6 items-center justify-center rounded-full text-[11px] font-bold text-white ring-4 ring-white dark:ring-slate-900 ${ACTION_DOT[s.actionType]}`}
                >
                  {s.order}
                </span>
                <div className="rounded-xl border border-slate-200 p-3 text-sm shadow-sm dark:border-slate-800">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className={`rounded-full px-2 py-0.5 text-[11px] font-medium ${ACTION_STYLE[s.actionType]}`}>
                      {s.order}. {typeName(s.actionType, t)}
                    </span>
                    {s.isPrerequisite ? (
                      <span className="rounded-full bg-rose-100 px-2 py-0.5 text-[11px] font-medium text-rose-800 dark:bg-rose-900/50 dark:text-rose-200">{t.doFirst}</span>
                    ) : null}
                    <span className="font-medium">
                      {s.action.url ? (
                        <a href={s.action.url} target="_blank" rel="noopener noreferrer" className={`text-indigo-700 underline hover:text-indigo-900 dark:text-indigo-300 ${ring}`}>
                          {s.action.title}
                        </a>
                      ) : (
                        s.action.title
                      )}
                    </span>
                  </div>
                  <p className="mt-1.5 text-xs text-slate-500 dark:text-slate-400">
                    {fmt(t.levelArrow, { skill: skillName(s.skillId, language), from: levelName(s.fromLevel, language), to: levelName(s.toLevel, language) })} ·{" "}
                    {fmt(t.hours, { n: s.effortHours })}
                    {s.gain > 0 ? <span className="font-semibold text-emerald-700 dark:text-emerald-400"> · +{one(s.gain)}</span> : null}
                  </p>
                  <details className="mt-2">
                    <summary className={`cursor-pointer text-xs font-medium text-primary ${ring}`}>{t.whyThis}</summary>
                    <ul className="mt-1 list-disc space-y-0.5 pl-5 text-xs text-slate-600 dark:text-slate-300">
                      {s.reasons.map((r, i) => (
                        <li key={i}>{reasonText(r, plan.roleId, ctx)}</li>
                      ))}
                    </ul>
                  </details>
                </div>
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
