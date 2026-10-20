"use client";

import { useEffect, useRef, useState } from "react";
import { ArrowLeft, ArrowRight, Sparkles } from "lucide-react";
import { Button } from "@/components/shared/Button";
import { CONCERNS, type Concern } from "@/lib/c2/assessment";
import {
  predictConcerns,
  type ConcernPrediction,
} from "@/lib/c2/concern-runtime";
import { checkTransformerInput } from "@/lib/c2/transformer-runtime";
import type { ConcernAnalysis } from "@/lib/c2/concern-routing";
import {
  choiceClass,
  fieldClass,
  panel,
  secondaryText,
  SafetySupport,
} from "./wellness-ui";
import { concerningDisclosure } from "@/lib/c2/assistant";

export function WellnessConcernInput({
  description,
  analysis,
  onContinue,
  onBack,
  onSupport,
}: {
  description: string;
  analysis: ConcernAnalysis | null;
  onContinue: (analysis: ConcernAnalysis, text: string) => void;
  onBack: () => void;
  onSupport?: () => void;
}) {
  const [text, setText] = useState(description);
  const [prediction, setPrediction] = useState<ConcernPrediction | null>(
    analysis?.prediction ?? null,
  );
  const [confirmed, setConfirmed] = useState<Concern[]>(
    analysis?.confirmed ?? [],
  );
  const [safetyRequested, setSafetyRequested] = useState(
    analysis?.safetySupportRequested ?? false,
  );
  const showSafety = safetyRequested || concerningDisclosure(text);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const run = useRef(0);
  const inFlight = useRef(false);
  useEffect(
    () => () => {
      run.current++;
    },
    [],
  );
  function change(value: string) {
    run.current++;
    setText(value);
    setPrediction(null);
    setConfirmed([]);
    setMessage("");
  }
  async function analyse() {
    if (inFlight.current) return;
    const problem = checkTransformerInput(text);
    if (problem) {
      setMessage(problem);
      return;
    }
    const id = ++run.current;
    inFlight.current = true;
    setBusy(true);
    setPrediction(null);
    setConfirmed([]);
    setMessage(
      "Preparing your topic suggestions. The first use downloads about 268 MB and may take a moment. Your words stay on this device.",
    );
    try {
      const result = await predictConcerns(text);
      if (id !== run.current) return;
      setPrediction(result);
      setConfirmed(
        result.scores.filter((item) => item.selected).map((item) => item.topic),
      );
      setMessage(
        "Review the suggested topics below. Change any that do not fit before continuing.",
      );
    } catch (error) {
      if (id === run.current)
        setMessage(
          error instanceof Error && error.message.startsWith("Please shorten")
            ? error.message
            : "Text analysis could not run. You can choose your topics below or continue without it.",
        );
    } finally {
      inFlight.current = false;
      setBusy(false);
    }
  }
  function continueWithTopics() {
    run.current++;
    onContinue(
      {
        prediction,
        confirmed,
        source: prediction ? "distilbert-confirmed" : "student-selected",
        safetySupportRequested: showSafety,
      },
      text,
    );
  }
  return (
    <section className={panel} aria-label="Personalise your check-in">
      <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-widest text-blue-600 dark:text-blue-300">
        <Sparkles className="h-4 w-4" aria-hidden="true" />
        Make it personal
      </div>
      <h3 className="mt-3 text-2xl font-semibold">
        What would you like us to understand?
      </h3>
      <p className={`mt-3 ${secondaryText}`}>
        Tell us what has been on your mind. We’ll suggest topics for you to
        review, then tailor the next questions and support options to what fits.
      </p>
      {analysis ? (
        <p className={`mt-3 ${secondaryText}`}>
          Continuing from this review restarts the optional follow-up questions.
          Your questionnaire answers are retained.
        </p>
      ) : null}
      <label
        htmlFor="c2-concern-description"
        className="mb-2 mt-5 block text-sm font-medium"
      >
        Your situation in your own words
      </label>
      <textarea
        id="c2-concern-description"
        className={fieldClass}
        rows={4}
        maxLength={1200}
        value={text}
        onChange={(event) => change(event.target.value)}
        placeholder="For example, what has been affecting your day or your studies?"
      />
      <div className="mt-2 flex flex-wrap justify-between gap-2 text-xs leading-5 text-slate-500 dark:text-slate-400">
        <span>Optional · English · private to this session</span>
        <span>{text.length} / 1,200</span>
      </div>
      <Button
        className="mt-4"
        onClick={analyse}
        disabled={busy || !text.trim()}
      >
        {busy ? "Finding your topics…" : "Suggest topics"}
      </Button>
      {message ? (
        <p role="status" className={`mt-3 ${secondaryText}`}>
          {message}
        </p>
      ) : null}
      <div className="mt-5 rounded-2xl border border-amber-200 p-4 dark:border-amber-900">
        <label className="flex cursor-pointer items-start gap-3 text-sm font-medium">
          <input
            type="checkbox"
            className="mt-1 h-4 w-4 accent-amber-700"
            checked={safetyRequested}
            onChange={(event) => setSafetyRequested(event.target.checked)}
          />
          I would like support with self-harm or staying safe
        </label>
        <p className={`ml-7 mt-2 ${secondaryText}`}>
          You can open this support at any time. It does not depend on a topic
          suggestion or questionnaire score. You do not need to describe any
          actions or injuries.
        </p>
      </div>
      {showSafety ? (
        <div className="mt-4 space-y-3">
          <SafetySupport />
          {onSupport ? (
            <Button onClick={onSupport}>Find human support now</Button>
          ) : null}
        </div>
      ) : null}
      <fieldset className="mt-6">
        <legend className="font-semibold">
          Which topics fit your situation?
        </legend>
        <p className={`mt-2 ${secondaryText}`}>
          {prediction
            ? "Your suggestions are selected below. Add or remove anything so the next questions reflect you."
            : "Choose topics yourself, or use the suggestions above. Leave them unchecked if none fit."}
        </p>
        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          {(Object.keys(CONCERNS) as Concern[]).map((topic) => (
            <label
              key={topic}
              className={`${choiceClass} ${confirmed.includes(topic) ? "border-blue-600 bg-blue-50 dark:bg-blue-950" : "border-slate-200 dark:border-slate-700"}`}
            >
              <input
                type="checkbox"
                checked={confirmed.includes(topic)}
                onChange={(event) =>
                  setConfirmed((previous) =>
                    event.target.checked
                      ? [...previous, topic]
                      : previous.filter((value) => value !== topic),
                  )
                }
                className="h-4 w-4 accent-blue-600"
              />
              {CONCERNS[topic].label}
            </label>
          ))}
        </div>
      </fieldset>
      <div className="mt-7 flex flex-wrap justify-between gap-3 border-t border-slate-100 pt-5 dark:border-slate-800">
        <Button
          variant="ghost"
          onClick={() => {
            run.current++;
            onBack();
          }}
        >
          <ArrowLeft className="mr-2 inline h-4 w-4" aria-hidden="true" />
          Back to questionnaire
        </Button>
        <Button disabled={busy} onClick={continueWithTopics}>
          Use these topics
          <ArrowRight className="ml-2 inline h-4 w-4" aria-hidden="true" />
        </Button>
        <Button
          variant="ghost"
          onClick={() => {
            run.current++;
            onContinue(
              {
                prediction: null,
                confirmed: [],
                source: "student-selected",
                safetySupportRequested: showSafety,
              },
              "",
            );
          }}
        >
          Continue without text analysis
        </Button>
      </div>
    </section>
  );
}
