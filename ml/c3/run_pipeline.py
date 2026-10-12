"""
C3 end-to-end pipeline (explainable career guidance). Re-runnable and seeded (42).

    pip install -r ml/c3/requirements.txt
    python ml/c3/run_pipeline.py            # all stages
    python ml/c3/run_pipeline.py data       # only regenerate synthetic data

Stages
  data   synthetic job ads -> cleaned / parsed ads; synthetic students + simulated
         expert labels; synthetic CVs for extraction evaluation
         -> ml/c3/data/synthetic/*, ml/c3/data/processed/*
  model  ad train/test split; TF-IDF role profiles from TRAIN ads only; export the
         runtime model (taxonomy + roles + profiles + parameters)
         -> src/lib/c3/model/career-model.json
  graph  hand-authored Gap-to-Action content + `requires` edges from the model,
         validated (types, levels, acyclic prerequisites)
         -> src/lib/c3/model/knowledge-graph.json
  parity Python reference outputs (readiness, gaps, plans, extraction, fuzzy ratio)
         for the TypeScript parity test, plus a small synthetic demo cohort for the
         staff aggregate view in demo mode
         -> tests/fixtures/c3-readiness-parity.json, src/lib/c3/model/demo-cohort.json

SYNTHETIC DATA: validates the pipeline, not real-world accuracy.
"""
from __future__ import annotations

import sys

from datetime import datetime, timezone

import pandas as pd
from rapidfuzz import fuzz

import numpy as np

import c3_common as C
import readiness
from kg import Planner, build_graph
from clean_ads import clean_records
from role_profiles import MIN_SUPPORT, PREFERRED_MENTION_WEIGHT, build_role_profiles, split_ads
from skill_extractor import FUZZY_MIN_CHARS, FUZZY_THRESHOLD, SkillExtractor
from synthetic_ads import generate_corpus
from synthetic_students import generate_students, split_indices, synthetic_cv

ADS_SYNTHETIC = C.SYNTHETIC_DIR / "job_ads_synthetic.jsonl"
ADS_HANDWRITTEN = C.SYNTHETIC_DIR / "job_ads_handwritten.jsonl"
ADS_CLEAN = C.PROCESSED_DIR / "job_ads_synthetic_clean.jsonl"
STUDENTS_CSV = C.SYNTHETIC_DIR / "students_synthetic.csv"
GAP_LABELS = C.SYNTHETIC_DIR / "gap_labels.json"
CV_EVAL = C.SYNTHETIC_DIR / "cv_eval.jsonl"
N_CV_EVAL = 200
MODEL_VERSION = "c3-readiness-v1-synthetic"


def stage_data() -> None:
    taxonomy = C.load_taxonomy()
    roles = C.load_roles()
    extractor = SkillExtractor(taxonomy)
    skill_ids = [s["id"] for s in taxonomy["skills"]]

    ads = generate_corpus(roles, C.SEED)
    C.write_jsonl(ADS_SYNTHETIC, ads)
    raw = [{k: v for k, v in a.items() if k != "truth"} for a in ads]  # the cleaner never sees the truth
    cleaned, stats = clean_records(raw, extractor, roles, "synthetic")
    C.write_jsonl(ADS_CLEAN, [a.to_dict() for a in cleaned])
    print(f"ads: {len(ads)} generated, {stats['output']} cleaned, {stats['duplicates']} duplicates, "
          f"{stats['unclassified_role']} unclassified titles, redactions {stats['redactions']}")

    students, gap_labels = generate_students(skill_ids, C.SEED)
    students.to_csv(STUDENTS_CSV, index=False)
    C.write_json(GAP_LABELS, gap_labels, compact=True)
    _, holdout = split_indices(students["hidden_track"].to_numpy(), C.SEED)
    rng = np.random.default_rng(C.SEED + 3)
    cv_rows = []
    for i in rng.choice(holdout, size=N_CV_EVAL, replace=False):
        row = students.iloc[int(i)]
        text, mentioned = synthetic_cv(row, skill_ids, rng)
        cv_rows.append({"student_id": row["student_id"], "cv_text": text, "truth_skills": mentioned})
    C.write_jsonl(CV_EVAL, cv_rows)
    rel_cols = [c for c in students.columns if c.startswith("rel_")]
    grades = students[rel_cols].to_numpy().ravel()
    print(f"students: {len(students)}; role-relevance grade shares 0/1/2/3: "
          + " / ".join(f"{(grades == g).mean():.2f}" for g in range(4)))
    print(f"CV evaluation set: {len(cv_rows)} synthetic CVs from hold-out students")


