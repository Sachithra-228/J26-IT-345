import Link from "next/link";
import type { TransformerEpoch, EmotionMetrics } from "@/lib/c2/transformer-evidence";
import { TrainingCurve } from "./wellness-transformer-lab";
import { SourceCode } from "./wellness-model-lab";
import { panel, secondaryText } from "./wellness-ui";
import { ConcernPredictionInspector } from "./concern-prediction-inspector";

export type ConcernReport = {
  status: string; runId: string; checkpointSha256: string; durationSeconds: number;
  protocol: { partitions: Record<string, { rows: number }>; batchSize: number; maxLength: number; augmentation: string };
  selected: { configuration: { id: string; backboneLearningRate: number; headLearningRate: number }; epoch: number; threshold: number; developmentMicroF1: number; trainableParameters: number; frozenEmbeddingUnchanged: boolean; lastBackboneBlockUpdated: boolean };
  history: TransformerEpoch[]; test: EmotionMetrics; baseline: { test: EmotionMetrics };
  perLabel: { label: string; precision: number; recall: number; f1: number; support: number }[];
  confusionMatrices: number[][][]; limitations: string[];
};
export function validateConcernReport(value: unknown): ConcernReport {
  const r = value as ConcernReport;
  if (r?.status !== "completed" || r.runId !== "c2-distilbert-concerns-v1" || !/^[a-f0-9]{64}$/.test(r.checkpointSha256) ||
      r.perLabel?.length !== 5 || r.confusionMatrices?.length !== 5 || !r.history?.length ||
      !r.selected.frozenEmbeddingUnchanged || !r.selected.lastBackboneBlockUpdated ||
      r.confusionMatrices.some((m) => m.length !== 2 || m.some((row) => row.length !== 2) || m.flat().reduce((a,b) => a+b,0) !== r.protocol.partitions.test.rows) ||
      [r.test.micro.f1, r.test.macro.f1, ...r.history.flatMap((e) => [e.trainLoss,e.validationLoss])].some((x) => !Number.isFinite(x) || x < 0)) throw new Error("Incomplete concern model evidence");
  return r;
}
export function WellnessConcernLab({ report, code }: { report: ConcernReport | null; code: string }) {
  if (!report) return <section className={panel}><h2 className="text-2xl font-semibold">Main check-in · DistilBERT concern training</h2><p className={`mt-3 ${secondaryText}`}>A completed concern-training evaluation is not available on this checkout yet. No final metrics are shown.</p></section>;
  const epochs = report.history.filter((r) => r.trial === report.selected.configuration.id);
  return <section className={`${panel} space-y-6`} aria-label="Main DistilBERT concern model evidence">
    <header><p className="text-xs font-semibold uppercase tracking-widest text-blue-600 dark:text-blue-300">Member 02 · Main check-in ML</p><h2 className="mt-3 text-3xl font-semibold">DistilBERT for student concern topics</h2><p className={`mt-3 ${secondaryText}`}>A separately fine-tuned five-output classifier guides personalised questions in the main check-in. Labels are low mood, worry, sleep, study and connection. You confirm the suggestions; questionnaire scoring and profile matching use explicit application rules.</p><Link href="/wellness" className="mt-3 inline-block font-medium text-blue-700 underline dark:text-blue-300">Open the main wellness check-in</Link></header>
    <div className="grid gap-3 sm:grid-cols-3">{["train","dev","test"].map((split) => <div key={split} className="rounded-2xl bg-slate-50 p-4 dark:bg-slate-950"><p className="text-xs uppercase text-slate-500">{split}</p><p className="mt-2 text-2xl font-semibold">{report.protocol.partitions[split].rows}</p><p className="text-xs text-slate-500">synthetic narratives</p></div>)}</div>
    <p className={secondaryText}>Wording families are separated across splits before composition. No real student records, diagnoses or clinical validation. Synthetic held-out results measure agreement with simulated concern labels.</p>
    <div className="grid gap-5 md:grid-cols-2"><TrainingCurve title="Concern training and validation loss" rows={epochs} loss /><TrainingCurve title="Concern training and validation exact-match accuracy" rows={epochs} /></div>
    <p className={secondaryText}>Curves use a fixed 0.5 threshold and complete label-set accuracy. Final test metrics use the development-selected threshold {report.selected.threshold}. Selected: {report.selected.configuration.id}, epoch {report.selected.epoch}; backbone rate {report.selected.configuration.backboneLearningRate.toExponential()}, head rate {report.selected.configuration.headLearningRate.toExponential()}, batch {report.protocol.batchSize}, maximum {report.protocol.maxLength} tokens. {report.selected.trainableParameters.toLocaleString("en")} parameters trained.</p>
    <div className="overflow-x-auto"><table className="w-full text-left text-sm"><caption className="mb-3 text-left font-semibold">Held-out synthetic concern classification</caption><thead><tr>{["Method","Micro precision","Micro recall","Micro-F1","Macro-F1","Exact match"].map((t) => <th key={t} scope="col" className="p-2">{t}</th>)}</tr></thead><tbody>{[{name:"DistilBERT",m:report.test},{name:"Same-data TF-IDF + logistic",m:report.baseline.test}].map(({name,m}) => <tr key={name} className="border-t border-slate-200 dark:border-slate-700"><th scope="row" className="p-2">{name}</th>{[m.micro.precision,m.micro.recall,m.micro.f1,m.macro.f1,m.exactMatchAccuracy].map((x,i) => <td key={i} className="p-2">{x.toFixed(4)}</td>)}</tr>)}</tbody></table></div>
    <details><summary className="cursor-pointer font-medium text-blue-700 dark:text-blue-300">Learning-rate and augmentation trials, every epoch</summary><p className={`my-3 ${secondaryText}`}>{report.protocol.augmentation}</p><div className="overflow-auto"><table className="w-full text-left text-xs"><caption className="sr-only">All concern model trial epochs</caption><thead><tr>{["Trial","Epoch","Train loss","Validation loss","Train exact match","Validation exact match","Validation micro-F1"].map((t) => <th key={t} scope="col" className="p-2">{t}</th>)}</tr></thead><tbody>{report.history.map((r) => <tr key={`${r.trial}-${r.epoch}`}><th scope="row" className="p-2">{r.trial}</th>{[r.epoch,r.trainLoss.toFixed(4),r.validationLoss.toFixed(4),r.train.exactMatchAccuracy.toFixed(4),r.validation.exactMatchAccuracy.toFixed(4),r.selectionMicroF1.toFixed(4)].map((x,i) => <td key={i} className="p-2">{x}</td>)}</tr>)}</tbody></table></div></details>
    <details><summary className="cursor-pointer font-medium text-blue-700 dark:text-blue-300">Per-topic precision, recall and F1</summary><table className="mt-3 w-full text-left text-sm"><caption className="sr-only">Concern per-topic test metrics</caption><thead><tr>{["Topic","Precision","Recall","F1","Support"].map((x) => <th scope="col" key={x} className="p-2">{x}</th>)}</tr></thead><tbody>{report.perLabel.map((r) => <tr key={r.label}><th scope="row" className="p-2">{r.label}</th>{[r.precision.toFixed(3),r.recall.toFixed(3),r.f1.toFixed(3),r.support].map((x,i) => <td className="p-2" key={i}>{x}</td>)}</tr>)}</tbody></table></details>
    <ConcernPredictionInspector />
    <SourceCode name="ml/c2/train_concerns.py — main concern fine-tuning" source={code} />
    <p className="break-all text-xs text-slate-500">Run {report.runId} · {Math.round(report.durationSeconds/60)} minutes · checkpoint SHA-256 {report.checkpointSha256}. Frozen embedding unchanged; final backbone block updated by gradient training.</p>
    <details><summary className="cursor-pointer text-sm font-medium">Limitations of the concern model</summary><ul className="mt-3 list-disc space-y-2 pl-5">{report.limitations.map((x) => <li key={x} className={secondaryText}>{x}</li>)}</ul></details>
  </section>;
}
