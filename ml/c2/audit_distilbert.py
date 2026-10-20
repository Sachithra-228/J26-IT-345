"""Audit a completed neural experiment without fitting or changing a model."""
import argparse
import json

import numpy as np
import torch
from safetensors.torch import load_file
from transformers import AutoTokenizer

from train_distilbert import ARTIFACTS, ROOT, sha, subset, targets, write
from train_text import RAW, read_partitions, tokenize


def audit(run_id):
    folder = ARTIFACTS / run_id
    report = json.loads((folder / "evaluation.json").read_text(encoding="utf-8"))
    protocol = report["protocol"]
    assert report["status"] == "completed"
    assert sha(folder / "selected/model.safetensors") == report["checkpointSha256"]
    assert sha(ROOT / "ml/c2/train_distilbert.py") == protocol["scriptSha256"]
    assert sha(ROOT / "ml/c2/train_text.py") == protocol["preparationScriptSha256"]
    for name, metadata in protocol["source"]["files"].items():
        assert sha(RAW / name) == metadata["sha256"], name
    labels, partitions, _ = read_partitions()
    selected = {"train": subset(partitions["train"], protocol["partitions"]["train"]["rows"], 1),
                "dev": subset(partitions["dev"], protocol["partitions"]["dev"]["rows"], 2), "test": partitions["test"]}
    import hashlib
    keys = {}
    for name, rows in selected.items():
        expected = protocol["partitions"][name]
        assert len(rows) == expected["rows"]
        assert hashlib.sha256("\n".join(row["id"] for row in rows).encode()).hexdigest() == expected["idsSha256"]
        assert targets(rows, len(labels)).sum(axis=0).astype(int).tolist() == expected["labelCounts"]
        keys[name] = {" ".join(tokenize(row["text"])) for row in rows}
        assert len(keys[name]) == len(rows)
    assert not keys["train"] & keys["dev"]
    assert not keys["train"] & keys["test"]
    assert not keys["dev"] & keys["test"]

    counts = np.array(report["confusionMatrices"])
    assert counts.shape == (28, 2, 2)
    assert np.all(counts >= 0)
    assert np.all(counts.sum(axis=(1, 2)) == len(selected["test"]))
    true_positive, false_positive, false_negative = counts[:, 1, 1], counts[:, 0, 1], counts[:, 1, 0]
    p = true_positive.sum() / max(1, (true_positive + false_positive).sum())
    r = true_positive.sum() / max(1, (true_positive + false_negative).sum())
    f1 = 2 * p * r / max(1e-12, p + r)
    assert abs(f1 - report["test"]["micro"]["f1"]) < 1e-9
    for i, row in enumerate(report["perLabel"]):
        assert row["label"] == labels[i]
        assert row["support"] == int((true_positive + false_negative)[i])
        label_f1 = 2 * true_positive[i] / max(1, 2 * true_positive[i] + false_positive[i] + false_negative[i])
        assert abs(label_f1 - row["f1"]) < 1e-9
    assert abs(np.mean([row["f1"] for row in report["perLabel"]]) - report["test"]["macro"]["f1"]) < 1e-9
    best = max(report["history"], key=lambda row: row["selectionMicroF1"])
    assert best["trial"] == report["selected"]["configuration"]["id"]
    assert best["epoch"] == report["selected"]["epoch"]
    assert best["selectedThreshold"] == report["selected"]["threshold"]
    assert all(row["epoch"] <= protocol["epochsMaximum"] for row in report["history"])

    base_path = ARTIFACTS / "cache/hub/models--distilbert--distilbert-base-uncased/snapshots" / protocol["modelRevision"] / "model.safetensors"
    original_weights = load_file(str(base_path))
    trained_weights = load_file(str(folder / "selected/model.safetensors"))
    frozen_count, changed_count, trainable_count = 0, 0, 0
    first_trainable = 6 - protocol["trainableLastBlocks"]
    for name, value in trained_weights.items():
        if not name.startswith("distilbert."):
            continue
        frozen = name.startswith("distilbert.embeddings.") or any(name.startswith(f"distilbert.transformer.layer.{i}.") for i in range(first_trainable))
        equal = torch.equal(value, original_weights[name])
        if frozen:
            assert equal, f"Frozen tensor changed: {name}"
            frozen_count += 1
        else:
            trainable_count += 1
            changed_count += int(not equal)
    assert frozen_count > 0 and changed_count > 0
    weight_audit = {"baseSha256": sha(base_path), "checkpointSha256": report["checkpointSha256"],
                    "frozenBackboneTensorsUnchanged": frozen_count, "trainableBackboneTensorCount": trainable_count,
                    "trainableBackboneTensorsChanged": changed_count,
                    "newClassificationHeadTensors": sum(not name.startswith("distilbert.") for name in trained_weights)}
    del original_weights, trained_weights

    tokenizer = AutoTokenizer.from_pretrained(folder / "selected", local_files_only=True)
    length_audit = {}
    for name, rows in selected.items():
        encoded = tokenizer([row["text"] for row in rows], truncation=False, padding=False,
                            return_attention_mask=False, return_token_type_ids=False)
        lengths = np.array([len(ids) for ids in encoded["input_ids"]])
        length_audit[name] = {"rows": len(rows), "minimumTokens": int(lengths.min()),
                              "medianTokens": float(np.median(lengths)), "p95Tokens": float(np.quantile(lengths, 0.95)),
                              "maximumTokens": int(lengths.max()),
                              "rowsExceedingMaximumLength": int((lengths > protocol["maxLength"]).sum()),
                              "tokenCountsIncludeSpecialTokens": True}
    result = {"runId": run_id, "allPassed": True, "auditOnlyNoTraining": True,
              "checks": ["Dataset/source hashes match", "Training source hashes unchanged",
                         "Checkpoint hash matches completed evaluation", "Seeded split IDs and label counts reproduce",
                         "Saved frozen tensors match the base exactly and fine-tuned backbone tensors changed",
                         "No normalized-token duplicate overlap across selected splits",
                         "Confusion denominators and per-label/micro/macro F1 reconcile",
                         "Selected checkpoint/threshold matches the best development result"],
              "tokenLengthAudit": length_audit, "maxLength": protocol["maxLength"],
              "weightAudit": weight_audit,
              "limitations": ["Normalized-token deduplication is not author separation or a semantic leakage audit.",
                              "This software audit does not establish local student or clinical validity."]}
    write(ROOT / "docs/c2/evidence" / f"{run_id}-audit.json", result)
    print(json.dumps(result), flush=True)


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--run-id", default="distilbert-pilot-v1")
    args = parser.parse_args()
    if not args.run_id.replace("-", "").replace("_", "").isalnum():
        parser.error("Invalid run ID")
    torch.set_num_threads(4)
    audit(args.run_id)
