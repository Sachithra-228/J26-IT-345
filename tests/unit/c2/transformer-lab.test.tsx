import { render, screen, within } from "@testing-library/react";
import { WellnessTransformerLab } from "@/components/c2/wellness-transformer-lab";
import { validateTransformerReport, type TransformerReport } from "@/lib/c2/transformer-evidence";

// Invented UI fixture; never exported as model evidence or website measurements.
function fixture(): TransformerReport {
  const metrics = { micro: { precision: 0.6, recall: 0.4, f1: 0.48 }, macro: { precision: 0.3, recall: 0.2, f1: 0.24 }, exactMatchAccuracy: 0.25, labelAccuracy: 0.95 };
  const config = { id: "unit-trial", backboneLearningRate: 2e-5, headLearningRate: 5e-4, tokenMaskProbability: 0 };
  return {
    schemaVersion: 1, status: "completed", runId: "unit-fixture", task: "Unit fixture", checkpointSha256: "a".repeat(64), durationSeconds: 60,
    protocol: { model: "distilbert/distilbert-base-uncased", modelRevision: "unit-revision", seed: 1, maxLength: 96, batchSize: 16, epochsMaximum: 3,
      trainableLastBlocks: 2, weightDecay: 0.01, gradientClipNorm: 1, optimizer: "AdamW", loss: "BCE", augmentation: "None", configurations: [config],
      partitions: { train: { rows: 3000, idsSha256: "a", labelCounts: [] }, dev: { rows: 1000, idsSha256: "b", labelCounts: [] }, test: { rows: 10, idsSha256: "c", labelCounts: [] } },
      environment: { python: "3.12", cudaAvailable: false, packages: { torch: "test", transformers: "test" } } },
    selected: { configuration: config, epoch: 1, threshold: 0.25, developmentMicroF1: 0.48, trainableParameters: 14787868, totalParameters: 66975004 },
    history: [{ trial: config.id, epoch: 1, trainLoss: 0.12, validationLoss: 0.14, train: metrics, validation: metrics, curveThreshold: 0.5, selectedThreshold: 0.25, selectionMicroF1: 0.48, seconds: 60 }],
    test: metrics, baseline: { name: "fixture baseline", test: { ...metrics, micro: { precision: 0.7, recall: 0.5, f1: 0.58 } } },
    perLabel: Array.from({ length: 28 }, (_, i) => ({ label: `emotion-${i}`, precision: 0, recall: 0, f1: 0, support: 3 })),
    confusionMatrices: Array.from({ length: 28 }, () => [[5, 2], [3, 0]]), limitations: ["Fixture limitation"],
  };
}

it("does not invent metrics or claim completion without a final evaluation", () => {
  render(<WellnessTransformerLab report={null} trainingCode="loss.backward()" />);
  expect(screen.getByText(/No completed evaluation is available/)).toBeInTheDocument();
  expect(screen.queryByRole("img")).not.toBeInTheDocument();
  expect(screen.queryByText(/Completed neural fine-tuning pilot/)).not.toBeInTheDocument();
});

it("shows recorded curves, equal-data baseline and weak classes without relabeling the live predictor", () => {
  const report = validateTransformerReport(fixture());
  render(<WellnessTransformerLab report={report} trainingCode="loss.backward()" />);
  expect(screen.getByRole("img", { name: /Training and validation loss/ })).toBeInTheDocument();
  expect(screen.getByRole("img", { name: /exact-match accuracy/ })).toBeInTheDocument();
  const table = screen.getByRole("table", { name: "Equal-data held-out model comparison" });
  expect(within(table).getByText("0.4800")).toBeInTheDocument();
  expect(within(table).getByText("0.5800")).toBeInTheDocument();
  expect(screen.getByText(/separate text baseline below uses logistic regression/)).toBeInTheDocument();
  expect(screen.getAllByText("5 / 2 / 3 / 0")).toHaveLength(28);
});

it("rejects an incomplete run, wrong model identity or checkpoint with no corresponding epoch", () => {
  expect(() => validateTransformerReport({ ...fixture(), status: "running" })).toThrow();
  expect(() => validateTransformerReport({ ...fixture(), checkpointSha256: "missing" })).toThrow();
  expect(() => validateTransformerReport({ ...fixture(), history: [] })).toThrow();
  const bad = fixture();
  bad.selected.epoch = 9;
  expect(() => validateTransformerReport(bad)).toThrow();
});

it("rejects missing-trial results and confusion counts with the wrong denominator", () => {
  const missing = fixture();
  missing.protocol.configurations.push({ ...missing.protocol.configurations[0], id: "not-trained" });
  expect(() => validateTransformerReport(missing)).toThrow();
  const wrong = fixture();
  wrong.confusionMatrices[0] = [[50, 2], [3, 0]];
  expect(() => validateTransformerReport(wrong)).toThrow(/test partition/);
});
