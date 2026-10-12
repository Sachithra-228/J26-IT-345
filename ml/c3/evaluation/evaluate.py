"""
C3 evaluation: extraction quality, role recommendation and gap ranking (proposed vs
baseline), 5-fold cross-validation over the ad corpus, lambda sensitivity and plan
statistics. Called by `python ml/c3/run_pipeline.py evaluate`.

Protocol (no leakage):
  * ads: one stratified 80/20 split (role_profiles.split_ads). Role profiles are built
    from the 80% training ads only; extraction is reported on the 20% test ads.
  * students: one stratified 80/20 split (synthetic_students.split_indices). Every
    reported ranking metric uses the 20% hold-out students once. Nothing is tuned:
    LAMBDA = 0.5 was fixed in advance; the lambda sensitivity table uses TRAIN students
    only and is informational.
  * 5-fold CV: the training ads are split into 5 folds; each run builds profiles from 4
    folds and is scored on the hold-out students, showing how much the results depend
    on which ads were collected.

SYNTHETIC DATA: validates the pipeline, not real-world accuracy. The simulated expert
labels and the ads come from the same hidden templates, so the size of any proposed-vs-
baseline gain is optimistic.
"""
from __future__ import annotations

from datetime import datetime, timezone

import matplotlib

matplotlib.use("Agg")
import matplotlib.pyplot as plt
import numpy as np
import pandas as pd
from sklearn.model_selection import KFold

import c3_common as C
import readiness as R
from ad_parser import parse_ad
from kg import Planner
from metrics import ndcg_at_k, paired_bootstrap, precision_at_k, prf, recall_at_k
from role_profiles import build_role_profiles, split_ads
from skill_extractor import SkillExtractor
from synthetic_students import split_indices

K_ROLES = 3
K_GAPS = 5
LAMBDAS = [0.0, 0.25, 0.5, 1.0]
BLUE, ORANGE, AQUA = "#2a78d6", "#eb6834", "#1baf7a"  # validated categorical slots 1-3 (dataviz validator)
INK, MUTED, SURFACE = "#0b0b0b", "#52514e", "#fcfcfb"


# ---------------------------------------------------------------- extraction
def extraction_eval(ads_truth: dict, ads_clean: list[dict], test_idx: list[int], extractor, roles, cv_rows, handwritten) -> dict:
    tp = fp = fn = 0
    lvl_ok = pref_ok = matched = 0
    role_ok = role_n = unclassified = 0
    for i in test_idx:
        ad = ads_clean[i]
        truth = ads_truth[ad["ad_id"]]
        t_skills = truth["skills"]
        p_skills = {s["skill_id"]: s for s in ad["skills"]}
        tp += len(set(p_skills) & set(t_skills))
        fp += len(set(p_skills) - set(t_skills))
        fn += len(set(t_skills) - set(p_skills))
        for sid in set(p_skills) & set(t_skills):
            matched += 1
            lvl_ok += p_skills[sid]["required_level"] == t_skills[sid]["level_from_text"]
            pref_ok += p_skills[sid]["preferred"] == t_skills[sid]["preferred"]
        if truth["title_is_generic"]:
            unclassified += ad["role_id"] is None
        else:
            role_n += 1
            role_ok += ad["role_id"] == truth["role_id"]
    ads_metrics = prf(tp, fp, fn) | {
        "ads": len(test_idx),
        "levelAccuracyOnMatched": lvl_ok / matched,
        "preferredFlagAccuracyOnMatched": pref_ok / matched,
        "roleFromTitleAccuracy": role_ok / role_n,
        "genericTitlesLeftUnclassified": unclassified,
    }

    tp = fp = fn = 0
    for row in cv_rows:
        p = set(extractor.extract(row["cv_text"]).skill_ids)
        t = set(row["truth_skills"])
        tp, fp, fn = tp + len(p & t), fp + len(p - t), fn + len(t - p)
    cv_metrics = prf(tp, fp, fn) | {"cvs": len(cv_rows)}

    tp = fp = fn = 0
    role_hits, pref_ok, matched, per_ad = 0, 0, 0, []
    for ad in handwritten:
        parsed = parse_ad(ad["title"], ad["text"], extractor, roles)
        p = {s.skill_id: s for s in parsed["skills"]}
        t = ad["truth"]["skills"]
        tp, fp, fn = tp + len(set(p) & set(t)), fp + len(set(p) - set(t)), fn + len(set(t) - set(p))
        for sid in set(p) & set(t):
            matched += 1
            pref_ok += p[sid].preferred == t[sid]["preferred"]
        role_hits += parsed["role_id"] == ad["truth"]["role_id"]
        per_ad.append({"adId": ad["ad_id"], "trueRole": ad["truth"]["role_id"], "parsedRole": parsed["role_id"]})
    hw_metrics = prf(tp, fp, fn) | {
        "ads": len(handwritten),
        "roleFromTitleCorrect": role_hits,
        "preferredFlagAccuracyOnMatched": pref_ok / matched if matched else None,
        "perAd": per_ad,
    }
    return {
        "syntheticAdsTestSplit": ads_metrics,
        "syntheticCvs": cv_metrics,
        "handWrittenAds": hw_metrics,
        "caveat": (
            "Synthetic ads and CVs use phrasings drawn from the same lexicon as the extractor (only planted out-of-"
            "vocabulary terms are missed) and contain no distractor terms, so precision ~1.0 is optimistic. The 6 "
            "hand-written ads are independent of the generator but were written (AI-assisted) by the same author as the "
            "synonym list, so they are not a blind test either, and n = 6 is far too few for a reliable estimate. A "
            "real estimate needs public ads annotated by someone who has not seen the taxonomy."
        ),
    }


