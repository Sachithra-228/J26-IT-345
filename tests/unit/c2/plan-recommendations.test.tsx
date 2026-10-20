import { fireEvent, render, screen, within } from "@testing-library/react";
import { WellnessPlan } from "@/components/c2/wellness-plan";
import {
  CONCERN_TOPICS,
  type Assessment,
  type Concern,
} from "@/lib/c2/assessment";
import identity from "@/lib/c2/model/concern-identity.json";
import {
  createWellnessPlan,
  hasUsablePlanPrediction,
  recommendWellnessActivities,
} from "@/lib/c2/wellness-plan";

function checkIn(
  scores: Partial<Record<Concern, number>> = {},
  topics: Concern[] = ["study", "sleep", "worry"],
): Assessment {
  return {
    phq9: Array(9).fill(0),
    gad7: Array(7).fill(0),
    context: {},
    supportTopics: topics,
    version: "test",
    completedAt: "2026-10-20T12:00:00Z",
    concernAnalysis: {
      confirmed: topics,
      source: "distilbert-confirmed",
      prediction: {
        runId: identity.runId,
        checkpointSha256: identity.checkpointSha256,
        threshold: 0.25,
        inputIds: [],
        tokenCount: 5,
        scores: CONCERN_TOPICS.map((topic) => ({
          topic,
          score: scores[topic] ?? 0.1,
          selected: (scores[topic] ?? 0.1) >= 0.25,
        })),
      },
    },
  };
}
const callbacks = () => ({
  completions: [],
  onComplete: jest.fn(),
  onSupport: jest.fn(),
  onCommunity: jest.fn(),
  onProgress: jest.fn(),
  onSummary: jest.fn(),
});

