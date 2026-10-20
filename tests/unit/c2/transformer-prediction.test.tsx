import { act, fireEvent, render, screen } from "@testing-library/react";
import { TransformerPrediction } from "@/components/c2/transformer-prediction";
import { checkTransformerInput, predictTransformer, type TransformerPrediction as Prediction } from "@/lib/c2/transformer-runtime";

jest.mock("@/lib/c2/transformer-runtime", () => ({
  ...jest.requireActual("@/lib/c2/transformer-runtime"), predictTransformer: jest.fn(),
}));
const predict = jest.mocked(predictTransformer);
const checkpoint = "a".repeat(64);
const result: Prediction = { runId: "unit-fixture", tokenCount: 6, inputIds: [101, 1045, 102], threshold: 0.2,
  scores: [{ label: "joy", score: 0.7, selected: true }, { label: "neutral", score: 0.1, selected: false }] };

beforeEach(() => { jest.clearAllMocks(); predict.mockResolvedValue(result); });

it("does not offer a prediction before a verified browser export is available", () => {
  render(<TransformerPrediction checkpoint={checkpoint} ready={false} />);
  expect(screen.getByRole("status")).toHaveTextContent("not available");
  expect(screen.queryByRole("textbox")).not.toBeInTheDocument();
  expect(predict).not.toHaveBeenCalled();
});

it("validates unsupported/short input before loading the large model", () => {
  expect(checkTransformerInput("I am happy about my progress.")).toBeNull();
  expect(checkTransformerInput("hello")).toMatch(/three words/);
  expect(checkTransformerInput("English text with සිංහල words.")).toMatch(/English text only/);
  render(<TransformerPrediction checkpoint={checkpoint} ready />);
  fireEvent.change(screen.getByRole("textbox"), { target: { value: "hello" } });
  fireEvent.click(screen.getByRole("button", { name: "Run fine-tuned DistilBERT" }));
  expect(screen.getByRole("alert")).toHaveTextContent("three words");
  expect(predict).not.toHaveBeenCalled();
});

it("runs the trained checkpoint on request and displays its scores without changing the recorded metrics", async () => {
  render(<TransformerPrediction checkpoint={checkpoint} ready />);
  fireEvent.change(screen.getByRole("textbox"), { target: { value: "I am happy about my progress." } });
  fireEvent.click(screen.getByRole("button", { name: "Run fine-tuned DistilBERT" }));
  expect(await screen.findByRole("heading", { name: "Prediction from your fine-tuned checkpoint" })).toBeInTheDocument();
  expect(predict).toHaveBeenCalledWith("I am happy about my progress.", checkpoint);
  expect(screen.getByText("0.7000 · selected")).toBeInTheDocument();
});

it("discards stale output after editing and keeps an in-flight model run exclusive", async () => {
  let finish!: (value: Prediction) => void;
  predict.mockReturnValue(new Promise((resolve) => { finish = resolve; }));
  render(<TransformerPrediction checkpoint={checkpoint} ready />);
  fireEvent.change(screen.getByRole("textbox"), { target: { value: "I am happy about my progress." } });
  fireEvent.click(screen.getByRole("button", { name: "Run fine-tuned DistilBERT" }));
  fireEvent.change(screen.getByRole("textbox"), { target: { value: "I have a different sentence." } });
  expect(screen.getByRole("button", { name: "Loading or running DistilBERT…" })).toBeDisabled();
  await act(async () => { finish(result); });
  expect(screen.queryByText("0.7000 · selected")).not.toBeInTheDocument();
  expect(screen.getByRole("button", { name: "Run fine-tuned DistilBERT" })).toBeEnabled();
});

it("offers a recoverable error without exposing internal exception details", async () => {
  predict.mockRejectedValue(new Error("internal failure details"));
  render(<TransformerPrediction checkpoint={checkpoint} ready />);
  fireEvent.change(screen.getByRole("textbox"), { target: { value: "I am happy about my progress." } });
  fireEvent.click(screen.getByRole("button", { name: "Run fine-tuned DistilBERT" }));
  expect(await screen.findByRole("alert")).toHaveTextContent("Reload and retry");
  expect(screen.queryByText("internal failure details")).not.toBeInTheDocument();
});