# ---------------------------------------------------------------- rankings
def ranking_metrics(students: pd.DataFrame, idx, profiles: list[dict], gap_labels: dict, skill_ids: list[str], lam: float) -> dict:
    by_id = {p["id"]: p for p in profiles}
    roles = [p["id"] for p in profiles]
    out = {m: {"proposed": [], "baseline": []} for m in ("roleNdcg", "roleP", "roleR", "gapNdcg", "gapP", "gapR")}
    gap_pairs = {"proposed": [], "baseline": []}
    for i in idx:
        row = students.iloc[int(i)]
        levels = {s: int(row[f"lvl_{s}"]) for s in skill_ids}
        rel = {r: int(row[f"rel_{r}"]) for r in roles}
        ranked = {
            "proposed": [x["roleId"] for x in R.rank_roles(levels, profiles, "proposed", lam)],
            "baseline": [x["roleId"] for x in R.rank_roles(levels, profiles, "baseline")],
        }
        for m in ("proposed", "baseline"):
            out["roleNdcg"][m].append(ndcg_at_k(ranked[m], rel, K_ROLES))
            out["roleP"][m].append(precision_at_k(ranked[m], rel, K_ROLES))
            out["roleR"][m].append(recall_at_k(ranked[m], rel, K_ROLES))
        target = row["target_roles"].split("|")[0]
        g_rel = gap_labels[row["student_id"]].get(target, {})
        g_ranked = {
            "proposed": [g["skillId"] for g in R.proposed_gaps(levels, by_id[target], skill_ids, lam)],
            "baseline": [g["skillId"] for g in R.baseline_gaps(levels, by_id[target], skill_ids)],
        }
        for m in ("proposed", "baseline"):
            gap_pairs[m].append((g_ranked[m], g_rel))
    for m in ("proposed", "baseline"):
        for ranked_list, g_rel in gap_pairs[m]:
            out["gapNdcg"][m].append(ndcg_at_k(ranked_list, g_rel, K_GAPS))
            out["gapP"][m].append(precision_at_k(ranked_list, g_rel, K_GAPS) if g_rel else None)
            out["gapR"][m].append(recall_at_k(ranked_list, g_rel, K_GAPS))
    return out


def _paired(values: dict) -> tuple[list[float], list[float]]:
    pairs = [(a, b) for a, b in zip(values["proposed"], values["baseline"]) if a is not None and b is not None]
    return [a for a, _ in pairs], [b for _, b in pairs]


METRIC_NAMES = {
    "roleNdcg": f"Role recommendation NDCG@{K_ROLES}",
    "roleP": f"Role recommendation Precision@{K_ROLES}",
    "roleR": f"Role recommendation Recall@{K_ROLES}",
    "gapNdcg": f"Gap ranking NDCG@{K_GAPS}",
    "gapP": f"Gap ranking Precision@{K_GAPS}",
    "gapR": f"Gap ranking Recall@{K_GAPS}",
}


