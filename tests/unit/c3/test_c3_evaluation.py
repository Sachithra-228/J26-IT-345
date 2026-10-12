"""C3 Phase 6 tests: metric formulas (hand-computed cases) and the evidence files."""
import math

import pytest

import c3_common as C
from metrics import ndcg_at_k, paired_bootstrap, precision_at_k, prf, recall_at_k


def test_ndcg_hand_computed():
    rel = {"a": 3, "b": 2, "c": 0, "d": 1}
    assert ndcg_at_k(["a", "b", "d"], rel, 3) == pytest.approx(1.0)
    dcg = (2**0 - 1) / math.log2(2) + (2**3 - 1) / math.log2(3) + (2**2 - 1) / math.log2(4)
    idcg = 7 / math.log2(2) + 3 / math.log2(3) + 1 / math.log2(4)
    assert ndcg_at_k(["c", "a", "b"], rel, 3) == pytest.approx(dcg / idcg)
    assert ndcg_at_k(["a"], {"a": 0}, 3) is None  # undefined without relevant items


def test_ideal_ranking_includes_items_the_ranker_cannot_return():
    # "x" is relevant but not in the ranked list, so NDCG < 1 even for a perfect order
    assert ndcg_at_k(["a"], {"a": 3, "x": 3}, 2) < 1.0


def test_precision_and_recall_at_k():
    rel = {"a": 3, "b": 1, "c": 2, "d": 2}
    assert precision_at_k(["a", "b", "c"], rel, 3) == pytest.approx(2 / 3)
    assert recall_at_k(["a", "b", "c"], rel, 3) == pytest.approx(2 / 3)
    assert recall_at_k(["a"], {"a": 1}, 3) is None
    assert precision_at_k(["a"], rel, 5) == pytest.approx(1 / 5)  # short lists are not rewarded


def test_paired_bootstrap_detects_a_consistent_difference():
    res = paired_bootstrap([0.9] * 50, [0.8] * 50, seed=1)
    assert res["meanDifference"] == pytest.approx(0.1)
    assert res["ci95"][0] == pytest.approx(0.1) and res["pOneSided"] == 0.0
    noisy = paired_bootstrap([0.5, 0.6, 0.4, 0.5], [0.5, 0.4, 0.6, 0.5], seed=1)
    assert noisy["ci95"][0] < 0 < noisy["ci95"][1]


def test_prf():
    assert prf(8, 2, 2) == pytest.approx({"precision": 0.8, "recall": 0.8, "f1": 0.8, "tp": 8, "fp": 2, "fn": 2})


@pytest.mark.parametrize("name", ["recommendation-eval.json", "extraction-eval.json", "role-profiles.json"])
def test_evidence_files_are_labelled_synthetic(name):
    data = C.load_json(C.EVIDENCE_DIR / name)
    assert "SYNTHETIC" in data["warning"]
    assert data["modelVersion"] == C.load_json(C.MODEL_OUT)["version"]


def test_recommendation_evidence_reports_targets_honestly():
    data = C.load_json(C.EVIDENCE_DIR / "recommendation-eval.json")
    assert data["proposalTargets"]["status"] == "not stated"
    assert data["protocol"]["students"]["holdout"] == 600
    for m in data["holdout"].values():
        assert 0.0 <= m["proposed"] <= 1.0 and 0.0 <= m["baseline"] <= 1.0
        lo, hi = m["pairedBootstrap"]["ci95"]
        assert lo <= m["pairedBootstrap"]["meanDifference"] <= hi
