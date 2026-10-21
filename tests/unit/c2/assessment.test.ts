import {
  PHQ9,
  GAD7,
  FREQUENCY,
  scoreScale,
  selfHarmResponse,
  followUps,
  assessmentConcerns,
  supportSuggestion,
  QUESTIONNAIRE_VERSION,
  type Assessment,
  type Answer,
} from "@/lib/c2/assessment";
function answers(total: number, length: number): Answer[] {
  return Array.from(
    { length },
    (_, i) => Math.max(0, Math.min(3, total - i * 3)) as Answer,
  );
}
const caseOf = (p: number, g: number): Assessment => ({
  phq9: answers(p, 9),
  gad7: answers(g, 7),
  context: {},
  completedAt: "2026-10-19",
  version: QUESTIONNAIRE_VERSION,
});
it("retains the complete item sets, frequency choices and safety question", () => {
  expect(PHQ9).toHaveLength(9);
  expect(GAD7).toHaveLength(7);
  expect(FREQUENCY).toEqual([
    "Not at all",
    "Several days",
    "More than half the days",
    "Nearly every day",
  ]);
  expect(PHQ9[8]).toContain("hurting yourself");
});
it.each([
  [0, "Minimal"],
  [4, "Minimal"],
  [5, "Mild"],
  [9, "Mild"],
  [10, "Moderate"],
  [14, "Moderate"],
  [15, "Moderately severe"],
  [19, "Moderately severe"],
  [20, "Severe"],
  [27, "Severe"],
])("PHQ-9 total %i is %s", (total, band) => {
  expect(scoreScale("phq9", answers(Number(total), 9))).toMatchObject({
    total,
    band,
    maximum: 27,
  });
});
it.each([
  [0, "Minimal"],
  [4, "Minimal"],
  [5, "Mild"],
  [9, "Mild"],
  [10, "Moderate"],
  [14, "Moderate"],
  [15, "Severe"],
  [21, "Severe"],
])("GAD-7 total %i is %s", (total, band) => {
  expect(scoreScale("gad7", answers(Number(total), 7))).toMatchObject({
    total,
    band,
    maximum: 21,
  });
});
it("never imputes an unanswered item as zero", () => {
  const a = answers(0, 9);
  a[2] = null;
  expect(scoreScale("phq9", a)).toEqual({
    answered: 8,
    missing: [3],
    total: null,
    band: null,
    maximum: 27,
  });
});
it.each(
  [
    [],
    Array(9),
    Array(9).fill(-1),
    Array(9).fill(4),
    Array(9).fill(NaN),
    Array(9).fill(1.5),
    Array(9).fill(undefined),
  ].map((vector) => [vector]),
)("rejects invalid questionnaire vectors %#", (vector) => {
  expect(() => scoreScale("phq9", vector as Answer[])).toThrow();
});
it("handles the safety response separately even with a low total", () => {
  const a = caseOf(0, 0);
  a.phq9[8] = 1;
  expect(scoreScale("phq9", a.phq9).total).toBe(1);
  expect(selfHarmResponse(a.phq9)).toBe("reported");
  expect(supportSuggestion(a).body).toContain("regardless of your totals");
  a.phq9[8] = null;
  expect(selfHarmResponse(a.phq9)).toBe("unanswered");
  a.phq9[8] = 0;
  expect(selfHarmResponse(a.phq9)).toBe("not-reported");
});
it("selects context questions only for relevant reported answers", () => {
  const a = caseOf(0, 0);
  expect(followUps(a.phq9, a.gad7).map((q) => q.id)).toEqual([
    "duration",
    "goal",
  ]);
  a.phq9[2] = 1;
  a.gad7[0] = 1;
  expect(followUps(a.phq9, a.gad7).map((q) => q.id)).toEqual([
    "impact",
    "sleep",
    "worry",
    "duration",
    "goal",
  ]);
});
it("does not use context to change standard scores and preserves both symptom dimensions", () => {
  const a = caseOf(12, 15);
  a.context = { worry: "Study or exams", mood: "Feeling connected" };
  expect(scoreScale("phq9", a.phq9).total).toBe(12);
  expect(scoreScale("gad7", a.gad7).total).toBe(15);
  expect(assessmentConcerns(a)).toEqual([
    "low-mood",
    "worry",
    "sleep",
    "study",
    "connection",
  ]);
});
it("does not offer reassurance from low or incomplete scores", () => {
  expect(supportSuggestion(caseOf(0, 0)).body).toContain("does not rule out");
  const a = caseOf(0, 0);
  a.gad7[1] = null;
  expect(supportSuggestion(a).title).toContain("still open");
});
it("supports professional choice at any score", () => {
  const a = caseOf(0, 0);
  a.context.goal = "Talk to a professional";
  expect(supportSuggestion(a).title).toContain("professional");
});
it.each([
  [15, 0],
  [20, 0],
  [0, 15],
  [0, 21],
])("makes professional support prominent for PHQ %i / GAD %i", (p, g) => {
  expect(supportSuggestion(caseOf(p, g)).title).toBe(
    "Make professional support your next step",
  );
});
it("keeps the completed high result actionable when the other scale is incomplete", () => {
  const a = caseOf(0, 15);
  a.phq9[0] = null;
  expect(supportSuggestion(a).title).toBe(
    "Make professional support your next step",
  );
  a.phq9[8] = 1;
  expect(supportSuggestion(a).body).toContain("regardless of your totals");
});