def summarise(raw: dict, seed: int) -> dict:
    out = {}
    for key, values in raw.items():
        a, b = _paired(values)
        out[key] = {
            "metric": METRIC_NAMES[key],
            "proposed": float(np.mean(a)),
            "baseline": float(np.mean(b)),
            "studentsScored": len(a),
            "pairedBootstrap": paired_bootstrap(a, b, seed),
        }
    return out


# ---------------------------------------------------------------- charts
def _style(ax):
    ax.set_facecolor(SURFACE)
    for side in ("top", "right"):
        ax.spines[side].set_visible(False)
    for side in ("left", "bottom"):
        ax.spines[side].set_color("#c9c8c2")
    ax.tick_params(colors=MUTED)
    ax.grid(axis="x", color="#ecebe7", linewidth=0.8)
    ax.set_axisbelow(True)


def chart_rankings(summary: dict, path):
    keys = list(METRIC_NAMES)
    y = np.arange(len(keys))
    h = 0.36
    fig, ax = plt.subplots(figsize=(8.2, 4.9), facecolor=SURFACE)
    _style(ax)
    prop = [summary[k]["proposed"] for k in keys]
    base = [summary[k]["baseline"] for k in keys]
    ax.barh(y - h / 2 - 0.01, prop, height=h, color=BLUE, label="Proposed: weighted readiness")
    ax.barh(y + h / 2 + 0.01, base, height=h, color=ORANGE, label="Baseline: unweighted overlap")
    for yi, v in zip(y - h / 2, prop):
        ax.text(v + 0.01, yi, f"{v:.3f}", va="center", fontsize=8, color=INK)
    for yi, v in zip(y + h / 2, base):
        ax.text(v + 0.01, yi, f"{v:.3f}", va="center", fontsize=8, color=MUTED)
    ax.set_yticks(y, [METRIC_NAMES[k] for k in keys], color=INK, fontsize=9)
    ax.invert_yaxis()
    ax.set_xlim(0, 1.1)
    ax.set_xlabel("Mean over hold-out students (higher is better)", color=MUTED)
    ax.set_title("C3 ranking quality - SYNTHETIC data (pipeline validation only)", color=INK, fontsize=11, loc="left")
    ax.legend(loc="upper center", bbox_to_anchor=(0.4, -0.16), frameon=False, fontsize=8, ncol=2)
    fig.tight_layout()
    fig.savefig(path, dpi=160, facecolor=SURFACE)
    plt.close(fig)


def chart_extraction(extraction: dict, path):
    sets = [("Synthetic ads\n(test split)", extraction["syntheticAdsTestSplit"]), ("Synthetic CVs", extraction["syntheticCvs"]),
            (f"Hand-written ads\n(n = {extraction['handWrittenAds']['ads']})", extraction["handWrittenAds"])]
    x = np.arange(len(sets))
    w = 0.25
    fig, ax = plt.subplots(figsize=(7.4, 4.4), facecolor=SURFACE)
    _style(ax)
    ax.grid(axis="y", color="#ecebe7", linewidth=0.8)
    ax.grid(axis="x", visible=False)
    for j, (metric, color) in enumerate([("precision", BLUE), ("recall", ORANGE), ("f1", AQUA)]):
        vals = [m[metric] for _, m in sets]
        xs = x + (j - 1) * (w + 0.01)
        ax.bar(xs, vals, width=w, color=color, label=metric.upper() if metric == "f1" else metric.title())
        for xi, v in zip(xs, vals):
            ax.text(xi, v + 0.015, f"{v:.2f}", ha="center", fontsize=8, color=INK)
    ax.set_xticks(x, [s for s, _ in sets], color=INK, fontsize=9)
    ax.set_ylim(0, 1.12)
    ax.set_ylabel("Skill extraction (micro-averaged)", color=MUTED)
    ax.set_title("C3 skill extraction - SYNTHETIC / hand-written samples", color=INK, fontsize=11, loc="left")
    ax.legend(loc="upper center", bbox_to_anchor=(0.5, -0.2), frameon=False, fontsize=8, ncol=3)
    fig.tight_layout()
    fig.savefig(path, dpi=160, facecolor=SURFACE)
    plt.close(fig)


