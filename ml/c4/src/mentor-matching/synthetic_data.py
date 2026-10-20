"""
SYNTHETIC DATA: validates the pipeline, not real-world accuracy.

Generates fictional mentors and students (seed 42) plus simulated "expert" relevance
labels for evaluation. No real person is described. Mentor names are invented.

The simulated expert ("hidden world") deliberately differs from the proposed scorer:
it uses its own weights, a non-linear skill term, a hard penalty when no language is
shared, and noise. It still rewards the same kinds of fit, so a better score on these
labels shows the pipeline works end to end; it is not evidence of real-world accuracy.
Replace these labels with mentor / faculty judgements on consented students before
reporting results.
"""
from __future__ import annotations

import numpy as np

from matcher import Mentor, Student, criteria
from taxonomy import INTEREST_IDS, LANGUAGE_IDS, SKILL_IDS, SLOT_IDS

SEED = 42

_FIRST = ["Nimal", "Kavindi", "Tharindu", "Ishara", "Ruwan", "Dilini", "Kasun", "Sanduni", "Arjun", "Priya",
          "Mohamed", "Fathima", "Chamath", "Hiruni", "Suresh", "Anjali", "Lahiru", "Nethmi", "Kumar", "Rizwan"]
_LAST = ["Perera", "Silva", "Fernando", "Jayasinghe", "Bandara", "Wickramasinghe", "Rajapaksha", "Dissanayake",
         "Sivakumar", "Rahman", "Gunawardena", "Herath", "Weerasinghe", "Nadarajah", "Kumara"]
_ROLES = ["Software engineer", "Senior QA engineer", "Data scientist", "DevOps engineer", "UI/UX designer",
          "Network engineer", "Security analyst", "Tech lead", "Lecturer", "Product manager", "Mobile developer"]

# Rough co-occurrence so profiles look plausible (role -> likely skills)
_ROLE_SKILLS = {
    "Software engineer": ["programming_fundamentals", "web_backend", "databases", "web_frontend"],
    "Senior QA engineer": ["software_testing", "programming_fundamentals", "communication"],
    "Data scientist": ["data_analysis", "machine_learning", "databases", "research_writing"],
    "DevOps engineer": ["cloud_devops", "networking", "web_backend"],
    "UI/UX designer": ["ui_ux", "web_frontend", "communication"],
    "Network engineer": ["networking", "cybersecurity", "cloud_devops"],
    "Security analyst": ["cybersecurity", "networking", "programming_fundamentals"],
    "Tech lead": ["project_management", "web_backend", "interview_prep", "communication"],
    "Lecturer": ["research_writing", "programming_fundamentals", "machine_learning", "communication"],
    "Product manager": ["project_management", "communication", "ui_ux"],
    "Mobile developer": ["mobile_dev", "web_frontend", "programming_fundamentals"],
}

# Simulated expert weights (intentionally not the AHP weights)
_EXPERT = {"skill": 0.42, "interest": 0.13, "language": 0.25, "availability": 0.20}


def _pick(rng: np.random.Generator, items: list[str], lo: int, hi: int) -> list[str]:
    k = int(rng.integers(lo, hi + 1))
    return sorted(rng.choice(items, size=min(k, len(items)), replace=False).tolist())


def _languages(rng: np.random.Generator) -> list[str]:
    first = rng.choice(["si", "ta", "en"], p=[0.62, 0.23, 0.15])
    langs = {str(first)}
    if rng.random() < 0.75:
        langs.add("en")
    return sorted(langs)


def make_mentors(rng: np.random.Generator, n: int) -> list[Mentor]:
    mentors = []
    for i in range(n):
        role = str(rng.choice(_ROLES))
        core = _ROLE_SKILLS[role]
        expertise = {s: int(rng.integers(2, 4)) for s in core[: int(rng.integers(2, len(core) + 1))]}
        for s in _pick(rng, [x for x in SKILL_IDS if x not in expertise], 0, 2):
            expertise[s] = int(rng.integers(1, 3))
        capacity = int(rng.integers(3, 9))
        mentors.append(
            Mentor(
                id=f"M{i + 1:03d}",
                name=f"{rng.choice(_FIRST)} {rng.choice(_LAST)}",
                expertise=dict(sorted(expertise.items())),
                interests=_pick(rng, INTEREST_IDS, 2, 4),
                languages=_languages(rng),
                slots=_pick(rng, SLOT_IDS, 1, 3),
                capacity=capacity,
                # about 15% of mentors are already full, the rest have 0-2 mentees
                load=capacity if rng.random() < 0.15 else int(rng.integers(0, 3)),
                headline=role,
            )
        )
    return mentors


def make_students(rng: np.random.Generator, n: int) -> list[Student]:
    students = []
    for i in range(n):
        needs = {s: int(rng.integers(1, 4)) for s in _pick(rng, SKILL_IDS, 1, 3)}
        langs = _languages(rng)
        preferred = langs[0] if len(langs) == 1 else str(rng.choice([l for l in langs if l != "en"] or ["en"]))
        if rng.random() < 0.2:
            preferred = "en" if "en" in langs else preferred
        students.append(
            Student(
                id=f"S{i + 1:04d}",
                needs=needs,
                interests=_pick(rng, INTEREST_IDS, 1, 3),
                preferred_language=preferred,
                languages=langs,
                slots=_pick(rng, SLOT_IDS, 1, 3),
            )
        )
    return students


def expert_utility(rng: np.random.Generator, student: Student, mentor: Mentor) -> float:
    c = criteria(student, mentor)
    u = (
        _EXPERT["skill"] * np.sqrt(c["skill"])
        + _EXPERT["interest"] * c["interest"]
        + _EXPERT["language"] * c["language"]
        + _EXPERT["availability"] * c["availability"]
    )
    if c["language"] == 0.0:
        u *= 0.4
    return float(u + rng.normal(0.0, 0.04))


def expert_labels(rng: np.random.Generator, students: list[Student], mentors: list[Mentor]) -> dict[str, dict[str, int]]:
    """Graded relevance per student: 3 = best, 2 = next two, 1 = next three, else 0.
    A full mentor is never relevant (an adviser would not suggest them)."""
    labels: dict[str, dict[str, int]] = {}
    for s in students:
        utils = [(m.id, expert_utility(rng, s, m)) for m in mentors if m.load < m.capacity]
        utils.sort(key=lambda t: -t[1])
        rel: dict[str, int] = {}
        for rank, (mid, _) in enumerate(utils[:6]):
            rel[mid] = 3 if rank == 0 else 2 if rank < 3 else 1
        labels[s.id] = rel
    return labels


def generate(n_mentors: int = 60, n_students: int = 480, seed: int = SEED):
    rng = np.random.default_rng(seed)
    mentors = make_mentors(rng, n_mentors)
    students = make_students(rng, n_students)
    labels = expert_labels(rng, students, mentors)
    return mentors, students, labels


assert set(LANGUAGE_IDS) == {"en", "si", "ta"}