def load_clean_ads() -> list[dict]:
    return C.read_jsonl(ADS_CLEAN)


def export_model(profiles: list[dict], n_ads: int, n_train: int) -> dict:
    taxonomy = C.load_taxonomy()
    roles = {r["id"]: r for r in C.load_roles()}
    model = {
        "schemaVersion": "1.0.0",
        "version": MODEL_VERSION,
        "trainedOn": "SYNTHETIC job advertisements - pipeline validation only (see ml/c3/src/job-ad-nlp/synthetic_ads.py)",
        "warning": C.SYNTHETIC_WARNING,
        "generatedAt": datetime.now(timezone.utc).isoformat(timespec="seconds"),
        "params": {
            "lambdaGapPenalty": readiness.LAMBDA,
            "minSupport": MIN_SUPPORT,
            "preferredMentionWeight": PREFERRED_MENTION_WEIGHT,
            "fuzzyThreshold": FUZZY_THRESHOLD,
            "fuzzyMinChars": FUZZY_MIN_CHARS,
        },
        "adCorpus": {"total": n_ads, "usedForProfiles": n_train, "sourceType": "synthetic"},
        "taxonomy": {
            "version": taxonomy["taxonomyVersion"],
            "levels": [{"level": lv["level"], "label": lv["label"]} for lv in taxonomy["levels"]],
            "areas": taxonomy["areas"],
            "skills": [{"id": s["id"], "area": s["area"], "label": s["label"], "synonyms": s["synonyms"]} for s in taxonomy["skills"]],
        },
        "roles": [{"id": p["id"], "label": roles[p["id"]]["label"], "adCount": p["adCount"], "skills": p["skills"]} for p in profiles],
    }
    C.write_json(C.MODEL_OUT, model, compact=True)
    return model


def stage_model() -> None:
    ads = load_clean_ads()
    train, _test = split_ads(ads, C.SEED)
    profiles = build_role_profiles([ads[i] for i in train], C.role_ids(), C.skill_ids())
    export_model(profiles, len(ads), len(train))
    for p in profiles:
        top = ", ".join(f"{s['skillId']} {s['weight']:.2f}/L{s['requiredLevel']}" for s in p["skills"][:4])
        print(f"  {p['id']:22s} ads={p['adCount']:3d} skills={len(p['skills']):2d}  {top}")
    print(f"exported {C.MODEL_OUT.relative_to(C.ROOT)} ({C.MODEL_OUT.stat().st_size / 1024:.0f} KB)")


def stage_graph() -> None:
    model = C.load_json(C.MODEL_OUT)
    graph = build_graph(C.load_json(C.KG_SOURCE_PATH), model, f"Requires edges from model {model['version']}.")
    C.write_json(C.KG_OUT, graph, compact=True)
    counts: dict[str, int] = {}
    for n in graph["nodes"]:
        counts[n["type"]] = counts.get(n["type"], 0) + 1
    ecounts: dict[str, int] = {}
    for e in graph["edges"]:
        ecounts[e["type"]] = ecounts.get(e["type"], 0) + 1
    print(f"graph nodes {counts}")
    print(f"      edges {ecounts}")
    # worked example: a student with only curriculum basics targeting Data Scientist
    levels = {s: 0 for s in C.skill_ids()} | {"prog_oop": 2, "databases_sql": 1, "python": 1, "communication": 2}
    profile = next(r for r in model["roles"] if r["id"] == "data_scientist")
    plan = Planner(graph).plan(levels, profile, C.skill_ids())
    print(f"example plan (data_scientist): readiness {plan['readiness']:.1f} -> {plan['projectedReadiness']:.1f}, "
          f"{plan['totalEffortHours']} h")
    for st in plan["steps"]:
        pre = f" (prerequisite for {st['prerequisiteFor']})" if st["isPrerequisite"] else ""
        print(f"   {st['order']:2d}. {st['actionId']:14s} {st['skillId']:16s} {st['fromLevel']}->{st['toLevel']} "
              f"+{st['gain']:.1f} pts {st['effortHours']}h{pre}")
    print(f"exported {C.KG_OUT.relative_to(C.ROOT)} ({C.KG_OUT.stat().st_size / 1024:.0f} KB)")