it("uses current model priorities to change activity order for identical confirmed topics", () => {
  const first = checkIn({ study: 0.6, sleep: 0.8, worry: 0.9 });
  expect(createWellnessPlan(first).map((item) => item.activityId)).toEqual([
    "worry-step",
    "wind-down",
    "small-start",
  ]);
  expect(
    createWellnessPlan(checkIn({ study: 0.95, sleep: 0.8, worry: 0.6 }))[0]
      .activityId,
  ).toBe("small-start");
  expect(createWellnessPlan(first)[0].reason).toContain(
    "DistilBERT helped prioritise this confirmed topic",
  );
});
it("lets explicit follow-up answers refine model priority and selects the workload activity", () => {
  const value = checkIn({ study: 0.7, worry: 0.85 }, ["worry", "study"]);
  value.context.study = "I would like help planning my workload";
  expect(createWellnessPlan(value)[0].activityId).toBe("workload");
  expect(createWellnessPlan(value)[0].reason).toContain(value.context.study);
});
it("does not resurrect an unconfirmed prediction and retains student-added low-score topics", () => {
  const value = checkIn({ study: 0.1, sleep: 0.99, worry: 0.8 }, [
    "study",
    "worry",
  ]);
  expect(recommendWellnessActivities(value).map((item) => item.topic)).toEqual([
    "worry",
    "study",
  ]);
  expect(
    recommendWellnessActivities(value).find((item) => item.topic === "study")
      ?.basis,
  ).toBe("topics");
  value.context.worry = "No current worry concern";
  expect(recommendWellnessActivities(value).map((item) => item.topic)).toEqual([
    "study",
  ]);
});
it.each(["wrong-checkpoint", "invalid-score", "missing-label"])(
  "falls back to student choices for %s",
  (failure) => {
    const value = checkIn({ study: 0.6, worry: 0.9 });
    const prediction = value.concernAnalysis!.prediction!;
    if (failure === "wrong-checkpoint") prediction.checkpointSha256 = "wrong";
    if (failure === "invalid-score") prediction.scores[0].score = NaN;
    if (failure === "missing-label") prediction.scores.pop();
    expect(hasUsablePlanPrediction(value)).toBe(false);
    expect(createWellnessPlan(value)[0].activityId).toBe("small-start");
    expect(
      createWellnessPlan(value).some((item) => item.basis === "model-topics"),
    ).toBe(false);
  },
);
it("does not rank treatment urgency from questionnaire totals or a separate safety request", () => {
  const value = checkIn({ study: 0.6, worry: 0.9 });
  expect(
    createWellnessPlan({
      ...value,
      phq9: Array(9).fill(3),
      gad7: Array(7).fill(3),
      safetySupportRequested: true,
    }),
  ).toEqual(createWellnessPlan(value));
});
it("starts the ranked suggestion, permits replacement and restores the original suggestions", () => {
  render(
    <WellnessPlan
      {...callbacks()}
      assessment={checkIn({ study: 0.9 }, ["study"])}
    />,
  );
  const first = screen.getByRole("article", { name: "Plan action 1" });
  expect(within(first).getByRole("heading")).toHaveTextContent(
    "Make one task easier to start",
  );
  fireEvent.change(screen.getByLabelText("Choose an activity for step 1"), {
    target: { value: "wind-down" },
  });
  expect(within(first).getByText("Chosen by you")).toBeInTheDocument();
  fireEvent.click(
    screen.getByRole("button", { name: "Start chosen activity" }),
  );
  expect(
    screen.getByRole("button", { name: "Start activity" }),
  ).toBeInTheDocument();
  fireEvent.click(
    screen.getByRole("button", { name: "Restore suggested plan" }),
  );
  expect(
    screen.queryByRole("button", { name: "Start activity" }),
  ).not.toBeInTheDocument();
  expect(within(first).getByRole("heading")).toHaveTextContent(
    "Make one task easier to start",
  );
  expect(
    screen.getByRole("button", { name: "Start suggested activity" }),
  ).toBeInTheDocument();
});
it("replaces stale suggestions and closes the old activity when the check-in changes", () => {
  const props = callbacks();
  const view = render(
    <WellnessPlan {...props} assessment={checkIn({ study: 0.9 }, ["study"])} />,
  );
  fireEvent.click(
    screen.getByRole("button", { name: "Start suggested activity" }),
  );
  expect(
    screen.getByRole("button", { name: "Start activity" }),
  ).toBeInTheDocument();
  view.rerender(
    <WellnessPlan {...props} assessment={checkIn({ sleep: 0.9 }, ["sleep"])} />,
  );
  expect(
    within(screen.getByRole("article", { name: "Plan action 1" })).getByRole(
      "heading",
    ),
  ).toHaveTextContent("Plan a gentler evening");
  expect(
    screen.queryByRole("button", { name: "Start activity" }),
  ).not.toBeInTheDocument();
});
it.each([
  ["Talk to a professional", "Explore professional support", "onSupport"],
  ["Connect with other students", "Browse student discussions", "onCommunity"],
] as const)("respects the requested next step: %s", (goal, label, callback) => {
  const props = callbacks();
  const value = checkIn({ study: 0.9 });
  value.context.goal = goal;
  render(<WellnessPlan {...props} assessment={value} />);
  fireEvent.click(
    within(
      screen.getByRole("region", { name: "Suggested next step" }),
    ).getByRole("button", { name: label }),
  );
  expect(props[callback]).toHaveBeenCalledTimes(1);
});
it("supports incomplete/manual plans without claiming ML ran or a complete screening", () => {
  const value = checkIn({}, ["study"]);
  value.phq9[0] = null;
  value.concernAnalysis!.prediction = null;
  value.concernAnalysis!.source = "student-selected";
  render(<WellnessPlan {...callbacks()} assessment={value} />);
  expect(
    screen.getByText(/Some screening answers are still open/),
  ).toBeInTheDocument();
  expect(
    screen.queryByText("DistilBERT-informed suggestion"),
  ).not.toBeInTheDocument();
  expect(
    screen.getByRole("button", { name: "Start suggested activity" }),
  ).toBeEnabled();
});
