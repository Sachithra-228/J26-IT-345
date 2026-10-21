import { act, fireEvent, render, screen } from "@testing-library/react";
import { WellnessConcernInput } from "@/components/c2/wellness-concern-input";
import {
  predictConcerns,
  type ConcernPrediction,
} from "@/lib/c2/concern-runtime";
jest.mock("@/lib/c2/concern-runtime", () => ({ predictConcerns: jest.fn() }));
const predict = jest.mocked(predictConcerns);
const result: ConcernPrediction = {
  runId: "test",
  checkpointSha256: "a".repeat(64),
  tokenCount: 4,
  inputIds: [101, 102],
  threshold: 0.5,
  scores: [
    { topic: "sleep", score: 0.8, selected: true },
    { topic: "worry", score: 0.1, selected: false },
  ],
};
beforeEach(() => jest.clearAllMocks());
it("uses an expanded-label model suggestion and lets the student keep it", async () => {
  predict.mockResolvedValue({
    ...result,
    scores: [
      { topic: "grief", score: 0.9, selected: true },
      { topic: "self-esteem", score: 0.2, selected: false },
    ],
  });
  const complete = jest.fn();
  render(
    <WellnessConcernInput
      description="I want support after losing someone close to me."
      analysis={null}
      onContinue={complete}
      onBack={jest.fn()}
    />,
  );
  await act(async () => {
    fireEvent.click(screen.getByRole("button", { name: "Suggest topics" }));
  });
  expect(screen.getByRole("checkbox", { name: "Grief & loss" })).toBeChecked();
  clickContinue();
  expect(complete.mock.calls[0][0]).toMatchObject({
    source: "distilbert-confirmed",
    confirmed: ["grief"],
  });
  function clickContinue() {
    fireEvent.click(screen.getByRole("button", { name: "Use these topics" }));
  }
});
it("offers fifteen support topics and an independent safety choice without running ML", () => {
  render(
    <WellnessConcernInput
      description=""
      analysis={null}
      onContinue={jest.fn()}
      onBack={jest.fn()}
    />,
  );
  expect(screen.getAllByRole("checkbox")).toHaveLength(16);
  expect(
    screen.getByRole("checkbox", { name: "Grief & loss" }),
  ).toBeInTheDocument();
  expect(
    screen.getByRole("checkbox", { name: "Alcohol & substance use" }),
  ).toBeInTheDocument();
  expect(predict).not.toHaveBeenCalled();
});
it("shows safety support immediately and preserves the choice when text analysis is skipped", () => {
  const complete = jest.fn(),
    support = jest.fn();
  render(
    <WellnessConcernInput
      description=""
      analysis={null}
      onContinue={complete}
      onBack={jest.fn()}
      onSupport={support}
    />,
  );
  fireEvent.click(
    screen.getByRole("checkbox", {
      name: "I would like support with self-harm or staying safe",
    }),
  );
  expect(
    screen.getByRole("region", { name: "Immediate support" }),
  ).toBeInTheDocument();
  fireEvent.click(
    screen.getByRole("button", { name: "Find human support now" }),
  );
  expect(support).toHaveBeenCalledTimes(1);
  fireEvent.click(
    screen.getByRole("button", { name: "Continue without text analysis" }),
  );
  expect(complete.mock.calls[0][0]).toMatchObject({
    prediction: null,
    safetySupportRequested: true,
  });
  expect(predict).not.toHaveBeenCalled();
});
it("opens the separate support route for a concerning phrase without waiting for an inference", () => {
  render(
    <WellnessConcernInput
      description=""
      analysis={null}
      onContinue={jest.fn()}
      onBack={jest.fn()}
    />,
  );
  fireEvent.change(screen.getByRole("textbox"), {
    target: { value: "I would like support with thoughts of self-harm." },
  });
  expect(
    screen.getByRole("region", { name: "Immediate support" }),
  ).toBeInTheDocument();
  expect(predict).not.toHaveBeenCalled();
});
it("does not analyse automatically, lets students reject suggestions, and clears stale output on edits", async () => {
  predict.mockResolvedValue(result);
  const complete = jest.fn();
  render(
    <WellnessConcernInput
      description="I cannot get enough rest lately."
      analysis={null}
      onContinue={complete}
      onBack={jest.fn()}
    />,
  );
  expect(predict).not.toHaveBeenCalled();
  await act(async () => {
    fireEvent.click(screen.getByRole("button", { name: "Suggest topics" }));
  });
  expect(
    screen.getByRole("checkbox", { name: "Sleep & routines" }),
  ).toBeChecked();
  fireEvent.click(screen.getByRole("checkbox", { name: "Sleep & routines" }));
  fireEvent.click(screen.getByRole("button", { name: "Use these topics" }));
  expect(complete.mock.calls[0][0].confirmed).toEqual([]);
  fireEvent.change(screen.getByRole("textbox"), {
    target: { value: "I feel connected and well today." },
  });
  expect(
    screen.queryByText(
      "Review the suggested topics below. Change any that do not fit before continuing.",
    ),
  ).not.toBeInTheDocument();
  expect(
    screen
      .getAllByRole("checkbox")
      .every((x) => !(x as HTMLInputElement).checked),
  ).toBe(true);
});
it("ignores a late prediction after the description changes", async () => {
  let resolve!: (value: ConcernPrediction) => void;
  predict.mockReturnValue(
    new Promise((r) => {
      resolve = r;
    }),
  );
  render(
    <WellnessConcernInput
      description="I cannot sleep through the night."
      analysis={null}
      onContinue={jest.fn()}
      onBack={jest.fn()}
    />,
  );
  fireEvent.click(screen.getByRole("button", { name: "Suggest topics" }));
  fireEvent.change(screen.getByRole("textbox"), {
    target: { value: "I feel well and rested today." },
  });
  await act(async () => {
    resolve(result);
  });
  expect(
    screen.queryByText(
      "Review the suggested topics below. Change any that do not fit before continuing.",
    ),
  ).not.toBeInTheDocument();
  expect(
    screen.getByRole("checkbox", { name: "Sleep & routines" }),
  ).not.toBeChecked();
});
