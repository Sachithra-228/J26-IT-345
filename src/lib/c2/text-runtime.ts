/** Portable C2 TF-IDF / logistic runtime. Mirrors ml/c2/train_text.py. */
export type TextModel = {
  schemaVersion: number;
  version: string;
  language: string;
  task: string;
  labels: string[];
  threshold: number;
  minTokens: number;
  minKnownTokenFraction: number;
  vocabulary: Record<string, number>;
  idf: number[];
  coefficients: number[][];
  intercepts: number[];
};
export type EmotionScore = { label: string; score: number; selected: boolean };
export type TextAnalysis = {
  status:
    | "ready"
    | "too_short"
    | "too_long"
    | "unsupported_language"
    | "unfamiliar_words";
  modelVersion: string;
  tokenCount: number;
  knownTokenFraction: number;
  scores: EmotionScore[];
};

export function tokenizeReflection(text: string): string[] {
  return (
    text
      .normalize("NFKC")
      .replace(/[‘’]/g, "'")
      .toLowerCase()
      .match(/[a-z0-9]+(?:'[a-z0-9]+)?/g) ?? []
  );
}

export function predictEmotionScores(text: string, model: TextModel): number[] {
  const tokens = tokenizeReflection(text);
  const counts = new Map<number, number>();
  const terms = [...tokens];
  for (let i = 0; i < tokens.length - 1; i++)
    terms.push(`${tokens[i]} ${tokens[i + 1]}`);
  for (const term of terms) {
    const index = model.vocabulary[term];
    if (typeof index === "number")
      counts.set(index, (counts.get(index) ?? 0) + 1);
  }
  const features: Array<[number, number]> = [];
  let squared = 0;
  for (const [index, count] of counts) {
    const value = (1 + Math.log(count)) * model.idf[index];
    features.push([index, value]);
    squared += value * value;
  }
  const norm = Math.sqrt(squared) || 1;
  return model.coefficients.map((weights, labelIndex) => {
    let logit = model.intercepts[labelIndex];
    for (const [index, value] of features)
      logit += weights[index] * (value / norm);
    // Numerically stable logistic function.
    return logit >= 0
      ? 1 / (1 + Math.exp(-logit))
      : Math.exp(logit) / (1 + Math.exp(logit));
  });
}

export function analyzeReflection(
  text: string,
  model: TextModel,
): TextAnalysis {
  const tokens = tokenizeReflection(text);
  const known = tokens.filter(
    (term) => typeof model.vocabulary[term] === "number",
  ).length;
  const base = {
    modelVersion: model.version,
    tokenCount: tokens.length,
    knownTokenFraction: tokens.length ? known / tokens.length : 0,
  };
  if (text.length > 1200) return { ...base, status: "too_long", scores: [] };
  // Only English was evaluated. Other scripts are not silently treated as English.
  if (/[^\p{Script=Latin}\p{Script=Common}\p{Script=Inherited}]/u.test(text))
    return { ...base, status: "unsupported_language", scores: [] };
  if (tokens.length < model.minTokens)
    return { ...base, status: "too_short", scores: [] };
  if (base.knownTokenFraction < model.minKnownTokenFraction)
    return { ...base, status: "unfamiliar_words", scores: [] };
  const values = predictEmotionScores(text, model);
  return {
    ...base,
    status: "ready",
    scores: model.labels
      .map((label, i) => ({
        label,
        score: values[i],
        selected: values[i] >= model.threshold,
      }))
      .sort((a, b) => b.score - a.score),
  };
}

export async function loadTextModel(): Promise<TextModel> {
  const model = (await import("./model/text-model.json")).default as TextModel;
  if (
    model.schemaVersion !== 1 ||
    model.labels.length !== model.coefficients.length ||
    model.idf.length !== model.coefficients[0]?.length
  ) {
    throw new Error(
      "The C2 model file is incompatible. Please reload and try again.",
    );
  }
  return model;
}
