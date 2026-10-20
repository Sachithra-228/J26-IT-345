"use client";

import { useEffect, useRef, useState } from "react";
import {
  ArrowLeft,
  ArrowRight,
  Check,
  ClipboardList,
  LockKeyhole,
} from "lucide-react";
import { Button } from "@/components/shared/Button";
import {
  Assessment,
  Answer,
  PHQ9,
  GAD7,
  FREQUENCY,
  RECALL_PROMPT,
  QUESTIONNAIRE_VERSION,
  type FollowUp,
  followUps,
  scoreScale,
  selfHarmResponse,
  assessmentSafetySupport,
  supportSuggestion,
} from "@/lib/c2/assessment";
import {
  SafetySupport,
  panel,
  secondaryText,
  choiceClass,
} from "./wellness-ui";
import { SUPPORT_QUESTIONS } from "@/lib/c2/support-runtime";
import {
  concernExplanation,
  followupTarget,
  nextConcernQuestion,
  resolvedConcernTopics,
  type ConcernAnalysis,
} from "@/lib/c2/concern-routing";
import {
  BUNDLED_FOLLOWUP_BANK,
  loadFollowupBank,
} from "@/lib/c2/followup-bank";
import { WellnessConcernInput } from "./wellness-concern-input";
import { ScreeningResultCard } from "./screening-result-card";
import { WellnessCommunities } from "./wellness-communities";

