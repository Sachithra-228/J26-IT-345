import fixture from "../../fixtures/c2/text-parity.json";
import artifact from "@/lib/c2/model/text-model.json";
import {
  analyzeReflection,
  predictEmotionScores,
  tokenizeReflection,
  type TextModel,
} from "@/lib/c2/text-runtime";

const model = artifact as TextModel;
describe("C2 Python to browser model parity", () => {
  it("uses the exact model version and label order", () => {
    expect(fixture.modelVersion).toBe(model.version);
    expect(fixture.labels).toEqual(model.labels);
  });
  it.each(fixture.cases.map((entry, i) => [i, entry] as const))(
    "matches preprocessing and all label scores for probe %i",
    (_i, entry) => {
      expect(tokenizeReflection(entry.text)).toEqual(entry.tokens);
      const actual = predictEmotionScores(entry.text, model);
      expect(actual).toHaveLength(entry.scores.length);
      actual.forEach((score, i) =>
        expect(Math.abs(score - entry.scores[i])).toBeLessThan(1e-7),
      );
    },
  );
});

describe("C2 input and uncertainty boundaries", () => {
  it("withholds results for short, unsupported and unfamiliar inputs", () => {
    for (const text of ["", "hi"])
      expect(analyzeReflection(text, model)).toMatchObject({
        status: "too_short",
        scores: [],
      });
    for (const text of [
      "මට අද සතුටුයි",
      "எனக்கு இன்று மகிழ்ச்சி",
      "I feel worried අද",
      "Мне грустно сегодня",
    ]) {
      expect(analyzeReflection(text, model)).toMatchObject({
        status: "unsupported_language",
        scores: [],
      });
    }
    expect(analyzeReflection("zxqvvv qwxzzz plmmqq", model)).toMatchObject({
      status: "unfamiliar_words",
      scores: [],
    });
    expect(analyzeReflection("a".repeat(1201), model).status).toBe("too_long");
  });
  it("returns marginal label scores and availability, without a clinical or referral decision", () => {
    const result = analyzeReflection(
      "I feel proud that I finished my project and grateful for my friends.",
      model,
    );
    expect(result.status).toBe("ready");
    expect(result.scores).toHaveLength(28);
    expect(
      result.scores.every((entry) => entry.score >= 0 && entry.score <= 1),
    ).toBe(true);
    expect(
      result.scores.every(
        (entry) => entry.selected === entry.score >= model.threshold,
      ),
    ).toBe(true);
    expect(result).not.toHaveProperty("riskLevel");
    expect(result).not.toHaveProperty("diagnosis");
    expect(result).not.toHaveProperty("referralCategory");
  });
});
