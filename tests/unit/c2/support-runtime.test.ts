import artifact from "@/lib/c2/model/support-model.json";
import fixture from "../../fixtures/c2/support-parity.json";
import { estimateSupport, nextSupportQuestion, predictSupportHead, supportFeatures, validateSupportModel, type SupportInput, type SupportModel } from "@/lib/c2/support-runtime";
import type { Answer } from "@/lib/c2/assessment";
const model = artifact as SupportModel;
function input(caseInput: { phq9: number[]; gad7: number[]; context: object }): SupportInput {
  return { phq9: caseInput.phq9 as Answer[], gad7: caseInput.gad7 as Answer[], context: caseInput.context as Record<string, string> };
}
it("validates the generated model schema, labels and dimensions", () => {
  expect(validateSupportModel(model)).toBe(model);
  expect(model.version).toBe(fixture.version);
  expect(() => validateSupportModel({ ...model, schema: "wrong" })).toThrow();
  expect(() => validateSupportModel({ ...model, featureNames: [] })).toThrow();
});
it.each(fixture.cases.map((probe, i) => [i, probe] as const))("matches Python feature encoding and both learned heads for probe %i", (_, probe) => {
  const values = supportFeatures(input(probe.input));
  expect(values).toEqual(probe.features);
  for (const [actual, expected] of [[predictSupportHead(values, model.support), probe.supportScores], [predictSupportHead(values, model.router), probe.topicScores]]) {
    expect(actual).toHaveLength(expected.length);
    actual.forEach((value, i) => expect(Math.abs(value - expected[i])).toBeLessThan(1e-7));
  }
  expect(nextSupportQuestion(input(probe.input), Object.keys(probe.input.context), model)?.id ?? null).toBe(probe.nextQuestion);
});
it.each(fixture.rollouts.map((probe, i) => [i, probe] as const))("replays Python's adaptive six-question path including skipped answers for case %i", (_, probe) => {
  const original = input(probe.input), context: Record<string, string> = {}, asked: string[] = [];
  let question;
  while ((question = nextSupportQuestion({ ...original, context }, asked, model))) {
    asked.push(question.id);
    if (original.context[question.id]) context[question.id] = original.context[question.id];
  }
  expect(asked).toEqual(probe.path);
  expect(context).toEqual(probe.usedContext);
  expect(new Set(asked).size).toBe(6);
  const scores = predictSupportHead(supportFeatures({ ...original, context }), model.support);
  scores.forEach((value, i) => expect(Math.abs(value - probe.supportScores[i])).toBeLessThan(1e-7));
});
it("handles safety independently and never treats missing questionnaire items as healthy", () => {
  const base: SupportInput = { phq9: Array(9).fill(0), gad7: Array(7).fill(0), context: {} };
  const safety = { ...base, phq9: [...base.phq9.slice(0, 8), 1 as Answer] };
  expect(supportFeatures(safety)).toEqual(supportFeatures(base));
  expect(estimateSupport(safety, model)).toMatchObject({ status: "safety", category: null, scores: [], topics: [] });
  const incomplete = { ...base, phq9: [null, ...base.phq9.slice(1)] };
  expect(estimateSupport(incomplete, model)).toMatchObject({ status: "incomplete", category: null, scores: [] });
  expect(supportFeatures(incomplete)).not.toEqual(supportFeatures(base));
  expect(() => supportFeatures({ ...base, gad7: [4] as Answer[] })).toThrow();
});
it("keeps research class scores distinct from diagnostic claims", () => {
  const result = estimateSupport(input(fixture.cases[0].input), model);
  expect(result.status).toBe("ready");
  expect(result.scores.reduce((sum, item) => sum + item.score, 0)).toBeCloseTo(1, 10);
  expect(result).not.toHaveProperty("diagnosis");
  expect(result).not.toHaveProperty("suicideRisk");
  expect(result.topics).toHaveLength(5);
});
