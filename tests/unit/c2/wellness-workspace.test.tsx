import { act, fireEvent, render, screen, within } from "@testing-library/react";
import { WellnessWorkspace } from "@/components/c2/wellness-workspace";
import { WellnessAssessment } from "@/components/c2/wellness-assessment";
import { analyzeReflection, loadTextModel } from "@/lib/c2/text-runtime";
import { PHQ9, GAD7, type Assessment } from "@/lib/c2/assessment";

jest.mock("@/context/language-context", () => ({
  useLanguage: () => ({ language: "en" }),
}));
jest.mock("@/lib/c2/text-runtime", () => ({
  loadTextModel: jest.fn(),
  analyzeReflection: jest.fn(),
}));
jest.mock("@/components/wellness/counselor-booking", () => ({
  CounselorBooking: () => <div>Account booking service</div>,
}));
jest.mock("@/components/wellness/peer-support", () => ({
  PeerSupport: () => <div>Account community service</div>,
}));
const load = jest.mocked(loadTextModel),
  analyze = jest.mocked(analyzeReflection);
const originalFetch = global.fetch;
beforeEach(() => {
  jest.clearAllMocks();
  global.fetch = jest.fn();
  load.mockResolvedValue({} as Awaited<ReturnType<typeof loadTextModel>>);
  analyze.mockReturnValue({
    status: "ready",
    modelVersion: "test",
    tokenCount: 6,
    knownTokenFraction: 1,
    scores: [{ label: "joy", score: 0.7, selected: true }],
  });
});
afterEach(() => {
  global.fetch = originalFetch;
});
function click(name: string) {
  fireEvent.click(screen.getByRole("button", { name, exact: true }));
}
function answer(name: string) {
  fireEvent.click(screen.getByRole("radio", { name, exact: true }));
  click(screen.queryByRole("button", { name: "See my summary", exact: true }) ? "See my summary" : "Continue");
}
function coreResponses(skipFirst = false, safety = false) {
  PHQ9.forEach((_, index) => {
    if (index === 0 && skipFirst) click("Skip this question");
    else answer(index === 8 && safety ? "Several days" : "Not at all");
  });
  GAD7.forEach(() => answer("Not at all"));
  if (screen.queryByRole("button", { name: "Continue without text analysis", exact: true })) click("Continue without text analysis");
}
function skipContext() {
  while (
    screen.queryByRole("button", { name: "Skip this question", exact: true })
  )
    click("Skip this question");
}
it("shows a normal service interface without fictional-use gates", () => {
  render(<WellnessWorkspace />);
  expect(
    screen.getByRole("button", { name: "Start my check-in" }),
  ).toBeInTheDocument();
  expect(
    screen.queryByText(/fictional|practice student|research preview/i),
  ).not.toBeInTheDocument();
  expect(screen.queryByText("Account booking service")).not.toBeInTheDocument();
});
it("completes both questionnaires and keeps all assessment data on-device", () => {
  const complete = jest.fn();
  render(
    <WellnessAssessment
      onComplete={complete}
      onSupport={jest.fn()}
      onChat={jest.fn()}
    />,
  );
  click("Begin my check-in");
  expect(
    screen.getByRole("button", { name: "Continue", exact: true }),
  ).toBeDisabled();
  coreResponses();
  expect(screen.getByRole("heading", { name: /How much are these concerns/ })).toBeInTheDocument();
  skipContext();
  expect(screen.getAllByText("Minimal symptom range")).toHaveLength(2);
  expect(complete.mock.calls[0][0]).toMatchObject({
    phq9: Array(9).fill(0),
    gad7: Array(7).fill(0),
    context: {},
  });
  expect(global.fetch).toHaveBeenCalledWith("/api/c2/follow-up-questions", { cache: "no-store" });
});
it("shows incomplete results rather than treating skipped answers as zero", () => {
  render(
    <WellnessAssessment
      onComplete={jest.fn()}
      onSupport={jest.fn()}
      onChat={jest.fn()}
    />,
  );
  click("Begin my check-in");
  coreResponses(true);
  skipContext();
  expect(screen.getByText("Incomplete questionnaire")).toBeInTheDocument();
  expect(screen.getByText(/Missing: 1/)).toBeInTheDocument();
  click("Review PHQ-9 answers");
  expect(
    screen.getByRole("heading", { name: PHQ9[0], exact: true }),
  ).toBeInTheDocument();
});
it("shows item-9 support before any final total and retains it in the summary", () => {
  render(
    <WellnessAssessment
      onComplete={jest.fn()}
      onSupport={jest.fn()}
      onChat={jest.fn()}
    />,
  );
  click("Begin my check-in");
  for (let i = 0; i < 8; i++) answer("Not at all");
  fireEvent.click(
    screen.getByRole("radio", { name: "Several days", exact: true }),
  );
  expect(
    screen.getByRole("region", { name: "Immediate support" }),
  ).toBeInTheDocument();
  fireEvent.click(
    screen.getByRole("radio", { name: "I am unsure or need immediate help" }),
  );
  expect(screen.getByRole("alert")).toHaveTextContent(
    "cannot contact emergency help",
  );
  click("Continue");
  GAD7.forEach(() => answer("Not at all"));
  skipContext();
  expect(
    screen.getByRole("region", { name: "Immediate support" }),
  ).toBeInTheDocument();
  expect(screen.getByText(/regardless of your totals/)).toBeInTheDocument();
});
it("keeps core answers when navigating back and selects context without adding a score", () => {
  const complete = jest.fn();
  render(
    <WellnessAssessment
      onComplete={complete}
      onSupport={jest.fn()}
      onChat={jest.fn()}
    />,
  );
  click("Begin my check-in");
  answer("Several days");
  click("Back");
  expect(
    screen.getByRole("radio", { name: "Several days", exact: true }),
  ).toBeChecked();
  click("Continue");
  for (let i = 1; i < 9; i++) answer("Not at all");
  GAD7.forEach(() => answer("Not at all"));
  fireEvent.click(screen.getByRole("checkbox", { name: "Low mood & motivation" }));
  click("Use these topics");
  answer("Getting started");
  while (screen.queryByRole("button", { name: "Skip this question", exact: true })) {
    const heading = screen.getByRole("heading", { level: 3 }).textContent ?? "";
    if (heading.startsWith("How much are these concerns")) answer("Very difficult");
    else if (heading.startsWith("What would feel most useful")) answer("Talk to a professional");
    else click("Skip this question");
  }
  const result: Assessment = complete.mock.calls[0][0];
  expect(result.context).toMatchObject({
    impact: "Very difficult",
    mood: "Getting started",
    goal: "Talk to a professional",
  });
  expect(result.phq9.reduce<number>((sum, x) => sum + (x ?? 0), 0)).toBe(1);
  expect(
    screen.getByText("Consider talking with a professional"),
  ).toBeInTheDocument();
});
it("skipping a previously answered final context item removes its old value", () => {
  const complete = jest.fn();
  render(
    <WellnessAssessment
      onComplete={complete}
      onSupport={jest.fn()}
      onChat={jest.fn()}
    />,
  );
  click("Begin my check-in");
  coreResponses();
  for (let i = 0; i < 3; i++) click("Skip this question");
  fireEvent.click(
    screen.getByRole("radio", { name: "Talk to a professional" }),
  );
  click("Continue");
  click("Back");
  click("Skip this question");
  click("Skip this question");
  expect(complete.mock.calls[0][0].context.goal).toBeUndefined();
});
it("preserves drafts between views and only calls the text model with explicit opt-in", async () => {
  render(<WellnessWorkspace />);
  click("Reflections");
  fireEvent.change(screen.getByLabelText("Your reflection"), {
    target: { value: "I am happy about finishing my project." },
  });
  click("Overview");
  click("Reflections");
  expect(screen.getByLabelText("Your reflection")).toHaveValue(
    "I am happy about finishing my project.",
  );
  click("Review my reflection");
  expect(
    await screen.findByText(
      "Text analysis is off. No emotion estimate was made.",
    ),
  ).toBeInTheDocument();
  expect(load).not.toHaveBeenCalled();
  fireEvent.click(
    screen.getByRole("checkbox", { name: /Explore possible emotions/ }),
  );
  click("Review my reflection");
  expect(
    await screen.findByText("Possible emotions expressed in this writing"),
  ).toBeInTheDocument();
  click("Keep in this session");
  expect(
    screen.getByRole("button", { name: "Kept in this session" }),
  ).toBeDisabled();
  click("Delete reflection 2");
  expect(
    screen.queryByRole("button", { name: "Delete reflection 2" }),
  ).not.toBeInTheDocument();
  expect(global.fetch).not.toHaveBeenCalled();
});
it("retains a draft after model failure and prevents in-flight work restoring a cleared session", async () => {
  load.mockRejectedValueOnce(new Error("offline"));
  render(<WellnessWorkspace />);
  click("Reflections");
  fireEvent.change(screen.getByLabelText("Your reflection"), {
    target: { value: "A software test reflection about university." },
  });
  fireEvent.click(
    screen.getByRole("checkbox", { name: /Explore possible emotions/ }),
  );
  click("Review my reflection");
  expect(await screen.findByRole("alert")).toHaveTextContent("could not load");
  let resolve!: (model: Awaited<ReturnType<typeof loadTextModel>>) => void;
  load.mockImplementationOnce(
    () =>
      new Promise((done) => {
        resolve = done;
      }),
  );
  click("Review my reflection");
  click("Clear my session");
  await act(async () =>
    resolve({} as Awaited<ReturnType<typeof loadTextModel>>),
  );
  click("Reflections");
  expect(screen.getByLabelText("Your reflection")).toHaveValue("");
  expect(
    screen.queryByText("Possible emotions expressed in this writing"),
  ).not.toBeInTheDocument();
});
it("provides free-text guided chat without uploading the conversation and clears it explicitly", () => {
  render(<WellnessWorkspace />);
  click("Support chat");
  fireEvent.change(screen.getByLabelText("Your message"), {
    target: { value: "I worry about my exams" },
  });
  click("Send message");
  expect(
    within(screen.getByRole("log")).getByText(/worry is something/),
  ).toBeInTheDocument();
  click("Find a professional");
  expect(screen.getByText("Account booking service")).toBeInTheDocument();
  click("Support chat");
  expect(screen.getByText("I worry about my exams")).toBeInTheDocument();
  click("Clear chat");
  expect(screen.queryByText("I worry about my exams")).not.toBeInTheDocument();
  expect(global.fetch).not.toHaveBeenCalled();
});
it("separates the community service and exposes immediate help without an assessment", () => {
  render(<WellnessWorkspace />);
  click("Explore community");
  expect(screen.getByText("Account community service")).toBeInTheDocument();
  expect(
    screen.getByRole("button", { name: "All conversations" }),
  ).toHaveAttribute("aria-pressed", "true");
  click("I need immediate help");
  expect(
    screen.getByRole("region", { name: "Immediate support" }),
  ).toBeInTheDocument();
});
