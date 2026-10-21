/** Browser inference for the new synthetic questionnaire/context models. */
import spec from "./support-spec.json";
import { scoreScale, selfHarmResponse, type Answer, type Concern, type FollowUp } from "./assessment";

export type SupportInput = { phq9: readonly Answer[]; gad7: readonly Answer[]; context: Record<string, string> };
type Linear = { kind: "multinomial-logistic" | "multilabel-logistic"; mean: number[]; scale: number[]; coefficients: number[][]; intercepts: number[] };
type Forest = { kind: "random-forest"; trees: Array<{ left: number[]; right: number[]; feature: number[]; threshold: number[]; values: number[][] }> };
export type SupportModel = {
  schemaVersion: number;
  version: string;
  schema: string;
  featureNames: string[];
  classes: string[];
  topics: string[];
  warning: string;
  support: Linear | Forest;
  router: Linear;
  uncertainty: { minimumMaximumScore: number; minimumMargin: number };
};
export type SupportEstimate = {
  status: "ready" | "incomplete" | "safety";
  version: string;
  uncertain: boolean;
  category: string | null;
  scores: Array<{ category: string; score: number }>;
  topics: Array<{ topic: Concern; score: number }>;
  observations: string[];
};
export const SUPPORT_LABELS: Record<string, string> = {
  "optional-support": "Self-management with optional support",
  "routine-follow-up": "Routine professional follow-up",
  "prompt-review": "Prompt professional review",
};
export const SUPPORT_QUESTIONS: FollowUp[] = spec.questions;

export function supportFeatures(input: SupportInput): number[] {
  // Validate all 16 answers even though the safety item is excluded from features.
  scoreScale("phq9", input.phq9);
  scoreScale("gad7", input.gad7);
  const answers = [...input.phq9.slice(0, 8), ...input.gad7];
  const values = answers.map((value) => value == null ? 0 : value / 3);
  values.push(...answers.map((value) => Number(value == null)));
  for (const q of spec.questions) {
    const value = input.context[q.id];
    values.push(...q.options.map((option) => Number(value === option)));
    values.push(Number(!q.options.includes(value)));
  }
  return values;
}

function sigmoid(value: number) {
  return value >= 0 ? 1 / (1 + Math.exp(-value)) : Math.exp(value) / (1 + Math.exp(value));
}
export function predictSupportHead(values: number[], head: Linear | Forest): number[] {
  if (head.kind === "random-forest") {
    const totals = Array(3).fill(0) as number[];
    // sklearn's forest accepts float32 input at traversal time.
    const x = values.map(Math.fround);
    for (const tree of head.trees) {
      let node = 0;
      while (tree.left[node] !== -1) node = x[tree.feature[node]] <= tree.threshold[node] ? tree.left[node] : tree.right[node];
      tree.values[node].forEach((value, i) => { totals[i] += value / head.trees.length; });
    }
    return totals;
  }
  const x = values.map((value, i) => (value - head.mean[i]) / head.scale[i]);
  const logits = head.coefficients.map((weights, label) => weights.reduce((sum, weight, i) => sum + weight * x[i], head.intercepts[label]));
  if (head.kind === "multilabel-logistic") return logits.map(sigmoid);
  const max = Math.max(...logits), exp = logits.map((value) => Math.exp(value - max));
  const sum = exp.reduce((a, b) => a + b, 0);
  return exp.map((value) => value / sum);
}

export function estimateSupport(input: SupportInput, model: SupportModel): SupportEstimate {
  const values = supportFeatures(input);
  const observations = spec.questions.filter((q) => input.context[q.id] && q.options.includes(input.context[q.id])).map((q) => `${q.id === "impact" ? "Daily-life impact" : q.id === "duration" ? "Duration" : q.id === "goal" ? "Support goal" : q.id}: ${input.context[q.id]}`);
  const base = { version: model.version, uncertain: true, category: null, scores: [], topics: [], observations };
  if (selfHarmResponse(input.phq9) === "reported") return { ...base, status: "safety" };
  if (input.phq9.some((v) => v === null) || input.gad7.some((v) => v === null)) return { ...base, status: "incomplete" };
  const scores = predictSupportHead(values, model.support).map((score, i) => ({ category: model.classes[i], score })).sort((a, b) => b.score - a.score);
  const topics = predictSupportHead(values, model.router).map((score, i) => ({ topic: model.topics[i] as Concern, score })).sort((a, b) => b.score - a.score);
  const uncertain = scores[0].score < model.uncertainty.minimumMaximumScore || scores[0].score - scores[1].score < model.uncertainty.minimumMargin;
  return { status: "ready", version: model.version, uncertain, category: uncertain ? null : scores[0].category, scores, topics, observations };
}

export function nextSupportQuestion(input: SupportInput, asked: readonly string[], model: SupportModel): FollowUp | null {
  for (const id of spec.foundation) {
    if (!asked.includes(id)) return SUPPORT_QUESTIONS.find((q) => q.id === id)!;
  }
  if (asked.length >= spec.maximumQuestions) return null;
  const scores = predictSupportHead(supportFeatures(input), model.router);
  const candidates = spec.topics.map((topic, i) => ({
    id: (spec.topicQuestions as Record<string, string>)[topic], score: scores[i], order: i,
  })).filter((item) => !asked.includes(item.id)).sort((a, b) => b.score - a.score || a.order - b.order);
  const chosen = candidates[0];
  return chosen ? { ...SUPPORT_QUESTIONS.find((q) => q.id === chosen.id)!, reason: "Selected from the context bank by the trained topic model using the answers available so far. This is research routing, not a clinical conclusion." } : null;
}

export function validateSupportModel(model: SupportModel): SupportModel {
  const length = supportFeatures({ phq9: Array(9).fill(0), gad7: Array(7).fill(0), context: {} }).length;
  const validLinear = (head: Linear, labels: number) => head.coefficients.length === labels && head.intercepts.length === labels && head.coefficients.every((row) => row.length === length && row.every(Number.isFinite)) && head.intercepts.every(Number.isFinite) && head.mean.length === length && head.scale.length === length && head.mean.every(Number.isFinite) && head.scale.every((n) => Number.isFinite(n) && n > 0);
  if (model.schemaVersion !== 1 || model.schema !== spec.version || model.featureNames.length !== length || JSON.stringify(model.classes) !== JSON.stringify(spec.classes) || JSON.stringify(model.topics) !== JSON.stringify(spec.topics) || !validLinear(model.router, 5) || (model.support.kind !== "random-forest" && !validLinear(model.support, 3))) throw new Error("Incompatible C2 support model");
  return model;
}
export async function loadSupportModel(): Promise<SupportModel> {
  return validateSupportModel((await import("./model/support-model.json")).default as SupportModel);
}
