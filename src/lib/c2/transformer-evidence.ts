export type EmotionMetrics = {
  micro: { precision: number; recall: number; f1: number };
  macro: { precision: number; recall: number; f1: number };
  exactMatchAccuracy: number;
  labelAccuracy: number;
};

export type TransformerEpoch = {
  trial: string;
  epoch: number;
  trainLoss: number;
  validationLoss: number;
  train: EmotionMetrics;
  validation: EmotionMetrics;
  curveThreshold: number;
  selectedThreshold: number;
  selectionMicroF1: number;
  seconds: number;
};

export type TransformerReport = {
  schemaVersion: number;
  status: string;
  runId: string;
  task: string;
  checkpointSha256: string;
  durationSeconds: number;
  protocol: {
    model: string;
    modelRevision: string;
    seed: number;
    maxLength: number;
    batchSize: number;
    epochsMaximum: number;
    trainableLastBlocks: number;
    weightDecay: number;
    gradientClipNorm: number;
    optimizer: string;
    loss: string;
    augmentation: string;
    configurations: { id: string; backboneLearningRate: number; headLearningRate: number; tokenMaskProbability: number }[];
    partitions: Record<"train" | "dev" | "test", { rows: number; idsSha256: string; labelCounts: number[] }>;
    environment: { python: string; cudaAvailable: boolean; packages: Record<string, string> };
  };
  selected: {
    configuration: { id: string; backboneLearningRate: number; headLearningRate: number; tokenMaskProbability: number };
    epoch: number;
    threshold: number;
    developmentMicroF1: number;
    trainableParameters: number;
    totalParameters: number;
  };
  history: TransformerEpoch[];
  test: EmotionMetrics;
  baseline: { name: string; test: EmotionMetrics };
  perLabel: { label: string; precision: number; recall: number; f1: number; support: number }[];
  confusionMatrices: number[][][];
  limitations: string[];
};

// This is a project-generated report, not untrusted user input. Fail closed on
// incomplete output so the page cannot present a partial run as final evidence.
export function validateTransformerReport(value: unknown): TransformerReport {
  const report = value as TransformerReport | null;
  if (report?.schemaVersion !== 1 || report.status !== "completed" ||
      report.protocol?.model !== "distilbert/distilbert-base-uncased" ||
      !/^[a-f0-9]{64}$/.test(report.checkpointSha256 ?? "") ||
      !report.history?.length || report.perLabel?.length !== 28 || report.confusionMatrices?.length !== 28 ||
      !report.protocol.configurations?.every((config) => report.history.some((row) => row.trial === config.id)) ||
      !report.history.some((row) => row.trial === report.selected?.configuration?.id && row.epoch === report.selected?.epoch)) {
    throw new Error("Incomplete or mismatched DistilBERT evaluation report");
  }
  const numbers = [report.test.micro.f1, report.test.macro.f1, report.test.exactMatchAccuracy,
    ...report.history.flatMap((row) => [row.trainLoss, row.validationLoss, row.train.exactMatchAccuracy, row.validation.exactMatchAccuracy])];
  if (numbers.some((number) => !Number.isFinite(number) || number < 0)) throw new Error("Invalid DistilBERT evaluation values");
  const testRows = report.protocol.partitions?.test?.rows;
  if (!testRows || report.confusionMatrices.some((matrix) => matrix.length !== 2 || matrix.some((row) => row.length !== 2) ||
      matrix.flat().some((number) => !Number.isInteger(number) || number < 0) || matrix.flat().reduce((a, b) => a + b, 0) !== testRows)) {
    throw new Error("DistilBERT confusion counts do not match the test partition");
  }
  return report;
}
