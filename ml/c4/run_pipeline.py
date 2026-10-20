"""
C4 mentor-matching pipeline: synthetic data -> ranking evaluation (baseline vs proposed,
bootstrap CIs, ablation) -> cohort assignment and workload evaluation -> exports.

SYNTHETIC DATA: validates the pipeline, not real-world accuracy.

Run from the repo root:  python ml/c4/run_pipeline.py   (seed 42, deterministic)

Writes:
  docs/c4/evidence/matching-eval.json        all metrics
  docs/c4/evidence/c4-ranking-comparison.png
  docs/c4/evidence/c4-workload-balance.png
  src/lib/c4/model/matching-model.json       taxonomy, AHP weights, headline results (read by the web app)
  src/lib/c4/model/demo-mentors.json         12 fictional mentors for the dashboard demo
  tests/fixtures/c4/matching-parity.json     Python reference scores for the TypeScript parity test
"""
from __future__ import annotations

import json
import sys
from dataclasses import asdict
from pathlib import Path

import numpy as np

ROOT = Path(__file__).resolve().parents[2]
C4 = Path(__file__).resolve().parent
sys.path.insert(0, str(C4 / "src" / "mentor-matching"))
sys.path.insert(0, str(C4 / "evaluation"))

import matcher  # noqa: E402
from matcher import CRITERIA, WEIGHTS, Mentor, Student  # noqa: E402
from metrics import bootstrap_ci, gini, ndcg_at_k, precision_at_k  # noqa: E402
from synthetic_data import SEED, generate  # noqa: E402
from taxonomy import INTERESTS, LANGUAGES, SKILLS, SLOTS  # noqa: E402

MODEL_VERSION = "c4-matching-v1-synthetic"
WARNING = "SYNTHETIC DATA: validates the pipeline, not real-world accuracy."
K_P, K_NDCG = 3, 5
# Semester intake for the workload experiment: well below total free capacity, so the
# balance numbers reflect the method rather than a cohort that fills every slot.
INTAKE = 150


def r6(x: float) -> float:
    return round(float(x), 6)


def weighted_rank(student: Student, mentors: list[Mentor], weights: dict[str, float]) -> list[str]:
    open_mentors = [m for m in mentors if m.load < m.capacity]
    total = sum(weights.values())
    scored = []
    for m in open_mentors:
        c = matcher.criteria(student, m)
        scored.append((m.id, sum(w * c[name] for name, w in weights.items()) / total))
    scored.sort(key=lambda t: (-t[1], t[0]))
    return [mid for mid, _ in scored]


def ranking_eval(students, mentors, labels, rng):
    w = dict(zip(CRITERIA, WEIGHTS))
    variants = {
        "baseline_skill_cosine": lambda s: [m.id for m, _ in matcher.rank_baseline(s, mentors)],
        "baseline_skill_cosine_capacity_filter": lambda s: [
            m.id for m, _ in matcher.rank_baseline(s, [x for x in mentors if x.load < x.capacity])
        ],
        "proposed_ahp_multi_criteria": lambda s: [m.id for m, _ in matcher.rank_proposed(s, mentors)],
    }
    for name in CRITERIA:
        variants[f"ablation_without_{name}"] = (
            lambda s, drop=name: weighted_rank(s, mentors, {k: v for k, v in w.items() if k != drop})
        )

    per_student: dict[str, dict[str, np.ndarray]] = {}
    for name, rank in variants.items():
        p, n = [], []
        for s in students:
            ids = rank(s)
            p.append(precision_at_k(ids, labels[s.id], K_P))
            n.append(ndcg_at_k(ids, labels[s.id], K_NDCG))
        per_student[name] = {"p": np.array(p), "ndcg": np.array(n)}

    out = {}
    for name, v in per_student.items():
        out[name] = {
            f"precision_at_{K_P}": r6(v["p"].mean()),
            f"precision_at_{K_P}_ci95": [r6(x) for x in bootstrap_ci(v["p"], rng)],
            f"ndcg_at_{K_NDCG}": r6(v["ndcg"].mean()),
            f"ndcg_at_{K_NDCG}_ci95": [r6(x) for x in bootstrap_ci(v["ndcg"], rng)],
        }
    diff = per_student["proposed_ahp_multi_criteria"]["ndcg"] - per_student["baseline_skill_cosine"]["ndcg"]
    out["difference_proposed_minus_baseline"] = {
        f"ndcg_at_{K_NDCG}": r6(diff.mean()),
        f"ndcg_at_{K_NDCG}_ci95": [r6(x) for x in bootstrap_ci(diff, rng)],
    }
    return out


