"""C4 mentor matching: AHP weights, criteria, capacity rules, assignment and metrics."""
import numpy as np
import pytest

import matcher
from matcher import Mentor, Student
from metrics import gini, ndcg_at_k, precision_at_k
from synthetic_data import generate


def mentor(mid="M1", capacity=4, load=0, **kw):
    base = dict(expertise={"web_backend": 3, "databases": 2}, interests=["startups", "research"],
                languages=["si", "en"], slots=["saturday", "sunday"])
    base.update(kw)
    return Mentor(id=mid, name=mid, capacity=capacity, load=load, **base)


def student(**kw):
    base = dict(id="S1", needs={"web_backend": 2}, interests=["startups"], preferred_language="si",
                languages=["si", "en"], slots=["saturday"])
    base.update(kw)
    return Student(**base)


def test_ahp_weights_are_consistent_and_sum_to_one():
    assert matcher.CONSISTENCY_RATIO < 0.10
    assert matcher.WEIGHTS.sum() == pytest.approx(1.0)
    assert matcher.WEIGHTS.argmax() == matcher.CRITERIA.index("skill")


def test_perfect_fit_scores_every_criterion_high():
    c = matcher.criteria(student(), mentor())
    assert c["skill"] == pytest.approx(1.0)
    assert c["language"] == 1.0 and c["availability"] == 1.0 and c["capacity"] == 1.0
    assert c["interest"] == pytest.approx(0.5)


def test_language_falls_back_to_shared_then_zero():
    assert matcher.criteria(student(preferred_language="ta", languages=["ta", "en"]), mentor())["language"] == 0.5
    assert matcher.criteria(student(preferred_language="ta", languages=["ta"]), mentor())["language"] == 0.0


def test_all_criteria_stay_in_unit_range():
    mentors, students, _ = generate(n_mentors=20, n_students=50)
    for s in students:
        for m in mentors:
            assert all(0.0 <= v <= 1.0 for v in matcher.criteria(s, m).values())


def test_full_mentor_is_never_recommended():
    full = mentor("FULL", capacity=3, load=3, expertise={"web_backend": 3})
    ranked = matcher.rank_proposed(student(), [full, mentor("OPEN", expertise={"web_backend": 1})])
    assert [m.id for m, _ in ranked] == ["OPEN"]


@pytest.mark.parametrize("assign", [matcher.assign_optimal, matcher.assign_greedy])
def test_capacity_aware_assignment_never_exceeds_capacity(assign):
    mentors, students, _ = generate(n_mentors=20, n_students=60)
    out = assign(students[:40], mentors)
    load = {m.id: m.load for m in mentors}
    for mid in out.values():
        if mid:
            load[mid] += 1
    assert all(load[m.id] <= m.capacity for m in mentors)


def test_optimal_assignment_leaves_students_unassigned_when_capacity_runs_out():
    mentors = [mentor("A", capacity=2, load=1), mentor("B", capacity=3, load=2)]
    students = [student(id=f"S{i}") for i in range(4)]
    out = matcher.assign_optimal(students, mentors)
    assert sum(1 for v in out.values() if v) == 2
    assert sum(1 for v in out.values() if v is None) == 2


def test_generation_is_deterministic():
    a, b = generate(n_mentors=10, n_students=10), generate(n_mentors=10, n_students=10)
    assert [m.expertise for m in a[0]] == [m.expertise for m in b[0]]
    assert a[2] == b[2]


def test_metrics():
    rel = {"A": 3, "B": 2, "C": 1}
    assert ndcg_at_k(["A", "B", "C"], rel, 3) == pytest.approx(1.0)
    assert ndcg_at_k(["X", "Y", "Z"], rel, 3) == 0.0
    assert precision_at_k(["A", "X", "C"], rel, 3) == pytest.approx(2 / 3)
    assert gini([1, 1, 1, 1]) == pytest.approx(0.0)
    assert gini([0, 0, 0, 4]) == pytest.approx(0.75)
    assert gini(np.zeros(3).tolist()) == 0.0
