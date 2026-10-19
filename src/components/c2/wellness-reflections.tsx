"use client";
import { useEffect, useRef, useState } from "react";
import { BookOpen, Trash2 } from "lucide-react";
import { Button } from "@/components/shared/Button";
import {
  ANALYSIS_MESSAGES,
  MOODS,
  type Mood,
  type ReflectionEntry,
} from "@/lib/c2/reflection";
import { analyzeReflection, loadTextModel } from "@/lib/c2/text-runtime";
import { concerningDisclosure } from "@/lib/c2/assistant";
import { fieldClass, panel, SafetySupport, secondaryText } from "./wellness-ui";

export function WellnessReflections() {
  const [mood, setMood] = useState<Mood | null>(null);
  const [text, setText] = useState("");
  const [analyze, setAnalyze] = useState(false);
  const [entries, setEntries] = useState<ReflectionEntry[]>([]);
  const [result, setResult] = useState<ReflectionEntry | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const generation = useRef(0),
    sequence = useRef(0);
  useEffect(
    () => () => {
      generation.current++;
    },
    [],
  );
  async function reflect() {
    if (!text.trim() && !mood) {
      setError("Choose a mood or add a reflection.");
      return;
    }
    const run = ++generation.current;
    setBusy(true);
    setError("");
    try {
      const analysis =
        analyze && text.trim()
          ? analyzeReflection(text.trim(), await loadTextModel())
          : null;
      if (run !== generation.current) return;
      setResult({
        id: ++sequence.current,
        createdAt: new Date().toISOString(),
        text: text.trim(),
        mood,
        analysis,
      });
    } catch {
      if (run === generation.current)
        setError(
          "The text model could not load. Your draft is still here. Retry or turn off text analysis.",
        );
    } finally {
      if (run === generation.current) setBusy(false);
    }
  }
  function reset() {
    generation.current++;
    setBusy(false);
    setText("");
    setMood(null);
    setResult(null);
    setError("");
  }
  return (
    <div className="grid gap-5 lg:grid-cols-[1.2fr_1fr]">
      <section className={panel} aria-label="Write a reflection">
        <p className="text-xs font-semibold uppercase tracking-widest text-blue-600 dark:text-blue-300">
          Your words, at your pace
        </p>
        <h3 className="mt-3 text-2xl font-semibold">How has today felt?</h3>
        <p className={`mt-3 ${secondaryText}`}>
          Notice a moment, choose a mood, or put it into words. Your writing
          stays in this session.
        </p>
        <fieldset className="mt-6">
          <legend className="text-sm font-medium">A mood, if you like</legend>
          <div className="mt-3 flex flex-wrap gap-2">
            {MOODS.map((item) => (
              <label
                key={item.id}
                className={`cursor-pointer rounded-2xl border p-3 text-center text-sm has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-blue-500 ${mood === item.id ? "border-blue-600 bg-blue-50 dark:bg-blue-950" : "border-slate-200 dark:border-slate-700"}`}
              >
                <input
                  type="radio"
                  name="reflection-mood"
                  className="sr-only"
                  checked={mood === item.id}
                  onChange={() => setMood(item.id)}
                />
                <span
                  className="mb-1 block text-xl text-blue-600 dark:text-blue-300"
                  aria-hidden="true"
                >
                  {item.symbol}
                </span>
                {item.label}
              </label>
            ))}
          </div>
          <Button
            variant="ghost"
            className="mt-1 px-0 text-xs"
            onClick={() => setMood(null)}
          >
            Clear mood
          </Button>
        </fieldset>
        <label
          htmlFor="c2-reflection"
          className="mb-2 mt-5 block text-sm font-medium"
        >
          Your reflection
        </label>
        <textarea
          id="c2-reflection"
          rows={5}
          maxLength={1200}
          value={text}
          onChange={(event) => setText(event.target.value)}
          placeholder="What happened, and what is on your mind?"
          className={fieldClass}
        />
        <p className="mt-1 text-right text-xs text-slate-500">
          {text.length} / 1,200
        </p>
        <label className="mt-3 flex items-start gap-3 text-sm leading-6">
          <input
            type="checkbox"
            className="mt-1 h-4 w-4 accent-blue-600"
            checked={analyze}
            onChange={(event) => setAnalyze(event.target.checked)}
          />
          Explore possible emotions expressed in my English writing, using
          on-device text analysis.
        </label>
        <p className="mt-2 text-xs leading-5 text-slate-500 dark:text-slate-400">
          Optional text labels describe wording, not your actual feelings, a
          diagnosis or a clinical probability.
        </p>
        {error ? (
          <p
            role="alert"
            className="mt-4 text-sm text-rose-700 dark:text-rose-300"
          >
            {error}
          </p>
        ) : null}
        <div className="mt-5 flex gap-3">
          <Button
            disabled={busy}
            onClick={reflect}
            className="disabled:opacity-50"
          >
            {busy ? "Reflecting…" : "Review my reflection"}
          </Button>
          <Button variant="ghost" onClick={reset}>
            Clear draft
          </Button>
        </div>
        {concerningDisclosure(text) ? (
          <div className="mt-5">
            <SafetySupport />
          </div>
        ) : null}
        {result ? (
          <div className="mt-6 space-y-4 border-t border-slate-100 pt-5 dark:border-slate-800">
            <p className="whitespace-pre-wrap break-words text-sm leading-6">
              {result.text || "A moment noticed without words."}
            </p>
            {result.analysis?.status === "ready" ? (
              <div>
                <h4 className="font-medium">
                  Possible emotions expressed in this writing
                </h4>
                <ul className="mt-3 space-y-3">
                  {result.analysis.scores.slice(0, 3).map((item) => (
                    <li key={item.label}>
                      <div className="mb-1 flex justify-between text-sm">
                        <span className="capitalize">
                          {item.label}
                          {item.selected ? " · above threshold" : ""}
                        </span>
                        <span>{Math.round(item.score * 100)}%</span>
                      </div>
                      <div className="h-1.5 rounded-full bg-slate-100 dark:bg-slate-800">
                        <div
                          className="h-full rounded-full bg-blue-500"
                          style={{ width: `${item.score * 100}%` }}
                        />
                      </div>
                    </li>
                  ))}
                </ul>
                {!result.analysis.scores.some((item) => item.selected) ? (
                  <p className={`mt-3 ${secondaryText}`}>
                    No label crossed the model threshold.
                  </p>
                ) : null}
                <p className="mt-3 text-xs leading-5 text-slate-500 dark:text-slate-400">
                  Independent model scores; they do not add to 100% and are not
                  calibrated clinical probabilities.
                </p>
              </div>
            ) : result.analysis ? (
              <p className={secondaryText}>
                {ANALYSIS_MESSAGES[result.analysis.status]}
              </p>
            ) : (
              <p className={secondaryText}>
                Text analysis is off. No emotion estimate was made.
              </p>
            )}
            <Button
              variant="secondary"
              disabled={entries.some((entry) => entry.id === result.id)}
              onClick={() =>
                setEntries((previous) =>
                  previous.some((entry) => entry.id === result.id)
                    ? previous
                    : [result, ...previous],
                )
              }
            >
              {entries.some((entry) => entry.id === result.id)
                ? "Kept in this session"
                : "Keep in this session"}
            </Button>
          </div>
        ) : null}
      </section>
      <section className={panel} aria-label="Session reflections">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold">Your reflections</h3>
          <BookOpen aria-hidden="true" className="h-5 w-5 text-blue-500" />
        </div>
        <p className={`mt-2 ${secondaryText}`}>
          Only entries you choose to keep appear here. They clear when you
          refresh or leave.
        </p>
        {entries.length ? (
          <ul className="mt-4 divide-y divide-slate-100 dark:divide-slate-800">
            {entries.map((entry) => (
              <li key={entry.id} className="py-4">
                <div className="flex items-start justify-between gap-3">
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    {new Date(entry.createdAt).toLocaleTimeString([], {
                      hour: "2-digit",
                      minute: "2-digit",
                    })}{" "}
                    ·{" "}
                    {MOODS.find((item) => item.id === entry.mood)?.label ??
                      "No mood selected"}
                  </p>
                  <button
                    aria-label={`Delete reflection ${entry.id}`}
                    onClick={() =>
                      setEntries((previous) =>
                        previous.filter((item) => item.id !== entry.id),
                      )
                    }
                    className="rounded-full p-2 text-slate-500 hover:bg-slate-100 focus-visible:ring-2 dark:hover:bg-slate-800"
                  >
                    <Trash2 aria-hidden="true" className="h-4 w-4" />
                  </button>
                </div>
                <p className="mt-2 whitespace-pre-wrap break-words text-sm leading-6">
                  {entry.text || "A check-in without a written reflection."}
                </p>
              </li>
            ))}
          </ul>
        ) : (
          <div className="py-12 text-center">
            <BookOpen
              aria-hidden="true"
              className="mx-auto h-8 w-8 text-blue-300"
            />
            <p className="mt-3 text-sm text-slate-500 dark:text-slate-400">
              A little room for your next reflection.
            </p>
          </div>
        )}
      </section>
    </div>
  );
}
