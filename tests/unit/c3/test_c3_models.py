"""C3 Phase 2 tests: role profiles (TF-IDF), baseline and proposed readiness, gap ranking."""
import math

import pytest

import c3_common as C
import readiness as R
from role_profiles import build_role_profiles

SKILLS = ["a", "b", "c", "comm"]


def _ad(role, *skills):
    return {"role_id": role, "skills": [{"skill_id": s, "required_level": lv, "preferred": pref} for s, lv, pref in skills]}


@pytest.fixture()
def toy_profiles():
    ads = [
        _ad("r1", ("a", 3, False), ("comm", 2, False)),
        _ad("r1", ("a", 2, False), ("b", 1, True), ("comm", 2, False)),
        _ad("r2", ("c", 2, False), ("comm", 2, False)),
        _ad("r2", ("c", 2, False)),
        _ad(None, ("a", 1, False)),  # unclassified ads are ignored
    ]
    return build_role_profiles(ads, ["r1", "r2"], SKILLS, min_support=0.2)


def test_profile_weights_tf_idf_and_levels(toy_profiles):
    r1 = {s["skillId"]: s for s in toy_profiles[0]["skills"]}
    assert toy_profiles[0]["adCount"] == 2
    assert math.isclose(sum(s["weight"] for s in r1.values()), 1.0)
    assert r1["a"]["tf"] == 1.0 and r1["b"]["tf"] == 0.25  # preferred mention counts half
    assert r1["a"]["idf"] > r1["comm"]["idf"]  # comm appears in both roles -> less distinctive
    assert r1["a"]["requiredLevel"] == 3  # median of [3, 2] = 2.5 rounds half up
    assert r1["a"]["weight"] > r1["comm"]["weight"]
    assert [s["skillId"] for s in toy_profiles[0]["skills"]] == ["a", "comm", "b"]


def test_min_support_drops_rare_skills():
    ads = [_ad("r1", ("a", 2, False))] * 9 + [_ad("r1", ("a", 2, False), ("b", 1, False))]
    prof = build_role_profiles(ads, ["r1"], SKILLS, min_support=0.15)[0]
    assert [s["skillId"] for s in prof["skills"]] == ["a"]


PROFILE = {
    "id": "r",
    "skills": [
        {"skillId": "a", "weight": 0.5, "requiredLevel": 3},
        {"skillId": "b", "weight": 0.3, "requiredLevel": 2},
        {"skillId": "c", "weight": 0.2, "requiredLevel": 1},
    ],
}


def test_points_formula_bounds():
    assert R.skill_points(3, 3, 0.5)[2] == pytest.approx(50.0)
    assert R.skill_points(0, 3, 0.5)[2] == pytest.approx(-25.0)  # -LAMBDA x 100 x w
    assert R.skill_points(3, 2, 0.5)[2] == pytest.approx(50.0)  # over-qualification is capped


def test_contributions_explain_the_score():
    res = R.proposed_readiness({"a": 2, "b": 0, "c": 1}, PROFILE)
    assert sum(c["points"] for c in res["contributions"]) == pytest.approx(res["rawScore"])
    assert res["score"] == pytest.approx(max(0.0, res["rawScore"]))
    assert R.proposed_readiness({"a": 3, "b": 2, "c": 1}, PROFILE)["score"] == pytest.approx(100.0)
    assert R.proposed_readiness({}, PROFILE)["score"] == 0.0  # clamped at 0


def test_proposed_score_is_monotonic_in_every_skill():
    for skill in ("a", "b", "c"):
        prev = -1.0
        for lv in range(4):
            s = R.proposed_readiness({"a": 1, "b": 1, "c": 0, skill: lv}, PROFILE)["score"]
            assert s >= prev
            prev = s


def test_baseline_counts_unweighted_coverage():
    res = R.baseline_readiness({"a": 1, "b": 0, "c": 3}, PROFILE)
    assert res["score"] == pytest.approx(100 * 2 / 3)


def test_gap_ranking_by_gain():
    gaps = R.proposed_gaps({"a": 2, "b": 0, "c": 1}, PROFILE, ["a", "b", "c"])
    assert [g["skillId"] for g in gaps] == ["b", "a"]  # missing b (w 0.3, L0) gains more than a (w 0.5, 2/3)
    for g in gaps:
        _, _, pts = R.skill_points(g["level"], g["requiredLevel"], g["weight"])
        assert g["gainToRequired"] == pytest.approx(100 * g["weight"] - pts)
        assert 0 < g["gainNextLevel"] <= g["gainToRequired"]
    assert R.proposed_gaps({"a": 3, "b": 2, "c": 1}, PROFILE, ["a", "b", "c"]) == []


def test_baseline_gaps_ignore_weights():
    gaps = R.baseline_gaps({"a": 1, "b": 0, "c": 0}, PROFILE, ["a", "b", "c"])
    assert [g["skillId"] for g in gaps] == ["a", "b", "c"]  # shortfall 2, 2, 1; ties in taxonomy order


def test_rank_roles_orders_by_score():
    p2 = {"id": "q", "skills": [{"skillId": "c", "weight": 1.0, "requiredLevel": 1}]}
    ranked = R.rank_roles({"c": 1}, [PROFILE, p2])
    assert [r["roleId"] for r in ranked] == ["q", "r"]


def test_exported_model_is_consistent():
    model = C.load_json(C.MODEL_OUT)
    assert "SYNTHETIC" in model["warning"]
    skill_ids = {s["id"] for s in model["taxonomy"]["skills"]}
    assert [r["id"] for r in model["roles"]] == C.role_ids()
    for role in model["roles"]:
        assert math.isclose(sum(s["weight"] for s in role["skills"]), 1.0, rel_tol=1e-12)
        assert all(s["skillId"] in skill_ids and 1 <= s["requiredLevel"] <= 3 for s in role["skills"])
        weights = [s["weight"] for s in role["skills"]]
        assert weights == sorted(weights, reverse=True)