def assignment_eval(intake: list[Student], mentors: list[Mentor]):
    methods = {
        "baseline_top_skill_mentor": matcher.assign_baseline(intake, mentors),
        "greedy_first_come_capacity_aware": matcher.assign_greedy(intake, mentors),
        "optimal_capacity_aware_hungarian": matcher.assign_optimal(intake, mentors),
    }
    by_id = {m.id: m for m in mentors}
    students = {s.id: s for s in intake}
    out, loads_out = {}, {}
    for name, assignment in methods.items():
        load = {m.id: m.load for m in mentors}
        for mid in assignment.values():
            if mid:
                load[mid] += 1
        over_students = sum(max(load[m.id] - m.capacity, 0) for m in mentors)
        over_mentors = sum(1 for m in mentors if load[m.id] > m.capacity)
        ratios = [load[m.id] / m.capacity for m in mentors]
        pairs = [(students[sid], by_id[mid]) for sid, mid in assignment.items() if mid]
        crit = [matcher.criteria(s, m) for s, m in pairs]
        out[name] = {
            "students_assigned": len(pairs),
            "students_unassigned": len(intake) - len(pairs),
            "students_beyond_capacity": over_students,
            "mentors_over_capacity": over_mentors,
            "load_ratio_gini": r6(gini(ratios)),
            "max_load_ratio": r6(max(ratios)),
            "mean_skill_fit": r6(np.mean([c["skill"] for c in crit])),
            "share_language_preferred": r6(np.mean([c["language"] == 1.0 for c in crit])),
            "share_some_shared_slot": r6(np.mean([c["availability"] > 0 for c in crit])),
        }
        loads_out[name] = ratios
    return out, loads_out


def charts(ranking, loads):
    import matplotlib

    matplotlib.use("Agg")
    import matplotlib.pyplot as plt

    ev = ROOT / "docs" / "c4" / "evidence"
    names = ["baseline_skill_cosine", "baseline_skill_cosine_capacity_filter", "proposed_ahp_multi_criteria"]
    labels = ["Skill-only\nbaseline", "Skill-only +\ncapacity filter", "Proposed\n(AHP, 5 criteria)"]
    key = f"ndcg_at_{K_NDCG}"
    vals = [ranking[n][key] for n in names]
    err = [[v - ranking[n][f"{key}_ci95"][0] for n, v in zip(names, vals)],
           [ranking[n][f"{key}_ci95"][1] - v for n, v in zip(names, vals)]]
    fig, ax = plt.subplots(figsize=(6.4, 4))
    ax.bar(labels, vals, yerr=err, capsize=6, color=["#94a3b8", "#64748b", "#2563eb"])
    ax.set_ylabel(f"NDCG@{K_NDCG} (95% bootstrap CI)")
    ax.set_ylim(0, 1)
    ax.set_title("C4 mentor ranking - SYNTHETIC DATA", fontsize=10)
    fig.tight_layout()
    fig.savefig(ev / "c4-ranking-comparison.png", dpi=150)
    plt.close(fig)

    fig, ax = plt.subplots(figsize=(6.4, 4))
    bins = np.linspace(0, max(max(v) for v in loads.values()) + 0.1, 16)
    for name, label, color in [
        ("baseline_top_skill_mentor", "Skill-only baseline", "#94a3b8"),
        ("optimal_capacity_aware_hungarian", "Proposed (capacity-aware)", "#2563eb"),
    ]:
        ax.hist(loads[name], bins=bins, alpha=0.7, label=label, color=color)
    ax.axvline(1.0, color="#dc2626", linestyle="--", linewidth=1, label="Capacity limit")
    ax.set_xlabel("Mentor load / capacity after intake")
    ax.set_ylabel("Mentors")
    ax.set_title(f"Workload after assigning {INTAKE} students - SYNTHETIC DATA", fontsize=10)
    ax.legend()
    fig.tight_layout()
    fig.savefig(ev / "c4-workload-balance.png", dpi=150)
    plt.close(fig)


def mentor_json(m: Mentor) -> dict:
    d = asdict(m)
    return {"id": d["id"], "name": d["name"], "headline": d["headline"], "expertise": d["expertise"],
            "interests": d["interests"], "languages": d["languages"], "slots": d["slots"],
            "capacity": d["capacity"], "load": d["load"]}


