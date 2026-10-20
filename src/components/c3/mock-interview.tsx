"use client";

import { ArrowRight, Check } from "lucide-react";
import { useEffect, useId, useMemo, useState } from "react";
import { Button } from "@/components/shared/Button";
import { Card } from "@/components/shared/Card";
import { useLanguage, type Language } from "@/context/language-context";
import { fmt, getC3Text, label, type C3Text } from "@/lib/c3/i18n";
import {
  scoreAnswer,
  selectQuestions,
  summariseSession,
  type AnswerFeedback,
  type Criterion,
  type CriterionResult,
  type SelectedQuestion,
  type SessionSummary
} from "@/lib/c3/interview";
import { firstActionFor } from "@/lib/c3/ad-check";
import { planForRole } from "@/lib/c3/graph";
import { careerModel, getRole, getSkill, type RoleProfile } from "@/lib/c3/model";
import type { SkillLevels } from "@/lib/c3/readiness";

const ring = "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-1";

type Phase = "setup" | "asking" | "feedback" | "summary";
type Result = { selected: SelectedQuestion; feedback: AnswerFeedback; answer: string };

const skillName = (id: string, language: Language) => {
  const s = getSkill(id);
  return s ? label(s.label, language) : id;
};
const roleName = (id: string, language: Language) => {
  const r = getRole(id);
  return r ? label(r.label, language) : id;
};

const CRITERION_LABEL: Record<Criterion, keyof C3Text> = {
  keyPoints: "crKeyPoints",
  structure: "crStructure",
  depth: "crDepth",
  evidence: "crEvidence",
  clarity: "crClarity"
};
const CRITERION_TIP: Record<Criterion, keyof C3Text> = {
  keyPoints: "tipKeyPoints",
  structure: "tipStructure",
  depth: "tipDepth",
  evidence: "tipEvidence",
  clarity: "tipClarity"
};
const STAR_LABEL: Record<string, keyof C3Text> = {
  situation: "starSituation",
  task: "starTask",
  action: "starAction",
  result: "starResult"
};

function explain(c: CriterionResult, t: C3Text): string {
  const d = c.detail;
  const yesNo = (v: unknown) => (v === "yes" ? t.yes : t.no);
  const list = (v: unknown) => {
    const arr = (v as string[]) ?? [];
    return arr.length ? arr.map((k) => t[STAR_LABEL[k]]).join(", ") : t.none;
  };
  switch (c.criterion) {
    case "keyPoints":
      return fmt(t.exKeyPoints, { covered: d.covered as number, total: d.total as number });
    case "structure":
      return "starFound" in d
        ? fmt(t.exStructureStar, { found: list(d.starFound), missing: list(d.starMissing) })
        : fmt(t.exStructureTech, { sentences: d.sentences as number, example: yesNo(d.hasExample), steps: yesNo(d.hasSteps) });
    case "depth":
      return fmt(t.exDepth, { words: d.words as number, min: d.min as number, ideal: d.ideal as number });
    case "evidence":
      return fmt(t.exEvidence, { numbers: d.numbers as number, tools: d.tools as number, ownership: d.ownership as number });
    case "clarity":
      return fmt(t.exClarity, { avg: d.avgSentence as number, unique: d.uniqueRatio as number });
  }
}

function reasonText(s: SelectedQuestion, roleId: string, t: C3Text, language: Language): string {
  const r = s.reason;
  switch (r.code) {
    case "gap":
      return fmt(t.ivReasonGap, { skill: skillName(r.skillId, language), points: (Math.round(r.gain * 10) / 10).toFixed(1) });
    case "strength":
      return fmt(t.ivReasonStrength, { skill: skillName(r.skillId, language) });
    case "core":
      return fmt(t.ivReasonCore, { skill: skillName(r.skillId, language) });
    case "behavioural":
      return t.ivReasonBehavioural;
    case "situational":
      return fmt(t.ivReasonSituational, { role: roleName(roleId, language) });
  }
}

