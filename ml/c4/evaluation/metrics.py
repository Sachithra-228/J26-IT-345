"""Ranking and workload metrics for the C4 mentor-matching evaluation."""
from __future__ import annotations

import math

import numpy as np


def precision_at_k(ranked_ids: list[str], rel: dict[str, int], k: int) -> float:
    return sum(1 for mid in ranked_ids[:k] if rel.get(mid, 0) > 0) / k


def ndcg_at_k(ranked_ids: list[str], rel: dict[str, int], k: int) -> float:
    dcg = sum((2 ** rel.get(mid, 0) - 1) / math.log2(i + 2) for i, mid in enumerate(ranked_ids[:k]))
    ideal = sorted(rel.values(), reverse=True)[:k]
    idcg = sum((2 ** r - 1) / math.log2(i + 2) for i, r in enumerate(ideal))
    return dcg / idcg if idcg else 0.0


def gini(values: list[float]) -> float:
    """Gini coefficient (0 = perfectly even, 1 = all on one)."""
    x = np.sort(np.asarray(values, dtype=float))
    if x.size == 0 or x.sum() == 0:
        return 0.0
    n = x.size
    return float((2 * np.arange(1, n + 1) - n - 1) @ x / (n * x.sum()))


def bootstrap_ci(values: np.ndarray, rng: np.random.Generator, b: int = 1000) -> tuple[float, float]:
    n = values.size
    means = values[rng.integers(0, n, size=(b, n))].mean(axis=1)
    lo, hi = np.percentile(means, [2.5, 97.5])
    return float(lo), float(hi)
