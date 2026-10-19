"use client";

import { FormEvent, ReactNode, useId, useState } from "react";
import { Card } from "@/components/shared/Card";
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
      <label htmlFor={htmlFor} className="mb-1 block text-sm font-medium text-slate-700 dark:text-slate-200">
        {label}
      </label>
      {children}
      {invalid ? <p className="mt-1 text-xs font-medium text-red-600">▲ {invalidHint}</p> : null}
    </div>
  );
}

const ring = "focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-1";

type AssessmentToolProps = {
  scholarships?: ScholarshipCriteria[];
  /** Called after each successful calculation (used by dashboards that persist the result). */
  onResult?: (profile: StudentFinancialProfile, assessment: VulnerabilityAssessment) => void;
};

export function AssessmentTool({ scholarships = illustrativeScholarships, onResult }: AssessmentToolProps) {
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
        className={`${ring} ${errors[name] ? "border-red-500" : ""}`}
        {...props}
      />
    </Field>
  );

  const check = (name: keyof FormState, label: string) => (
    <label className="flex items-start gap-2 text-sm text-slate-700 dark:text-slate-200">
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
    <div className="grid gap-6 lg:grid-cols-5">
      <form onSubmit={onSubmit} noValidate className="space-y-5 lg:col-span-3" aria-label={t.toolTitle}>
        <Card className="space-y-4">
          <p className="rounded-lg bg-emerald-50 px-3 py-2 text-xs text-emerald-900 dark:bg-emerald-950 dark:text-emerald-100">
            {t.privacyNote}
          </p>
          <p className="rounded-lg bg-amber-50 px-3 py-2 text-xs text-amber-900 dark:bg-amber-950 dark:text-amber-100">
            {t.syntheticNote}
          </p>
          <Field label={t.sampleLabel} htmlFor={id("sample")}>
            <Select id={id("sample")} value={sampleId} onChange={(e) => loadSample(e.target.value)} className={ring}>
              <option value="">{t.samplePlaceholder}</option>
              {demoCases.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.id} · {c.label[language] ?? c.label.en}
                </option>
              ))}
            </Select>
          </Field>
          <p className="text-xs text-slate-500">{t.sampleNote}</p>
        </Card>

        <Card>
          <fieldset className="space-y-4">
            <legend className="mb-2 text-base font-semibold">{t.sectionHousehold}</legend>
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
                  className={ring}
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
        </Card>

        <Card>
          <fieldset className="space-y-4">
            <legend className="mb-2 text-base font-semibold">{t.sectionFinances}</legend>
            <div className="grid gap-4 sm:grid-cols-2">
              {numberInput("expenses", t.expenses, { min: 5000, step: 1000 })}
              <Field label={t.accommodation} htmlFor={id("accommodation")}>
                <Select
                  id={id("accommodation")}
                  value={form.accommodation}
                  onChange={(e) => set("accommodation", e.target.value as Accommodation)}
                  className={ring}
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
        </Card>

        <Card>
          <fieldset className="space-y-4">
            <legend className="mb-2 text-base font-semibold">{t.sectionStudy}</legend>
            <div className="grid gap-4 sm:grid-cols-2">
              {numberInput("gpa", t.gpa, { min: 0, max: 4, step: 0.01 })}
              <Field label={t.year} htmlFor={id("year")}>
                <Select id={id("year")} value={form.year} onChange={(e) => set("year", e.target.value as "3" | "4")} className={ring}>
                  <option value="3">3</option>
                  <option value="4">4</option>
                </Select>
              </Field>
            </div>
          </fieldset>
        </Card>

        {Object.keys(errors).length > 0 ? (
          <p role="alert" className="text-sm text-red-600">
            {t.invalidInput}
          </p>
        ) : null}
        <div className="flex gap-3">
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

      <div className="space-y-4 lg:col-span-2" aria-live="polite">
        {result ? (
          <>
            <Card>
              <h3 className="text-lg font-semibold">{t.resultTitle}</h3>
              <div className="mt-4 flex items-end gap-3">
                <span className="text-5xl font-bold tabular-nums" data-testid="vi-value">
                  {result.assessment.vulnerabilityIndex}
                </span>
                <span className="pb-1 text-sm text-slate-500">/ 100 · {t.index}</span>
              </div>
              <div
                className="mt-3 h-3 overflow-hidden rounded-full bg-slate-200 dark:bg-slate-700"
                role="progressbar"
                aria-valuenow={result.assessment.vulnerabilityIndex}
                aria-valuemin={0}
                aria-valuemax={100}
                aria-label={t.index}
              >
                <div
                  className={`h-full ${bandColor(result.assessment.band)}`}
                  style={{ width: `${result.assessment.vulnerabilityIndex}%` }}
                />
              </div>
              <p className="mt-2 text-sm font-semibold" data-testid="vi-band">
                {bandLabel(result.assessment.band)}
              </p>
              <h4 className="mt-5 text-sm font-semibold">{t.whyTitle}</h4>
              <p className="text-xs text-slate-500">{t.whyNote}</p>
              <ul className="mt-2 space-y-2">
                {result.assessment.topFactors.map((f) => (
                  <li key={f.feature}>
                    <div className="flex justify-between text-sm">
                      <span>{f.label}</span>
                      <span className="text-slate-500">{f.sharePercent}%</span>
                    </div>
                    <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-slate-200 dark:bg-slate-700">
                      <div className="h-full bg-primary" style={{ width: `${f.sharePercent}%` }} />
                    </div>
                  </li>
                ))}
              </ul>
            </Card>

            <Card>
              <h3 className="text-lg font-semibold">{t.matchesTitle}</h3>
              <p className="text-xs text-slate-500">{t.catalogueNote}</p>
              {result.recs.length === 0 ? (
                <p className="mt-3 text-sm text-slate-500">{t.noMatches}</p>
              ) : (
                <ol className="mt-3 space-y-3" data-testid="recommendations">
                  {result.recs.slice(0, 5).map((r, index) => (
                    <li key={r.scholarship.id} className="rounded-xl border border-slate-200 p-3 dark:border-slate-700">
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <p className="text-sm font-semibold">
                            {index + 1}. {r.scholarship.title}
                          </p>
                          <p className="text-xs text-slate-500">
                            {r.scholarship.provider} · LKR {r.scholarship.amountLkr.toLocaleString("en-LK")} · {t.deadlineIn}{" "}
                            {r.scholarship.deadlineDays} {t.days}
                          </p>
                        </div>
                        <span className="shrink-0 rounded-full bg-primary/10 px-2 py-0.5 text-xs font-semibold text-primary">
                          {t.fit} {Math.round(r.score * 100)}%
                        </span>
                      </div>
                      <ul className="mt-2 list-disc pl-5 text-xs text-slate-600 dark:text-slate-300">
                        {r.reasons.map((reason) => (
                          <li key={reason}>{reason}</li>
                        ))}
                      </ul>
                    </li>
                  ))}
                </ol>
              )}
            </Card>
          </>
        ) : (
          <Card>
            <p className="text-sm text-slate-500">{t.toolSubtitle}</p>
          </Card>
        )}
      </div>
    </div>
  );
}
