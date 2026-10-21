import type { TransformerEpoch, TransformerReport } from "@/lib/c2/transformer-evidence";
import { panel, secondaryText } from "./wellness-ui";
import { SourceCode } from "./wellness-model-lab";
import { TransformerPrediction } from "./transformer-prediction";

type Props = { report: TransformerReport | null; trainingCode: string; browserReady?: boolean; browserInfo?: { bytes: number; microF1: number } };
const percent = (value: number) => `${(value * 100).toFixed(1)}%`;

export function TrainingCurve({ title, rows, loss }: { title: string; rows: TransformerEpoch[]; loss?: boolean }) {
  const train = rows.map((row) => loss ? row.trainLoss : row.train.exactMatchAccuracy);
  const validation = rows.map((row) => loss ? row.validationLoss : row.validation.exactMatchAccuracy);
  const maximum = loss ? Math.max(0.01, ...train, ...validation) * 1.1 : 1;
  const x = (i: number) => 55 + (i / Math.max(1, rows.length - 1)) * 390;
  const y = (value: number) => 180 - (value / maximum) * 145;
  return <figure className="min-w-0 rounded-2xl bg-slate-50 p-4 dark:bg-slate-950">
    <figcaption className="text-sm font-semibold">{title}</figcaption>
    <svg role="img" aria-label={`${title}. Actual per-epoch measurements; values are in the table below.`} viewBox="0 0 490 225" className="mt-3 w-full text-slate-500">
      {[0, 0.5, 1].map((fraction) => <g key={fraction}>
        <line x1="55" x2="445" y1={y(maximum * fraction)} y2={y(maximum * fraction)} stroke="currentColor" strokeOpacity="0.2" />
        <text x="47" y={y(maximum * fraction) + 4} textAnchor="end" fill="currentColor" fontSize="11">{(maximum * fraction).toFixed(2)}</text>
      </g>)}
      {[{ values: train, color: "#2563eb" }, { values: validation, color: "#d97706" }].map(({ values, color }) => <g key={color}>
        <polyline fill="none" stroke={color} strokeWidth="2.5" points={values.map((value, i) => `${x(i)},${y(value)}`).join(" ")} />
        {values.map((value, i) => <circle key={i} cx={x(i)} cy={y(value)} r="4" fill={color} />)}
      </g>)}
      {rows.map((row, i) => <text key={row.epoch} x={x(i)} y="199" textAnchor="middle" fill="currentColor" fontSize="11">{row.epoch}</text>)}
      <text x="250" y="219" textAnchor="middle" fill="currentColor" fontSize="11">Epoch</text>
    </svg>
    <div className="flex gap-5 text-xs"><span className="text-blue-700 dark:text-blue-300">● Training</span><span className="text-amber-700 dark:text-amber-300">● Validation</span></div>
  </figure>;
}

