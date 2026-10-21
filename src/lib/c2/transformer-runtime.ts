// Browser-only, explicitly requested inference. Fetches model assets, never a prediction API.
export type TransformerPrediction = {
  runId: string;
  tokenCount: number;
  inputIds: number[];
  threshold: number;
  scores: { label: string; score: number; selected: boolean }[];
};
type Manifest = { schemaVersion: number; runId: string; checkpointSha256: string; labels: string[]; threshold: number; maxLength: number; onnxBytes: number; dtype: "fp32" };
let cached: { checkpoint: string; promise: ReturnType<typeof createRuntime> } | null = null;

export function checkTransformerInput(text: string): string | null {
  if (text.trim().length > 1200) return "Use 1,200 characters or fewer.";
  if ((text.match(/[A-Za-z]+/g) ?? []).length < 3) return "Enter an English sentence with at least three words.";
  if (/[^\p{Script=Latin}\p{Number}\p{Punctuation}\p{Separator}\p{Symbol}\p{Mark}\s]/u.test(text)) return "This experiment supports English text only. This script is outside its evaluation.";
  return null;
}

async function createRuntime(expectedCheckpoint: string) {
  const response = await fetch("/c2/transformer/c2-distilbert/manifest.json", { cache: "no-store" });
  if (!response.ok) throw new Error("The trained browser model is not available on this checkout yet.");
  const manifest = await response.json() as Manifest;
  if (manifest.schemaVersion !== 1 || manifest.dtype !== "fp32" || manifest.checkpointSha256 !== expectedCheckpoint || manifest.labels.length !== 28 ||
      !(manifest.threshold > 0 && manifest.threshold < 1) || !Number.isFinite(manifest.maxLength)) {
    throw new Error("The browser model does not match the recorded training run.");
  }
  const { env, AutoTokenizer, AutoModelForSequenceClassification } = await import("@huggingface/transformers");
  env.allowRemoteModels = false;
  env.allowLocalModels = true;
  env.useBrowserCache = false;
  env.localModelPath = "/c2/transformer/";
  const wasm = env.backends.onnx.wasm;
  if (!wasm) throw new Error("Browser inference is unavailable in this runtime.");
  wasm.wasmPaths = "/c2/transformer/wasm/";
  wasm.numThreads = 1;
  wasm.proxy = false;
  const [tokenizer, model] = await Promise.all([
    AutoTokenizer.from_pretrained("c2-distilbert", { local_files_only: true }),
    AutoModelForSequenceClassification.from_pretrained("c2-distilbert", { local_files_only: true, dtype: "fp32", device: "wasm" }),
  ]);
  const config = model.config as typeof model.config & { c2_checkpoint_sha256?: string };
  if (config.c2_checkpoint_sha256 !== expectedCheckpoint) throw new Error("The loaded checkpoint identity is inconsistent.");
  return { manifest, tokenizer, model };
}

export async function predictTransformer(text: string, expectedCheckpoint: string): Promise<TransformerPrediction> {
  const problem = checkTransformerInput(text);
  if (problem) throw new Error(problem);
  if (!cached || cached.checkpoint !== expectedCheckpoint) {
    cached = { checkpoint: expectedCheckpoint, promise: createRuntime(expectedCheckpoint) };
  }
  let runtime: Awaited<ReturnType<typeof createRuntime>>;
  try {
    runtime = await cached.promise;
  } catch (error) {
    cached = null;
    throw error;
  }
  const { tokenizer, model, manifest } = runtime;
  const inputs = tokenizer(text.trim(), { truncation: true, max_length: manifest.maxLength, padding: false, return_token_type_ids: false });
  const output = await model(inputs);
  const logits = output.logits.data as Float32Array;
  if (logits.length !== manifest.labels.length || Array.from(logits).some((value) => !Number.isFinite(value))) {
    throw new Error("The model returned invalid output.");
  }
  const scores = manifest.labels.map((label, i) => {
    const score = 1 / (1 + Math.exp(-logits[i]));
    return { label, score, selected: score >= manifest.threshold };
  }).sort((a, b) => b.score - a.score);
  return { runId: manifest.runId, inputIds: Array.from(inputs.input_ids.data, Number), tokenCount: inputs.input_ids.dims[1], threshold: manifest.threshold, scores };
}
