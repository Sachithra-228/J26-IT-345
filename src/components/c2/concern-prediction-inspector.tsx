"use client";

import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/shared/Button";
import { CONCERNS } from "@/lib/c2/assessment";
import { predictConcerns, type ConcernPrediction } from "@/lib/c2/concern-runtime";
import { checkTransformerInput } from "@/lib/c2/transformer-runtime";
import { fieldClass, secondaryText } from "./wellness-ui";

/** Technical inspection stays separate from the student-facing check-in. */
export function ConcernPredictionInspector() {
  const [text, setText] = useState("");
  const [prediction, setPrediction] = useState<ConcernPrediction | null>(null);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const generation = useRef(0);
  const inFlight = useRef(false);
  useEffect(() => () => { generation.current++; }, []);

  async function inspect() {
    if (inFlight.current) return;
    const issue = checkTransformerInput(text);
    if (issue) { setMessage(issue); return; }
    const current = ++generation.current;
    inFlight.current = true;
    setBusy(true);
    setPrediction(null);
    setMessage("Loading or running the main concern model. The first download is about 268 MB; entered text stays in this browser.");
    try {
      const next = await predictConcerns(text);
      if (current !== generation.current) return;
      setPrediction(next);
      setMessage("Prediction complete. These scores are concern-label outputs, not illness probabilities.");
    } catch (error) {
      if (current === generation.current) setMessage(error instanceof Error && error.message.startsWith("Please shorten") ? error.message : "The local concern model could not run. Check the browser export and try again.");
    } finally {
      inFlight.current = false;
      setBusy(false);
    }
  }

  return <details className="rounded-2xl border border-slate-200 p-5 dark:border-slate-700">
    <summary className="cursor-pointer font-medium text-blue-700 dark:text-blue-300">Inspect the main DistilBERT prediction</summary>
    <p className={`mt-3 ${secondaryText}`}>This uses the same five-topic model and inference function as the main check-in. Student confirmations and application rules determine the questions and support matching afterwards.</p>
    <label htmlFor="c2-concern-inspector" className="mb-2 mt-4 block text-sm font-medium">English text for the concern model</label>
    <textarea id="c2-concern-inspector" rows={3} maxLength={1200} className={fieldClass} value={text} onChange={(event) => { generation.current++; setText(event.target.value); setPrediction(null); setMessage(""); }} />
    <Button className="mt-3" disabled={busy || !text.trim()} onClick={inspect}>{busy ? "Running concern model…" : "Inspect concern prediction"}</Button>
    {message ? <p role="status" className={`mt-3 ${secondaryText}`}>{message}</p> : null}
    {prediction ? <div aria-label="Main concern prediction details" className="mt-4 space-y-3">
      <p className="break-all text-xs text-slate-500">{prediction.runId} · {prediction.tokenCount} tokens · threshold {prediction.threshold}</p>
      <div className="overflow-x-auto"><table className="w-full text-left text-sm">
        <caption className="sr-only">DistilBERT concern scores</caption>
        <thead><tr><th scope="col">Concern</th><th scope="col">Score</th><th scope="col">Suggestion</th></tr></thead>
        <tbody>{prediction.scores.map((item) => <tr key={item.topic}><th scope="row" className="py-2 font-normal">{CONCERNS[item.topic].label}</th><td>{item.score.toFixed(7)}</td><td>{item.selected ? "Suggested" : "Below threshold"}</td></tr>)}</tbody>
      </table></div>
      <p className="break-words text-xs">WordPiece token IDs: {prediction.inputIds.join(", ")}</p>
      <p className="break-all text-xs text-slate-500">Checkpoint SHA-256: {prediction.checkpointSha256}</p>
    </div> : null}
  </details>;
}
