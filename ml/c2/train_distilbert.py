"""Fine-tune the English DistilBERT backbone for GoEmotions multilabel labels.

benchmark measures real gradient steps without opening the test partition.
train freezes its protocol before fitting, selects on development data only,
and evaluates the selected checkpoint on the held-out test partition once.
No synthetic questionnaire cases, student records or clinical targets are used.
"""
from __future__ import annotations

import argparse
from datetime import datetime, timezone
import hashlib
import importlib.metadata
import json
import os
from pathlib import Path
import platform
import random
import time

# Prevent credentials being used for a public, pinned download. All caches stay local.
ROOT = Path(__file__).resolve().parents[2]
ARTIFACTS = ROOT / "ml/c2/artifacts/distilbert"
os.environ.setdefault("HF_HOME", str(ARTIFACTS / "cache"))
os.environ.setdefault("HF_HUB_DISABLE_IMPLICIT_TOKEN", "1")
os.environ.setdefault("TOKENIZERS_PARALLELISM", "false")

import numpy as np
import torch
from torch.utils.data import DataLoader
from transformers import AutoModelForSequenceClassification, AutoTokenizer

from train_text import RAW, SEED, download, read_partitions, tokenize

MODEL_ID = "distilbert/distilbert-base-uncased"
MODEL_REVISION = "12040accade4e8a0f71eabdb258fecc2e7e948be"
THRESHOLDS = (0.15, 0.20, 0.25, 0.30, 0.40, 0.50)


def write(path, obj):
    path.parent.mkdir(parents=True, exist_ok=True)
    temporary = path.with_suffix(path.suffix + ".tmp")
    temporary.write_text(json.dumps(obj, ensure_ascii=False, indent=2), encoding="utf-8")
    temporary.replace(path)


def sha(path):
    return hashlib.sha256(path.read_bytes()).hexdigest()


def seed_everything():
    random.seed(SEED)
    np.random.seed(SEED)
    torch.manual_seed(SEED)
    if torch.cuda.is_available():
        torch.cuda.manual_seed_all(SEED)


def targets(rows, size):
    y = np.zeros((len(rows), size), dtype=np.float32)
    for i, row in enumerate(rows):
        y[i, list(row["labels"])] = 1
    return y


def metrics(truth, scores, threshold):
    from sklearn.metrics import accuracy_score, precision_recall_fscore_support, hamming_loss
    pred = scores >= threshold
    result = {}
    for average in ("micro", "macro", "weighted"):
        p, r, f, _ = precision_recall_fscore_support(truth, pred, average=average, zero_division=0)
        result[average] = {"precision": float(p), "recall": float(r), "f1": float(f)}
    result["exactMatchAccuracy"] = float(accuracy_score(truth, pred))
    result["labelAccuracy"] = float(1 - hamming_loss(truth, pred))
    return result


def select_threshold(truth, scores):
    from sklearn.metrics import f1_score
    trials = [{"threshold": t, "microF1": float(f1_score(truth, scores >= t, average="micro", zero_division=0))} for t in THRESHOLDS]
    best = max(trials, key=lambda row: row["microF1"])
    return best["threshold"], trials


def subset(rows, count, salt):
    if count == 0 or count >= len(rows):
        return rows
    # Uniform seeded sampling, independent of model performance and target labels.
    indices = np.random.default_rng(SEED + salt).choice(len(rows), count, replace=False)
    return [rows[int(i)] for i in sorted(indices)]


class Batches:
    def __init__(self, rows, tokenizer, max_length, labels):
        self.encoded = tokenizer([row["text"] for row in rows], truncation=True, max_length=max_length, padding=False)
        self.y = targets(rows, labels)
        self.tokenizer = tokenizer

    def __len__(self):
        return len(self.y)

    def __getitem__(self, i):
        return {**{k: v[i] for k, v in self.encoded.items()}, "labels": self.y[i]}

    def collate(self, rows):
        y = torch.from_numpy(np.stack([row["labels"] for row in rows]))
        batch = self.tokenizer.pad([{k: v for k, v in row.items() if k != "labels"} for row in rows], padding=True, return_tensors="pt")
        batch["labels"] = y
        return batch

    def loader(self, size, shuffle=False):
        return DataLoader(self, batch_size=size, shuffle=shuffle, collate_fn=self.collate, num_workers=0,
                          generator=torch.Generator().manual_seed(SEED))