/** The criteria the student did best on (score 3, or 2 if none is 3). */
function strengths(feedback: AnswerFeedback): Criterion[] {
  const top = feedback.criteria.filter((c) => c.score === 3);
  return (top.length ? top : feedback.criteria.filter((c) => c.score === 2)).map((c) => c.criterion);
}

/** The criterion to work on first: the lowest score (ties: rubric order). */
function weakestOf(feedback: AnswerFeedback): Criterion | null {
  const low = [...feedback.criteria].sort((a, b) => a.score - b.score)[0];
  return low && low.score < 3 ? low.criterion : null;
}

const bandStyle = {
  strong: "bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-200",
  developing: "bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-200",
  practice: "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-200"
} as const;

type Props = {
  /** Skill levels from the readiness analysis (null if it has not been run yet). */
  levels?: SkillLevels | null;
  targetRoleIds?: string[];
  /** Called with the summary when an interview is finished (used by the career assistant). */
  onSummary?: (summary: SessionSummary) => void;
  /** Opens the student's Gap-to-Action plan (the Readiness tab); the button is hidden without it. */
  onOpenPlan?: () => void;
};

/** Rule-based mock interview (FR13). Runs on-device; answers are never sent or stored. */
export function MockInterview({ levels = null, targetRoleIds = [], onSummary, onOpenPlan }: Props) {
  const { language } = useLanguage();
  const t = getC3Text(language);
  const uid = useId();
  const [roleId, setRoleId] = useState<string>(targetRoleIds[0] ?? careerModel.roles[0].id);
  const [count, setCount] = useState(6);
  const [round, setRound] = useState(0);
  const [phase, setPhase] = useState<Phase>("setup");
  const [questions, setQuestions] = useState<SelectedQuestion[]>([]);
  const [index, setIndex] = useState(0);
  const [answer, setAnswer] = useState("");
  const [emptyError, setEmptyError] = useState(false);
  const [results, setResults] = useState<Result[]>([]);
  const [seconds, setSeconds] = useState(0);

  // follow the student's first target role when a new analysis arrives (not on every render)
  const firstTarget = targetRoleIds[0];
  useEffect(() => {
    if (firstTarget) setRoleId(firstTarget);
  }, [firstTarget]);

  useEffect(() => {
    if (phase !== "asking") return;
    const timer = setInterval(() => setSeconds((s) => s + 1), 1000);
    return () => clearInterval(timer);
  }, [phase, index]);

  const current = questions[index];
  const last = results[results.length - 1];
  const summary = useMemo(
    () => summariseSession(results.map((r) => ({ question: r.selected.question, feedback: r.feedback }))),
    [results]
  );

  useEffect(() => {
    if (phase === "summary" && summary.answered > 0) onSummary?.(summary);
  }, [phase, summary, onSummary]);

  // For each skill to practise: the matching step of the student's plan, or the first learning action.
  const practiseSteps = useMemo(() => {
    if (phase !== "summary") return [];
    const role = getRole(roleId);
    const plan = role && levels ? planForRole(levels, role) : null;
    return summary.practiseSkills.map((skillId) => {
      const step = plan?.steps.find((st) => st.skillId === skillId);
      const action = step ? step.action : firstActionFor(skillId, levels?.[skillId] ?? 0);
      return { skillId, action };
    });
  }, [phase, roleId, levels, summary.practiseSkills]);

  const scores = results.map((r) => r.feedback.total);
  const best = scores.length > 1 ? scores.indexOf(Math.max(...scores)) : -1;
  const worst = scores.length > 1 ? scores.lastIndexOf(Math.min(...scores)) : -1;

  function start(nextRound = round) {
    const role = getRole(roleId) as RoleProfile;
    setQuestions(selectQuestions(levels ?? {}, role, count, nextRound));
    setIndex(0);
    setResults([]);
    setAnswer("");
    setSeconds(0);
    setEmptyError(false);
    setPhase("asking");
  }

  function submit() {
    if (!answer.trim()) {
      setEmptyError(true);
      return;
    }
    setEmptyError(false);
    setResults((r) => [...r, { selected: current, feedback: scoreAnswer(current.question, answer), answer }]);
    setPhase("feedback");
  }

  function next() {
    if (index + 1 >= questions.length) {
      setPhase("summary");
      return;
    }
    setIndex(index + 1);
    setAnswer("");
    setSeconds(0);
    setPhase("asking");
  }

  const typeLabel = (type: string) =>
    type === "technical" ? t.ivTypeTechnical : type === "behavioural" ? t.ivTypeBehavioural : t.ivTypeSituational;
  const mmss = `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, "0")}`;
  const words = answer.trim() ? answer.trim().split(/\s+/).length : 0;

  return (
    <div className="space-y-6" data-testid="c3-interview">
      <header>
        <h3 className="text-xl font-semibold">{t.ivTitle}</h3>
        <p className="mt-1 max-w-3xl text-sm text-slate-600 dark:text-slate-300">{t.ivSubtitle}</p>
        <details className="mt-2 max-w-3xl text-sm">
          <summary className={`cursor-pointer text-xs font-medium text-primary ${ring}`}>ⓘ {t.ivHowItWorks}</summary>
          <p className="mt-1 text-xs text-slate-600 dark:text-slate-300">{t.ivNote}</p>
        </details>
      </header>

      {phase === "setup" ? (
        <Card>
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label htmlFor={`${uid}-role`} className="mb-1 block text-sm font-medium text-slate-700 dark:text-slate-200">
                {t.ivRole}
              </label>
              <select
                id={`${uid}-role`}
                value={roleId}
                onChange={(e) => setRoleId(e.target.value)}
                className={`w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-900 ${ring}`}
              >
                {careerModel.roles.map((r) => (
                  <option key={r.id} value={r.id}>
                    {label(r.label, language)}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label htmlFor={`${uid}-count`} className="mb-1 block text-sm font-medium text-slate-700 dark:text-slate-200">
                {t.ivCount}
              </label>
              <select
                id={`${uid}-count`}
                value={count}
                onChange={(e) => setCount(Number(e.target.value))}
                className={`w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-900 ${ring}`}
              >
                {[4, 6, 8].map((n) => (
                  <option key={n} value={n}>
                    {n}
                  </option>
                ))}
              </select>
            </div>
          </div>
          <p className="mt-3 text-sm text-slate-600 dark:text-slate-300">{levels ? t.ivUsesGaps : t.ivNoAnalysis}</p>
          <Button type="button" className="mt-4" onClick={() => start()}>
            {t.ivStart}
          </Button>
        </Card>
      ) : null}

      {(phase === "asking" || phase === "feedback") && current ? (
        <Card>
          <div className="flex flex-wrap items-center gap-2 text-xs">
            <span className="rounded-full bg-slate-100 px-2 py-0.5 dark:bg-slate-800">
              {fmt(t.ivQuestionOf, { n: index + 1, total: questions.length })}
            </span>
            <span className="rounded-full bg-primary/10 px-2 py-0.5 text-primary">{typeLabel(current.question.type)}</span>
          </div>
          <p data-testid="c3-iv-question" className="mt-3 text-lg font-medium" lang="en">
            {current.question.prompt}
          </p>
          <p className="mt-1 text-xs text-slate-500">
            <span className="font-medium">{t.ivWhyAsked}</span> {reasonText(current, roleId, t, language)}
          </p>

          <label htmlFor={`${uid}-answer`} className="mb-1 mt-4 block text-sm font-medium text-slate-700 dark:text-slate-200">
            {t.ivAnswer}
          </label>
          <textarea
            id={`${uid}-answer`}
            lang="en"
            value={answer}
            onChange={(e) => setAnswer(e.target.value)}
            readOnly={phase === "feedback"}
            rows={7}
            maxLength={5000}
            autoComplete="off"
            aria-invalid={emptyError || undefined}
            aria-describedby={emptyError ? `${uid}-empty` : undefined}
            className={`w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-900 ${ring}`}
          />
          <div className="mt-1 flex flex-wrap justify-between gap-2 text-xs text-slate-500">
            <span>{fmt(t.ivWords, { n: words })}</span>
            {phase === "asking" ? <span aria-live="off">{fmt(t.ivTime, { time: mmss })}</span> : null}
          </div>
          {emptyError ? (
            <p id={`${uid}-empty`} role="alert" className="mt-1 text-xs font-medium text-red-600">
              ▲ {t.ivEmptyAnswer}
            </p>
          ) : null}

          {phase === "asking" ? (
            <div className="mt-4 flex flex-wrap gap-3">
              <Button type="button" onClick={submit}>
                {t.ivSubmit}
              </Button>
              <Button type="button" variant="ghost" onClick={() => setPhase(results.length ? "summary" : "setup")}>
                {t.ivEnd}
              </Button>
            </div>
          ) : null}

          {phase === "feedback" && last ? (
            <section data-testid="c3-iv-feedback" className="mt-5 space-y-4" aria-live="polite">
              <div className="flex flex-wrap items-center gap-3">
                <span data-testid="c3-iv-score" className="text-2xl font-semibold">
                  {fmt(t.ivScore, { score: last.feedback.total })}
                </span>
                <span className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${bandStyle[last.feedback.band]}`}>
                  {last.feedback.band === "strong" ? t.ivBandStrong : last.feedback.band === "developing" ? t.ivBandDeveloping : t.ivBandPractice}
                </span>
              </div>
              <FeedbackHeadline feedback={last.feedback} t={t} />
              <details className="text-sm">
                <summary className={`cursor-pointer font-medium text-primary ${ring}`}>{t.ivDetails}</summary>
                <ul className="mt-3 space-y-2">
                  {last.feedback.criteria.map((c) => (
                    <li key={c.criterion} className="text-sm">
                      <div className="flex justify-between gap-3">
                        <span className="font-medium">{t[CRITERION_LABEL[c.criterion]]}</span>
                        <span className="text-slate-500">{c.score}/3</span>
                      </div>
                      <div className="mt-1 h-1.5 w-full overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800" aria-hidden="true">
                        <div className="h-full bg-primary" style={{ width: `${(c.score / 3) * 100}%` }} />
                      </div>
                      <p className="mt-1 text-xs text-slate-600 dark:text-slate-300">{explain(c, t)}</p>
                    </li>
                  ))}
                </ul>
                <p className="mt-3 font-medium">{t.ivCovered}</p>
                <ul className="mt-1 list-disc pl-5 text-slate-600 dark:text-slate-300" lang="en">
                  {last.feedback.coveredPoints.length ? last.feedback.coveredPoints.map((p) => <li key={p}>{p}</li>) : <li>{t.none}</li>}
                </ul>
              </details>
              <details className="text-sm">
                <summary className={`cursor-pointer font-medium text-primary ${ring}`}>{t.ivModel}</summary>
                <p className="mt-1 text-slate-600 dark:text-slate-300" lang="en">
                  {current.question.modelAnswer}
                </p>
              </details>
              <Button type="button" onClick={next}>
                {index + 1 >= questions.length ? t.ivFinish : t.ivNext}
              </Button>
            </section>
          ) : null}
        </Card>
      ) : null}

      {phase === "summary" ? (
        <Card>
          <h4 className="text-base font-semibold">{t.ivSummaryTitle}</h4>
          <p data-testid="c3-iv-summary" className="mt-2 text-sm">
            {fmt(t.ivAverage, { score: summary.average, n: summary.answered })}
          </p>
          {summary.weakest ? (
            <p className="mt-1 text-sm">
              {fmt(t.ivWeakest, { criterion: t[CRITERION_LABEL[summary.weakest]] })} {t[CRITERION_TIP[summary.weakest]]}
            </p>
          ) : null}
          <h5 className="mt-4 text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">{t.ivYourAnswers}</h5>
          <ol data-testid="c3-iv-answers" className="mt-2 space-y-1.5">
            {results.map((r, i) => (
              <li key={i} className="flex flex-wrap items-center gap-2 text-sm">
                <span className="font-medium">{fmt(t.ivQLine, { n: i + 1, score: r.feedback.total })}</span>
                <span className="min-w-0 flex-1 truncate text-slate-600 dark:text-slate-300" lang="en">
                  {r.selected.question.prompt}
                </span>
                {i === best ? (
                  <span data-testid="c3-iv-best" className="rounded-full bg-emerald-100 px-2 py-0.5 text-[11px] font-semibold text-emerald-800 dark:bg-emerald-900/60 dark:text-emerald-100">
                    {t.ivStrongest}
                  </span>
                ) : null}
                {i === worst && worst !== best ? (
                  <span data-testid="c3-iv-worst" className="rounded-full bg-amber-100 px-2 py-0.5 text-[11px] font-semibold text-amber-800 dark:bg-amber-900/60 dark:text-amber-100">
                    {t.ivWeakestTag}
                  </span>
                ) : null}
              </li>
            ))}
          </ol>
          {summary.practiseSkills.length ? (
            <div className="mt-4 text-sm">
              <p>{fmt(t.ivPractise, { skills: summary.practiseSkills.map((s) => skillName(s, language)).join(", ") })}</p>
              <ul data-testid="c3-iv-plan-steps" className="mt-1 list-disc space-y-1 pl-5 text-slate-600 dark:text-slate-300">
                {practiseSteps.map((p) =>
                  p.action ? (
                    <li key={p.skillId}>
                      {fmt(t.ivPlanStep, { skill: skillName(p.skillId, language), action: p.action.title, h: p.action.effortHours })}
                    </li>
                  ) : null
                )}
              </ul>
            </div>
          ) : null}
          <p className="mt-2 text-xs text-slate-500">{t.ivPrivacy}</p>
          <div className="mt-4 flex flex-wrap gap-3">
            <Button
              type="button"
              onClick={() => {
                setRound(round + 1);
                start(round + 1);
              }}
            >
              {t.ivRestart}
            </Button>
            <Button type="button" variant="secondary" onClick={() => setPhase("setup")}>
              {t.ivChangeRole}
            </Button>
            {onOpenPlan && levels ? (
              <Button type="button" variant="ghost" onClick={onOpenPlan}>
                {t.ivOpenPlan}
              </Button>
            ) : null}
          </div>
        </Card>
      ) : null}
    </div>
  );
}

/** The two lines a student reads first: what went well, and what to improve (with the missed points). */
function FeedbackHeadline({ feedback, t }: { feedback: AnswerFeedback; t: C3Text }) {
  const good = strengths(feedback);
  const weak = weakestOf(feedback);
  return (
    <div className="space-y-3 text-sm">
      <p data-testid="c3-iv-went-well" className="flex items-start gap-2 rounded-xl bg-emerald-50 px-3 py-2 text-emerald-900 dark:bg-emerald-950/40 dark:text-emerald-100">
        <Check aria-hidden="true" className="mt-0.5 h-4 w-4 shrink-0" />
        {good.length ? fmt(t.ivWentWell, { list: good.map((c) => t[CRITERION_LABEL[c]]).join(", ") }) : t.ivWentWellNone}
      </p>
      {weak || feedback.missedPoints.length ? (
        <div data-testid="c3-iv-to-improve" className="rounded-xl bg-amber-50 px-3 py-2 text-amber-900 dark:bg-amber-950/40 dark:text-amber-100">
          <p className="flex items-center gap-2 font-medium">
            <ArrowRight aria-hidden="true" className="h-4 w-4 shrink-0" />
            {t.ivToImprove}
          </p>
          {weak ? <p className="mt-1">{t[CRITERION_TIP[weak]]}</p> : null}
          {feedback.missedPoints.length ? (
            <>
              <p className="mt-2 font-medium">{t.ivMissed}</p>
              <ul className="mt-1 list-disc pl-5" lang="en">
                {feedback.missedPoints.map((p) => (
                  <li key={p}>{p}</li>
                ))}
              </ul>
            </>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
