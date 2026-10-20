import identity from "./model/concern-identity.json";
import type { Concern } from "./assessment";
import { checkTransformerInput } from "./transformer-runtime";

export type ConcernPrediction = {
  runId: string;
  checkpointSha256: string;
  threshold: number;
  tokenCount: number;
  inputIds: number[];
  scores: { topic: Concern; score: number; selected: boolean }[];
};
type Manifest = { schemaVersion: number; task: string; runId: string; checkpointSha256: string; labels: Concern[]; threshold: number; maxLength: number; dtype: string };
let cached: ReturnType<typeof createRuntime> | null = null;
let inferenceTail: Promise<unknown> = Promise.resolve();

async function createRuntime() {
  if (!identity.checkpointSha256) throw new Error("The concern training run is not available on this checkout.");
  const response = await fetch("/c2/transformer/c2-concerns/manifest.json", { cache: "no-store" });
  if (!response.ok) throw new Error("The trained concern model is unavailable.");
  const manifest = await response.json() as Manifest;
  if (manifest.schemaVersion !== 1 || manifest.task !== "c2-concerns" || manifest.dtype !== "fp32" ||
      manifest.runId !== identity.runId || manifest.checkpointSha256 !== identity.checkpointSha256 ||
      JSON.stringify(manifest.labels) !== JSON.stringify(identity.labels) ||
      !Number.isFinite(manifest.threshold) || manifest.threshold <= 0 || manifest.threshold >= 1 ||
      !Number.isInteger(manifest.maxLength) || manifest.maxLength < 8 || manifest.maxLength > 512) {
    throw new Error("The concern model does not match its training evidence.");
  }
  const { env, AutoTokenizer, AutoModelForSequenceClassification } = await import("@huggingface/transformers");
  env.allowRemoteModels = false; env.allowLocalModels = true; env.useBrowserCache = false;
  env.localModelPath = "/c2/transformer/";
  const wasm = env.backends.onnx.wasm;
  if (!wasm) throw new Error("Browser inference is unavailable.");
  wasm.wasmPaths = "/c2/transformer/wasm/"; wasm.numThreads = 1; wasm.proxy = false;
  const [tokenizer, model] = await Promise.all([
    AutoTokenizer.from_pretrained("c2-concerns", { local_files_only: true }),
    AutoModelForSequenceClassification.from_pretrained("c2-concerns", { local_files_only: true, dtype: "fp32", device: "wasm" }),
  ]);
  if ((model.config as typeof model.config & { c2_checkpoint_sha256?: string }).c2_checkpoint_sha256 !== manifest.checkpointSha256) throw new Error("Concern checkpoint identity mismatch.");
  return { tokenizer, model, manifest };
}

export async function predictConcerns(text: string): Promise<ConcernPrediction> {
  const problem = checkTransformerInput(text);
  if (problem) throw new Error(problem);
  // Serialise runs across component mounts; the WASM model is shared in memory.
  const previous = inferenceTail;
  const task = (async () => {
    await previous.catch(() => undefined);
    if (!cached) cached = createRuntime();
    let runtime: Awaited<ReturnType<typeof createRuntime>>;
    try { runtime = await cached; } catch (error) { cached = null; throw error; }
    const { tokenizer, model, manifest } = runtime;
    const full = tokenizer(text.trim(), { truncation: false, padding: false, return_token_type_ids: false });
    if (full.input_ids.dims[1] > manifest.maxLength) throw new Error(`Please shorten the description to ${manifest.maxLength - 2} word pieces or fewer; its ending will not be silently removed.`);
    const output = await model(full);
    const logits = Array.from(output.logits.data as Float32Array);
    if (logits.length !== 5 || logits.some((x) => !Number.isFinite(x))) throw new Error("Invalid model output.");
    return {
      runId: manifest.runId, checkpointSha256: manifest.checkpointSha256, threshold: manifest.threshold,
      tokenCount: full.input_ids.dims[1], inputIds: Array.from(full.input_ids.data, Number),
      scores: manifest.labels.map((topic, i) => { const score = 1 / (1 + Math.exp(-logits[i])); return { topic, score, selected: score >= manifest.threshold }; }).sort((a, b) => b.score - a.score),
    };
  })();
  inferenceTail = task.catch(() => undefined);
  return task;
}