type Phase = "intro" | "phq9" | "gad7" | "narrative" | "context" | "results";
export function WellnessAssessment({
  onComplete,
  onSupport,
  onChat,
  onEdit,
  onPlan,
  onPrepare,
  onCommunity,
}: {
  onComplete: (result: Assessment) => void;
  onSupport: () => void;
  onChat: () => void;
  onEdit?: () => void;
  onPlan?: () => void;
  onPrepare?: () => void;
  onCommunity?: (id?: string) => void;
}) {
  const [phase, setPhase] = useState<Phase>("intro");
  const [index, setIndex] = useState(0);
  const [phq9, setPhq9] = useState<Answer[]>(Array(9).fill(null));
  const [gad7, setGad7] = useState<Answer[]>(Array(7).fill(null));
  const [context, setContext] = useState<Record<string, string>>({});
  const [result, setResult] = useState<Assessment | null>(null);
  const [safetyChoice, setSafetyChoice] = useState("");
  const [disclosedSafety, setDisclosedSafety] = useState(false);
  const title = useRef<HTMLHeadingElement>(null);
  const [announcement, setAnnouncement] = useState("");
  const [description, setDescription] = useState("");
  const [analysis, setAnalysis] = useState<ConcernAnalysis | null>(null);
  const [queue, setQueue] = useState<FollowUp[]>([]);
  const [questionBank, setQuestionBank] = useState<{
    bank: typeof BUNDLED_FOLLOWUP_BANK;
    source: "database" | "bundled";
  }>({ bank: BUNDLED_FOLLOWUP_BANK, source: "bundled" });
  const loadedQuestionBank = useRef<{
    bank: typeof BUNDLED_FOLLOWUP_BANK;
    source: "database" | "bundled";
  }>({ bank: BUNDLED_FOLLOWUP_BANK, source: "bundled" });
  const modelRouting = analysis !== null;
  const questions = modelRouting ? queue : followUps(phq9, gad7);
  const concernReported = selfHarmResponse(phq9) === "reported";
  useEffect(() => {
    if (phase !== "intro") title.current?.focus();
  }, [phase, index]);

  function finish(contextValues = context) {
    const activeContext = Object.fromEntries(
      questions
        .filter((q) => contextValues[q.id])
        .map((q) => [q.id, contextValues[q.id]]),
    );
    const completed = {
      safetySupportRequested: disclosedSafety,
      phq9: [...phq9],
      gad7: [...gad7],
      context: activeContext,
      completedAt: new Date().toISOString(),
      version: QUESTIONNAIRE_VERSION,
      ...(analysis ? { concernAnalysis: analysis } : {}),
      questionPath: questions.map(({ id, text, reason }) => ({
        id,
        text,
        reason,
      })),
      contextRouting: analysis?.prediction
        ? ("distilbert" as const)
        : analysis
          ? ("student-topics" as const)
          : ("rules" as const),
      ...(analysis
        ? {
            questionBankVersion: questionBank.bank.version,
            questionBankSource: questionBank.source,
            supportTopics: resolvedConcernTopics(
              analysis,
              activeContext,
              questionBank.bank,
            ),
          }
        : {}),
    };
    setResult(completed);
    onComplete(completed);
    setPhase("results");
    setAnnouncement("Your screening summary is ready.");
  }
  function next(contextValues = context, skippedCore = false) {
    if (phase === "phq9" && index === 8) {
      setPhase("gad7");
      setIndex(0);
    } else if (phase === "gad7" && index === 6) {
      setContext({});
      setQueue([]);
      const canAnalyse =
        !skippedCore &&
        [...phq9, ...gad7].every((v) => v !== null) &&
        !concernReported;
      if (!canAnalyse) setAnalysis(null);
      setPhase(canAnalyse ? "narrative" : "context");
      setIndex(0);
    } else if (phase === "context" && index === questions.length - 1) {
      const question = analysis
        ? nextConcernQuestion(
            analysis,
            contextValues,
            queue.map((q) => q.id),
            questionBank.bank,
            phq9,
            gad7,
          )
        : null;
      if (question) {
        setQueue((previous) => [...previous, question]);
        setIndex((previous) => previous + 1);
      } else finish(contextValues);
    } else setIndex((previous) => previous + 1);
  }
  function back() {
    if (index > 0) setIndex((previous) => previous - 1);
    else if (phase === "gad7") {
      setPhase("phq9");
      setIndex(8);
    } else if (phase === "context") {
      setPhase(analysis ? "narrative" : "gad7");
      setIndex(analysis ? 0 : 6);
    } else setPhase("intro");
  }
  const scale = phase === "phq9" ? phq9 : gad7;
  const core = phase === "phq9" || phase === "gad7";
  const coreItems = phase === "phq9" ? PHQ9 : GAD7;
  const current = phase === "context" ? questions[index] : undefined;
  const chosen = core
    ? scale[index]
    : current
      ? context[current.id]
      : undefined;
  const progress =
    phase === "intro"
      ? 0
      : phase === "results"
        ? 100
        : phase === "phq9"
          ? (index / 16) * 75
          : phase === "gad7"
            ? ((index + 9) / 16) * 75
            : 75 +
              (index /
                (modelRouting
                  ? followupTarget(analysis!, context, questionBank.bank)
                  : questions.length)) *
                25;
  const summary = result ? supportSuggestion(result) : null;

  return (
    <div className="space-y-5">
      <p className="sr-only" role="status">
        {announcement}
      </p>
      {phase === "intro" ? (
        <section className={`${panel} overflow-hidden`}>
          <span className="inline-flex rounded-2xl bg-blue-50 p-3 text-blue-600 dark:bg-blue-950 dark:text-blue-300">
            <ClipboardList aria-hidden="true" className="h-6 w-6" />
          </span>
          <p className="mt-5 text-xs font-semibold uppercase tracking-widest text-blue-600 dark:text-blue-300">
            A clearer starting point
          </p>
          <h3 className="mt-3 text-2xl font-semibold">
            Let’s check in with you.
          </h3>
          <p className={`mt-3 max-w-2xl ${secondaryText}`}>
            Answer nine questions about depressive symptoms and seven about
            anxiety symptoms, then five to nine additional questions chosen from
            your answers. Take your time; you can go back or skip an item.
          </p>
          <div className="my-6 grid gap-3 sm:grid-cols-3">
            {[
              ["01", "Your answers", "PHQ-9 and GAD-7 · last 2 weeks"],
              ["02", "Your context", "Relevant follow-up questions"],
              ["03", "Your next step", "A summary and support choices"],
            ].map(([n, t, d]) => (
              <div
                key={n}
                className="rounded-2xl bg-slate-50 p-4 dark:bg-slate-800"
              >
                <span className="text-xs font-semibold text-blue-600 dark:text-blue-300">
                  {n}
                </span>
                <h4 className="mt-2 font-medium">{t}</h4>
                <p className="mt-1 text-xs leading-5 text-slate-500 dark:text-slate-400">
                  {d}
                </p>
              </div>
            ))}
          </div>
          <div className={`mb-6 flex items-start gap-2 ${secondaryText}`}>
            <LockKeyhole aria-hidden="true" className="mt-1 h-4 w-4 shrink-0" />
            <p>
              Your answers stay in this page session and clear on refresh.
              Nothing is shared with staff. This is screening information, not a
              diagnosis. The service is not monitored.
            </p>
          </div>
          <p className={`mb-5 ${secondaryText}`}>
            You can also tell us what’s on your mind. Review your suggested
            topics to personalise the next questions, or choose topics yourself.
          </p>
          <Button
            onClick={() => {
              void loadFollowupBank().then((loaded) => {
                loadedQuestionBank.current = loaded;
              });
              setPhase("phq9");
              setIndex(0);
            }}
          >
            Begin my check-in{" "}
            <ArrowRight aria-hidden="true" className="ml-2 inline h-4 w-4" />
          </Button>
          <p className="mt-3 text-xs text-slate-500 dark:text-slate-400">
            For adults aged 18 and over. English questionnaires. Select Begin to
            continue with these privacy choices.
          </p>
        </section>
      ) : null}
      {phase === "narrative" ? (
        <WellnessConcernInput
          onSupport={onSupport}
          description={description}
          analysis={analysis}
          onBack={() => {
            setPhase("gad7");
            setIndex(6);
          }}
          onContinue={(confirmed, text) => {
            setDisclosedSafety(confirmed.safetySupportRequested === true);
            const selectedBank = loadedQuestionBank.current;
            onEdit?.();
            setResult(null);
            setAnalysis(confirmed);
            setDescription(text);
            setContext({});
            setQuestionBank(selectedBank);
            setQueue([
              nextConcernQuestion(
                confirmed,
                {},
                [],
                selectedBank.bank,
                phq9,
                gad7,
              )!,
            ]);
            setIndex(0);
            setPhase("context");
          }}
        />
      ) : null}

      {core || phase === "context" ? (
        <section className={panel}>
          {disclosedSafety && !concernReported ? (
            <div className="mb-5">
              <SafetySupport />
            </div>
          ) : null}
          <div className="flex flex-wrap items-center justify-between gap-2 text-xs font-medium text-slate-500 dark:text-slate-400">
            <span>
              {phase === "phq9"
                ? "PHQ-9 · depressive symptoms"
                : phase === "gad7"
                  ? "GAD-7 · anxiety symptoms"
                  : "A little more context"}
            </span>
            <span>
              Question {index + 1} of{" "}
              {core
                ? coreItems.length
                : modelRouting
                  ? "up to 9"
                  : questions.length}
            </span>
          </div>
          <div
            role="progressbar"
            aria-label="Check-in progress"
            aria-valuemin={0}
            aria-valuemax={100}
            aria-valuenow={Math.round(progress)}
            className="my-5 h-1.5 overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800"
          >
            <div
              className="h-full rounded-full bg-gradient-to-r from-blue-600 to-sky-400"
              style={{ width: `${progress}%` }}
            />
          </div>
          {core ? (
            <p className={`mb-4 ${secondaryText}`}>{RECALL_PROMPT}</p>
          ) : (
            <p className={`mb-4 ${secondaryText}`}>{current?.reason}</p>
          )}
          <h3
            ref={title}
            tabIndex={-1}
            className="scroll-mt-32 text-xl font-semibold leading-8 outline-none sm:text-2xl"
          >
            {core ? coreItems[index] : current?.text}
          </h3>
          <fieldset className="mt-6 grid gap-3 sm:grid-cols-2">
            <legend className="sr-only">
              {core ? coreItems[index] : current?.text}
            </legend>
            {(core ? FREQUENCY : (current?.options ?? [])).map(
              (option, optionIndex) => {
                const selected = core
                  ? chosen === optionIndex
                  : chosen === option;
                return (
                  <label
                    key={`${phase}-${index}-${option}`}
                    className={`${choiceClass} ${selected ? "border-blue-600 bg-blue-50 text-blue-800 dark:bg-blue-950 dark:text-blue-100" : "border-slate-200 hover:border-blue-300 dark:border-slate-700"}`}
                  >
                    <input
                      type="radio"
                      name={`c2-${phase}-${index}`}
                      checked={selected}
                      onChange={() => {
                        if (core) {
                          onEdit?.();
                          setResult(null);
                          const change = (previous: Answer[]) =>
                            previous.map((value, i) =>
                              i === index ? (optionIndex as Answer) : value,
                            );
                          (phase === "phq9" ? setPhq9 : setGad7)(change);
                        } else if (current) {
                          if (modelRouting) {
                            const retained = queue.slice(0, index + 1);
                            setQueue(retained);
                            setContext((previous) => ({
                              ...Object.fromEntries(
                                Object.entries(previous).filter(([key]) =>
                                  retained.some((q) => q.id === key),
                                ),
                              ),
                              [current.id]: option,
                            }));
                          } else
                            setContext((previous) => ({
                              ...previous,
                              [current.id]: option,
                            }));
                        }
                      }}
                      className="h-4 w-4 shrink-0 accent-blue-600"
                    />
                    {option}
                  </label>
                );
              },
            )}
          </fieldset>
          {phase === "phq9" && index === 8 && concernReported ? (
            <div className="mt-5 space-y-4">
              <SafetySupport reported />
              <fieldset>
                <legend className="mb-3 text-sm font-medium">
                  Do you feel able to stay safe right now?
                </legend>
                <div className="flex flex-wrap gap-3">
                  {[
                    "I feel able to stay safe",
                    "I am unsure or need immediate help",
                    "Prefer not to answer",
                  ].map((value) => (
                    <label
                      key={value}
                      className={`${choiceClass} border-amber-300 dark:border-amber-800`}
                    >
                      <input
                        type="radio"
                        name="safety-check"
                        checked={safetyChoice === value}
                        onChange={() => setSafetyChoice(value)}
                        className="accent-blue-600"
                      />
                      {value}
                    </label>
                  ))}
                </div>
              </fieldset>
              {safetyChoice === "I am unsure or need immediate help" ? (
                <p
                  role="alert"
                  className="font-medium text-amber-800 dark:text-amber-200"
                >
                  Please use the immediate-help options above now. This check-in
                  cannot contact emergency help for you.
                </p>
              ) : null}
            </div>
          ) : null}
          <div className="mt-7 flex flex-wrap items-center justify-between gap-3 border-t border-slate-100 pt-5 dark:border-slate-800">
            <Button variant="ghost" onClick={back}>
              <ArrowLeft aria-hidden="true" className="mr-2 inline h-4 w-4" />
              Back
            </Button>
            <div className="flex flex-wrap items-center gap-3">
              <Button
                variant="ghost"
                onClick={() => {
                  onEdit?.();
                  setResult(null);
                  if (core)
                    (phase === "phq9" ? setPhq9 : setGad7)((previous) =>
                      previous.map((value, i) => (i === index ? null : value)),
                    );
                  if (!core && current) {
                    const retained = modelRouting
                      ? queue.slice(0, index + 1)
                      : questions;
                    const updated = Object.fromEntries(
                      Object.entries(context).filter(([key]) =>
                        retained.some((q) => q.id === key),
                      ),
                    );
                    delete updated[current.id];
                    if (modelRouting && index < queue.length - 1) {
                      setQueue(retained);
                      setContext(updated);
                      setIndex(index + 1);
                      const question = analysis
                        ? nextConcernQuestion(
                            analysis,
                            updated,
                            retained.map((q) => q.id),
                            questionBank.bank,
                            phq9,
                            gad7,
                          )
                        : null;
                      if (question) setQueue([...retained, question]);
                      else finish(updated);
                      return;
                    }
                    setContext(updated);
                    next(updated);
                  } else next(context, true);
                }}
              >
                Skip this question
              </Button>
              <Button
                disabled={chosen == null || chosen === ""}
                className="disabled:cursor-not-allowed disabled:opacity-40"
                onClick={() => next()}
              >
                {phase === "context" &&
                (analysis
                  ? !nextConcernQuestion(
                      analysis,
                      context,
                      queue.map((q) => q.id),
                      questionBank.bank,
                      phq9,
                      gad7,
                    ) && index === queue.length - 1
                  : index === questions.length - 1)
                  ? "See my summary"
                  : "Continue"}
                <ArrowRight
                  aria-hidden="true"
                  className="ml-2 inline h-4 w-4"
                />
              </Button>
            </div>
          </div>
          {phase === "context" ? (
            <div className="mt-4">
              <p className="text-xs text-slate-500 dark:text-slate-400">
                These optional questions help us understand your situation and
                what support you want. Your topics and answers guide what comes
                next; they do not change your questionnaire scores.
              </p>
              {analysis ? (
                <Button
                  variant="ghost"
                  className="mt-3"
                  onClick={() => {
                    onEdit?.();
                    setResult(null);
                    setPhase("narrative");
                    setIndex(0);
                  }}
                >
                  Review description and topics
                </Button>
              ) : null}
            </div>
          ) : null}
        </section>
      ) : null}

      {phase === "results" && result && summary ? (
        <div className="space-y-5">
          {assessmentSafetySupport(result) ? (
            <SafetySupport
              reported={selfHarmResponse(result.phq9) === "reported"}
            />
          ) : null}
          <section className={panel}>
            <p className="text-xs font-semibold uppercase tracking-widest text-blue-600 dark:text-blue-300">
              Your screening summary
            </p>
            <h3
              ref={title}
              tabIndex={-1}
              className="mt-3 scroll-mt-32 text-2xl font-semibold outline-none"
            >
              Your symptom levels and next steps.
            </h3>
            <p className={`mt-3 ${secondaryText}`}>
              These results describe your answers over the last two weeks. They
              do not confirm depression, an anxiety disorder or another
              diagnosis.
            </p>
            <div className="mt-6 grid gap-4 sm:grid-cols-2">
              {(["phq9", "gad7"] as const).map((kind) => {
                return (
                  <ScreeningResultCard
                    key={kind}
                    kind={kind}
                    answers={result[kind]}
                    onReview={() => {
                      const value = scoreScale(kind, result[kind]);
                      onEdit?.();
                      setResult(null);
                      setPhase(kind);
                      setIndex(value.missing.length ? value.missing[0] - 1 : 0);
                    }}
                  />
                );
              })}
            </div>
            {selfHarmResponse(result.phq9) === "unanswered" ? (
              <p className={`mt-4 ${secondaryText}`}>
                PHQ-9 question 9 was not answered. No conclusion about safety
                can be drawn from this assessment.
              </p>
            ) : null}
            <div className="mt-5 rounded-2xl border border-blue-100 bg-blue-50 p-5 dark:border-blue-900 dark:bg-blue-950">
              <h4 className="font-semibold">{summary.title}</h4>
              <p className={`mt-2 ${secondaryText}`}>{summary.body}</p>
              <div className="mt-5 flex flex-wrap gap-3">
                <Button onClick={onSupport}>
                  Find support{" "}
                  <ArrowRight
                    aria-hidden="true"
                    className="ml-2 inline h-4 w-4"
                  />
                </Button>
                {onPlan ? (
                  <Button variant="secondary" onClick={onPlan}>
                    Build my wellness plan
                  </Button>
                ) : null}
                {onPrepare ? (
                  <Button variant="secondary" onClick={onPrepare}>
                    Prepare appointment notes
                  </Button>
                ) : null}
                <Button variant="ghost" onClick={onChat}>
                  Talk it through
                </Button>
              </div>
              <p className="mt-4 text-xs leading-5 text-slate-500 dark:text-slate-400">
                Symptom levels come from PHQ-9 and GAD-7 answers. DistilBERT
                suggests support topics to help personalise follow-up questions
                and activities; it does not diagnose an illness.
              </p>
            </div>
            {onCommunity ? (
              <div className="mt-5">
                <WellnessCommunities
                  assessment={result}
                  compact
                  onBrowse={onCommunity}
                  onSupport={onSupport}
                />
              </div>
            ) : null}
            <div
              className="mt-5 rounded-2xl border border-slate-200 p-5 dark:border-slate-700"
              aria-label="Personalised explanation"
            >
              <h4 className="font-semibold">
                How your answers led to this summary
              </h4>
              <ul className="mt-3 list-disc space-y-2 pl-5">
                {concernExplanation(result).map((line) => (
                  <li key={line} className={secondaryText}>
                    {line}
                  </li>
                ))}
              </ul>
              {result.questionPath?.length ? (
                <details className="mt-4">
                  <summary className="cursor-pointer text-sm font-medium text-blue-700 dark:text-blue-300">
                    Why these follow-up questions?
                  </summary>
                  <ul className="mt-3 space-y-3">
                    {result.questionPath.map((item) => (
                      <li key={item.id} className={secondaryText}>
                        <strong>
                          {item.text ??
                            SUPPORT_QUESTIONS.find((q) => q.id === item.id)
                              ?.text}
                        </strong>
                        <br />
                        {item.reason}
                      </li>
                    ))}
                  </ul>
                </details>
              ) : null}
            </div>
            {Object.keys(result.context).length ? (
              <div className="mt-5">
                <h4 className="font-semibold">The context you added</h4>
                <dl className="mt-2 divide-y divide-slate-100 dark:divide-slate-800">
                  {(result.questionPath ?? [])
                    .filter((q) => result.context[q.id])
                    .map((q) => (
                      <div key={q.id} className="py-3 text-sm">
                        <dt className="text-slate-500 dark:text-slate-400">
                          {q.text}
                        </dt>
                        <dd className="mt-1 font-medium">
                          {result.context[q.id]}
                        </dd>
                      </div>
                    ))}
                </dl>
              </div>
            ) : null}
            <p className="mt-4 flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
              <Check aria-hidden="true" className="h-4 w-4" />
              Available in this session. Not shared or saved to your account.
            </p>
          </section>
        </div>
      ) : null}
    </div>
  );
}