def chart_lambda(sens: list[dict], path):
    fig, ax = plt.subplots(figsize=(6.4, 4.2), facecolor=SURFACE)
    _style(ax)
    ax.grid(axis="y", color="#ecebe7", linewidth=0.8)
    lams = [s["lambda"] for s in sens]
    for key, color, name in (("roleNdcg", BLUE, f"Role NDCG@{K_ROLES}"), ("gapNdcg", ORANGE, f"Gap NDCG@{K_GAPS}")):
        vals = [s[key] for s in sens]
        ax.plot(lams, vals, color=color, linewidth=2, marker="o", markersize=6, label=name)
        ax.text(lams[-1] + 0.03, vals[-1], name, color=INK, fontsize=8, va="center")
    ax.axvline(R.LAMBDA, color=MUTED, linestyle="--", linewidth=1)
    ax.text(R.LAMBDA + 0.02, ax.get_ylim()[1], "fixed in advance (0.5)", color=MUTED, fontsize=8, va="top")
    ax.set_xlabel("Gap penalty lambda", color=MUTED)
    ax.set_ylabel("NDCG on TRAIN students", color=MUTED)
    ax.set_xlim(-0.05, 1.35)
    ax.set_title("Sensitivity to lambda - SYNTHETIC, train split only (not used for tuning)", color=INK, fontsize=10, loc="left")
    ax.legend(loc="upper center", bbox_to_anchor=(0.45, -0.2), frameon=False, fontsize=8, ncol=2)
    fig.tight_layout()
    fig.savefig(path, dpi=160, facecolor=SURFACE)
    plt.close(fig)


