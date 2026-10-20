import {
  CONCERN_TOPICS,
  assessmentConcerns,
  type Assessment,
} from "@/lib/c2/assessment";
import {
  concernExplanation,
  followupTarget,
  nextConcernQuestion,
  resolvedConcernTopics,
  confirmedTopicWeights,
  type ConcernAnalysis,
} from "@/lib/c2/concern-routing";
import {
  BUNDLED_FOLLOWUP_BANK,
  validateFollowupBank,
} from "@/lib/c2/followup-bank";
import {
  matchProviders,
  EMPTY_PREFERENCES,
  type Provider,
} from "@/lib/c2/support";
import profiles from "@/lib/c2/research-professionals.json";

const analysis: ConcernAnalysis = {
  source: "distilbert-confirmed",
  confirmed: ["worry", "sleep"],
  prediction: {
    runId: "test",
    checkpointSha256: "a".repeat(64),
    tokenCount: 3,
    inputIds: [],
    threshold: 0.5,
    scores: [
      { topic: "study", score: 0.95, selected: true },
      { topic: "worry", score: 0.9, selected: true },
      { topic: "sleep", score: 0.8, selected: true },
    ],
  },
};
const assessment: Assessment = {
  phq9: [3, 3, 3, 3, 0, 0, 0, 0, 0],
  gad7: [3, 3, 3, 2, 0, 0, 0],
  context: {
    impact: "Very difficult",
    duration: "More than a month",
    goal: "Talk to a professional",
  },
  concernAnalysis: analysis,
  completedAt: "2026-10-20",
  version: "test",
};
it("uses confirmed topics instead of reintroducing rejected model or questionnaire topics", () => {
  expect(assessmentConcerns(assessment)).toEqual(["worry", "sleep"]);
  expect(confirmedTopicWeights(analysis)).toEqual({ worry: 0.9, sleep: 0.8 });
});
it("validates 270 distinct authored questions across fifteen topics", () => {
  const bank = BUNDLED_FOLLOWUP_BANK;
  expect(validateFollowupBank(bank)).toBe(bank);
  expect(bank.questions).toHaveLength(270);
  expect(new Set(bank.questions.map((q) => q.text.toLowerCase())).size).toBe(
    270,
  );
  for (const topic of CONCERN_TOPICS) {
    expect(
      bank.questions.filter((q) =>
        q.topics.includes(topic as (typeof analysis.confirmed)[number]),
      ),
    ).toHaveLength(17);
  }
  expect(bank.questions.filter((q) => !q.topics.length)).toHaveLength(15);
});
it.each(CONCERN_TOPICS.slice(5))(
  "uses earlier answers to choose distinct %s branches",
  (topic) => {
    const selected: ConcernAnalysis = {
      prediction: null,
      confirmed: [topic],
      source: "student-selected",
    };
    const entry = nextConcernQuestion(selected, {}, []);
    expect(entry?.id).toBe(topic);
    const first = nextConcernQuestion(
      selected,
      { [topic]: entry!.options[0] },
      [topic],
    );
    const second = nextConcernQuestion(
      selected,
      { [topic]: entry!.options[1] },
      [topic],
    );
    expect(first?.id).toBe(`${topic}-detail-1`);
    expect(second?.id).toBe(`${topic}-detail-2`);
    expect(first?.reason).toContain(entry!.options[0]);
    const asked: string[] = [topic],
      context = { [topic]: entry!.options[0] };
    while (true) {
      const next = nextConcernQuestion(selected, context, asked);
      if (!next) break;
      asked.push(next.id);
      if (asked.length > 9) throw new Error("Limit exceeded");
    }
    expect(new Set(asked).size).toBe(asked.length);
    expect(asked.length).toBeGreaterThanOrEqual(5);
    expect(asked).toContain("impact");
    expect(asked).toContain("goal");
    const dismissed = resolvedConcernTopics(selected, {
      [topic]: entry!.options[4],
    });
    expect(dismissed).not.toContain(topic);
  },
);
function pathFor(firstAnswer: string) {
  const asked: string[] = [],
    context: Record<string, string> = {};
  while (true) {
    const q = nextConcernQuestion(
      analysis,
      context,
      asked,
      BUNDLED_FOLLOWUP_BANK,
      assessment.phq9,
      assessment.gad7,
    );
    if (!q) break;
    asked.push(q.id);
    if (q.id === "worry") context.worry = firstAnswer;
    if (asked.length > 9) throw new Error("Question limit exceeded");
  }
  return { asked, context };
}
it("uses earlier answers to take different branches, with no repeats and a 5–9 question limit", () => {
  const study = pathFor("Study or exams"),
    relationships = pathFor("Relationships");
  expect(study.asked[0]).toBe("worry");
  expect(resolvedConcernTopics(analysis, study.context)).toContain("study");
  expect(resolvedConcernTopics(analysis, relationships.context)).toContain(
    "connection",
  );
  expect(study.asked).toContain("study");
  expect(relationships.asked).toContain("connection");
  expect(study.asked).not.toEqual(relationships.asked);
  for (const path of [study.asked, relationships.asked]) {
    expect(path.length).toBeGreaterThanOrEqual(5);
    expect(path.length).toBeLessThanOrEqual(9);
    expect(new Set(path).size).toBe(path.length);
    expect(path).toContain("impact");
    expect(path).toContain("goal");
  }
});
it("asks five general questions with no selected topics and scales to nine with five", () => {
  const none = { ...analysis, confirmed: [] };
  expect(followupTarget(none, {})).toBe(5);
  const asked: string[] = [];
  while (true) {
    const next = nextConcernQuestion(none, {}, asked);
    if (!next) break;
    asked.push(next.id);
  }
  expect(asked).toHaveLength(5);
  expect(
    asked.every(
      (id) =>
        !BUNDLED_FOLLOWUP_BANK.questions.find((q) => q.id === id)?.topics
          .length,
    ),
  ).toBe(true);
  expect(
    followupTarget(
      {
        ...analysis,
        confirmed: ["low-mood", "worry", "sleep", "study", "connection"],
      },
      {},
    ),
  ).toBe(9);
});
it("drops a topic after an explicit no-current-concern answer", () => {
  expect(
    resolvedConcernTopics(analysis, { sleep: "No current sleep concern" }),
  ).toEqual(["worry"]);
});
it("uses a money-related worry answer to introduce the practical-support questions", () => {
  const selected: ConcernAnalysis = {
    prediction: null,
    confirmed: ["worry"],
    source: "student-selected",
  };
  const context = { worry: "Money or practical problems" };
  expect(resolvedConcernTopics(selected, context)).toContain("practical");
  const asked = ["worry"];
  while (true) {
    const next = nextConcernQuestion(selected, context, asked);
    if (!next) break;
    asked.push(next.id);
  }
  expect(asked).toContain("practical");
});
it("explains actual questionnaire ranges and reported context without claiming neural diagnosis", () => {
  const text = concernExplanation(assessment).join(" ");
  expect(text).toContain("PHQ-9: 12/27, in the moderate symptom range");
  expect(text).toContain("GAD-7: 11/21, in the moderate symptom range");
  expect(text).toContain("These topics help personalise your support options.");
  expect(text).not.toContain("diagnosed");
  const incomplete = concernExplanation({
    ...assessment,
    phq9: [null, ...assessment.phq9.slice(1)],
  }).join(" ");
  expect(incomplete).toContain("PHQ-9 is incomplete");
});
it("passes confirmed concerns to real profile matching while enforcing student preferences", () => {
  const providers = profiles.map((p) => ({
    ...p,
    availability: "demo",
    isResearchProfile: true,
  })) as Provider[];
  const matches = matchProviders(
    providers,
    assessmentConcerns(assessment),
    { ...EMPTY_PREFERENCES, gender: "female", language: "en" },
    confirmedTopicWeights(analysis),
  );
  expect(matches[0].provider._id).toBe("c2-research-03");
  expect(
    matches.every(
      (m) =>
        m.provider.gender === "female" && m.provider.languages?.includes("en"),
    ),
  ).toBe(true);
  expect(matches[0].reasons.join(" ")).toContain("Worry");
});
it("matches expanded topics only against recorded profile areas while retaining preferences", () => {
  const providers = profiles.map((p) => ({
    ...p,
    availability: "demo",
    isResearchProfile: true,
  })) as Provider[];
  const matches = matchProviders(providers, ["trauma"], {
    ...EMPTY_PREFERENCES,
    gender: "female",
    language: "ta",
    profession: "psychologist",
  });
  expect(matches[0].provider._id).toBe("c2-research-08");
  expect(matches[0].reasons.join(" ")).toContain(
    "Difficult experiences & trauma",
  );
});
