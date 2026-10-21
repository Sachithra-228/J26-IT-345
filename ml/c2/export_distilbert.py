"""Export a completed, hash-verified C2 checkpoint for local browser inference.

The full-precision graph preserves the selected checkpoint. Earlier quantized
conversion probes exposed cross-runtime differences, so FP32 is retained.
The original selected threshold is retained; no tuning against test data.
"""
from __future__ import annotations

import argparse
import json
import os
from pathlib import Path
import shutil
import time

ROOT = Path(__file__).resolve().parents[2]
os.environ["HF_HUB_OFFLINE"] = "1"
os.environ["TRANSFORMERS_OFFLINE"] = "1"

import numpy as np
import onnx
import onnxruntime as ort
import torch
from transformers import AutoTokenizer, AutoModelForSequenceClassification

from train_distilbert import ARTIFACTS, Batches, metrics, sha, targets, write
from train_text import RAW, read_partitions


def export(run_id):
    start = time.perf_counter()
    folder = ARTIFACTS / run_id
    report_path = folder / "evaluation.json"
    report = json.loads(report_path.read_text(encoding="utf-8"))
    checkpoint = folder / "selected/model.safetensors"
    if report.get("status") != "completed" or sha(checkpoint) != report["checkpointSha256"]:
        raise ValueError("Only a completed checkpoint matching its final evaluation may be exported")
    for name, metadata in report["protocol"]["source"]["files"].items():
        if sha(RAW / name) != metadata["sha256"]:
            raise ValueError(f"Dataset changed since the training run: {name}")
    source = folder / "selected"
    model = AutoModelForSequenceClassification.from_pretrained(source, use_safetensors=True, attn_implementation="eager").eval()
    tokenizer = AutoTokenizer.from_pretrained(source)
    # Saved generic BertTokenizer metadata can otherwise reintroduce segment IDs.
    # DistilBERT takes no token_type_ids; this does not change its WordPiece IDs.
    tokenizer.model_input_names = ["input_ids", "attention_mask"]
    destination = ROOT / "public/c2/transformer/c2-distilbert"
    (destination / "onnx").mkdir(parents=True, exist_ok=True)
    # Invalidate readiness while replacing generated export assets.
    (destination / "manifest.json").unlink(missing_ok=True)
    shutil.copyfile(ROOT / "docs/c2/GOEMOTIONS_LICENSE.txt", destination / "LICENSE.txt")
    (destination / "ATTRIBUTION.txt").write_text(
        "C2 English text emotion classifier, fine-tuned in UniCare Connect.\n"
        "Base: https://huggingface.co/distilbert/distilbert-base-uncased (Apache-2.0).\n"
        "Training annotations: https://github.com/google-research/google-research/tree/master/goemotions (Apache-2.0).\n"
        "Full Apache-2.0 license: LICENSE.txt. No clinical interpretation is established.\n", encoding="utf-8")
    fp32 = folder / "browser-fp32.onnx"
    browser_model = destination / "onnx/model.onnx"

    class Logits(torch.nn.Module):
        def __init__(self, classifier):
            super().__init__()
            self.classifier = classifier

        def forward(self, input_ids, attention_mask):
            return self.classifier(input_ids=input_ids, attention_mask=attention_mask).logits

    sample = tokenizer("A short example used only for graph export.", return_tensors="pt")
    wrapper = Logits(model).eval()
    with torch.inference_mode():
        # Explicit legacy exporter keeps browser-compatible dynamic axes/opset.
        # No training or parameter changes occur in this conversion.
        torch.onnx.export(wrapper, (sample["input_ids"], sample["attention_mask"]), str(fp32),
            input_names=["input_ids", "attention_mask"], output_names=["logits"],
            dynamic_axes={"input_ids": {0: "batch", 1: "sequence"}, "attention_mask": {0: "batch", 1: "sequence"}, "logits": {0: "batch"}},
            opset_version=17, dynamo=False, external_data=False)
    # The exporter restores its wrapper's mode. Keep dropout disabled in the
    # subsequent PyTorch reference checks as well as in the exported graph.
    model.eval()
    onnx.checker.check_model(str(fp32))
    shutil.copyfile(fp32, browser_model)
    onnx.checker.check_model(str(browser_model))
    for name in ("tokenizer.json", "tokenizer_config.json", "special_tokens_map.json", "vocab.txt", "added_tokens.json"):
        if (source / name).exists():
            shutil.copyfile(source / name, destination / name)
    tokenizer_config = json.loads((destination / "tokenizer_config.json").read_text(encoding="utf-8"))
    tokenizer_config["model_input_names"] = ["input_ids", "attention_mask"]
    write(destination / "tokenizer_config.json", tokenizer_config)
    config = json.loads((source / "config.json").read_text(encoding="utf-8"))
    config["c2_checkpoint_sha256"] = report["checkpointSha256"]
    config["c2_run_id"] = run_id
    write(destination / "config.json", config)

    # Match the actual JS runtime assets installed with this project; no CDN.
    runtime_source = ROOT / "node_modules/onnxruntime-web/dist"
    runtime_destination = ROOT / "public/c2/transformer/wasm"
    runtime_destination.mkdir(parents=True, exist_ok=True)
    runtime_files = list(runtime_source.glob("ort-wasm*.wasm")) + list(runtime_source.glob("ort-wasm*.mjs"))
    if not runtime_files:
        raise FileNotFoundError("Install the project's browser inference dependency before exporting")
    for file in runtime_files:
        shutil.copyfile(file, runtime_destination / file.name)

    options = ort.SessionOptions()
    options.intra_op_num_threads = 4
    options.inter_op_num_threads = 1
    original = ort.InferenceSession(str(browser_model), sess_options=options, providers=["CPUExecutionProvider"])
    deployed = original
    probes = ["I am happy that I finished my project and grateful for the help.",
              "I miss my friends and feel lonely this evening.",
              "I am worried about my exam tomorrow.",
              "I am not sad today. I am happy my friend called.",
              "I am angry about the delay.", "I feel proud of my progress.",
              "I do not know how I feel about that.", "The library opens at nine.",
              "I’m relieved that my friend called; I don’t feel alone today.",
              "I enjoyed meeting my friends at the café today."]
    parity, maximum_fp32_error = [], 0.0
    for text in probes:
        inputs = tokenizer(text, return_tensors="pt", truncation=True, max_length=report["protocol"]["maxLength"])
        numpy_inputs = {name: value.numpy() for name, value in inputs.items()}
        with torch.inference_mode():
            reference = model(**inputs).logits.sigmoid().numpy()[0]
        original_scores = 1 / (1 + np.exp(-original.run(None, numpy_inputs)[0][0]))
        maximum_fp32_error = max(maximum_fp32_error, float(np.max(np.abs(reference - original_scores))))
        parity.append({"text": text, "inputIds": numpy_inputs["input_ids"][0].tolist(), "scores": original_scores.tolist()})
    if maximum_fp32_error > 1e-4:
        raise ValueError(f"FP32 graph differs from PyTorch: {maximum_fp32_error}")

    # Measure conversion effects at the original dev-selected threshold.
    # This does not reselect the model, threshold or quantization configuration.
    labels, partitions, _ = read_partitions()
    dataset = Batches(partitions["test"], tokenizer, report["protocol"]["maxLength"], len(labels))
    all_scores = []
    # Match the website's one-comment inference policy for the deployed benchmark.
    for index, batch in enumerate(dataset.loader(1)):
        inputs = {name: tensor.numpy() for name, tensor in batch.items() if name != "labels"}
        all_scores.append(1 / (1 + np.exp(-deployed.run(None, inputs)[0])))
        if index % 1000 == 0:
            print(json.dumps({"browserExportTestComments": index + 1, "of": len(dataset)}), flush=True)
    conversion_report = {"schemaVersion": 1, "runId": run_id, "checkpointSha256": report["checkpointSha256"],
                         "onnxSha256": sha(browser_model), "onnxBytes": browser_model.stat().st_size,
                         "fp32MaximumProbeScoreError": maximum_fp32_error,
                         "precision": "FP32; no quantization or retraining", "exportVersion": 3, "evaluationBatchSize": 1,
                         "reasonForConversionRevision": "Quantized conversion probes exposed cross-runtime differences. Retain the numerically verified full-precision graph for the PP1 demonstration. Training checkpoint and selected threshold are unchanged; no model or threshold is chosen against test results.",
                         "threshold": report["selected"]["threshold"], "testRows": len(dataset),
                         "browserTest": metrics(targets(partitions["test"], len(labels)), np.concatenate(all_scores), report["selected"]["threshold"]),
                         "torchTest": report["test"], "runtimeAssets": [file.name for file in runtime_files],
                         "onnxRuntimeVersion": ort.__version__, "onnxVersion": onnx.__version__,
                         "seconds": time.perf_counter() - start}
    write(ROOT / "docs/c2/evidence" / f"{run_id}-browser-export.json", conversion_report)
    write(ROOT / "tests/fixtures/c2/distilbert-parity.json", {"runId": run_id, "labels": labels, "cases": parity})
    # The manifest is written last. The website must not enable inference while
    # model files/export verification are incomplete.
    write(destination / "manifest.json", {"schemaVersion": 1, "runId": run_id, "model": "DistilBERT",
        "checkpointSha256": report["checkpointSha256"], "onnxSha256": sha(browser_model), "onnxBytes": browser_model.stat().st_size,
        "exportVersion": 3, "dtype": "fp32", "precision": "FP32",
        "labels": labels, "threshold": report["selected"]["threshold"], "maxLength": report["protocol"]["maxLength"],
        "browserTest": conversion_report["browserTest"], "task": "English text emotion labels; no clinical interpretation",
        "baseModel": report["protocol"]["model"], "baseRevision": report["protocol"]["modelRevision"],
        "license": "Apache-2.0", "baseModelUrl": "https://huggingface.co/distilbert/distilbert-base-uncased"})
    print(json.dumps(conversion_report), flush=True)


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--run-id", default="distilbert-pilot-v1")
    args = parser.parse_args()
    if not args.run_id.replace("-", "").replace("_", "").isalnum():
        parser.error("Invalid run ID")
    torch.set_num_threads(4)
    export(args.run_id)
