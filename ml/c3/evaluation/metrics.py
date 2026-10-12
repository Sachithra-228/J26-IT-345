"""
Ranking and extraction metrics for the C3 evaluation (plain, dependency-free formulas).

Graded relevance is 0-3; "relevant" for precision / recall means grade >= RELEVANT_GRADE.
  NDCG@K      = DCG@K / IDCG@K with gain 2^rel - 1 and discount log2(rank + 1); the ideal
                ranking uses ALL labelled items, including ones a ranker cannot return
  Precision@K = relevant items in the top K / K
  Recall@K    = relevant items in the top K / all relevant items (undefined when there are none)
Paired bootstrap: resample students with replacement, recompute the mean difference
(proposed - baseline); 95% percentile interval; p = share of resamples with difference <= 0.
"""
from __future__ import annotations

import math

import numpy as np

RELEVANT_GRADE = 2


def dcg(grades: list[int]) -> float:
    return sum((2**g - 1) / math.log2(i + 2) for i, g in enumerate(grades))


def ndcg_at_k(ranked: list[str], relevance: dict[str, int], k: int) -> float | None:
    ideal = dcg(sorted(relevance.values(), reverse=True)[:k])
    if ideal == 0:
        return None
    return dcg([relevance.get(item, 0) for item in ranked[:k]]) / ideal


def precision_at_k(ranked: list[str], relevance: dict[str, int], k: int) -> float:
    return sum(1 for item in ranked[:k] if relevance.get(item, 0) >= RELEVANT_GRADE) / k


def recall_at_k(ranked: list[str], relevance: dict[str, int], k: int) -> float | None:
    total = sum(1 for g in relevance.values() if g >= RELEVANT_GRADE)
    if total == 0:
        return None
    return sum(1 for item in ranked[:k] if relevance.get(item, 0) >= RELEVANT_GRADE) / total


def paired_bootstrap(a: list[float], b: list[float], seed: int, n_boot: int = 2000) -> dict:
    """a = proposed, b = baseline, aligned per student."""
    diff = np.asarray(a, dtype=float) - np.asarray(b, dtype=float)
    rng = np.random.default_rng(seed)
    idx = rng.integers(0, len(diff), size=(n_boot, len(diff)))
    means = diff[idx].mean(axis=1)
    return {
        "meanDifference": float(diff.mean()),
        "ci95": [float(np.percentile(means, 2.5)), float(np.percentile(means, 97.5))],
        "pOneSided": float((means <= 0).mean()),
        "resamples": n_boot,
        "n": int(len(diff)),
    }


def prf(tp: int, fp: int, fn: int) -> dict:
    p = tp / (tp + fp) if tp + fp else 0.0
    r = tp / (tp + fn) if tp + fn else 0.0
    return {"precision": p, "recall": r, "f1": 2 * p * r / (p + r) if p + r else 0.0, "tp": tp, "fp": fp, "fn": fn}