def build_model(labels, layers):
    seed_everything()
    model = AutoModelForSequenceClassification.from_pretrained(
        MODEL_ID, revision=MODEL_REVISION, use_safetensors=True,
        num_labels=len(labels), problem_type="multi_label_classification",
        id2label=dict(enumerate(labels)), label2id={label: i for i, label in enumerate(labels)},
    )
    # Partial fine-tuning: embeddings and early blocks retain pretrained weights.
    for parameter in model.distilbert.parameters():
        parameter.requires_grad = False
    for block in model.distilbert.transformer.layer[-layers:]:
        for parameter in block.parameters():
            parameter.requires_grad = True
    return model


def evaluate(model, loader, device):
    model.eval()
    total, count, scores = 0.0, 0, []
    with torch.inference_mode():
        for batch in loader:
            batch = {k: v.to(device) for k, v in batch.items()}
            output = model(**batch)
            n = len(batch["labels"])
            total += float(output.loss) * n
            count += n
            scores.append(output.logits.sigmoid().cpu().numpy())
    return total / count, np.concatenate(scores)


def environment():
    packages = {name: importlib.metadata.version(name) for name in ("torch", "transformers", "numpy", "scikit-learn", "tokenizers", "safetensors", "huggingface-hub")}
    return {"python": platform.python_version(), "platform": platform.platform(), "logicalCpuCount": os.cpu_count(),
            "cudaAvailable": torch.cuda.is_available(), "torchThreads": torch.get_num_threads(), "packages": packages}


def benchmark(args):
    download()  # Local hash verification; uses no network when cached.
    # Deliberately do not parse test.tsv for the machine-speed check.
    import csv
    labels = (RAW / "emotions.txt").read_text().splitlines()
    rows = []
    with (RAW / "train.tsv").open(encoding="utf-8", newline="") as stream:
        for text, raw_labels, row_id in csv.reader(stream, delimiter="\t"):
            rows.append({"text": text, "labels": set(map(int, raw_labels.split(","))), "id": row_id})
            if len(rows) >= args.batch_size * 4:
                break
    tokenizer = AutoTokenizer.from_pretrained(MODEL_ID, revision=MODEL_REVISION)
    batches = Batches(rows, tokenizer, args.max_length, len(labels))
    model = build_model(labels, args.layers).to(args.device)
    optimizer = torch.optim.AdamW([p for p in model.parameters() if p.requires_grad], lr=2e-5)
    model.train()
    seconds = []
    changed_parameter = next(model.distilbert.transformer.layer[-1].parameters())
    before = changed_parameter.detach().clone()
    frozen_parameter = next(model.distilbert.embeddings.parameters())
    frozen_before = frozen_parameter.detach().clone()
    for step, batch in enumerate(batches.loader(args.batch_size)):
        start = time.perf_counter()
        optimizer.zero_grad(set_to_none=True)
        loss = model(**{k: v.to(args.device) for k, v in batch.items()}).loss
        loss.backward()
        optimizer.step()
        if args.device == "cuda":
            torch.cuda.synchronize()
        seconds.append(time.perf_counter() - start)
        print(json.dumps({"gradientStep": step + 1, "loss": float(loss.detach()), "seconds": round(seconds[-1], 3)}), flush=True)
    result = {"status": "gradient-smoke-test-only", "notFinalTraining": True,
              "model": MODEL_ID, "revision": MODEL_REVISION, "environment": environment(),
              "batchSize": args.batch_size, "maxLength": args.max_length, "trainableLastBlocks": args.layers,
              "trainableParameters": sum(p.numel() for p in model.parameters() if p.requires_grad),
              "totalParameters": sum(p.numel() for p in model.parameters()), "secondsPerStep": seconds,
              "pretrainedBlockWeightsChanged": bool(not torch.equal(before, changed_parameter.detach())),
              "frozenEmbeddingWeightsUnchanged": bool(torch.equal(frozen_before, frozen_parameter.detach())),
              "testPartitionUsed": False}
    if not result["pretrainedBlockWeightsChanged"] or not result["frozenEmbeddingWeightsUnchanged"]:
        raise RuntimeError("Gradient audit failed: expected trainable backbone updates and frozen embeddings")
    write(ARTIFACTS / "benchmark.json", result)
    print(json.dumps(result), flush=True)