# ---------------------------------------------------------------- main entry
def run(paths: dict) -> dict:
    taxonomy = C.load_taxonomy()
    roles = C.load_roles()
    extractor = SkillExtractor(taxonomy)
    skill_ids = [s["id"] for s in taxonomy["skills"]]
    role_ids = [r["id"] for r in roles]

    ads_clean = C.read_jsonl(paths["ads_clean"])
    ads_truth = {a["ad_id"]: a["truth"] for a in C.read_jsonl(paths["ads_synthetic"])}
    train_ads, test_ads = split_ads(ads_clean, C.SEED)
    students = pd.read_csv(paths["students"])
    gap_labels = C.load_json(paths["gap_labels"])
    tr_students, ho_students = split_indices(students["hidden_track"].to_numpy(), C.SEED)

    extraction = extraction_eval(ads_truth, ads_clean, test_ads, extractor, roles,
                                 C.read_jsonl(paths["cv_eval"]), C.read_jsonl(paths["ads_handwritten"]))

    model = C.load_json(C.MODEL_OUT)
    profiles = model["roles"]
    holdout = summarise(ranking_metrics(students, ho_students, profiles, gap_labels, skill_ids, R.LAMBDA), C.SEED)

    # 5-fold CV over the training ads (profiles rebuilt each time; hold-out students scored)
    folds = []
    kf = KFold(n_splits=5, shuffle=True, random_state=C.SEED)
    train_arr = np.array(train_ads)
    for k, (keep, _drop) in enumerate(kf.split(train_arr)):
        fold_profiles = build_role_profiles([ads_clean[int(i)] for i in train_arr[keep]], role_ids, skill_ids)
        raw = ranking_metrics(students, ho_students, fold_profiles, gap_labels, skill_ids, R.LAMBDA)
        folds.append({key: {m: float(np.mean([v for v in raw[key][m] if v is not None])) for m in ("proposed", "baseline")} for key in raw})
    cv = {
        key: {
            m: {"mean": float(np.mean([f[key][m] for f in folds])), "std": float(np.std([f[key][m] for f in folds]))}
            for m in ("proposed", "baseline")
        }
        | {"metric": METRIC_NAMES[key]}
        for key in METRIC_NAMES
    }

    # lambda sensitivity on TRAIN students only (informational; lambda stays 0.5)
    sens = []
    for lam in LAMBDAS:
        raw = ranking_metrics(students, tr_students, profiles, gap_labels, skill_ids, lam)
        sens.append({"lambda": lam, **{key: float(np.mean([v for v in raw[key]["proposed"] if v is not None])) for key in ("roleNdcg", "gapNdcg")}})

    # Gap-to-Action plan statistics on hold-out students (primary target role)
    graph = C.load_json(C.KG_OUT)
    planner = Planner(graph)
    by_id = {p["id"]: p for p in profiles}
    steps, hours, gains, unplanned, prereq = [], [], [], 0, 0
    for i in ho_students:
        row = students.iloc[int(i)]
        levels = {s: int(row[f"lvl_{s}"]) for s in skill_ids}
        plan = planner.plan(levels, by_id[row["target_roles"].split("|")[0]], skill_ids)
        steps.append(len(plan["steps"]))
        hours.append(plan["totalEffortHours"])
        gains.append(plan["projectedReadiness"] - plan["readiness"])
        unplanned += bool(plan["unplannedGaps"])
        prereq += any(s["isPrerequisite"] for s in plan["steps"])
    plans = {
        "students": len(ho_students),
        "meanSteps": float(np.mean(steps)),
        "meanEffortHours": float(np.mean(hours)),
        "medianEffortHours": float(np.median(hours)),
        "meanProjectedReadinessGain": float(np.mean(gains)),
        "plansWithPrerequisiteSteps": prereq,
        "plansWithUnplannedGaps": unplanned,
        "note": "Projected gain assumes the student completes every step; effort hours are hand-entered estimates.",
    }

    now = datetime.now(timezone.utc).isoformat(timespec="seconds")
    common = {"warning": C.SYNTHETIC_WARNING, "generatedAt": now, "generatedBy": "python ml/c3/run_pipeline.py evaluate",
              "modelVersion": model["version"]}
    proposal_targets = {
        "status": "not stated",
        "note": ("docs/c3/proposal/ is empty and the README names NDCG and SUS without numeric targets for C3. "
                 "No target is invented here; add the proposal's targets when the C3 proposal is committed."),
    }
    recommendation = common | {
        "protocol": {
            "students": {"total": int(len(students)), "train": int(len(tr_students)), "holdout": int(len(ho_students)),
                         "split": "stratified 80/20 by hidden career track, seed 42 (synthetic_students.split_indices)"},
            "ads": {"total": len(ads_clean), "train": len(train_ads), "test": len(test_ads),
                    "split": "stratified 80/20 by parsed role, seed 42 (role_profiles.split_ads)"},
            "relevance": "simulated expert grades 0-3; relevant = grade >= 2",
            "lambda": R.LAMBDA,
            "kRoles": K_ROLES,
            "kGaps": K_GAPS,
            "gapEvaluation": "primary target role of each hold-out student; students with no labelled gap have no NDCG/recall",
        },
        "proposalTargets": proposal_targets,
        "holdout": holdout,
        "crossValidation5FoldOverAds": cv,
        "lambdaSensitivityTrainOnly": sens,
        "gapToActionPlans": plans,
        "caveat": ("Labels are simulated from the same hidden role templates that generated the ads, so a weighted model "
                   "that recovers those weights is favoured by construction. These numbers show the pipeline, metrics and "
                   "statistics work end to end - not that C3 is accurate for real SLIIT students."),
    }
    ev = C.EVIDENCE_DIR
    ev.mkdir(parents=True, exist_ok=True)
    C.write_json(ev / "recommendation-eval.json", recommendation)
    C.write_json(ev / "extraction-eval.json", common | {"proposalTargets": proposal_targets} | extraction)
    C.write_json(ev / "role-profiles.json", common | {
        "note": "Role profiles derived from SYNTHETIC ads (training split). Weight = normalised TF-IDF; tf = share of ads mentioning the skill.",
        "roles": [{"id": p["id"], "adCount": p["adCount"],
                   "skills": [{k: s[k] for k in ("skillId", "weight", "tf", "requiredLevel", "adsMentioning")} for s in p["skills"]]}
                  for p in profiles],
    })
    chart_rankings(holdout, ev / "c3-ranking-comparison.png")
    chart_extraction(extraction, ev / "c3-skill-extraction.png")
    chart_lambda(sens, ev / "c3-lambda-sensitivity.png")
    return {"holdout": holdout, "cv": cv, "extraction": extraction, "plans": plans, "sens": sens}