export function WellnessTransformerLab({ report, trainingCode, browserReady = false, browserInfo }: Props) {
  if (!report) return <section className={panel} aria-label="DistilBERT training experiment">
    <p className="text-xs font-semibold uppercase tracking-widest text-blue-600 dark:text-blue-300">New deep-learning experiment</p>
    <h2 className="mt-3 text-2xl font-semibold">DistilBERT · fine-tuning English text emotions</h2>
    <p className={`mt-3 ${secondaryText}`}>The training pipeline is prepared. No completed evaluation is available on this checkout yet. Training/validation curves and test metrics appear only after the recorded run finishes successfully.</p>
    <p className={`my-4 ${secondaryText}`}>The existing text baseline below continues to use TF-IDF and logistic regression.</p>
    <SourceCode name="ml/c2/train_distilbert.py — neural fine-tuning pipeline" source={trainingCode} />
  </section>;
  const selectedRows = report.history.filter((row) => row.trial === report.selected.configuration.id);
  const plainLowRate = report.history.filter((row) => row.trial === "lr-2e-5");
  const maskedLowRate = report.history.filter((row) => row.trial === "lr-2e-5-mask");
  const maskingDifference = plainLowRate.length && maskedLowRate.length
    ? Math.max(...maskedLowRate.map((row) => row.selectionMicroF1)) - Math.max(...plainLowRate.map((row) => row.selectionMicroF1)) : null;
  return <section aria-label="DistilBERT training experiment" className="space-y-6 text-slate-900 dark:text-slate-100">
    <header className="rounded-3xl bg-gradient-to-br from-slate-900 via-indigo-900 to-blue-800 px-6 py-8 text-white sm:px-8">
      <p className="text-xs font-semibold uppercase tracking-widest text-blue-200">C2 · Completed neural fine-tuning pilot</p>
      <h2 className="mt-3 text-3xl font-semibold tracking-tight">DistilBERT: from pretrained language to emotion labels.</h2>
      <p className="mt-4 max-w-3xl text-sm leading-6 text-blue-100">We trained a new 28-output head and updated the final {report.protocol.trainableLastBlocks} transformer blocks using labeled English comments. This is a separate experiment from questionnaire support prediction.</p>
      <div className="mt-5 flex flex-wrap gap-2 text-xs"><span className="rounded-full bg-white/10 px-3 py-2">{report.protocol.partitions.train.rows.toLocaleString("en")} training comments</span><span className="rounded-full bg-white/10 px-3 py-2">{report.protocol.partitions.dev.rows.toLocaleString("en")} validation comments</span><span className="rounded-full bg-white/10 px-3 py-2">{report.protocol.partitions.test.rows.toLocaleString("en")} held-out comments</span></div>
    </header>
    <TransformerPrediction checkpoint={report.checkpointSha256} ready={browserReady} browserInfo={browserInfo} />
    <div className="grid gap-6 lg:grid-cols-2">
      <section className={panel} aria-label="Transformer data preprocessing">
        <h3 className="text-xl font-semibold">1. Prepare the data</h3>
        <p className={`mt-3 ${secondaryText}`}>Public GoEmotions comments with human emotion annotations. We verify file hashes, remove empty/duplicate entries and cross-split overlaps, then choose seeded training/validation subsets before fitting. Test data stays outside model selection.</p>
        <p className={`mt-3 ${secondaryText}`}>WordPiece tokenization · {report.protocol.maxLength}-token maximum · dynamic padding · negation retained. The small pilot is not the complete training dataset. No student health records or synthetic questionnaire rows enter this experiment.</p>
      </section>
      <section className={panel} aria-label="Transformer fine tuning settings">
        <h3 className="text-xl font-semibold">2. Update the selected layers</h3>
        <dl className="mt-4 grid grid-cols-2 gap-4 text-sm">{[
          ["Trainable parameters", report.selected.trainableParameters.toLocaleString("en")],
          ["Total parameters", report.selected.totalParameters.toLocaleString("en")],
          ["Selected backbone rate", report.selected.configuration.backboneLearningRate.toExponential()],
          ["Head learning rate", report.selected.configuration.headLearningRate.toExponential()],
          ["Batch size", report.protocol.batchSize], ["Selected epoch", report.selected.epoch],
          ["Weight decay", report.protocol.weightDecay], ["Selected threshold", report.selected.threshold],
        ].map(([name, value]) => <div key={name}><dt className="text-xs text-slate-500 dark:text-slate-400">{name}</dt><dd className="mt-1 font-medium">{value}</dd></div>)}</dl>
        <p className={`mt-4 ${secondaryText}`}>Embeddings and early blocks remain frozen. AdamW uses binary cross-entropy for multiple labels, a warmup/decay schedule and gradient clipping. Validation micro-F1 selects the trial, epoch and threshold.</p>
      </section>
    </div>
    <section className={panel} aria-label="Transformer learning curves">
      <h3 className="text-xl font-semibold">3. Inspect actual learning curves</h3>
      <p className={`mt-3 ${secondaryText}`}>Selected trial: {report.selected.configuration.id}. Each point is a complete training/validation evaluation after that epoch. Accuracy means the entire predicted label set matches, at the fixed threshold 0.5. Final test metrics use the separately selected threshold {report.selected.threshold}.</p>
      <div className="mt-5 grid gap-5 md:grid-cols-2"><TrainingCurve title="Training and validation loss" rows={selectedRows} loss /><TrainingCurve title="Training and validation exact-match accuracy" rows={selectedRows} /></div>
      <details className="mt-5"><summary className="cursor-pointer text-sm font-medium text-blue-700 dark:text-blue-300">Inspect every trial and epoch</summary>
        <div className="mt-3 overflow-x-auto"><table className="w-full text-left text-xs"><caption className="sr-only">Recorded epoch measurements for all transformer trials</caption><thead><tr>{["Trial", "Epoch", "Train loss", "Val loss", "Train exact match", "Val exact match", "Val micro-F1 (selected threshold)"].map((name) => <th scope="col" key={name} className="whitespace-nowrap px-3 py-3">{name}</th>)}</tr></thead><tbody>{report.history.map((row) => <tr key={`${row.trial}-${row.epoch}`} className="border-t border-slate-200 dark:border-slate-700"><th scope="row" className="px-3 py-3 font-medium">{row.trial}</th><td className="px-3 py-3">{row.epoch}</td><td className="px-3 py-3">{row.trainLoss.toFixed(5)}</td><td className="px-3 py-3">{row.validationLoss.toFixed(5)}</td><td className="px-3 py-3">{percent(row.train.exactMatchAccuracy)}</td><td className="px-3 py-3">{percent(row.validation.exactMatchAccuracy)}</td><td className="px-3 py-3">{row.selectionMicroF1.toFixed(4)}</td></tr>)}</tbody></table></div>
      </details>
    </section>
    <section className={panel} aria-label="Transformer augmentation comparison">
      <h3 className="text-xl font-semibold">4. Test augmentation and learning rates</h3>
      <p className={`mt-3 ${secondaryText}`}>Primary trials use original text. The masking ablation hides 5% of eligible training tokens while protecting special tokens and a small negation list. Meaning may still change, so improvement is measured rather than assumed. Validation/test text is never augmented.</p>
      <div className="mt-4 overflow-x-auto"><table className="w-full text-left text-sm"><caption className="sr-only">Development comparison of learning rates and token masking</caption><thead><tr>{["Trial", "Backbone rate", "Token masking", "Best validation micro-F1"].map((name) => <th scope="col" key={name} className="whitespace-nowrap px-3 py-3">{name}</th>)}</tr></thead><tbody>{report.protocol.configurations.map((config) => <tr key={config.id} className="border-t border-slate-200 dark:border-slate-700"><th scope="row" className="px-3 py-3 font-medium">{config.id}{config.id === report.selected.configuration.id ? " · selected" : ""}</th><td className="px-3 py-3">{config.backboneLearningRate.toExponential()}</td><td className="px-3 py-3">{percent(config.tokenMaskProbability)}</td><td className="px-3 py-3">{Math.max(...report.history.filter((row) => row.trial === config.id).map((row) => row.selectionMicroF1)).toFixed(4)}</td></tr>)}</tbody></table></div>
    </section>
    {maskingDifference !== null ? <p className={secondaryText}>At the matched 2e-5 learning rate, masking minus original-text validation micro-F1 is {maskingDifference >= 0 ? "+" : ""}{maskingDifference.toFixed(4)}. This is a single-seed comparison; it does not establish a general benefit from augmentation.</p> : null}
    <section className={panel} aria-label="Transformer held out evaluation">
      <h3 className="text-xl font-semibold">5. Evaluate once on held-out data</h3>
      <p className={`mt-3 ${secondaryText}`}>Both methods use exactly the same training/validation rows and held-out test comments. The simpler baseline is refitted for this comparison. No superiority or clinical accuracy is assumed.</p>
      <div className="mt-4 overflow-x-auto"><table className="w-full text-left text-sm"><caption className="sr-only">Equal-data held-out model comparison</caption><thead><tr>{["Method", "Micro precision", "Micro recall", "Micro-F1", "Macro-F1", "Exact match"].map((name) => <th scope="col" key={name} className="whitespace-nowrap px-3 py-3">{name}</th>)}</tr></thead><tbody>{[{ name: "Fine-tuned DistilBERT", metrics: report.test }, { name: "TF-IDF + logistic baseline", metrics: report.baseline.test }].map(({ name, metrics }) => <tr key={name} className="border-t border-slate-200 dark:border-slate-700"><th scope="row" className="px-3 py-3 font-medium">{name}</th>{[metrics.micro.precision, metrics.micro.recall, metrics.micro.f1, metrics.macro.f1, metrics.exactMatchAccuracy].map((value, i) => <td key={i} className="px-3 py-3">{value.toFixed(4)}</td>)}</tr>)}</tbody></table></div>
      <p className={`mt-4 ${secondaryText}`}>Label-wise accuracy: {percent(report.test.labelAccuracy)}. This can look high because most labels are absent; inspect F1 and rare-label recall too. Emotion labels are not depression/anxiety diagnoses.</p>
      <details className="mt-5"><summary className="cursor-pointer text-sm font-medium text-blue-700 dark:text-blue-300">Per-emotion precision, recall, F1 and confusion counts</summary><div className="mt-3 max-h-96 overflow-auto"><table className="w-full text-left text-xs"><caption className="sr-only">Per-emotion test metrics; TN FP FN TP are binary confusion counts</caption><thead><tr>{["Emotion", "Precision", "Recall", "F1", "Support", "TN / FP / FN / TP"].map((name) => <th scope="col" key={name} className="whitespace-nowrap px-3 py-2">{name}</th>)}</tr></thead><tbody>{report.perLabel.map((row, i) => <tr key={row.label} className="border-t border-slate-100 dark:border-slate-800"><th scope="row" className="px-3 py-2 font-normal">{row.label}</th><td className="px-3 py-2">{row.precision.toFixed(3)}</td><td className="px-3 py-2">{row.recall.toFixed(3)}</td><td className="px-3 py-2">{row.f1.toFixed(3)}</td><td className="px-3 py-2">{row.support}</td><td className="whitespace-nowrap px-3 py-2">{report.confusionMatrices[i].flat().join(" / ")}</td></tr>)}</tbody></table></div></details>
    </section>
    <section className={panel} aria-label="Transformer training provenance">
      <h3 className="text-xl font-semibold">6. Show the training code and checkpoint</h3>
      <p className={`my-4 ${secondaryText}`}>Look for the frozen-layer setup, loss.backward(), optimizer.step(), validation selection and save_pretrained(). Training runs offline; the prediction panel above runs its exported checkpoint. The separate text baseline below uses logistic regression.</p>
      <SourceCode name="ml/c2/train_distilbert.py — actual neural training" source={trainingCode} />
      <dl className="mt-5 space-y-3 break-words text-xs leading-5 text-slate-500 dark:text-slate-400"><div><dt className="font-semibold">Run</dt><dd>{report.runId} · {Math.round(report.durationSeconds / 60)} minutes · {report.protocol.environment.cudaAvailable ? "CUDA" : "CPU"}</dd></div><div><dt className="font-semibold">Base revision</dt><dd className="break-all font-mono">{report.protocol.modelRevision}</dd></div><div><dt className="font-semibold">Selected checkpoint SHA-256</dt><dd className="break-all font-mono">{report.checkpointSha256}</dd><dd>The original checkpoint stays in the local training folder. Its verified ONNX export supplies the weights for browser predictions above.</dd></div><div><dt className="font-semibold">Environment</dt><dd>Python {report.protocol.environment.python} · PyTorch {report.protocol.environment.packages.torch} · Transformers {report.protocol.environment.packages.transformers}</dd></div></dl>
      <details className="mt-5"><summary className="cursor-pointer text-sm font-medium text-blue-700 dark:text-blue-300">Limitations and remaining work</summary><ul className="mt-3 list-disc space-y-2 pl-5 text-sm text-slate-600 dark:text-slate-300">{report.limitations.map((item) => <li key={item}>{item}</li>)}</ul></details>
    </section>
  </section>;
}
