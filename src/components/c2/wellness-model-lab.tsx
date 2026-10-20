"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { ArrowLeft, ArrowRight, BrainCircuit, Code2, FlaskConical } from "lucide-react";
import { Button } from "@/components/shared/Button";
import { analyzeReflection, loadTextModel, type TextAnalysis } from "@/lib/c2/text-runtime";
import { ANALYSIS_MESSAGES } from "@/lib/c2/reflection";
import { fieldClass, panel, secondaryText } from "./wellness-ui";

type Evaluation = typeof import("../../../docs/c2/evidence/text-evaluation.json");
type Props = {
  evaluation: Evaluation;
  trainingCode: string;
  inferenceCode: string;
  modelHash: string;
};
const MODEL_NAME = "TF-IDF + One-vs-Rest Logistic Regression";

export function SourceCode({ name, source }: { name: string; source: string }) {
  return (
    <details className="rounded-2xl border border-slate-200 dark:border-slate-700">
      <summary className="cursor-pointer break-words px-4 py-4 text-sm font-medium focus-visible:ring-2 focus-visible:ring-blue-500">
        {name}
      </summary>
      <div className="overflow-x-auto rounded-b-2xl bg-slate-950 p-4 text-slate-100" tabIndex={0} role="region" aria-label={`${name} source code`}>
        <pre className="text-xs leading-6"><code>{source.split("\n").map((line, index) => (
          <span key={index} className="block"><span aria-hidden="true" className="mr-5 inline-block w-8 select-none text-right text-slate-500">{index + 1}</span>{line || " "}</span>
        ))}</code></pre>
      </div>
    </details>
  );
}

