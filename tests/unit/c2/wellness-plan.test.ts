import { createWellnessPlan } from "@/lib/c2/wellness-plan";
import {
  appendProgress,
  loadProgress,
  parseProgress,
  PROGRESS_KEY,
  screeningEntry,
} from "@/lib/c2/progress";
import { CONCERN_TOPICS, type Assessment } from "@/lib/c2/assessment";
import { activityById } from "@/lib/c2/wellness-plan";

const assessment: Assessment = {
  phq9: Array(9).fill(0),
  gad7: Array(7).fill(0),
  context: {},
  supportTopics: ["study"],
  concernAnalysis: {
    confirmed: ["study"],
    prediction: null,
    source: "student-selected",
  },
  completedAt: "2026-10-20T12:00:00.000Z",
  version: "test",
};
beforeEach(() => localStorage.clear());
it.each(CONCERN_TOPICS)("offers a topic-specific activity for %s", (topic) => {
  const plan = createWellnessPlan({ ...assessment, supportTopics: [topic] });
  expect(activityById(plan[0].activityId)?.topic).toBe(topic);
  expect(new Set(plan.map((item) => item.activityId)).size).toBe(3);
});
it("preserves expanded topic summaries without persisting the direct safety disclosure", () => {
  const value = screeningEntry({
    ...assessment,
    supportTopics: [...CONCERN_TOPICS],
    safetySupportRequested: true,
  });
  const parsed = parseProgress({ schemaVersion: 1, entries: [value] });
  expect(parsed.entries[0]).toMatchObject({
    kind: "screening",
    topics: [...CONCERN_TOPICS],
  });
  expect(JSON.stringify(parsed)).not.toContain("safetySupportRequested");
});
it("uses confirmed topics and the specific workload answer to change the plan", () => {
  expect(createWellnessPlan(assessment)[0].activityId).toBe("small-start");
  const workload = createWellnessPlan({
    ...assessment,
    context: { study: "I would like help planning my workload" },
  });
  expect(workload[0]).toMatchObject({ activityId: "workload" });
  expect(workload[0].reason).toContain(
    "I would like help planning my workload",
  );
  const sleep = createWellnessPlan({ ...assessment, supportTopics: ["sleep"] });
  expect(sleep[0].activityId).toBe("wind-down");
  expect(createWellnessPlan(null)).toHaveLength(3);
  expect(
    new Set(createWellnessPlan(assessment).map((item) => item.activityId)).size,
  ).toBe(3);
});
it("only keeps allowlisted summary fields and never converts missing screening items to zero", () => {
  const value = screeningEntry({
    ...assessment,
    phq9: [null, ...Array(8).fill(0)],
  });
  expect(value).toMatchObject({ kind: "screening", phq9: null, gad7: 0 });
  const parsed = parseProgress({
    schemaVersion: 1,
    entries: [
      { ...value, description: "private writing", rawAnswers: assessment.phq9 },
    ],
  });
  expect(JSON.stringify(parsed)).not.toMatch(
    /private writing|rawAnswers|description/,
  );
  expect(Object.keys(parsed.entries[0])).not.toContain("context");
});
it("rejects malformed, duplicate and out-of-range stored records", () => {
  const entry = { id: "x", kind: "mood", at: assessment.completedAt, value: 3 };
  expect(() => parseProgress({ schemaVersion: 2, entries: [] })).toThrow();
  expect(() =>
    parseProgress({ schemaVersion: 1, entries: [{ ...entry, value: 9 }] }),
  ).toThrow();
  expect(() =>
    parseProgress({ schemaVersion: 1, entries: [entry, entry] }),
  ).toThrow();
  expect(() =>
    parseProgress({ schemaVersion: 1, entries: [{ ...entry, at: "invalid" }] }),
  ).toThrow();
});
it("deduplicates summaries, preserves other browser keys and caps history at 100", () => {
  localStorage.setItem("other-app", "keep me");
  appendProgress(localStorage, screeningEntry(assessment));
  appendProgress(localStorage, screeningEntry(assessment));
  expect(loadProgress(localStorage).entries).toHaveLength(1);
  for (let i = 0; i < 101; i++)
    appendProgress(localStorage, {
      kind: "mood",
      id: `m${i}`,
      at: assessment.completedAt,
      value: 3,
    });
  expect(loadProgress(localStorage).entries).toHaveLength(100);
  expect(loadProgress(localStorage).entries[0].id).toBe("m1");
  expect(localStorage.getItem("other-app")).toBe("keep me");
  expect(localStorage.getItem(PROGRESS_KEY)).not.toContain("rawAnswers");
});