def student_levels(row: pd.Series, skill_ids: list[str]) -> dict[str, int]:
    return {s: int(row[f"lvl_{s}"]) for s in skill_ids}


def _extraction_record(extractor: SkillExtractor, text: str) -> dict:
    ext = extractor.extract(text)
    return {
        "text": text,
        "skillIds": ext.skill_ids,
        "redactions": ext.redactions,
        "tokenCount": ext.token_count,
        "matches": [
            {"skillId": m.skill_id, "text": m.text, "start": m.start, "method": m.method, "score": m.score}
            for ms in ext.skills.values() for m in ms
        ],
    }


def stage_parity() -> None:
    model = C.load_json(C.MODEL_OUT)
    graph = C.load_json(C.KG_OUT)
    planner = Planner(graph)
    skill_ids = [s["id"] for s in model["taxonomy"]["skills"]]
    profiles = model["roles"]
    by_id = {p["id"]: p for p in profiles}
    students = pd.read_csv(STUDENTS_CSV)
    _, holdout = split_indices(students["hidden_track"].to_numpy(), C.SEED)
    rng = np.random.default_rng(C.SEED + 5)
    cases = []
    for i in rng.choice(holdout, size=60, replace=False):
        row = students.iloc[int(i)]
        cases.append((row["student_id"], student_levels(row, skill_ids), row["target_roles"].split("|")[0]))
    cases.append(("EDGE-ZERO", {s: 0 for s in skill_ids}, "software_engineer"))
    cases.append(("EDGE-FULL", {s: 3 for s in skill_ids}, "data_scientist"))
    out = []
    for sid, levels, target in cases:
        prop = [readiness.proposed_readiness(levels, p) for p in profiles]
        plan = planner.plan(levels, by_id[target], skill_ids)
        out.append({
            "id": sid,
            "levels": levels,
            "targetRoleId": target,
            "proposed": [{"roleId": r["roleId"], "score": r["score"], "rawScore": r["rawScore"],
                          "points": [c["points"] for c in r["contributions"]]} for r in prop],
            "baseline": [readiness.baseline_readiness(levels, p)["score"] for p in profiles],
            "rankedRoles": [r["roleId"] for r in readiness.rank_roles(levels, profiles)],
            "baselineRankedRoles": [r["roleId"] for r in readiness.rank_roles(levels, profiles, method="baseline")],
            "gaps": [{"skillId": g["skillId"], "gainToRequired": g["gainToRequired"], "gainNextLevel": g["gainNextLevel"]}
                     for g in readiness.proposed_gaps(levels, by_id[target], skill_ids)],
            "baselineGaps": [g["skillId"] for g in readiness.baseline_gaps(levels, by_id[target], skill_ids)],
            "plan": {k: plan[k] for k in ("readiness", "projectedReadiness", "totalEffortHours", "unplannedGaps")}
                    | {"steps": [{k: st[k] for k in ("actionId", "kind", "skillId", "fromLevel", "toLevel", "gain",
                                                      "effortHours", "isPrerequisite", "prerequisiteFor", "alternatives")}
                                 for st in plan["steps"]]},
        })

    extractor = SkillExtractor(C.load_taxonomy())
    texts = [r["cv_text"] for r in C.read_jsonl(CV_EVAL)[:30]]
    texts += [a["text"] for a in C.read_jsonl(ADS_HANDWRITTEN)]
    texts += [
        "Built apps with React Native, Spring Boot and Kubernets; deployed via CI/CD on AWS.",
        "Contact: kamal.perera+jobs@gmail.com, 077 123 4567, +94 71-234-5678, NIC 199912345678 / 991234567V.",
        "Address: 12 Temple Road, Maharagama\nI live at No. 45/2, Galle Road, Colombo 03\nMobile: Flutter, Kotlin",
        "See https://github.com/someone and www.example.lk for Postgressql and TensorFlow work.",
        "manual testing, javascript developer, testng, node.js, .NET Core, C#, ui/ux, power bi",
        "ප්‍රවීණ Python සහ SQL දැනුම; நல்ல Java அறிவு; Ünïcödé ﬁle Kubernetes",
        "",
    ]
    extraction = [_extraction_record(extractor, t) for t in texts]
    rng2 = np.random.default_rng(C.SEED + 6)
    words = [syn for s in model["taxonomy"]["skills"] for syn in s["synonyms"]]
    fuzz_pairs = []
    for _ in range(60):
        a, b = str(rng2.choice(words)), str(rng2.choice(words))
        if rng2.random() < 0.5:  # near-miss of b
            k = int(rng2.integers(0, len(b)))
            a = b[:k] + b[k + 1:]
        fuzz_pairs.append([a, b, fuzz.ratio(a, b)])
    fixture = {
        "warning": C.SYNTHETIC_WARNING,
        "modelVersion": model["version"],
        "generatedBy": "ml/c3/run_pipeline.py parity",
        "students": out,
        "extraction": extraction,
        "fuzz": fuzz_pairs,
    }
    C.write_json(C.PARITY_OUT, fixture, compact=True)
    print(f"parity fixture: {len(out)} profiles, {len(extraction)} texts, {len(fuzz_pairs)} fuzzy pairs "
          f"-> {C.PARITY_OUT.relative_to(C.ROOT)} ({C.PARITY_OUT.stat().st_size / 1024:.0f} KB)")

    # Demo cohort: synthetic hold-out students for the staff aggregate view in demo mode.
    rng3 = np.random.default_rng(C.SEED + 7)
    cohort = []
    for i in rng3.choice(holdout, size=150, replace=False):
        row = students.iloc[int(i)]
        lv = student_levels(row, skill_ids)
        cohort.append({"yearOfStudy": int(row["year_of_study"]), "targetRoleIds": row["target_roles"].split("|"),
                       "skills": {k: v for k, v in lv.items() if v > 0}})
    demo = {"warning": "SYNTHETIC demo cohort - generated students, not real people. " + C.SYNTHETIC_WARNING,
            "students": cohort}
    out_path = C.MODEL_OUT.parent / "demo-cohort.json"
    C.write_json(out_path, demo, compact=True)
    print(f"demo cohort: {len(cohort)} synthetic students -> {out_path.relative_to(C.ROOT)}")


