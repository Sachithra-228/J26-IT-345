"use client";

import { FormEvent, ReactNode, useId, useState } from "react";
import { Calculator, ListChecks, ShieldCheck } from "lucide-react";
import {
  studentBentoIconClass,
  studentBentoInsetClass,
  studentBentoPillClass,
  studentBentoTileClass
} from "@/components/dashboard/student/student-card-theme";
import { Button } from "@/components/shared/Button";
import { Input } from "@/components/shared/Input";
import { Select } from "@/components/shared/Select";
import { useLanguage } from "@/context/language-context";
import { demoCases } from "@/lib/c1/demo-cases";
import { illustrativeScholarships } from "@/lib/c1/demo-scholarships";
import { getC1Text } from "@/lib/c1/i18n";
import { rankScholarships, type Recommendation, type ScholarshipCriteria } from "@/lib/c1/matching";
import {
  assessVulnerability,
  type Accommodation,
  type GuardianEmployment,
  type StudentFinancialProfile,
  type VulnerabilityAssessment
} from "@/lib/c1/vulnerability";

type FormState = {
  income: string;
  householdSize: string;
  dependents: string;
  siblings: string;
  guardian: GuardianEmployment;
  singleParent: boolean;
  rural: boolean;
  shock: boolean;
  hasLoan: boolean;
  loanAmount: string;
  expenses: string;
  accommodation: Accommodation;
  currentScholarship: boolean;
  gpa: string;
  year: "3" | "4";
};

const DEFAULTS: FormState = {
  income: "45000",
  householdSize: "5",
  dependents: "3",
  siblings: "1",
  guardian: "informal",
  singleParent: false,
  rural: true,
  shock: false,
  hasLoan: false,
  loanAmount: "0",
  expenses: "38000",
  accommodation: "boarding",
  currentScholarship: false,
  gpa: "3.0",
  year: "3"
};

/** Fills the form from a profile (used by the "Try a sample student" picker). */
function profileToForm(p: StudentFinancialProfile): FormState {
  return {
    income: String(p.monthlyHouseholdIncomeLkr),
    householdSize: String(p.householdSize),
    dependents: String(p.dependents),
    siblings: String(p.siblingsInEducation),
    guardian: p.guardianEmployment,
    singleParent: p.singleParent,
    rural: p.ruralDistrict,
    shock: p.financialShockLastYear,
    hasLoan: p.hasEducationLoan,
    loanAmount: String(p.loanAmountLkr),
    expenses: String(p.monthlyExpensesLkr),
    accommodation: p.accommodation,
    currentScholarship: p.currentScholarship,
    gpa: String(p.gpa),
    year: p.yearOfStudy === 4 ? "4" : "3"
  };
}

type Errors = Partial<Record<keyof FormState, true>>;

function parseForm(f: FormState): { profile?: StudentFinancialProfile; errors: Errors } {
  const errors: Errors = {};
  const num = (v: string) => (v.trim() === "" ? Number.NaN : Number(v));
  const income = num(f.income);
  const size = num(f.householdSize);
  const dependents = num(f.dependents);
  const siblings = num(f.siblings);
  const loan = f.hasLoan ? num(f.loanAmount) : 0;
  const expenses = num(f.expenses);
  const gpa = num(f.gpa);

  if (!(income >= 5_000 && income <= 1_000_000)) errors.income = true;
  if (!(Number.isInteger(size) && size >= 2 && size <= 9)) errors.householdSize = true;
  if (!(Number.isInteger(dependents) && dependents >= 0 && dependents <= (Number.isFinite(size) ? size - 1 : 8)))
    errors.dependents = true;
  if (!(Number.isInteger(siblings) && siblings >= 0 && siblings <= 6)) errors.siblings = true;
  if (f.hasLoan && !(loan >= 0 && loan <= 10_000_000)) errors.loanAmount = true;
  if (!(expenses >= 5_000 && expenses <= 200_000)) errors.expenses = true;
  if (!(gpa >= 0 && gpa <= 4)) errors.gpa = true;

  if (Object.keys(errors).length > 0) return { errors };
  return {
    errors,
    profile: {
      monthlyHouseholdIncomeLkr: income,
      householdSize: size,
      dependents,
      siblingsInEducation: siblings,
      guardianEmployment: f.guardian,
      singleParent: f.singleParent,
      hasEducationLoan: f.hasLoan,
      loanAmountLkr: loan,
      monthlyExpensesLkr: expenses,
      accommodation: f.accommodation,
      ruralDistrict: f.rural,
      financialShockLastYear: f.shock,
      currentScholarship: f.currentScholarship,
      gpa,
      yearOfStudy: Number(f.year)
    }
  };
}

