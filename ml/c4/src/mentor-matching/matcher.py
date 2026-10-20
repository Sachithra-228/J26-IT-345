"""
C4 multi-criteria mentor matching (the proposed method) and the skill-only baseline.

Five criteria, each in [0, 1], for a (student, mentor) pair:
  skill        - how well the mentor's expertise covers the skills the student wants help with
  interest     - Jaccard overlap of interests
  language     - 1 if the mentor speaks the student's preferred language, 0.5 if another
                 language they share, else 0
  availability - share of the student's free slots that the mentor is also free
  capacity     - share of the mentor's capacity that is still free (0 = full)

Weights come from AHP (Saaty pairwise matrix, principal eigenvector, CR < 0.10).
PROVISIONAL JUDGEMENTS: the matrix was drafted by the research team and must be
validated with SLIIT mentors / faculty before it is reported as an expert judgement.

A full mentor (capacity 0) is never recommended, so recommendations cannot over-allocate.
The TypeScript mirror (`src/lib/c4/matching.ts`) uses the same formulas and the weights
exported to `src/lib/c4/model/matching-model.json`; `tests/unit/c4/c4-parity.test.ts`
checks that both return the same scores.
"""
from __future__ import annotations

from dataclasses import dataclass, field

import numpy as np
from scipy.optimize import linear_sum_assignment

from taxonomy import MAX_SKILL_LEVEL, SKILL_IDS

CRITERIA = ["skill", "interest", "language", "availability", "capacity"]

# Saaty upper triangle (row criterion vs column criterion), provisional.
_UPPER = {
    (0, 1): 3, (0, 2): 2, (0, 3): 2, (0, 4): 3,
    (1, 2): 1 / 2, (1, 3): 1 / 2, (1, 4): 1,
    (2, 3): 1, (2, 4): 2,
    (3, 4): 2,
}
_RI = {3: 0.58, 4: 0.90, 5: 1.12, 6: 1.24}


@dataclass
class Mentor:
    id: str
    name: str
    expertise: dict[str, int]
    interests: list[str]
    languages: list[str]
    slots: list[str]
    capacity: int
    load: int
    headline: str = ""


@dataclass
class Student:
    id: str
    needs: dict[str, int]
    interests: list[str]
    preferred_language: str
    languages: list[str]
    slots: list[str] = field(default_factory=list)


def pairwise_matrix() -> np.ndarray:
    n = len(CRITERIA)
    m = np.ones((n, n))
    for (i, j), v in _UPPER.items():
        m[i, j] = v
        m[j, i] = 1.0 / v
    return m


def ahp_weights() -> tuple[np.ndarray, float, float]:
    """Return (weights, lambda_max, consistency_ratio) via the principal eigenvector."""
    m = pairwise_matrix()
    vals, vecs = np.linalg.eig(m)
    k = int(np.argmax(vals.real))
    w = np.abs(vecs[:, k].real)
    w = w / w.sum()
    lam = float(vals[k].real)
    n = m.shape[0]
    cr = ((lam - n) / (n - 1)) / _RI[n]
    return w, lam, float(cr)


WEIGHTS, LAMBDA_MAX, CONSISTENCY_RATIO = ahp_weights()


def criteria(student: Student, mentor: Mentor) -> dict[str, float]:
    need_total = sum(student.needs.values())
    skill = (
        sum(level * min(mentor.expertise.get(s, 0), MAX_SKILL_LEVEL) / MAX_SKILL_LEVEL for s, level in student.needs.items())
        / need_total
        if need_total
        else 0.0
    )
    a, b = set(student.interests), set(mentor.interests)
    interest = len(a & b) / len(a | b) if a | b else 0.0
    if student.preferred_language in mentor.languages:
        language = 1.0
    elif set(student.languages) & set(mentor.languages):
        language = 0.5
    else:
        language = 0.0
    availability = len(set(student.slots) & set(mentor.slots)) / len(student.slots) if student.slots else 0.0
    capacity = max(mentor.capacity - mentor.load, 0) / mentor.capacity if mentor.capacity else 0.0
    return {"skill": skill, "interest": interest, "language": language, "availability": availability, "capacity": capacity}


def proposed_score(student: Student, mentor: Mentor) -> float:
    c = criteria(student, mentor)
    return float(sum(w * c[name] for w, name in zip(WEIGHTS, CRITERIA)))


def baseline_score(student: Student, mentor: Mentor) -> float:
    """Skill-only cosine similarity between the student's needs and the mentor's expertise."""
    u = np.array([student.needs.get(s, 0) for s in SKILL_IDS], dtype=float)
    v = np.array([mentor.expertise.get(s, 0) for s in SKILL_IDS], dtype=float)
    denom = np.linalg.norm(u) * np.linalg.norm(v)
    return float(u @ v / denom) if denom else 0.0


def rank_proposed(student: Student, mentors: list[Mentor]) -> list[tuple[Mentor, float]]:
    """Mentors with free capacity, best first (ties broken by mentor id for determinism)."""
    open_mentors = [m for m in mentors if m.load < m.capacity]
    scored = [(m, proposed_score(student, m)) for m in open_mentors]
    return sorted(scored, key=lambda t: (-t[1], t[0].id))


def rank_baseline(student: Student, mentors: list[Mentor]) -> list[tuple[Mentor, float]]:
    scored = [(m, baseline_score(student, m)) for m in mentors]
    return sorted(scored, key=lambda t: (-t[1], t[0].id))


def assign_baseline(students: list[Student], mentors: list[Mentor]) -> dict[str, str]:
    """Each student takes their top skill-only mentor; capacity is ignored (status quo)."""
    return {s.id: rank_baseline(s, mentors)[0][0].id for s in students}


def assign_greedy(students: list[Student], mentors: list[Mentor]) -> dict[str, str | None]:
    """First come, first served: each student takes the best mentor that still has room."""
    load = {m.id: m.load for m in mentors}
    out: dict[str, str | None] = {}
    for s in students:
        choice = None
        for m, _ in sorted(((m, proposed_score(s, m)) for m in mentors), key=lambda t: (-t[1], t[0].id)):
            if load[m.id] < m.capacity:
                choice = m.id
                break
        if choice:
            load[choice] += 1
        out[s.id] = choice
    return out


def assign_optimal(students: list[Student], mentors: list[Mentor]) -> dict[str, str | None]:
    """Cohort-level assignment that maximises the total proposed score under every
    mentor's remaining capacity (Hungarian algorithm over expanded capacity slots).
    Capacity is re-read for each slot so a mentor's later slots score lower,
    which spreads students across mentors."""
    slots: list[tuple[Mentor, int]] = []
    for m in mentors:
        for k in range(max(m.capacity - m.load, 0)):
            slots.append((m, k))
    if not slots:
        return {s.id: None for s in students}
    cost = np.zeros((len(students), len(slots)))
    for i, s in enumerate(students):
        base = criteria_matrix_row(s, mentors)
        for j, (m, k) in enumerate(slots):
            c = base[m.id]
            cap_after = max(m.capacity - m.load - k, 0) / m.capacity
            score = sum(w * (cap_after if name == "capacity" else c[name]) for w, name in zip(WEIGHTS, CRITERIA))
            cost[i, j] = -score
    rows, cols = linear_sum_assignment(cost)
    out: dict[str, str | None] = {s.id: None for s in students}
    for r, c in zip(rows, cols):
        out[students[r].id] = slots[c][0].id
    return out


def criteria_matrix_row(student: Student, mentors: list[Mentor]) -> dict[str, dict[str, float]]:
    return {m.id: criteria(student, m) for m in mentors}