def main() -> None:
    mentors, students, labels = generate()
    rng = np.random.default_rng(SEED + 1)
    ranking = ranking_eval(students, mentors, labels, rng)
    intake = [students[i] for i in sorted(np.random.default_rng(SEED + 2).choice(len(students), INTAKE, replace=False))]
    assignment, loads = assignment_eval(intake, mentors)

    ev = ROOT / "docs" / "c4" / "evidence"
    ev.mkdir(parents=True, exist_ok=True)
    result = {
        "warning": WARNING,
        "model_version": MODEL_VERSION,
        "seed": SEED,
        "data": {"mentors": len(mentors), "students": len(students), "assignment_intake": INTAKE,
                 "total_free_capacity": sum(m.capacity - m.load for m in mentors)},
        "ahp": {"criteria": CRITERIA, "weights": [r6(w) for w in WEIGHTS],
                "lambda_max": r6(matcher.LAMBDA_MAX), "consistency_ratio": r6(matcher.CONSISTENCY_RATIO),
                "note": "Provisional pairwise judgements drafted by the research team; validate with SLIIT mentors."},
        "ranking": ranking,
        "assignment": assignment,
        "labels": "Simulated expert relevance (hidden world with its own weights, non-linear skill term, language penalty and noise).",
    }
    (ev / "matching-eval.json").write_text(json.dumps(result, indent=2) + "\n", encoding="utf-8")
    charts(ranking, loads)

    demo = mentors[:12]
    model = {
        "version": MODEL_VERSION,
        "warning": WARNING,
        "criteria": CRITERIA,
        # full precision so the TypeScript scores match Python exactly (parity test)
        "weights": dict(zip(CRITERIA, [float(w) for w in WEIGHTS])),
        "consistencyRatio": r6(matcher.CONSISTENCY_RATIO),
        "maxSkillLevel": 3,
        "taxonomy": {
            "skills": [{"id": i, "label": l} for i, l in SKILLS],
            "interests": [{"id": i, "label": l} for i, l in INTERESTS],
            "languages": [{"id": i, "label": l} for i, l in LANGUAGES],
            "slots": [{"id": i, "label": l} for i, l in SLOTS],
        },
        "results": {
            "ndcgBaseline": ranking["baseline_skill_cosine"][f"ndcg_at_{K_NDCG}"],
            "ndcgProposed": ranking["proposed_ahp_multi_criteria"][f"ndcg_at_{K_NDCG}"],
            "overloadBaseline": assignment["baseline_top_skill_mentor"]["students_beyond_capacity"],
            "overloadProposed": assignment["optimal_capacity_aware_hungarian"]["students_beyond_capacity"],
            "giniBaseline": assignment["baseline_top_skill_mentor"]["load_ratio_gini"],
            "giniProposed": assignment["optimal_capacity_aware_hungarian"]["load_ratio_gini"],
            "intake": INTAKE,
        },
    }
    model_dir = ROOT / "src" / "lib" / "c4" / "model"
    model_dir.mkdir(parents=True, exist_ok=True)
    (model_dir / "matching-model.json").write_text(json.dumps(model, indent=2) + "\n", encoding="utf-8")
    (model_dir / "demo-mentors.json").write_text(json.dumps([mentor_json(m) for m in demo], indent=2) + "\n", encoding="utf-8")

    cases = []
    for s in students[:30]:
        ranked = matcher.rank_proposed(s, demo)
        cases.append({
            "student": {"needs": s.needs, "interests": s.interests, "preferredLanguage": s.preferred_language,
                        "languages": s.languages, "slots": s.slots},
            "ranking": [{"mentorId": m.id, "score": r6(sc),
                         "criteria": {k: r6(v) for k, v in matcher.criteria(s, m).items()}} for m, sc in ranked],
        })
    fx = ROOT / "tests" / "fixtures" / "c4"
    fx.mkdir(parents=True, exist_ok=True)
    (fx / "matching-parity.json").write_text(json.dumps({"modelVersion": MODEL_VERSION, "cases": cases}, indent=2) + "\n", encoding="utf-8")

    p, b = ranking["proposed_ahp_multi_criteria"], ranking["baseline_skill_cosine"]
    a_b, a_o = assignment["baseline_top_skill_mentor"], assignment["optimal_capacity_aware_hungarian"]
    print(WARNING)
    print(f"AHP weights {dict(zip(CRITERIA, np.round(WEIGHTS, 3)))}  CR={matcher.CONSISTENCY_RATIO:.3f}")
    print(f"NDCG@5 baseline {b['ndcg_at_5']:.3f} -> proposed {p['ndcg_at_5']:.3f}")
    print(f"P@3    baseline {b['precision_at_3']:.3f} -> proposed {p['precision_at_3']:.3f}")
    print(f"Students beyond capacity: baseline {a_b['students_beyond_capacity']} -> proposed {a_o['students_beyond_capacity']}")
    print(f"Load Gini: baseline {a_b['load_ratio_gini']:.3f} -> proposed {a_o['load_ratio_gini']:.3f}")


if __name__ == "__main__":
    main()
