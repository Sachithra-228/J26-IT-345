"""
Synthetic Year 3/4 IT student profiles with simulated expert labels (C3).

!!! SYNTHETIC DATA - NOT REAL STUDENTS !!!
Real student questionnaires and CVs need SLIIT ethics approval (submitted, not yet
granted). Until then the recommender is developed on profiles generated here (seed 42).
Every metric computed on them validates the pipeline, NOT real-world accuracy.

Assumptions (plausible guesses, not measurements):
  * N = 3,000 students; 55% Year 3, 45% Year 4.
  * Each student has a hidden primary career interest (track, weighted towards
    software engineering and QA, which dominate entry-level IT hiring) and, for 40%,
    a secondary interest.
  * Skill level (0-3) = round(curriculum base + 1.6 x track relevance + 0.8 x secondary
    relevance + 0.35 x general ability + 0.25 if Year 4 + noise N(0, 0.6)), clipped.
    Curriculum base reflects modules most IT students take (OOP, databases, ...).
  * Declared target roles (what the questionnaire asks): the track with p = 0.85,
    otherwise a random role; the secondary interest is added with p = 0.6.

Simulated expert labels (stand-in for career advisers' judgements; computed from the
HIDDEN true role requirements in synthetic_world.py, never from the model):
  * role relevance 0-3 = grade of [true fit + 0.10 x interest + noise N(0, 0.05)],
    true fit = template-weighted share of required levels the student meets;
  * gap priority 0-3 per (student, target role, skill) = grade of
    [mention probability x relative shortfall x 1.5 if the skill is entirely missing
    + noise N(0, 0.04)].
Grade cut-offs were fixed before any model was evaluated.
Because labels and ads come from the same hidden templates, measured gains of a
weighted model over an unweighted one are optimistic.
"""
from __future__ import annotations

import numpy as np
import pandas as pd

from synthetic_world import ROLE_TEMPLATES, SURFACE

N_STUDENTS = 3000
TRACK_P = {
    "software_engineer": 0.20, "qa_engineer": 0.10, "frontend_engineer": 0.08, "mobile_developer": 0.07,
    "devops_engineer": 0.07, "data_analyst": 0.08, "data_scientist": 0.08, "business_analyst": 0.08,
    "ui_ux_designer": 0.06, "network_engineer": 0.06, "cybersecurity_analyst": 0.06, "project_coordinator": 0.06,
}
CURRICULUM_BASE = {
    "prog_oop": 1.0, "databases_sql": 1.0, "communication": 1.0, "problem_solving": 0.8, "version_control": 0.6,
    "frontend": 0.6, "networking": 0.6, "agile": 0.5, "statistics": 0.5, "python": 0.5, "javascript_ts": 0.5,
    "testing_manual": 0.4, "business_analysis": 0.4, "linux": 0.3,
}
ROLE_CUTS = (0.75, 0.55, 0.35)  # grade 3 / 2 / 1
GAP_CUTS = (0.45, 0.25, 0.10)


def _grade(x: float, cuts: tuple[float, float, float]) -> int:
    return 3 if x >= cuts[0] else 2 if x >= cuts[1] else 1 if x >= cuts[2] else 0


def true_fit(levels: dict[str, int], role: str) -> float:
    tpl = ROLE_TEMPLATES[role]
    total = sum(p for p, _ in tpl.values())
    return sum(p * min(levels[s] / q, 1.0) for s, (p, q) in tpl.items()) / total


def role_relevance(levels: dict[str, int], track: str, secondary: str | None, rng: np.random.Generator) -> dict[str, int]:
    out = {}
    for role in ROLE_TEMPLATES:
        interest = 1.0 if role == track else 0.5 if role == secondary else 0.0
        out[role] = _grade(true_fit(levels, role) + 0.10 * interest + rng.normal(0, 0.05), ROLE_CUTS)
    return out


def gap_relevance(levels: dict[str, int], role: str, rng: np.random.Generator) -> dict[str, int]:
    out = {}
    for skill, (p, q) in ROLE_TEMPLATES[role].items():
        if levels[skill] >= q:
            continue
        priority = p * (q - levels[skill]) / q * (1.5 if levels[skill] == 0 else 1.0) + rng.normal(0, 0.04)
        g = _grade(priority, GAP_CUTS)
        if g > 0:
            out[skill] = g
    return out


