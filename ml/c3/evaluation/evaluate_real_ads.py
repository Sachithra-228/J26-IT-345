"""
Preliminary evaluation of C3 on REAL public job advertisements (the manual sheet).

Compares what the pipeline reads from each ad's text with the researcher's manual
labels (import_sheet.py):
  * skill extraction - extractor skills vs labelled Required + Preferred skills
    (micro and macro precision / recall / F1, per skill, per role; 95% bootstrap CI
    over ads for micro F1; recall of required vs preferred skills separately)
  * "nice to have" detection - for skills both found and labelled, does the parser's
    preferred flag agree with the label?
  * role from title - the parser's title-based role vs the manual Role_Category
  * seniority from title / experience - parser vs manual Seniority

Development / held-out split: the taxonomy v1.1.0 synonyms were chosen by looking at
the first 98 ads (JOB001-JOB098, the development set). Every later ad (JOB099 onward)
is the held-out test set; its numbers are the honest estimate. See DEV_LAST_JOB_NUMBER.

IMPORTANT: one annotator (the researcher, who knows the taxonomy) labelled the ads,
so agreement is optimistic; a second, independent annotator is needed for a final
result. Outputs (aggregate numbers only): docs/c3/evidence/extraction-eval-real.json and
src/lib/c3/model/data-status.json (the snapshot shown on the admin insights page).
"""
from __future__ import annotations

import re
from collections import Counter, defaultdict

import numpy as np

import c3_common as C
from metrics import prf

OUT = C.EVIDENCE_DIR / "extraction-eval-real.json"
# Small aggregate snapshot read by the admin "Career Readiness Insights" page.
STATUS_OUT = C.MODEL_OUT.parent / "data-status.json"
WARNING = ("PRELIMINARY - real public job ads, but ONE annotator (the researcher) who knows the taxonomy "
           "labelled them; agreement is optimistic until an independent second annotator is added.")
MIN_SUPPORT_PER_SKILL = 3

# The synonyms of taxonomy v1.1.0 were tuned on ads JOB001-JOB098 (the development set).
# Ads with a higher number are the HELD-OUT test set: never look at them to change
# synonyms, parser rules or labels, or their numbers stop being an honest test.
DEV_LAST_JOB_NUMBER = 98


def _micro(pairs: list[tuple[set, set]]) -> dict:
    tp = sum(len(g & p) for g, p in pairs)
    fp = sum(len(p - g) for g, p in pairs)
    fn = sum(len(g - p) for g, p in pairs)
    return prf(tp, fp, fn)


def bootstrap_f1(pairs: list[tuple[set, set]], seed: int = C.SEED, n_boot: int = 2000) -> list[float]:
    counts = np.array([(len(g & p), len(p - g), len(g - p)) for g, p in pairs], dtype=float)
    rng = np.random.default_rng(seed)
    idx = rng.integers(0, len(counts), size=(n_boot, len(counts)))
    tp, fp, fn = (counts[idx][:, :, k].sum(axis=1) for k in range(3))
    f1 = np.where(2 * tp + fp + fn > 0, 2 * tp / np.maximum(2 * tp + fp + fn, 1), 0.0)
    return [float(np.percentile(f1, 2.5)), float(np.percentile(f1, 97.5))]


