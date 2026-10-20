import { act, fireEvent, render, screen, within } from "@testing-library/react";
import { WellnessAssessment } from "@/components/c2/wellness-assessment";
import { WellnessSupportLab } from "@/components/c2/wellness-support-lab";
import { FREQUENCY, GAD7, PHQ9, type Answer, type Assessment } from "@/lib/c2/assessment";
import { predictConcerns, type ConcernPrediction } from "@/lib/c2/concern-runtime";
import scenarios from "@/lib/c2/model/support-scenarios.json";
import report from "../../../docs/c2/evidence/support-evaluation.json";
jest.mock("@/lib/c2/concern-runtime", () => ({ predictConcerns: jest.fn() }));
jest.mock("@/components/wellness/counselor-booking", () => ({ CounselorBooking: () => <div>Research catalog component</div> }));
const predict = jest.mocked(predictConcerns);
const prediction: ConcernPrediction = { runId: "c2-distilbert-concerns-v1", checkpointSha256: "a".repeat(64), threshold: .5, tokenCount: 10, inputIds: [101,102], scores: [
  {topic:"worry",score:.9,selected:true},{topic:"sleep",score:.8,selected:true},{topic:"study",score:.7,selected:true},{topic:"low-mood",score:.1,selected:false},{topic:"connection",score:.05,selected:false},
] };
beforeEach(() => { jest.clearAllMocks(); predict.mockResolvedValue(prediction); });
function click(name: string) { fireEvent.click(screen.getByRole("button", { name, exact: true })); }
function radio(name: string) { fireEvent.click(screen.getByRole("radio", { name, exact: true })); }
async function start(p: Answer[], g: Answer[]) {
  await act(async () => { click("Begin my check-in"); });
  [...p, ...g].forEach((value) => {
    if (value === null) click("Skip this question");
    else { radio(FREQUENCY[value]); click("Continue"); }
  });
}
it("uses DistilBERT in the main check-in, supports corrections and edits, and keeps screening scores separate", async () => {
  const complete = jest.fn();
  render(<WellnessAssessment onComplete={complete} onSupport={jest.fn()} onChat={jest.fn()} />);
  const scenario = scenarios.cases[1];
  await start(scenario.phq9 as Answer[], scenario.gad7 as Answer[]);
  fireEvent.change(screen.getByRole("textbox", { name: "Your situation in your own words" }), {target:{value:"I worry about my project and cannot sleep."}});
  await act(async () => { click("Suggest topics"); });
  expect(predict).toHaveBeenCalledWith("I worry about my project and cannot sleep.");
  // Student rejects study; it must not survive merely because the model proposed it.
  fireEvent.click(screen.getByRole("checkbox", { name: "Study & exam pressure" }));
  click("Use these topics");
  expect(screen.getByRole("heading", { name: /Which area is most connected to your worry/ })).toBeInTheDocument();
  radio("Relationships"); click("Continue");
  expect(screen.getByRole("heading", { name: /What part of relationships/ })).toBeInTheDocument();
  click("Back");
  radio("Several things"); click("Continue");
  expect(screen.getByRole("heading", { name: /When several worries arrive/ })).toBeInTheDocument();
  const topicHeadings: string[] = [];
  while (screen.queryByRole("button", { name: "Skip this question", exact: true })) {
    topicHeadings.push(screen.getByRole("heading",{level:3}).textContent!);
    expect(screen.getByText(/Your topics and answers guide what comes next/)).toBeInTheDocument();
    if (screen.getByRole("heading",{level:3}).textContent?.startsWith("How much are these concerns")) { radio("Somewhat difficult"); click("Continue"); }
    else click("Skip this question");
  }
  expect(new Set(topicHeadings).size).toBe(topicHeadings.length);
  expect(complete).toHaveBeenCalledTimes(1);
  const result = complete.mock.calls[0][0] as Assessment;
  expect(result.contextRouting).toBe("distilbert");
  expect(result.context.impact).toBe("Somewhat difficult");
  expect(result.concernAnalysis?.confirmed).toEqual(["worry","sleep"]);
  expect(result.supportTopics).toEqual(["worry","sleep"]);
  expect(result.questionPath?.length).toBeGreaterThanOrEqual(5);
  expect(result.questionPath?.length).toBeLessThanOrEqual(9);
  expect(result.supportModel).toBeUndefined();
  expect(result.phq9).toEqual(scenario.phq9);
  expect(screen.getByLabelText("Personalised explanation")).toHaveTextContent("These topics help personalise your support options.");
});
it("lets the student select topics after model failure without fabricating a prediction", async () => {
  predict.mockRejectedValue(new Error("Unavailable"));
  render(<WellnessAssessment onComplete={jest.fn()} onSupport={jest.fn()} onChat={jest.fn()} />);
  await start(Array(9).fill(0), Array(7).fill(0));
  fireEvent.change(screen.getByRole("textbox", { name: "Your situation in your own words" }), {target:{value:"I would like some sleep support."}});
  await act(async () => { click("Suggest topics"); });
  expect(screen.getByText(/Text analysis could not run/)).toBeInTheDocument();
  fireEvent.click(screen.getByRole("checkbox", {name:"Sleep & routines"}));click("Use these topics");
  expect(screen.getByRole("heading", { name: /What would you most like help with around sleep/ })).toBeInTheDocument();
});
it("uses standard follow-ups and withholds a trained estimate when a questionnaire is incomplete", async () => {
  const complete = jest.fn();
  render(<WellnessAssessment onComplete={complete} onSupport={jest.fn()} onChat={jest.fn()} />);
  await start([null, ...Array(8).fill(0)], Array(7).fill(0));
  while (screen.queryByRole("button", { name: "Skip this question", exact: true })) click("Skip this question");
  expect(complete.mock.calls[0][0]).toMatchObject({ contextRouting: "rules" });
  expect(complete.mock.calls[0][0].concernAnalysis).toBeUndefined();
  expect(predict).not.toHaveBeenCalled();
});
it("runs the real six-question pipeline in the research page and clears old results when edited", async () => {
  render(<WellnessSupportLab report={report} trainingCode="model.fit(...)" generatorCode="synthetic case generator" inferenceCode="exported weights" />);
  fireEvent.change(screen.getByRole("combobox", { name: "Synthetic research scenario" }), { target: { value: scenarios.cases[0].id } });
  await act(async () => { click("Run support pipeline"); });
  const path = screen.getByLabelText("Selected question path");
  expect(within(path).getAllByRole("listitem")).toHaveLength(6);
  expect(screen.getByRole("region", { name: "Trained support model result" })).toBeInTheDocument();
  fireEvent.change(screen.getByRole("combobox", { name: "PHQ-9 item 1" }), { target: { value: "" } });
  expect(screen.queryByRole("region", { name: "Trained support model result" })).not.toBeInTheDocument();
  await act(async () => { click("Run support pipeline"); });
  expect(screen.getByText("Complete questionnaires needed for a model estimate")).toBeInTheDocument();
});