def generate_students(skill_ids: list[str], seed: int, n: int = N_STUDENTS) -> tuple[pd.DataFrame, dict]:
    rng = np.random.default_rng(seed)
    roles = list(TRACK_P)
    rows, gap_labels = [], {}
    for i in range(n):
        sid = f"SYN-C3-{i:04d}"
        year = int(rng.choice([3, 4], p=[0.55, 0.45]))
        track = str(rng.choice(roles, p=list(TRACK_P.values())))
        secondary = str(rng.choice([r for r in roles if r != track])) if rng.random() < 0.4 else None
        ability = float(rng.normal(0, 1))
        levels = {}
        for s in skill_ids:
            p1 = ROLE_TEMPLATES[track].get(s, (0.0, 0))[0]
            p2 = ROLE_TEMPLATES[secondary].get(s, (0.0, 0))[0] if secondary else 0.0
            mean = CURRICULUM_BASE.get(s, 0.1) + 1.6 * p1 + 0.8 * p2 + 0.35 * ability + 0.25 * (year == 4)
            levels[s] = int(np.clip(np.round(mean + rng.normal(0, 0.6)), 0, 3))
        primary_target = track if rng.random() < 0.85 else str(rng.choice([r for r in roles if r != track]))
        targets = [primary_target]
        if secondary and secondary not in targets and rng.random() < 0.6:
            targets.append(secondary)
        rel = role_relevance(levels, track, secondary, rng)
        gap_labels[sid] = {t: gap_relevance(levels, t, rng) for t in targets}
        rows.append(
            {
                "student_id": sid,
                "year_of_study": year,
                "target_roles": "|".join(targets),
                **{f"lvl_{s}": levels[s] for s in skill_ids},
                "hidden_track": track,
                "hidden_secondary": secondary or "",
                "hidden_ability": round(ability, 4),
                **{f"rel_{r}": rel[r] for r in roles},
            }
        )
    return pd.DataFrame(rows), gap_labels


def split_indices(tracks: np.ndarray, seed: int) -> tuple[np.ndarray, np.ndarray]:
    """The single student train/hold-out split shared by every C3 experiment (no leakage)."""
    from sklearn.model_selection import train_test_split

    return train_test_split(np.arange(len(tracks)), test_size=0.2, stratify=tracks, random_state=seed)


# Neutral wording on purpose: none of these phrases is a taxonomy synonym, so the
# CV-extraction evaluation measures skill mentions, not the career-interest sentence.
ROLE_NOUNS = {
    "software_engineer": "software engineering", "frontend_engineer": "web interfaces", "mobile_developer": "mobile products",
    "qa_engineer": "software quality", "devops_engineer": "platform engineering", "data_analyst": "analytics roles",
    "data_scientist": "data science", "business_analyst": "business-facing IT roles", "ui_ux_designer": "product design",
    "network_engineer": "networks", "cybersecurity_analyst": "cyber defence", "project_coordinator": "project delivery",
}
PROJECTS = ["a campus event booking system", "a library management app", "a bus-route tracker", "an expense tracker", "a final-year research prototype", "a hostel management portal"]


def _cv_surface(skill: str, rng: np.random.Generator) -> str:
    s = str(rng.choice(SURFACE[skill]))
    if len(s) >= 8 and " " not in s and rng.random() < 0.05:
        i = int(rng.integers(1, len(s) - 1))
        s = s[:i] + s[i + 1 :]
    return s


def synthetic_cv(row: pd.Series, skill_ids: list[str], rng: np.random.Generator) -> tuple[str, list[str]]:
    """A short CV for one synthetic student, with obviously fake identifiers for the PII stripper."""
    num = int(row["student_id"].split("-")[-1])
    strong = [s for s in skill_ids if row[f"lvl_{s}"] >= 2]
    basic = [s for s in skill_ids if row[f"lvl_{s}"] == 1 and rng.random() < 0.7]
    mentioned = sorted(set(strong) | set(basic), key=skill_ids.index)
    target = row["target_roles"].split("|")[0]
    lines = [
        f"Name: Student {row['student_id']}",
        f"Email: syn{num:04d}@example.com | Phone: +94 11 000 0{num % 1000:03d} | NIC: 000000000V",
        "Address: No. 1, Example Road, Colombo",
        "",
        "PROFILE",
        f"{'Third' if row['year_of_study'] == 3 else 'Final'}-year BSc (Hons) IT undergraduate interested in {ROLE_NOUNS[target]}.",
        "",
        "TECHNICAL SKILLS",
        ", ".join(_cv_surface(s, rng) for s in strong) or "Still building my technical skills.",
    ]
    if basic:
        lines += ["Also familiar with: " + ", ".join(_cv_surface(s, rng) for s in basic)]
    if len(strong) >= 2:
        a, b = rng.choice(strong, size=2, replace=False)
        lines += ["", "PROJECTS", f"- Built {rng.choice(PROJECTS)} using {_cv_surface(str(a), rng)} and {_cv_surface(str(b), rng)}."]
    lines += ["", "EDUCATION", f"BSc (Hons) in Information Technology, Year {row['year_of_study']}"]
    return "\n".join(lines), mentioned