def evaluate(ads: list[dict], labels: list[dict], skill_order: list[str]) -> dict:
    by_id = {a["ad_id"]: a for a in ads}
    pairs: list[tuple[set, set]] = []
    per_skill: dict[str, Counter] = defaultdict(Counter)
    per_role: dict[str, list] = defaultdict(list)
    req_hit = req_all = pref_hit = pref_all = 0
    flag_agree = flag_total = 0
    macro = []
    for lab in labels:
        ad = by_id[lab["ad_id"]]
        gold = set(lab["required"]) | set(lab["preferred"])
        found = {s["skill_id"]: s for s in ad["skills"]}
        pred = set(found)
        pairs.append((gold, pred))
        per_role[lab["role_id"] or "other"].append((gold, pred))
        macro.append(_micro([(gold, pred)])["f1"])
        for s in gold | pred:
            per_skill[s]["tp" if s in gold and s in pred else "fn" if s in gold else "fp"] += 1
        req_all += len(lab["required"])
        req_hit += len(set(lab["required"]) & pred)
        pref_all += len(lab["preferred"])
        pref_hit += len(set(lab["preferred"]) & pred)
        for s in gold & pred:
            flag_total += 1
            flag_agree += int(found[s]["preferred"] == (s in lab["preferred"]))

    micro = _micro(pairs)
    skills = []
    for sid in skill_order:
        c = per_skill.get(sid)
        if not c or c["tp"] + c["fn"] < MIN_SUPPORT_PER_SKILL and c["tp"] + c["fp"] < MIN_SUPPORT_PER_SKILL:
            continue
        m = prf(c["tp"], c["fp"], c["fn"])
        skills.append({"skillId": sid, "labelled": c["tp"] + c["fn"], **{k: round(v, 3) if isinstance(v, float) else v for k, v in m.items()}})

    role_pairs = [(lab["role_id"], lab["parsed_role_id"]) for lab in labels]
    role_known = [(m, p) for m, p in role_pairs if m is not None]
    seniority_pairs = [(lab["seniority"], lab["parsed_seniority"]) for lab in labels]
    confusions = Counter(f"{m} <- {p or 'unclassified'}" for m, p in role_known if m != p)

    return {
        "warning": WARNING,
        "ads": len(labels),
        "labelledSkills": sum(len(g) for g, _ in pairs),
        "skillExtraction": {
            "micro": {k: round(v, 3) if isinstance(v, float) else v for k, v in micro.items()},
            "microF1ci95": [round(x, 3) for x in bootstrap_f1(pairs)],
            "macroF1OverAds": round(float(np.mean(macro)), 3),
            "recallRequired": round(req_hit / req_all, 3) if req_all else None,
            "recallPreferred": round(pref_hit / pref_all, 3) if pref_all else None,
            "perSkill": sorted(skills, key=lambda s: s["f1"]),
            "perRoleF1": {r: round(_micro(p)["f1"], 3) for r, p in sorted(per_role.items())},
            "perSkillMinSupport": MIN_SUPPORT_PER_SKILL,
        },
        "preferredFlagAgreement": round(flag_agree / flag_total, 3) if flag_total else None,
        "roleFromTitle": {
            "accuracy": round(sum(m == p for m, p in role_known) / len(role_known), 3) if role_known else None,
            "unclassified": sum(1 for _, p in role_known if p is None),
            "adsWithCatalogueRole": len(role_known),
            "topConfusions": dict(confusions.most_common(8)),
        },
        "seniority": {
            "accuracy": round(sum(m == p for m, p in seniority_pairs) / len(seniority_pairs), 3) if seniority_pairs else None,
            "confusions": dict(Counter(f"{m} <- {p}" for m, p in seniority_pairs if m != p).most_common()),
        },
        "syntheticComparison": "Synthetic-ad extraction F1 is about 0.96 (docs/c3/evidence/extraction-eval.json); "
                               "the gap shows how optimistic synthetic text is.",
    }


def job_number(ad_id: str) -> int | None:
    """JOB001 -> 1, JOB99 -> 99; None when the ID has no number."""
    m = re.fullmatch(r"\s*JOB0*(\d+)\s*", ad_id or "", re.IGNORECASE)
    return int(m.group(1)) if m else None


def split_labels(labels: list[dict], dev_last: int = DEV_LAST_JOB_NUMBER) -> dict:
    """Splits labelled ads into development (number <= dev_last) and held-out (number > dev_last)."""
    out: dict[str, list[dict]] = {"development": [], "heldOut": [], "unsplit": []}
    for lab in labels:
        n = job_number(lab["ad_id"])
        out["unsplit" if n is None else "development" if n <= dev_last else "heldOut"].append(lab)
    return out


def split_summary(ads: list[dict], labels: list[dict], skill_order: list[str]) -> dict | None:
    """The headline numbers for one split; None when it has no ads."""
    if not labels:
        return None
    ids = {lab["ad_id"] for lab in labels}
    res = evaluate([a for a in ads if a["ad_id"] in ids], labels, skill_order)
    e = res["skillExtraction"]
    return {
        "ads": res["ads"],
        "precision": e["micro"]["precision"],
        "recall": e["micro"]["recall"],
        "f1": e["micro"]["f1"],
        "f1Ci95": e["microF1ci95"],
        "macroF1OverAds": e["macroF1OverAds"],
        "recallRequired": e["recallRequired"],
        "recallPreferred": e["recallPreferred"],
        "roleFromTitleAccuracy": res["roleFromTitle"]["accuracy"],
        "seniorityAccuracy": res["seniority"]["accuracy"],
        "weakestSkills": [{"skillId": s["skillId"], "f1": s["f1"]} for s in e["perSkill"][:5]],
    }


def evaluate_with_splits(ads: list[dict], labels: list[dict], skill_order: list[str], dev_last: int = DEV_LAST_JOB_NUMBER) -> dict:
    """evaluate() on all ads (top-level fields unchanged) plus "splits": all / development / heldOut."""
    res = evaluate(ads, labels, skill_order)
    parts = split_labels(labels, dev_last)
    res["splits"] = {
        "devLastJobNumber": dev_last,
        "rule": f"development = JOB001-JOB{dev_last:03d} (used to tune the v1.1.0 synonyms); heldOut = every later ad (never used for tuning)",
        "adsWithoutJobNumber": len(parts["unsplit"]),
        "all": split_summary(ads, labels, skill_order),
        "development": split_summary(ads, parts["development"], skill_order),
        "heldOut": split_summary(ads, parts["heldOut"], skill_order),
    }
    return res


