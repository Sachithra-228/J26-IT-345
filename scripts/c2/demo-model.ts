/** Offline PP1 demonstration using the same learned artifact/runtime as Reflections. */
import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { analyzeReflection, predictEmotionScores, type TextModel } from "../../src/lib/c2/text-runtime";

const root = resolve(__dirname, "../..");
const read = (path: string) => readFileSync(resolve(root, path), "utf8");
const modelBytes = read("src/lib/c2/model/text-model.json");
const model = JSON.parse(modelBytes) as TextModel;
const report = JSON.parse(read("docs/c2/evidence/text-evaluation.json"));
const fixture = JSON.parse(read("tests/fixtures/c2/text-parity.json")) as {
  modelVersion: string;
  labels: string[];
  cases: Array<{ text: string; scores: number[] }>;
};
const args = process.argv.slice(2);
if (args.includes("--help")) {
  console.log('Usage: npm run c2:demo [-- --text "English text"] [--labels]');
  console.log("Without --text, runs a fixed set of invented software examples. No data is saved or uploaded.");
  process.exit(0);
}
const textIndex = args.indexOf("--text");
const customText = textIndex >= 0 ? args[textIndex + 1] : undefined;
const validArgs = args.filter((_, i) => i !== textIndex && !(textIndex >= 0 && i === textIndex + 1));
if ((textIndex >= 0 && (!customText || customText.startsWith("--"))) || validArgs.some((arg) => arg !== "--labels")) {
  throw new Error('Use --text "English text" and/or --labels. See --help.');
}
if (report.modelVersion !== model.version || fixture.modelVersion !== model.version ||
    JSON.stringify(fixture.labels) !== JSON.stringify(model.labels)) {
  throw new Error("Model, report and Python reference versions/labels do not agree.");
}
let maximumDifference = 0;
for (const probe of fixture.cases) {
  const scores = predictEmotionScores(probe.text, model);
  if (scores.length !== probe.scores.length) throw new Error("Python reference score count differs.");
  scores.forEach((score, i) => {
    const difference = Math.abs(score - probe.scores[i]);
    if (!Number.isFinite(difference)) throw new Error("Non-finite model/reference score.");
    maximumDifference = Math.max(maximumDifference, difference);
  });
}
if (maximumDifference >= 1e-7) throw new Error("Learned model no longer matches Python reference scores.");

console.log("C2 / PP1: trained English text emotion model");
console.log(`Version: ${model.version}`);
console.log(`Artifact SHA-256: ${createHash("sha256").update(modelBytes).digest("hex")}`);
console.log("Task: emotion labels expressed in English wording; no diagnosis or referral prediction.");
console.log("Data: public GoEmotions Reddit annotations, not local student health records.");
console.table(Object.entries(report.protocol.partitions).map(([split, audit]) => ({
  split, retainedRows: (audit as { usedRows: number }).usedRows,
  purpose: split === "train" ? "learn vocabulary and weights" : split === "dev" ? "choose C and threshold" : "frozen final evaluation",
})));
console.log(`TF-IDF features: ${report.selected.features}; logistic classifiers: ${model.labels.length}; C: ${report.selected.C}; threshold: ${model.threshold}`);
console.log("Recorded held-out evaluation (not recomputed from these demonstration sentences):");
console.table([
  { method: "Training-frequency baseline", microF1: report.frequencyBaselineTest.micro.f1.toFixed(4), macroF1: report.frequencyBaselineTest.macro.f1.toFixed(4) },
  { method: "TF-IDF + logistic regression", microF1: report.test.micro.f1.toFixed(4), macroF1: report.test.macro.f1.toFixed(4) },
]);
console.log(`Python/browser score parity: PASS, ${fixture.cases.length} probes; max difference ${maximumDifference.toExponential(3)}.`);
console.log("F1 is not accuracy. Rare-label failures and domain mismatch remain; grief and nervousness have zero test recall.");
if (args.includes("--labels")) {
  console.table(report.perLabel.map((row: { label: string; precision: number; recall: number; f1: number; support: number }) => ({
    label: row.label, precision: row.precision.toFixed(4), recall: row.recall.toFixed(4), f1: row.f1.toFixed(4), testSupport: row.support,
  })));
}
const examples = customText !== undefined ? [customText] : [
  "I am happy about finishing my project and grateful for the help.",
  "I miss my friends and I feel lonely tonight.",
  "hi",
  "zxqvvv qwxzzz plmmqq",
  "මට අද සතුටුයි",
];
console.log("Live inference using the application runtime. Inputs below are demonstrations, not evaluation evidence.");
for (const text of examples) {
  const result = analyzeReflection(text, model);
  console.log(`\nInput: ${JSON.stringify(text)}`);
  console.log(`Status: ${result.status}; tokens: ${result.tokenCount}; known words: ${(100 * result.knownTokenFraction).toFixed(1)}%`);
  if (result.status === "ready") {
    console.table(result.scores.slice(0, 3).map((item) => ({
      label: item.label, modelScore: item.score.toFixed(4), aboveThreshold: item.selected,
    })));
    if (!result.scores.some((item) => item.selected)) console.log("No label crossed the threshold.");
  } else console.log("Scores withheld by the application's input checks.");
}
console.log("\nIndependent scores do not add to 100% and are not calibrated clinical probabilities.");
console.log("This command does not train, modify the model, save inputs, call the database or send text to an API.");