def stage_evaluate() -> None:
    import evaluate

    res = evaluate.run({
        "ads_clean": ADS_CLEAN, "ads_synthetic": ADS_SYNTHETIC, "ads_handwritten": ADS_HANDWRITTEN,
        "students": STUDENTS_CSV, "gap_labels": GAP_LABELS, "cv_eval": CV_EVAL,
    })
    print("SYNTHETIC DATA - pipeline validation only")
    for key, m in res["holdout"].items():
        b = m["pairedBootstrap"]
        print(f"  {m['metric']:38s} proposed {m['proposed']:.3f}  baseline {m['baseline']:.3f}  "
              f"diff {b['meanDifference']:+.3f} [{b['ci95'][0]:+.3f}, {b['ci95'][1]:+.3f}]  n={m['studentsScored']}")
    for key, m in res["cv"].items():
        print(f"  5-fold {m['metric']:31s} proposed {m['proposed']['mean']:.3f}±{m['proposed']['std']:.3f}  "
              f"baseline {m['baseline']['mean']:.3f}±{m['baseline']['std']:.3f}")
    ex = res["extraction"]
    for name in ("syntheticAdsTestSplit", "syntheticCvs", "handWrittenAds"):
        e = ex[name]
        print(f"  extraction {name:22s} P {e['precision']:.3f} R {e['recall']:.3f} F1 {e['f1']:.3f}")
    print(f"  plans: {res['plans']}")
    print(f"  lambda sensitivity (train): {res['sens']}")
    print(f"evidence written to {C.EVIDENCE_DIR.relative_to(C.ROOT)}")


STAGES = {"data": stage_data, "model": stage_model, "graph": stage_graph, "parity": stage_parity, "evaluate": stage_evaluate}


def main(argv: list[str]) -> None:
    wanted = argv or list(STAGES)
    for name in wanted:
        print(f"== stage: {name}")
        STAGES[name]()


if __name__ == "__main__":
    main(sys.argv[1:])