export function WellnessModelLab({ evaluation, trainingCode, inferenceCode, modelHash }: Props) {
  const [text, setText] = useState("");
  const [result, setResult] = useState<TextAnalysis | null>(null);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const generation = useRef(0);
  useEffect(() => () => { generation.current++; }, []);

  async function predict() {
    const run = ++generation.current;
    setBusy(true);
    setError("");
    setResult(null);
    try {
      const model = await loadTextModel();
      if (model.version !== evaluation.modelVersion) throw new Error("Model/report version mismatch");
      const next = analyzeReflection(text.trim(), model);
      if (run === generation.current) setResult(next);
    } catch {
      if (run === generation.current) setError("The model could not load or does not match this report. Retry after reloading the page.");
    } finally {
      if (run === generation.current) setBusy(false);
    }
  }
  function changeText(value: string) {
    generation.current++;
    setBusy(false);
    setText(value);
    setResult(null);
    setError("");
  }
  return (
    <section aria-label="C2 research and machine learning" className="space-y-6 text-slate-900 dark:text-slate-100">
      <Link href="/wellness" className="inline-flex items-center gap-2 text-sm font-medium text-blue-700 underline dark:text-blue-300">
        <ArrowLeft className="h-4 w-4" aria-hidden="true" /> Back to wellness
      </Link>
      <header className="rounded-3xl bg-gradient-to-br from-indigo-800 via-blue-700 to-sky-600 px-6 py-8 text-white sm:px-8">
        <p className="flex items-center gap-2 text-xs font-semibold uppercase tracking-widest text-blue-100"><FlaskConical className="h-4 w-4" aria-hidden="true" /> C2 · Research & ML</p>
        <h1 className="mt-4 text-3xl font-semibold tracking-tight sm:text-4xl">See the model behind the words.</h1>
        <p className="mt-4 max-w-2xl text-sm leading-6 text-blue-50">Explore live inference, the recorded training experiment and its source code. Member 02 · D. G. A. Indeepa · IT23273412.</p>
        <div className="mt-5 flex flex-wrap gap-2 text-xs"><span className="rounded-full bg-white/15 px-3 py-2">Trained in this project</span><span className="rounded-full bg-white/15 px-3 py-2">Python training → browser inference</span></div>
      </header>
      <section className={panel} aria-label="Model identity">
        <p className="text-xs font-semibold uppercase tracking-widest text-blue-600 dark:text-blue-300">The model name</p>
        <h2 className="mt-3 text-2xl font-semibold">{MODEL_NAME}</h2>
        <p className={`mt-3 ${secondaryText}`}>A supervised, multilabel English text emotion classifier: 27 emotions plus neutral. The classifier weights and word features were learned here from labelled public data. No pretrained language model or downloaded classifier weights are used.</p>
        <p className="mt-3 break-all font-mono text-xs text-slate-500 dark:text-slate-400">Version: {evaluation.modelVersion}</p>
        <p className={`mt-3 ${secondaryText}`}>This is the separate text baseline. PHQ-9/GAD-7 scoring remains deterministic. The new questionnaire-and-context support model is a different synthetic-data experiment; no facial model has been trained.</p>
      </section>
      <div className="grid gap-6 lg:grid-cols-[1.15fr_1fr]">
        <section className={panel} aria-label="Live model prediction">
          <h2 className="flex items-center gap-2 text-xl font-semibold"><BrainCircuit className="h-5 w-5 text-blue-600" aria-hidden="true" /> Try the trained model</h2>
          <p className={`mt-3 ${secondaryText}`}>Enter English text to run the same learned model used in Reflections. Your text stays in page memory. Predicting does not retrain the model.</p>
          <label htmlFor="c2-lab-text" className="mb-2 mt-5 block text-sm font-medium">Text to analyse</label>
          <textarea id="c2-lab-text" rows={5} maxLength={1200} value={text} onChange={(event) => changeText(event.target.value)} placeholder="Enter a sentence in English…" className={fieldClass} />
          <p className="mt-1 text-right text-xs text-slate-500">{text.length} / 1,200</p>
          <div className="mt-4 flex flex-wrap gap-3">
            <Button onClick={predict} disabled={busy || !text.trim()} className="disabled:opacity-50">{busy ? "Running model…" : "Run prediction"}</Button>
            <Button variant="secondary" onClick={() => changeText("")}>Clear input</Button>
          </div>
          {error ? <p role="alert" className="mt-4 text-sm text-rose-700 dark:text-rose-300">{error}</p> : null}
          <div aria-live="polite" aria-atomic="true" className="mt-5">
            {result?.status === "ready" ? <div className="space-y-4">
              <h3 className="font-semibold">Prediction from learned weights</h3>
              {result.scores.slice(0, 5).map((item) => <div key={item.label}>
                <div className="mb-1 flex justify-between gap-3 text-sm"><span className="capitalize">{item.label}</span><span>{item.score.toFixed(4)}{item.selected ? " · selected" : " · below threshold"}</span></div>
                <div className="h-2 rounded-full bg-slate-100 dark:bg-slate-800"><div className="h-2 rounded-full bg-blue-500" style={{ width: `${item.score * 100}%` }} /></div>
              </div>)}
              {!result.scores.some((item) => item.selected) ? <p className={secondaryText}>No emotion label crossed the decision threshold.</p> : null}
              <p className="text-xs text-slate-500 dark:text-slate-400">{result.tokenCount} tokens · {(result.knownTokenFraction * 100).toFixed(0)}% known words · threshold {evaluation.selected.threshold}</p>
            </div> : result ? <p className={secondaryText}>{ANALYSIS_MESSAGES[result.status]}</p> : <p className={secondaryText}>The learned model loads when you run a prediction.</p>}
          </div>
          <p className="mt-5 text-xs leading-5 text-slate-500 dark:text-slate-400">Scores describe possible labels in wording. They are independent, not calibrated probabilities, and do not diagnose mental illness or determine referrals.</p>
        </section>
        <section className={panel} aria-label="Training data and settings">
          <h2 className="text-xl font-semibold">What did we train it on?</h2>
          <p className={`mt-3 ${secondaryText}`}>GoEmotions supplies human-labelled English Reddit comments, not a trained model. No synthetic student dataset or local health records were used for this experiment.</p>
          <dl className="mt-5 space-y-4">
            {([
              ["Training", evaluation.protocol.partitions.train.usedRows, "Learns vocabulary, IDF and classifier weights."],
              ["Development", evaluation.protocol.partitions.dev.usedRows, "Chooses regularisation and decision threshold."],
              ["Held-out test", evaluation.protocol.partitions.test.usedRows, "Measures the selected model on unseen comments."],
            ] as const).map(([name, rows, description]) => <div key={name} className="rounded-2xl bg-slate-50 p-4 dark:bg-slate-950"><dt className="flex justify-between gap-3 text-sm font-semibold"><span>{name}</span><span>{rows.toLocaleString("en")} comments</span></dt><dd className="mt-1 text-xs leading-5 text-slate-500 dark:text-slate-400">{description}</dd></div>)}
          </dl>
          <p className={`mt-4 ${secondaryText}`}>After normalised duplicate and cross-split overlap removal. Test comments are never used to fit the model.</p>
          <p className="mt-4 text-sm leading-6">{evaluation.selected.features.toLocaleString("en")} TF-IDF features · word unigrams + bigrams · 28 logistic classifiers · C={evaluation.selected.C} · seed {evaluation.protocol.seed}</p>
        </section>
      </div>
      <section className={panel} aria-label="Recorded model evaluation">
        <h2 className="text-xl font-semibold">Measured on held-out data</h2>
        <p className={`mt-3 ${secondaryText}`}>Recorded results from the Python training pipeline. Typing a sentence above does not change this benchmark.</p>
        <div className="mt-5 overflow-x-auto">
          <table className="w-full text-left text-sm"><caption className="sr-only">Held-out emotion classification results</caption><thead><tr className="border-b border-slate-200 dark:border-slate-700">{["Method", "Micro precision", "Micro recall", "Micro F1", "Macro F1"].map((heading) => <th key={heading} scope="col" className="whitespace-nowrap px-3 py-3 font-medium">{heading}</th>)}</tr></thead><tbody>
            {[{ name: "Label-frequency baseline", metrics: evaluation.frequencyBaselineTest }, { name: "TF-IDF + logistic regression", metrics: evaluation.test }].map(({ name, metrics }) => <tr key={name} className="border-b border-slate-100 dark:border-slate-800"><th scope="row" className="px-3 py-4 font-medium">{name}</th>{[metrics.micro.precision, metrics.micro.recall, metrics.micro.f1, metrics.macro.f1].map((value, i) => <td key={i} className="px-3 py-4 tabular-nums">{value.toFixed(4)}</td>)}</tr>)}
          </tbody></table>
        </div>
        <p className={`mt-4 ${secondaryText}`}>F1 is not accuracy. These results concern public-comment emotion labels, not depression, anxiety or clinical referral. The frequency comparator is simple; no superiority over other trained models is established. Reddit text differs from local student writing.</p>
        <details className="mt-5"><summary className="cursor-pointer text-sm font-medium text-blue-700 dark:text-blue-300">Inspect every emotion, including weak results</summary>
          <p className={`mt-3 ${secondaryText}`}>Grief and nervousness have zero recall in this held-out test set. Support is the number of test comments annotated with that emotion; comments can have multiple labels.</p>
          <div className="mt-3 max-h-96 overflow-auto"><table className="w-full text-left text-sm"><caption className="sr-only">Per-emotion held-out metrics</caption><thead><tr>{["Emotion", "Precision", "Recall", "F1", "Support"].map((name) => <th key={name} scope="col" className="px-3 py-2 font-medium">{name}</th>)}</tr></thead><tbody>{evaluation.perLabel.map((row) => <tr key={row.label} className="border-t border-slate-100 dark:border-slate-800"><th scope="row" className="px-3 py-2 font-normal capitalize">{row.label}</th><td className="px-3 py-2">{row.precision.toFixed(3)}</td><td className="px-3 py-2">{row.recall.toFixed(3)}</td><td className="px-3 py-2">{row.f1.toFixed(3)}</td><td className="px-3 py-2">{row.support}</td></tr>)}</tbody></table></div>
        </details>
      </section>
      <section className={panel} aria-label="Training implementation">
        <h2 className="flex items-center gap-2 text-xl font-semibold"><Code2 aria-hidden="true" className="h-5 w-5 text-blue-600" /> Show how it was trained</h2>
        <ol className="mt-5 grid gap-4 text-sm sm:grid-cols-2 lg:grid-cols-4">{[
          ["1. Prepare", "Normalise text and remove duplicate/overlapping examples."],
          ["2. Fit", "fit_transform learns word features; model.fit learns logistic weights from training labels."],
          ["3. Select & test", "Choose C and threshold on development data, then evaluate the held-out test split."],
          ["4. Export & predict", "Export learned weights into text-model.json; the browser applies the same calculations."],
        ].map(([title, body]) => <li key={title} className="rounded-2xl bg-slate-50 p-4 dark:bg-slate-950"><h3 className="font-semibold">{title}</h3><p className="mt-2 text-xs leading-5 text-slate-500 dark:text-slate-400">{body}</p></li>)}</ol>
        <p className={`my-5 ${secondaryText}`}>The source below is read from this project, not a mock code sample. Look for TfidfVectorizer, LogisticRegression, model.fit and the held-out evaluation. Training runs in Python; this page runs inference only.</p>
        <div className="space-y-3"><SourceCode name="ml/c2/train_text.py — actual training pipeline" source={trainingCode} /><SourceCode name="src/lib/c2/text-runtime.ts — actual website inference" source={inferenceCode} /></div>
        <details className="mt-5"><summary className="cursor-pointer text-sm font-medium text-blue-700 dark:text-blue-300">Reproducibility & provenance</summary><dl className="mt-3 space-y-3 break-words text-xs leading-5 text-slate-500 dark:text-slate-400"><div><dt className="font-semibold">Data revision</dt><dd className="break-all font-mono">{evaluation.source.revision}</dd></div><div><dt className="font-semibold">Current learned artifact SHA-256</dt><dd className="break-all font-mono">{modelHash}</dd></div><div><dt className="font-semibold">Recorded Python environment</dt><dd>Python {evaluation.environment.python} · scikit-learn {evaluation.environment.scikitLearn}</dd></div><div><dt className="font-semibold">Training command, from the repository root</dt><dd className="overflow-x-auto rounded-xl bg-slate-950 p-3 font-mono text-slate-100">python ml/c2/train_text.py train</dd></div></dl></details>
      </section>
      <footer className="flex flex-wrap items-center justify-between gap-4 text-xs leading-5 text-slate-500 dark:text-slate-400"><p className="max-w-2xl">Research implementation with AI assistance. Public dataset attribution and limits are recorded in the project model card. No clinical validation is claimed.</p><Link href="/wellness" className="inline-flex items-center gap-2 font-medium text-blue-700 underline dark:text-blue-300">Use the wellness workspace <ArrowRight aria-hidden="true" className="h-4 w-4" /></Link></footer>
    </section>
  );
}