def train(args):
    from sklearn.feature_extraction.text import TfidfVectorizer
    from sklearn.linear_model import LogisticRegression
    from sklearn.multiclass import OneVsRestClassifier
    from sklearn.metrics import precision_recall_fscore_support, multilabel_confusion_matrix
    from threadpoolctl import threadpool_limits

    start = time.perf_counter()
    run_dir = ARTIFACTS / args.run_id
    # No accidental replacement of a measured run or repeated test tuning.
    if run_dir.exists():
        raise SystemExit(f"Run already exists: {run_dir}. Use a new run ID; preserve the old evidence.")
    download()
    labels, partitions, audit = read_partitions()
    rows = {"train": subset(partitions["train"], args.train_rows, 1),
            "dev": subset(partitions["dev"], args.dev_rows, 2), "test": partitions["test"]}
    run_dir.mkdir(parents=True)
    data_source = json.loads((RAW / "manifest.json").read_text(encoding="utf-8"))
    configurations = [{"id": "lr-2e-5", "backboneLearningRate": 2e-5, "headLearningRate": 5e-4, "tokenMaskProbability": 0.0},
                      {"id": "lr-5e-5", "backboneLearningRate": 5e-5, "headLearningRate": 5e-4, "tokenMaskProbability": 0.0}]
    if args.mask_ablation:
        configurations.append({"id": "lr-2e-5-mask", "backboneLearningRate": 2e-5, "headLearningRate": 5e-4, "tokenMaskProbability": 0.05})
    protocol = {"schemaVersion": 1, "runId": args.run_id, "createdUtc": datetime.now(timezone.utc).isoformat(),
                "model": MODEL_ID, "modelRevision": MODEL_REVISION, "source": data_source,
                "scriptSha256": sha(Path(__file__)), "preparationScriptSha256": sha(ROOT / "ml/c2/train_text.py"),
                "seed": SEED, "labels": labels, "deduplicationAudit": audit,
                "sampling": "Uniform seeded train/dev subsets, fixed before fitting; complete cleaned test split",
                "partitions": {name: {"rows": len(value), "idsSha256": hashlib.sha256("\n".join(r["id"] for r in value).encode()).hexdigest(),
                                      "labelCounts": targets(value, len(labels)).sum(axis=0).astype(int).tolist()} for name, value in rows.items()},
                "maxLength": args.max_length, "batchSize": args.batch_size, "epochsMaximum": args.epochs,
                "trainableLastBlocks": args.layers, "weightDecay": 0.01, "gradientClipNorm": 1.0,
                "optimizer": "AdamW; separate head/backbone rates; linear decay with 10% warmup",
                "loss": "Unweighted BCEWithLogitsLoss (multilabel); no disease targets",
                "configurations": configurations, "thresholdCandidates": THRESHOLDS,
                "selection": "Development micro-F1 across checkpoints, configurations and shared thresholds; earliest wins ties",
                "earlyStopping": "Stop a configuration after two epochs without improved development micro-F1",
                "augmentation": "None for primary trials. Optional 5% non-special, non-negation WordPiece masking is a training-only experimental ablation; label preservation is not guaranteed.",
                "curveAccuracy": "Exact set match; label accuracy is also reported and can be high from negative-label imbalance",
                "curveLoss": "Full selected training subset and development evaluated in eval mode after each epoch",
                "testUse": "Evaluate selected neural checkpoint and dev-selected baseline once after selection; no test tuning",
                "environment": environment()}
    write(run_dir / "protocol.json", protocol)
    tokenizer = AutoTokenizer.from_pretrained(MODEL_ID, revision=MODEL_REVISION)
    # Do not encode/evaluate the test split until the checkpoint is selected.
    batches = {name: Batches(rows[name], tokenizer, args.max_length, len(labels)) for name in ("train", "dev")}
    baseline_vectorizer = TfidfVectorizer(tokenizer=tokenize, token_pattern=None, lowercase=False,
        ngram_range=(1, 2), max_features=5000, min_df=3, sublinear_tf=True, norm="l2")
    x_train = baseline_vectorizer.fit_transform([r["text"] for r in rows["train"]])
    x_dev = baseline_vectorizer.transform([r["text"] for r in rows["dev"]])
    baseline_best, baseline_trials = None, []
    with threadpool_limits(limits=args.threads):
        for c in (1.0, 4.0):
            classifier = OneVsRestClassifier(LogisticRegression(C=c, solver="liblinear", max_iter=400, random_state=SEED))
            classifier.fit(x_train, batches["train"].y)
            scores = classifier.predict_proba(x_dev)
            threshold, threshold_trials = select_threshold(batches["dev"].y, scores)
            score = metrics(batches["dev"].y, scores, threshold)["micro"]["f1"]
            baseline_trials.append({"C": c, "thresholds": threshold_trials})
            if baseline_best is None or score > baseline_best[0]:
                baseline_best = (score, classifier, threshold, c)

    best, histories = None, []
    protected_ids = set(tokenizer.all_special_ids)
    for word in ("not", "no", "never", "n't"):
        protected_ids.update(tokenizer.encode(word, add_special_tokens=False))
    for config in configurations:
        model = build_model(labels, args.layers).to(args.device)
        backbone, head = [], []
        for name, parameter in model.named_parameters():
            if parameter.requires_grad:
                (backbone if name.startswith("distilbert.") else head).append(parameter)
        optimizer = torch.optim.AdamW([
            {"params": backbone, "lr": config["backboneLearningRate"]},
            {"params": head, "lr": config["headLearningRate"]}], weight_decay=0.01)
        loader = batches["train"].loader(args.batch_size, shuffle=True)
        total_steps = len(loader) * args.epochs
        warmup = max(1, int(total_steps * 0.1))
        scheduler = torch.optim.lr_scheduler.LambdaLR(optimizer, lambda step: min((step + 1) / warmup, max(0.0, (total_steps - step) / max(1, total_steps - warmup))))
        trial_best, stale = -1, 0
        for epoch in range(1, args.epochs + 1):
            epoch_start = time.perf_counter()
            model.train()
            for step, batch in enumerate(loader):
                batch = {k: v.to(args.device) for k, v in batch.items()}
                if config["tokenMaskProbability"]:
                    ids = batch["input_ids"]
                    mask = torch.rand(ids.shape, device=args.device) < config["tokenMaskProbability"]
                    for token_id in protected_ids:
                        mask &= ids != token_id
                    batch["input_ids"] = ids.masked_fill(mask, tokenizer.mask_token_id)
                optimizer.zero_grad(set_to_none=True)
                output = model(**batch)
                output.loss.backward()
                torch.nn.utils.clip_grad_norm_([p for p in model.parameters() if p.requires_grad], 1.0)
                optimizer.step()
                scheduler.step()
                if step % 25 == 0:
                    print(json.dumps({"trial": config["id"], "epoch": epoch, "batch": step + 1, "of": len(loader), "batchLoss": float(output.loss.detach())}), flush=True)
            train_loss, train_scores = evaluate(model, batches["train"].loader(args.batch_size), args.device)
            dev_loss, dev_scores = evaluate(model, batches["dev"].loader(args.batch_size), args.device)
            threshold, threshold_trials = select_threshold(batches["dev"].y, dev_scores)
            row = {"trial": config["id"], "epoch": epoch, "trainLoss": train_loss, "validationLoss": dev_loss,
                   "train": metrics(batches["train"].y, train_scores, 0.5), "validation": metrics(batches["dev"].y, dev_scores, 0.5),
                   "curveThreshold": 0.5, "selectedThreshold": threshold,
                   "selectionMicroF1": metrics(batches["dev"].y, dev_scores, threshold)["micro"]["f1"],
                   "thresholdTrials": threshold_trials, "seconds": time.perf_counter() - epoch_start}
            histories.append(row)
            write(run_dir / "history.json", histories)
            if best is None or row["selectionMicroF1"] > best["developmentMicroF1"]:
                best = {"configuration": config, "epoch": epoch, "threshold": threshold,
                        "developmentMicroF1": row["selectionMicroF1"],
                        "trainableParameters": sum(p.numel() for p in model.parameters() if p.requires_grad),
                        "totalParameters": sum(p.numel() for p in model.parameters())}
                model.save_pretrained(run_dir / "selected", safe_serialization=True)
                tokenizer.save_pretrained(run_dir / "selected")
                write(run_dir / "selected.json", best)
            print(json.dumps({"epochCompleted": row, "best": best}), flush=True)
            if row["selectionMicroF1"] > trial_best:
                trial_best, stale = row["selectionMicroF1"], 0
            else:
                stale += 1
                if stale >= 2:
                    break
        del optimizer, model
        if args.device == "cuda":
            torch.cuda.empty_cache()

    # Lock selection before the final test is encoded and scored.
    write(run_dir / "selection-locked.json", best)
    model = AutoModelForSequenceClassification.from_pretrained(run_dir / "selected", use_safetensors=True).to(args.device)
    test_batches = Batches(rows["test"], tokenizer, args.max_length, len(labels))
    test_loss, test_scores = evaluate(model, test_batches.loader(args.batch_size), args.device)
    _, classifier, base_threshold, base_c = baseline_best
    baseline_scores = classifier.predict_proba(baseline_vectorizer.transform([r["text"] for r in rows["test"]]))
    per_p, per_r, per_f, support = precision_recall_fscore_support(test_batches.y, test_scores >= best["threshold"], average=None, zero_division=0)
    report = {"schemaVersion": 1, "status": "completed", "runId": args.run_id,
              "task": "Multilabel public English comment emotion classification; no clinical targets or local student validation",
              "protocol": protocol, "selected": best, "history": histories, "testLoss": test_loss,
              "test": metrics(test_batches.y, test_scores, best["threshold"]),
              "baseline": {"name": "TF-IDF + logistic regression refitted on exactly the same train/dev rows", "C": base_c,
                           "threshold": base_threshold, "developmentMicroF1": baseline_best[0], "developmentTrials": baseline_trials,
                           "test": metrics(test_batches.y, baseline_scores, base_threshold)},
              "perLabel": [{"label": label, "precision": float(per_p[i]), "recall": float(per_r[i]), "f1": float(per_f[i]), "support": int(support[i])} for i, label in enumerate(labels)],
              "confusionMatrices": multilabel_confusion_matrix(test_batches.y, test_scores >= best["threshold"]).tolist(),
              "checkpointSha256": sha(run_dir / "selected/model.safetensors"),
              "durationSeconds": time.perf_counter() - start,
              "limitations": ["Pilot subsampling when counts are below the full partition; rare labels may be absent or weak.",
                              "Single random seed; no confidence intervals or independent replication.",
                              "English Reddit emotion labels differ from Sri Lankan student reflections and are not diagnoses.",
                              "Not a generative chatbot, clinical prediction model or trained professional-outcome matcher.",
                              "Fine-tuned checkpoint is local. Website integration must be verified separately."]}
    write(run_dir / "evaluation.json", report)
    evidence = ROOT / "docs/c2/evidence" / f"{args.run_id}-evaluation.json"
    write(evidence, report)
    print(json.dumps({"completed": args.run_id, "test": report["test"], "baseline": report["baseline"]["test"], "evidence": str(evidence)}), flush=True)


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("stage", choices=("benchmark", "train"))
    parser.add_argument("--run-id", default="distilbert-pilot-v1")
    parser.add_argument("--train-rows", type=int, default=3000, help="0 uses the complete cleaned training split")
    parser.add_argument("--dev-rows", type=int, default=1000, help="0 uses the complete cleaned development split")
    parser.add_argument("--epochs", type=int, default=3)
    parser.add_argument("--batch-size", type=int, default=16)
    parser.add_argument("--max-length", type=int, default=96)
    parser.add_argument("--layers", type=int, default=2, help="Last transformer blocks to fine-tune, 1..6")
    parser.add_argument("--threads", type=int, default=4)
    parser.add_argument("--mask-ablation", action="store_true")
    parser.add_argument("--device", choices=("cpu", "cuda"), default="cuda" if torch.cuda.is_available() else "cpu")
    args = parser.parse_args()
    if not 1 <= args.layers <= 6 or not 8 <= args.max_length <= 512 or min(args.epochs, args.batch_size, args.threads) < 1 or min(args.train_rows, args.dev_rows) < 0:
        parser.error("Invalid training configuration")
    if not args.run_id.replace("-", "").replace("_", "").isalnum():
        parser.error("Run ID must contain only letters, numbers, hyphens or underscores")
    torch.set_num_threads(args.threads)
    torch.set_num_interop_threads(1)
    seed_everything()
    benchmark(args) if args.stage == "benchmark" else train(args)
