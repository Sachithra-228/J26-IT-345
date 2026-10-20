import { act, fireEvent, render, screen, within } from "@testing-library/react";
import evaluation from "../../../docs/c2/evidence/text-evaluation.json";
import artifact from "@/lib/c2/model/text-model.json";
import { WellnessModelLab } from "@/components/c2/wellness-model-lab";
import { loadTextModel, type TextModel } from "@/lib/c2/text-runtime";

jest.mock("@/lib/c2/text-runtime", () => ({
  ...jest.requireActual("@/lib/c2/text-runtime"),
  loadTextModel: jest.fn(),
}));
const load = jest.mocked(loadTextModel);
const model = artifact as TextModel;
const props = {
  evaluation,
  trainingCode: "model.fit(x_train, y['train'])",
  inferenceCode: "predictEmotionScores(text, model)",
  modelHash: "artifact-hash",
};
beforeEach(() => {
  jest.clearAllMocks();
  load.mockResolvedValue(model);
});
function enter(text: string) {
  fireEvent.change(screen.getByRole("textbox", { name: "Text to analyse" }), { target: { value: text } });
}

it("separates recorded held-out evaluation from live inference and exposes the supplied source", () => {
  render(<WellnessModelLab {...props} />);
  expect(screen.getByRole("heading", { name: "TF-IDF + One-vs-Rest Logistic Regression" })).toBeInTheDocument();
  expect(screen.getByText("42,854 comments")).toBeInTheDocument();
  expect(screen.getByText("5,313 comments")).toBeInTheDocument();
  expect(screen.getByText("0.5552")).toBeInTheDocument();
  expect(screen.getByText("0.3054")).toBeInTheDocument();
  expect(screen.getByRole("button", { name: "Run prediction" })).toBeDisabled();
  expect(load).not.toHaveBeenCalled();
  fireEvent.click(screen.getByText("ml/c2/train_text.py — actual training pipeline"));
  expect(screen.getByText("model.fit(x_train, y['train'])")).toBeVisible();
});

it("uses real learned weights for a live prediction and clears stale output after input changes", async () => {
  render(<WellnessModelLab {...props} />);
  enter("I am happy about finishing my project and grateful for the help.");
  fireEvent.click(screen.getByRole("button", { name: "Run prediction" }));
  expect(await screen.findByRole("heading", { name: "Prediction from learned weights" })).toBeInTheDocument();
  expect(within(screen.getByRole("region", { name: "Live model prediction" })).getByText("joy")).toBeInTheDocument();
  expect(screen.getByText("0.8135 · selected")).toBeInTheDocument();
  enter("Another sentence");
  expect(screen.queryByText("0.8135 · selected")).not.toBeInTheDocument();
  expect(screen.getByText("0.5552")).toBeInTheDocument();
});

it("withholds emotion scores for short input using the actual application gate", async () => {
  render(<WellnessModelLab {...props} />);
  enter("hi");
  fireEvent.click(screen.getByRole("button", { name: "Run prediction" }));
  await act(async () => {});
  expect(screen.queryByRole("heading", { name: "Prediction from learned weights" })).not.toBeInTheDocument();
  expect(screen.getByText(/There is too little text for a useful model result/)).toBeInTheDocument();
});

it("discards an in-flight result when the input is cleared", async () => {
  let resolveModel!: (value: TextModel) => void;
  load.mockReturnValue(new Promise((resolve) => { resolveModel = resolve; }));
  render(<WellnessModelLab {...props} />);
  enter("I am happy about finishing my project.");
  fireEvent.click(screen.getByRole("button", { name: "Run prediction" }));
  fireEvent.click(screen.getByRole("button", { name: "Clear input" }));
  await act(async () => { resolveModel(model); });
  expect(screen.getByRole("textbox", { name: "Text to analyse" })).toHaveValue("");
  expect(screen.queryByRole("heading", { name: "Prediction from learned weights" })).not.toBeInTheDocument();
  expect(screen.getByRole("button", { name: "Run prediction" })).toBeDisabled();
});

it("shows a recoverable load error and rejects a mismatched model/report", async () => {
  load.mockResolvedValue({ ...model, version: "different-version" });
  render(<WellnessModelLab {...props} />);
  enter("I am happy about finishing my project.");
  fireEvent.click(screen.getByRole("button", { name: "Run prediction" }));
  expect(await screen.findByRole("alert")).toHaveTextContent("does not match this report");
  expect(screen.getByRole("button", { name: "Run prediction" })).toBeEnabled();
  expect(screen.queryByRole("heading", { name: "Prediction from learned weights" })).not.toBeInTheDocument();
});
