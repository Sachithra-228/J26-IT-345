"use client";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { ArrowLeft, BrainCircuit, FlaskConical } from "lucide-react";
import { Button } from "@/components/shared/Button";
import { CONCERNS, FREQUENCY, GAD7, PHQ9, scoreScale, type Answer } from "@/lib/c2/assessment";
import { estimateSupport, loadSupportModel, nextSupportQuestion, SUPPORT_LABELS, SUPPORT_QUESTIONS, type SupportEstimate, type SupportInput } from "@/lib/c2/support-runtime";
import scenarioData from "@/lib/c2/model/support-scenarios.json";
import type evidence from "../../../docs/c2/evidence/support-evaluation.json";
import { SourceCode } from "./wellness-model-lab";
import { SupportEstimateCard } from "./support-estimate";
import { CounselorBooking } from "@/components/wellness/counselor-booking";
import { fieldClass, panel, secondaryText } from "./wellness-ui";

type Props = { report: typeof evidence; trainingCode: string; generatorCode: string; inferenceCode: string };
const blank = (): SupportInput => ({ phq9: Array(9).fill(null), gad7: Array(7).fill(null), context: {} });

export function WellnessSupportLab({ report, trainingCode, generatorCode, inferenceCode }: Props) {
  const [input, setInput] = useState<SupportInput>(blank);
  const [expected, setExpected] = useState("");
  const [scenarioId, setScenarioId] = useState("");
  const [result, setResult] = useState<SupportEstimate | null>(null);
  const [path, setPath] = useState<string[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const generation = useRef(0);
  useEffect(() => () => { generation.current++; }, []);
  function change(next: SupportInput) {
    generation.current++;
    setBusy(false);
    setInput(next);
    setScenarioId("");
    setResult(null);
    setPath([]);
    setError("");
  }
  async function run() {
    const id = ++generation.current;
    setBusy(true);
    setError("");
    setResult(null);
    setPath([]);
    try {
      const model = await loadSupportModel();
      if (model.version !== report.modelVersion) throw new Error("Version mismatch");
      const context: Record<string, string> = {}, asked: string[] = [];
      const gate = estimateSupport({ ...input, context }, model);
      if (gate.status === "ready") {
        let question;
        while ((question = nextSupportQuestion({ ...input, context }, asked, model))) {
          asked.push(question.id);
          if (input.context[question.id]) context[question.id] = input.context[question.id];
        }
      }
      const estimate = estimateSupport({ ...input, context }, model);
      if (id === generation.current) { setResult(estimate); setPath(asked); }
    } catch {
      if (id === generation.current) setError("The model could not load or the evidence version differs. Reload and retry; no input was sent to a server.");
    } finally {
      if (id === generation.current) setBusy(false);
    }
  }
  const comparisons = [
    { name: "Majority-class baseline", metrics: report.test.majorityBaseline },
    { name: "Questionnaire/context rule baseline", metrics: report.test.questionnaireRuleBaseline },
    { name: "Questionnaire-only learned baseline", metrics: report.test.questionnaireOnlyLearnedBaseline },
    ...Object.entries(report.test.candidates).map(([name, metrics]) => ({ name, metrics })),
  ];
  return <section aria-label="Synthetic support model research" className="space-y-6 text-slate-900 dark:text-slate-100">
    <Link href="/wellness" className="inline-flex items-center gap-2 text-sm font-medium text-blue-700 underline dark:text-blue-300"><ArrowLeft className="h-4 w-4" aria-hidden="true" /> Back to wellness</Link>
    <header className="rounded-3xl bg-gradient-to-br from-indigo-800 via-blue-700 to-sky-600 p-6 text-white sm:p-8">
      <p className="flex items-center gap-2 text-xs font-semibold uppercase tracking-widest text-blue-100"><FlaskConical className="h-4 w-4" aria-hidden="true" /> Member 02 · Research & ML</p>
      <h1 className="mt-4 text-3xl font-semibold tracking-tight sm:text-4xl">From your answers to a next step.</h1>
      <p className="mt-4 max-w-2xl text-sm leading-6 text-blue-50">A newly trained questionnaire-and-context model, an adaptive topic selector, and reproducible evidence. D. G. A. Indeepa · IT23273412.</p>
      <p className="mt-4 text-xs leading-5 text-blue-100">Synthetic cases and simulated labels. This experiment demonstrates the pipeline; it does not establish diagnosis, clinical accuracy or real-world benefit.</p>
    </header>
    <section className={panel} aria-label="Support model identity">
      <p className="text-xs font-semibold uppercase tracking-widest text-blue-600 dark:text-blue-300">Selected support model</p>
      <h2 className="mt-3 text-2xl font-semibold">{report.selected.supportAlgorithm}</h2>
      <p className={`mt-3 ${secondaryText}`}>{report.features.length} defined structured features; classifier weights learned from the training cases. Random Forest was trained for comparison. The selected candidate is {report.selected.supportCandidate}; selection used development cases before test evaluation.</p>
      <p className={`mt-3 ${secondaryText}`}>The question selector is a separate {report.selected.routerAlgorithm} model. PHQ-9 and GAD-7 symptom scores remain separate standard calculations; neither trained model diagnoses depression or anxiety. PHQ item 9 is excluded from learned features and handled separately.</p>
      <div className="mt-5 grid gap-3 sm:grid-cols-3">{Object.entries(report.data.splits).map(([name, count]) => <div key={name} className="rounded-2xl bg-slate-50 p-4 dark:bg-slate-950"><p className="text-xs font-medium capitalize">{name === "dev" ? "Development" : name === "test" ? "Held-out test" : "Training"}</p><p className="mt-2 text-3xl font-semibold">{count.toLocaleString("en")}</p><p className="mt-1 text-xs text-slate-500">unique synthetic cases</p></div>)}</div>
      <p className="mt-4 text-xs leading-5 text-slate-500 dark:text-slate-400">Training uses four partial-answer snapshots per base case. All snapshots stay with the same base case in the same fold; 3,600 rows represent 900 cases, not 3,600 people.</p>
    </section>
    <section className={panel} aria-label="Support model live experiment">
      <h2 className="flex items-center gap-2 text-xl font-semibold"><BrainCircuit className="h-5 w-5 text-blue-600" aria-hidden="true" /> Explore the trained pipeline</h2>
      <p className={`mt-3 ${secondaryText}`}>Load a clearly labelled synthetic scenario or enter questionnaire values. The replay asks three general context questions, then uses the trained router to choose three topics. Only answers to the six selected questions enter the final estimate.</p>
      <label htmlFor="c2-scenario" className="mb-2 mt-5 block text-sm font-medium">Synthetic research scenario</label>
      <p className="mb-2 text-xs text-slate-500">Browse all {scenarioData.cases.length} frozen test cases. Cases are ordered by ID, not prediction success.</p>
      <select id="c2-scenario" className={fieldClass} value={scenarioId} onChange={(event) => {
        const scenario = scenarioData.cases.find((item) => item.id === event.target.value);
        if (scenario) { change({ phq9: scenario.phq9 as Answer[], gad7: scenario.gad7 as Answer[], context: Object.fromEntries(Object.entries(scenario.context).filter(([, value]) => typeof value === "string")) }); setScenarioId(scenario.id); setExpected(scenario.simulatedFollowup); }
        else { change(blank()); setExpected(""); }
      }}><option value="">Enter my own values</option>{scenarioData.cases.map((item) => <option key={item.id} value={item.id}>{item.id} · {item.title}</option>)}</select>
      {expected ? <p className="mt-2 text-xs text-slate-500">Simulator reference label: {SUPPORT_LABELS[expected]}. This is an invented label, not a professional judgment. The model can disagree.</p> : null}
      <details className="mt-5" open><summary className="cursor-pointer text-sm font-semibold text-blue-700 dark:text-blue-300">Questionnaire inputs</summary><div className="mt-4 grid gap-6 lg:grid-cols-2">{(["phq9", "gad7"] as const).map((kind) => <fieldset key={kind}><legend className="mb-3 font-semibold">{kind === "phq9" ? "PHQ-9" : "GAD-7"} · total {scoreScale(kind, input[kind]).total ?? "incomplete"}</legend><div className="space-y-3">{(kind === "phq9" ? PHQ9 : GAD7).map((text, i) => <label key={text} className="block text-xs leading-5"><span>{i + 1}. {text}</span><select aria-label={`${kind === "phq9" ? "PHQ-9" : "GAD-7"} item ${i + 1}`} value={input[kind][i] ?? ""} onChange={(event) => { const values = [...input[kind]]; values[i] = event.target.value === "" ? null : Number(event.target.value) as Answer; change({ ...input, [kind]: values }); setExpected(""); }} className={`${fieldClass} mt-1`}><option value="">Unanswered</option>{FREQUENCY.map((option, value) => <option key={option} value={value}>{value} · {option}</option>)}</select></label>)}</div></fieldset>)}</div></details>
      <details className="mt-5"><summary className="cursor-pointer text-sm font-semibold text-blue-700 dark:text-blue-300">Prepared context answers for the replay</summary><p className={`mt-3 ${secondaryText}`}>Unused answers are excluded. Skipped questions are recorded as missing, not a healthy response. In My check-in, you answer these questions as they are selected.</p><div className="mt-4 grid gap-4 sm:grid-cols-2">{SUPPORT_QUESTIONS.map((q) => <label key={q.id} className="text-xs leading-5">{q.text}<select aria-label={`Context: ${q.id}`} value={input.context[q.id] ?? ""} onChange={(event) => { const context = { ...input.context }; if (event.target.value) context[q.id] = event.target.value; else delete context[q.id]; change({ ...input, context }); setExpected(""); }} className={`${fieldClass} mt-2`}><option value="">Skipped / unavailable</option>{q.options.map((option) => <option key={option}>{option}</option>)}</select></label>)}</div></details>
      <div className="mt-5 flex flex-wrap gap-3"><Button onClick={run} disabled={busy} className="disabled:opacity-50">{busy ? "Running trained models…" : "Run support pipeline"}</Button><Button variant="secondary" onClick={() => { change(blank()); setExpected(""); }}>Clear experiment</Button></div>
      {error ? <p role="alert" className="mt-4 text-sm text-rose-700 dark:text-rose-300">{error}</p> : null}
      {path.length ? <div className="mt-5" aria-label="Selected question path"><h3 className="text-sm font-semibold">Questions selected during this run</h3><ol className="mt-3 space-y-2">{path.map((key, i) => <li key={key} className="rounded-xl bg-blue-50 p-3 text-xs leading-5 dark:bg-blue-950"><span className="font-semibold">{i + 1}. {i < 3 ? "General context" : "Selected by learned topic scores"}</span><p>{SUPPORT_QUESTIONS.find((q) => q.id === key)?.text}</p></li>)}</ol></div> : null}
      <div aria-live="polite" className="mt-5">{result ? <SupportEstimateCard estimate={result} /> : null}</div>
      {result?.status === "ready" ? <div className="mt-6" aria-label="Research professional matching">
        <h3 className="mb-3 text-lg font-semibold">Match this case to the demonstration directory</h3>
        <CounselorBooking researchOnly topics={result.topics.filter((item) => item.score >= 0.5).slice(0, 3).map((item) => item.topic)} topicWeights={Object.fromEntries(result.topics.map((item) => [item.topic, item.score]))} />
      </div> : null}
      <p className="mt-4 text-xs leading-5 text-slate-500 dark:text-slate-400">Runs the actual exported model locally. No journal, student record or database write is made; this is inference, not a new training run.</p>
    </section>
    <section className={panel} aria-label="Synthetic evaluation results">
      <h2 className="text-xl font-semibold">Measured results · 300 held-out synthetic cases</h2>
      <p className={`mt-3 ${secondaryText}`}>Labels come from documented simulator assumptions. These figures measure simulator agreement. The final context inputs were collected using the trained six-question routing policy.</p>
      <div className="mt-5 overflow-x-auto"><table className="w-full text-left text-sm"><caption className="sr-only">Synthetic support classifier comparison</caption><thead><tr><th scope="col" className="px-3 py-3">Method</th><th scope="col" className="px-3 py-3">Macro F1</th><th scope="col" className="px-3 py-3">Simulator-label accuracy</th></tr></thead><tbody>{comparisons.map(({ name, metrics }) => <tr key={name} className="border-t border-slate-100 dark:border-slate-800"><th scope="row" className="px-3 py-3 font-medium">{name}{name === report.selected.supportCandidate ? " · selected before testing" : ""}</th><td className="px-3 py-3">{metrics.macroF1.toFixed(3)}</td><td className="px-3 py-3">{metrics.accuracy.toFixed(3)}</td></tr>)}</tbody></table></div>
      <h3 className="mt-6 font-semibold">Selected model confusion matrix</h3><p className="mt-2 text-xs text-slate-500">Rows: simulated reference. Columns: model prediction. Counts cover all 300 test cases, including estimates marked uncertain by the application.</p>
      <div className="mt-3 overflow-x-auto"><table className="w-full text-left text-xs"><caption className="sr-only">Synthetic support confusion matrix</caption><thead><tr><th scope="col" className="p-3">Reference / prediction</th>{report.data.classCounts.test && Object.keys(report.data.classCounts.test).map((key) => <th key={key} scope="col" className="p-3">{SUPPORT_LABELS[key]}</th>)}</tr></thead><tbody>{report.test.selected.confusionMatrix.map((row, i) => <tr key={i}><th scope="row" className="p-3 font-medium">{SUPPORT_LABELS[Object.keys(report.data.classCounts.test)[i]]}</th>{row.map((value, j) => <td key={j} className={`p-3 text-center ${i === j ? "bg-blue-50 font-semibold text-blue-800 dark:bg-blue-950 dark:text-blue-200" : "bg-slate-50 dark:bg-slate-950"}`}>{value}</td>)}</tr>)}</tbody></table></div>
      <div className="mt-6 grid gap-4 sm:grid-cols-3"><div><h3 className="text-sm font-semibold">Topic ranking NDCG@3</h3><p className="mt-2 text-2xl font-semibold">{report.test.routing.learned.ndcgAt3.toFixed(3)}</p><p className="mt-1 text-xs text-slate-500">Rule comparator: {report.test.routing.questionnaireRules.ndcgAt3.toFixed(3)}. Initial questionnaire-only state.</p></div><div><h3 className="text-sm font-semibold">Accepted estimate coverage</h3><p className="mt-2 text-2xl font-semibold">{(100 * report.test.uncertainty.coverage).toFixed(1)}%</p><p className="mt-1 text-xs text-slate-500">{report.test.uncertainty.acceptedCases} of 300 exceed fixed score/margin thresholds. Other results remain uncertain.</p></div><div><h3 className="text-sm font-semibold">Repeated questions</h3><p className="mt-2 text-2xl font-semibold">{report.test.routing.repeatedQuestions}</p><p className="mt-1 text-xs text-slate-500">Six context questions per replay; skipped answers remain missing.</p></div></div>
      <details className="mt-5"><summary className="cursor-pointer text-sm font-medium text-blue-700 dark:text-blue-300">Per-class precision, recall and support</summary><div className="mt-3 space-y-3">{Object.entries(report.test.selected.perClass).map(([key, row]) => <p key={key} className="text-xs leading-5">{SUPPORT_LABELS[key]} · precision {row.precision.toFixed(3)} · recall {row.recall.toFixed(3)} · F1 {row["f1-score"].toFixed(3)} · support {row.support}</p>)}</div></details>
    </section>
    <section className={panel} aria-label="Synthetic training source">
      <h2 className="text-xl font-semibold">Show the actual training code</h2><p className={`my-4 ${secondaryText}`}>These files generate the cases, fit both candidate families, choose using development data, evaluate held-out cases, and export learned weights. They do not download a pretrained support classifier.</p>
      <div className="space-y-3"><SourceCode name="ml/c2/generate_support_cases.py — synthetic cases and labels" source={generatorCode} /><SourceCode name="ml/c2/train_support.py — fitting, comparison and evaluation" source={trainingCode} /><SourceCode name="src/lib/c2/support-runtime.ts — live website inference" source={inferenceCode} /></div>
      <details className="mt-5"><summary className="cursor-pointer text-sm font-medium text-blue-700 dark:text-blue-300">Reproducibility and limitations</summary><div className="mt-3 space-y-3 break-words text-xs leading-5 text-slate-500 dark:text-slate-400"><p>Version: {report.modelVersion} · seed {report.protocol.seed} · Python {report.environment.python} · scikit-learn {report.environment.scikitLearn}</p><p className="break-all">Data SHA-256: {report.data.jsonlSha256}</p><p className="break-all">Model SHA-256: {report.modelSha256}</p><p>{report.protocol.grouping}</p><p>{report.protocol.selection}</p><ul className="list-inside list-disc">{report.limitations.map((line) => <li key={line}>{line}</li>)}</ul><p>AI assisted the code, data simulator, training, tests and documentation. Independent counselor labels and local participant evaluation remain future work. No camera-fusion benefit is established.</p></div></details>
    </section>
  </section>;
}