function Field({
  label,
  htmlFor,
  invalid,
  invalidHint,
  children
}: {
  label: string;
  htmlFor: string;
  invalid?: boolean;
  invalidHint?: string;
  children: ReactNode;
}) {
  return (
    <div>
      <label htmlFor={htmlFor} className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-neutral-400">
        {label}
      </label>
      {children}
      {invalid ? <p className="mt-1 text-xs font-medium text-red-600 dark:text-red-400">{invalidHint}</p> : null}
    </div>
  );
}

const ring = "focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-1";

/** Borderless inset input surface that matches the dashboard bento tiles. */
const control =
  "border-transparent bg-slate-50 text-slate-900 dark:border-transparent dark:bg-neutral-900 dark:text-neutral-100";
const fieldsetClass = "mt-6 space-y-4 border-t border-slate-100 pt-6 dark:border-white/5";
const legendClass = "mb-3 text-xs font-semibold uppercase tracking-wider text-slate-400 dark:text-neutral-500";

function TileHeader({ icon, title, subtitle, meta }: { icon: ReactNode; title: string; subtitle?: string; meta?: ReactNode }) {
  return (
    <div className="mb-5 flex items-start justify-between gap-3">
      <div className="flex items-center gap-3">
        <span className={studentBentoIconClass}>{icon}</span>
        <div>
          <h3 className="text-base font-bold tracking-tight text-slate-900 dark:text-white">{title}</h3>
          {subtitle ? <p className="text-xs text-slate-500 dark:text-neutral-400">{subtitle}</p> : null}
        </div>
      </div>
      {meta}
    </div>
  );
}

type AssessmentToolProps = {
  scholarships?: ScholarshipCriteria[];
  /** Called after each successful calculation (used by dashboards that persist the result). */
  onResult?: (profile: StudentFinancialProfile, assessment: VulnerabilityAssessment) => void;
  /** Extra tile rendered at the end of the results column. */
  aside?: ReactNode;
};

