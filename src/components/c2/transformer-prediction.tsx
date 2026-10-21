"use client";

import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/shared/Button";
import { checkTransformerInput, predictTransformer, type TransformerPrediction as Prediction } from "@/lib/c2/transformer-runtime";
import { fieldClass, panel, secondaryText } from "./wellness-ui";

export function TransformerPrediction({ checkpoint, ready, browserInfo }: { checkpoint: string; ready: boolean; browserInfo?: { bytes: number; microF1: number } }) {
  const [text, setText] = useState("");
  const [result, setResult] = useState<Prediction | null>(null);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const generation = useRef(0);
  useEffect(() => () => { generation.current++; }, []);
  function change(value: string) {
    generation.current++;
    setText(value);
    setResult(null);
    setError("");
    // Keep an in-flight CPU computation exclusive until it settles. Its stale
    // output is discarded; editing cannot trigger concurrent large-model runs.
  }
  async function predict() {
    const issue = checkTransformerInput(text);
    if (issue) { setError(issue); return; }
    const version = ++generation.current;
    setBusy(true);
    setError("");
    setResult(null);
    try {
      const next = await predictTransformer(text, checkpoint);
      if (generation.current === version) setResult(next);
    } catch {
      if (generation.current === version) setError("The local model could not run. Reload and retry after its browser export is available.");
    } finally {
      setBusy(false);
    }
  }
  return <section className={panel} aria-label="Live DistilBERT prediction">
    <h3 className="text-xl font-semibold">Try your fine-tuned DistilBERT</h3>
    <p className={`mt-3 ${secondaryText}`}>The selected model runs in this browser. It downloads its model files from this site when requested; your entered text is not sent to a prediction server or added to training data. English only. The first load is larger than the classical baseline.</p>
    {browserInfo ? <p className={`mt-3 ${secondaryText}`}>Browser export: full precision (FP32) · {(browserInfo.bytes / 1_000_000).toFixed(1)} MB model · held-out micro-F1 {browserInfo.microF1.toFixed(4)} at the original selected threshold. The training results appear below. This export retains the trained weights without integer compression.</p> : null}
    {!ready ? <p role="status" className={`mt-4 ${secondaryText}`}>The training results are recorded. The verified browser export is not available on this checkout yet.</p> : <>
      <label htmlFor="c2-transformer-text" className="mb-2 mt-5 block text-sm font-medium">English text for DistilBERT</label>
      <textarea id="c2-transformer-text" rows={4} maxLength={1200} value={text} onChange={(event) => change(event.target.value)} className={fieldClass} placeholder="Enter a sentence to analyse…" />
      <div className="mt-4 flex flex-wrap gap-3"><Button onClick={predict} disabled={busy || !text.trim()}>{busy ? "Loading or running DistilBERT…" : "Run fine-tuned DistilBERT"}</Button><Button variant="secondary" onClick={() => change("")}>Clear DistilBERT input</Button></div>
      {error ? <p role="alert" className="mt-4 text-sm text-rose-700 dark:text-rose-300">{error}</p> : null}
      <div aria-live="polite" className="mt-5">{result ? <div className="space-y-4">
        <h4 className="font-semibold">Prediction from your fine-tuned checkpoint</h4>
        {result.scores.slice(0, 5).map((item) => <div key={item.label}><div className="mb-1 flex justify-between gap-3 text-sm"><span className="capitalize">{item.label}</span><span>{item.score.toFixed(4)}{item.selected ? " · selected" : " · below threshold"}</span></div><div className="h-2 rounded-full bg-slate-100 dark:bg-slate-800"><div className="h-2 rounded-full bg-indigo-500" style={{ width: `${item.score * 100}%` }} /></div></div>)}
        {!result.scores.some((score) => score.selected) ? <p className={secondaryText}>No label crossed the selected threshold.</p> : null}
        <p className="text-xs text-slate-500">{result.runId} · {result.tokenCount} tokens including special tokens · threshold {result.threshold}</p>
        <details><summary className="cursor-pointer text-xs text-blue-700 dark:text-blue-300">Inspect the exact model input and all scores</summary><p className="mt-3 break-words font-mono text-xs">WordPiece token IDs: {result.inputIds.join(", ")}</p><table className="mt-3 w-full text-left text-xs"><caption className="sr-only">All browser DistilBERT emotion scores</caption><thead><tr><th scope="col" className="py-2">Emotion</th><th scope="col" className="py-2">Score</th></tr></thead><tbody>{result.scores.map((score) => <tr key={score.label}><th scope="row" className="py-1 font-normal">{score.label}</th><td className="py-1">{score.score.toFixed(7)}</td></tr>)}</tbody></table></details>
      </div> : <p className={secondaryText}>Emotion-label scores appear here after inference. They are not clinical probabilities, diagnoses or referral decisions.</p>}</div>
    </>}
  </section>;
}