def build_data_status(import_report: dict, eval_res: dict, taxonomy_version: str, generated: str) -> dict:
    """Aggregate numbers only (counts, shares, metrics): no ad text, company names or URLs."""
    cov = import_report["coverage"]
    per_role = [{"roleId": e["roleId"], "ads": e["ads"], "target": e["target"]} for e in cov["perRole"] if "target" in e]
    issues = {k: v["count"] for k, v in import_report["issues"].items() if k != "unmapped_skill"}
    ext = eval_res["skillExtraction"]
    return {
        "generatedAt": generated,
        "taxonomyVersion": taxonomy_version,
        "realAds": {
            "rowsInSheet": import_report["rowsInSheet"],
            "adsUsed": import_report["adsUsed"],
            "rowsSkipped": import_report["rowsSkipped"],
            "issuesToFix": sum(issues.values()),
            "other": next((e["ads"] for e in cov["perRole"] if e["roleId"] == "other"), 0),
            "rolesAtTarget": cov["rolesAtTarget"],
            "perRole": per_role,
            "sources": cov["sources"],
        },
        "realEvaluation": {
            "ads": eval_res["ads"],
            "annotators": 1,
            "developmentSet": True,
            "precision": ext["micro"]["precision"],
            "recall": ext["micro"]["recall"],
            "f1": ext["micro"]["f1"],
            "f1Ci95": ext["microF1ci95"],
            "roleFromTitleAccuracy": eval_res["roleFromTitle"]["accuracy"],
            "seniorityAccuracy": eval_res["seniority"]["accuracy"],
            "heldOut": _held_out_status(eval_res),
        },
    }


def _held_out_status(eval_res: dict) -> dict | None:
    splits = eval_res.get("splits") or {}
    held = splits.get("heldOut")
    if not held:
        return None
    return {"ads": held["ads"], "f1": held["f1"], "f1Ci95": held["f1Ci95"], "devLastJobNumber": splits["devLastJobNumber"]}


def run() -> dict | None:
    from import_sheet import CLEAN_OUT, LABELS_OUT

    if not (CLEAN_OUT.exists() and LABELS_OUT.exists()):
        print("no imported sheet - run import_sheet.py first")
        return None
    from datetime import date

    from import_sheet import REPORT_OUT

    res = evaluate_with_splits(C.read_jsonl(CLEAN_OUT), C.read_jsonl(LABELS_OUT), C.skill_ids())
    C.write_json(OUT, res)
    status = build_data_status(C.load_json(REPORT_OUT), res, C.load_taxonomy()["taxonomyVersion"], date.today().isoformat())
    C.write_json(STATUS_OUT, status)
    e = res["skillExtraction"]
    m = e["micro"]
    print(f"REAL ADS (preliminary, 1 annotator): {res['ads']} ads, {res['labelledSkills']} labelled skills")
    print(f"  extraction micro P {m['precision']:.3f} R {m['recall']:.3f} F1 {m['f1']:.3f} "
          f"[95% CI {e['microF1ci95'][0]:.3f}, {e['microF1ci95'][1]:.3f}]  macro F1 {e['macroF1OverAds']:.3f}")
    print(f"  recall required {e['recallRequired']}  preferred {e['recallPreferred']}  "
          f"preferred-flag agreement {res['preferredFlagAgreement']}")
    worst = [f"{s['skillId']} {s['f1']:.2f}" for s in e["perSkill"][:5]]
    print(f"  weakest skills: {', '.join(worst)}")
    r = res["roleFromTitle"]
    print(f"  role from title: accuracy {r['accuracy']} ({r['unclassified']} unclassified of {r['adsWithCatalogueRole']})")
    print(f"  seniority: accuracy {res['seniority']['accuracy']}")
    sp = res["splits"]
    print(f"  split (dev = JOB001-JOB{sp['devLastJobNumber']:03d}, held-out = later ads):")
    for name in ("all", "development", "heldOut"):
        x = sp[name]
        if x is None:
            print(f"    {name:<12} no ads")
            continue
        print(f"    {name:<12} {x['ads']:>4} ads  P {x['precision']:.3f} R {x['recall']:.3f} F1 {x['f1']:.3f} "
              f"[95% CI {x['f1Ci95'][0]:.3f}, {x['f1Ci95'][1]:.3f}]  role-from-title {x['roleFromTitleAccuracy']}")
    if sp["adsWithoutJobNumber"]:
        print(f"  WARNING: {sp['adsWithoutJobNumber']} ad(s) have a Job_ID without a number and are in neither split")
    print(f"  evidence -> {OUT.relative_to(C.ROOT)}; admin status -> {STATUS_OUT.relative_to(C.ROOT)}")
    return res


if __name__ == "__main__":
    run()