export function AssessmentTool({ scholarships = illustrativeScholarships, onResult, aside }: AssessmentToolProps) {
  const { language } = useLanguage();
  const t = getC1Text(language);
  const uid = useId();
  const id = (name: string) => `${uid}-${name}`;
  const [form, setForm] = useState<FormState>(DEFAULTS);
  const [sampleId, setSampleId] = useState("");
  const [errors, setErrors] = useState<Errors>({});
  const [result, setResult] = useState<{ assessment: VulnerabilityAssessment; recs: Recommendation[] } | null>(null);

  const set = <K extends keyof FormState>(key: K, value: FormState[K]) => setForm((prev) => ({ ...prev, [key]: value }));

  function loadSample(nextId: string) {
    setSampleId(nextId);
    const sample = demoCases.find((c) => c.id === nextId);
    if (!sample) return;
    setForm(profileToForm(sample.profile));
    setErrors({});
    setResult(null);
  }

  function onSubmit(event: FormEvent) {
    event.preventDefault();
    const parsed = parseForm(form);
    setErrors(parsed.errors);
    if (!parsed.profile) {
      setResult(null);
      // Move keyboard / screen-reader focus to the first field that needs fixing.
      const firstInvalid = Object.keys(parsed.errors)[0];
      if (firstInvalid) document.getElementById(id(firstInvalid))?.focus();
      return;
    }
    const assessment = assessVulnerability(parsed.profile);
    setResult({ assessment, recs: rankScholarships(parsed.profile, assessment, scholarships) });
    onResult?.(parsed.profile, assessment);
  }

  const bandLabel = (band: VulnerabilityAssessment["band"]) =>
    band === "high" ? t.bandHigh : band === "moderate" ? t.bandModerate : t.bandLow;
  const bandColor = (band: VulnerabilityAssessment["band"]) =>
    band === "high" ? "bg-red-500" : band === "moderate" ? "bg-amber-500" : "bg-emerald-500";

  const numberInput = (name: keyof FormState, label: string, props: { min?: number; max?: number; step?: number } = {}) => (
    <Field label={label} htmlFor={id(String(name))} invalid={errors[name]} invalidHint={t.invalidInput}>
      <Input
        id={id(String(name))}
        type="number"
        inputMode="decimal"
        value={form[name] as string}
        onChange={(e) => set(name, e.target.value as never)}
        aria-invalid={errors[name] ? true : undefined}
        className={`${control} ${ring} ${errors[name] ? "!border-red-500" : ""}`}
        {...props}
      />
    </Field>
  );

  const check = (name: keyof FormState, label: string) => (
    <label className={`${studentBentoInsetClass} flex cursor-pointer items-start gap-2.5 px-3 py-2.5 text-sm text-slate-700 dark:text-neutral-200`}>
      <input
        type="checkbox"
        checked={form[name] as boolean}
        onChange={(e) => set(name, e.target.checked as never)}
        className="mt-0.5 h-4 w-4 rounded border-slate-300 text-primary focus-visible:ring-2 focus-visible:ring-primary"
      />
      <span>{label}</span>
    </label>
  );

  return (
    <div className="grid grid-cols-1 gap-4 lg:grid-cols-12">
      <form onSubmit={onSubmit} noValidate className={`${studentBentoTileClass} lg:col-span-7`} aria-label={t.toolTitle}>
        <TileHeader icon={<Calculator className="size-5" />} title={t.toolTitle} subtitle={t.sampleNote} />

        <div className="space-y-2">
          <p className={`${studentBentoInsetClass} flex items-start gap-2 px-3.5 py-2.5 text-xs text-slate-600 dark:text-neutral-300`}>
            <ShieldCheck className="mt-0.5 size-4 shrink-0 text-emerald-600 dark:text-emerald-400" />
            <span>{t.privacyNote}</span>
          </p>
          <p className="px-3.5 text-[11px] text-slate-400 dark:text-neutral-500">{t.syntheticNote}</p>
        </div>

        <div className="mt-5">
          <Field label={t.sampleLabel} htmlFor={id("sample")}>
            <Select id={id("sample")} value={sampleId} onChange={(e) => loadSample(e.target.value)} className={`${control} ${ring}`}>
              <option value="">{t.samplePlaceholder}</option>
              {demoCases.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.id} · {c.label[language] ?? c.label.en}
                </option>
              ))}
            </Select>
          </Field>
        </div>

        <fieldset className={fieldsetClass}>
          <legend className={legendClass}>{t.sectionHousehold}</legend>
          <div className="grid gap-4 sm:grid-cols-2">
            {numberInput("income", t.income, { min: 5000, step: 1000 })}
            {numberInput("householdSize", t.householdSize, { min: 2, max: 9, step: 1 })}
            {numberInput("dependents", t.dependents, { min: 0, max: 8, step: 1 })}
            {numberInput("siblings", t.siblings, { min: 0, max: 6, step: 1 })}
            <Field label={t.guardian} htmlFor={id("guardian")}>
              <Select
                id={id("guardian")}
                value={form.guardian}
                onChange={(e) => set("guardian", e.target.value as GuardianEmployment)}
                className={`${control} ${ring}`}
              >
                <option value="formal">{t.guardianFormal}</option>
                <option value="informal">{t.guardianInformal}</option>
                <option value="unemployed">{t.guardianUnemployed}</option>
                <option value="retired">{t.guardianRetired}</option>
                <option value="deceased">{t.guardianDeceased}</option>
              </Select>
            </Field>
          </div>
          <div className="grid gap-2 sm:grid-cols-2">
            {check("singleParent", t.singleParent)}
            {check("rural", t.rural)}
          </div>
        </fieldset>

        <fieldset className={fieldsetClass}>
          <legend className={legendClass}>{t.sectionFinances}</legend>
          <div className="grid gap-4 sm:grid-cols-2">
            {numberInput("expenses", t.expenses, { min: 5000, step: 1000 })}
            <Field label={t.accommodation} htmlFor={id("accommodation")}>
              <Select
                id={id("accommodation")}
                value={form.accommodation}
                onChange={(e) => set("accommodation", e.target.value as Accommodation)}
                className={`${control} ${ring}`}
              >
                <option value="home">{t.accHome}</option>
                <option value="boarding">{t.accBoarding}</option>
                <option value="hostel">{t.accHostel}</option>
              </Select>
            </Field>
            {form.hasLoan ? numberInput("loanAmount", t.loanAmount, { min: 0, step: 10000 }) : null}
          </div>
          <div className="grid gap-2 sm:grid-cols-2">
            {check("hasLoan", t.hasLoan)}
            {check("shock", t.shock)}
            {check("currentScholarship", t.currentScholarship)}
          </div>
        </fieldset>

        <fieldset className={fieldsetClass}>
          <legend className={legendClass}>{t.sectionStudy}</legend>
          <div className="grid gap-4 sm:grid-cols-2">
            {numberInput("gpa", t.gpa, { min: 0, max: 4, step: 0.01 })}
            <Field label={t.year} htmlFor={id("year")}>
              <Select id={id("year")} value={form.year} onChange={(e) => set("year", e.target.value as "3" | "4")} className={`${control} ${ring}`}>
                <option value="3">3</option>
                <option value="4">4</option>
              </Select>
            </Field>
          </div>
        </fieldset>

        {Object.keys(errors).length > 0 ? (
          <p role="alert" className="mt-5 text-sm text-red-600 dark:text-red-400">
            {t.invalidInput}
          </p>
        ) : null}
        <div className="mt-6 flex gap-3">
          <Button type="submit" className={ring}>
            {t.calculate}
          </Button>
          <Button
            type="button"
            variant="secondary"
            className={ring}
            onClick={() => {
              setForm(DEFAULTS);
              setSampleId("");
              setErrors({});
              setResult(null);
            }}
          >
            {t.reset}
          </Button>
        </div>
      </form>

      <div className="space-y-4 lg:col-span-5" aria-live="polite">
        {result ? (
          <>
            <div className={studentBentoTileClass}>
              <TileHeader
                icon={<ShieldCheck className="size-5" />}
                title={t.resultTitle}
                meta={<span className={studentBentoPillClass}>{bandLabel(result.assessment.band)}</span>}
              />
              <div className="flex items-end gap-3">
                <span className="text-5xl font-bold tracking-tight tabular-nums text-slate-900 dark:text-white" data-testid="vi-value">
                  {result.assessment.vulnerabilityIndex}
                </span>
                <span className="pb-1.5 text-sm text-slate-500 dark:text-neutral-400">/ 100 · {t.index}</span>
              </div>
              <div
                className="mt-3 h-2.5 overflow-hidden rounded-full bg-slate-100 dark:bg-neutral-800"
                role="progressbar"
                aria-valuenow={result.assessment.vulnerabilityIndex}
                aria-valuemin={0}
                aria-valuemax={100}
                aria-label={t.index}
              >
                <div
                  className={`h-full rounded-full ${bandColor(result.assessment.band)}`}
                  style={{ width: `${result.assessment.vulnerabilityIndex}%` }}
                />
              </div>
              <p className="mt-2 text-sm font-semibold text-slate-800 dark:text-neutral-200" data-testid="vi-band">
                {bandLabel(result.assessment.band)}
              </p>

              <div className={`${studentBentoInsetClass} mt-5 p-4`}>
                <h4 className="text-sm font-semibold text-slate-900 dark:text-white">{t.whyTitle}</h4>
                <p className="text-[11px] text-slate-500 dark:text-neutral-500">{t.whyNote}</p>
                <ul className="mt-3 space-y-2.5">
                  {result.assessment.topFactors.map((f) => (
                    <li key={f.feature}>
                      <div className="flex justify-between text-xs">
                        <span className="text-slate-700 dark:text-neutral-300">{f.label}</span>
                        <span className="font-semibold text-slate-500 dark:text-neutral-400">{f.sharePercent}%</span>
                      </div>
                      <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-slate-200/80 dark:bg-neutral-800">
                        <div className="h-full rounded-full bg-primary" style={{ width: `${f.sharePercent}%` }} />
                      </div>
                    </li>
                  ))}
                </ul>
              </div>
            </div>

            <div className={studentBentoTileClass}>
              <TileHeader
                icon={<ListChecks className="size-5" />}
                title={t.matchesTitle}
                subtitle={t.catalogueNote}
                meta={<span className={studentBentoPillClass}>{Math.min(result.recs.length, 5)}</span>}
              />
              {result.recs.length === 0 ? (
                <div className={`${studentBentoInsetClass} py-8 text-center text-sm text-slate-500 dark:text-neutral-500`}>
                  {t.noMatches}
                </div>
              ) : (
                <ol className="space-y-2.5" data-testid="recommendations">
                  {result.recs.slice(0, 5).map((r, index) => (
                    <li key={r.scholarship.id} className={`${studentBentoInsetClass} p-4`}>
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0">
                          <p className="text-sm font-semibold text-slate-900 dark:text-white">
                            {index + 1}. {r.scholarship.title}
                          </p>
                          <p className="mt-0.5 text-[11px] text-slate-500 dark:text-neutral-500">
                            {r.scholarship.provider} · LKR {r.scholarship.amountLkr.toLocaleString("en-LK")} · {t.deadlineIn}{" "}
                            {r.scholarship.deadlineDays} {t.days}
                          </p>
                        </div>
                        <span className="shrink-0 rounded-full bg-white px-2 py-0.5 text-[11px] font-semibold text-slate-700 shadow-sm ring-1 ring-slate-200/70 dark:bg-neutral-950 dark:text-neutral-300 dark:ring-white/10">
                          {t.fit} {Math.round(r.score * 100)}%
                        </span>
                      </div>
                      <ul className="mt-2 space-y-1 text-xs text-slate-600 dark:text-neutral-400">
                        {r.reasons.map((reason) => (
                          <li key={reason} className="flex gap-2">
                            <span className="mt-1.5 h-1 w-1 shrink-0 rounded-full bg-slate-400 dark:bg-neutral-500" />
                            <span>{reason}</span>
                          </li>
                        ))}
                      </ul>
                    </li>
                  ))}
                </ol>
              )}
            </div>
          </>
        ) : (
          <div className={`${studentBentoTileClass} flex flex-col items-center justify-center py-12 text-center`}>
            <span className={studentBentoIconClass}>
              <ShieldCheck className="size-5" />
            </span>
            <p className="mt-3 max-w-xs text-sm text-slate-500 dark:text-neutral-400">{t.toolSubtitle}</p>
          </div>
        )}
        {aside}
      </div>
    </div>
  );
}
