"""
Role profiles v2 from the real job ads (C3, Objective 2) - PRELIMINARY.

    py -3.13 ml/c3/run_pipeline.py real-profiles

Builds "c3-readiness-v2-real-preliminary" with exactly the v1 method and parameters
(build_role_profiles: preferred mentions count 0.5, idf, MIN_SUPPORT 0.15, normalised
weights, median level) from the manually collected public ads, and compares it with
v1 (synthetic). Nothing is tuned; v1, career-model.json and the app are not changed.

Data rules
- Ads: the cleaned real ads and the researcher's manual labels (git-ignored,
  ml/c3/data/private). All 255 ads may be used: the held-out split tests the skill
  extractor, not the profiles. Only seniority intern and associate (the Year 3/4 target).
- Skills and required / preferred come from the manual labels. The level of a skill is
  the parser's level for that skill in the same ad when it came from a level cue;
  otherwise the default for the ad's (manual) seniority: intern 1, associate 2.
- The platform's job board postings are never used.

Outputs (aggregate numbers only - no ad text, company names, URLs or Job IDs)
- docs/c3/evidence/career-model-v2-real-preliminary.json  (same role / skill format as v1)
- docs/c3/evidence/career-requirements-v2.csv  (proposal Appendix 3 structure, for expert review)
- docs/c3/evidence/role-profiles-v1-vs-v2.json  (per-role comparison and the example profile)

PRELIMINARY: descriptive comparison only, no accuracy claim; one annotator.
"""
from __future__ import annotations

import csv
from collections import Counter
from datetime import datetime, timezone
from pathlib import Path

import c3_common as C
import readiness
from role_profiles import MIN_SUPPORT, PREFERRED_MENTION_WEIGHT, build_role_profiles

V2_VERSION = "c3-readiness-v2-real-preliminary"
SENIORITIES = ("intern", "associate")
DEFAULT_LEVEL = {"intern": 1, "associate": 2}
LOW_DATA_ADS = 15
TOP_N = 8
LABEL = "PRELIMINARY: descriptive comparison only, no accuracy claim; one annotator"
NETWORK_NOTE = (
    "network_engineer includes IT-support ads (IT support / helpdesk titles) labelled as Network Engineer "
    "until IT Support has its own role; this can add support skills to the v2 network profile."
)
CSV_COLUMNS = ["career_id", "career_name", "skill", "required_level", "importance", "evidence_source", "source_date", "validation_status"]

# The "Load an example profile" student from the C3 UI (src/components/c3/career-guidance-tool.tsx).
EXAMPLE_LEVELS = {
    "prog_oop": 2, "databases_sql": 1, "communication": 2, "problem_solving": 1, "version_control": 1, "testing_manual": 2,
    "test_automation": 1, "agile": 1, "business_analysis": 1, "frontend": 1, "javascript_ts": 1,
}

EVIDENCE = C.EVIDENCE_DIR
V2_JSON = EVIDENCE / "career-model-v2-real-preliminary.json"
V2_CSV = EVIDENCE / "career-requirements-v2.csv"
COMPARISON_JSON = EVIDENCE / "role-profiles-v1-vs-v2.json"


def ads_for_profiles(clean_ads: list[dict], labels: list[dict]) -> tuple[list[dict], dict]:
    """Turns labelled real ads into build_role_profiles input. Returns (ads, stats)."""
    by_id = {a["ad_id"]: a for a in clean_ads}
    ads: list[dict] = []
    sources: Counter = Counter()
    skipped: Counter = Counter()
    for lab in labels:
        sen = lab.get("seniority")
        if not lab.get("role_id"):
            skipped["no_role"] += 1
            continue
        if sen not in SENIORITIES:
            skipped[f"seniority_{sen}"] += 1
            continue
        parsed = {s["skill_id"]: s for s in by_id.get(lab["ad_id"], {}).get("skills", [])}
        skills = []
        for skill_id, preferred in [(s, False) for s in lab["required"]] + [(s, True) for s in lab["preferred"]]:
            p = parsed.get(skill_id)
            if p is not None and p.get("level_source") == "cue":
                level, src = int(p["required_level"]), "cue"
            else:
                level, src = DEFAULT_LEVEL[sen], "seniorityDefault"
            sources[src] += 1
            skills.append({"skill_id": skill_id, "required_level": level, "preferred": preferred})
        ads.append({"ad_id": lab["ad_id"], "role_id": lab["role_id"], "seniority": sen, "skills": skills})
    return ads, {"adsUsed": len(ads), "skipped": dict(skipped), "levelSources": dict(sources)}


def _ranks(values: list[float]) -> list[float]:
    order = sorted(range(len(values)), key=lambda i: values[i])
    ranks = [0.0] * len(values)
    i = 0
    while i < len(order):
        j = i
        while j + 1 < len(order) and values[order[j + 1]] == values[order[i]]:
            j += 1
        for k in range(i, j + 1):
            ranks[order[k]] = (i + j) / 2 + 1
        i = j + 1
    return ranks


def spearman(a: dict[str, float], b: dict[str, float]) -> float | None:
    """Spearman rank correlation over the union of skills (0 when a skill is missing); None if undefined."""
    keys = sorted(set(a) | set(b))
    if len(keys) < 2:
        return None
    ra, rb = _ranks([a.get(k, 0.0) for k in keys]), _ranks([b.get(k, 0.0) for k in keys])
    ma, mb = sum(ra) / len(ra), sum(rb) / len(rb)
    cov = sum((x - ma) * (y - mb) for x, y in zip(ra, rb))
    va, vb = sum((x - ma) ** 2 for x in ra), sum((y - mb) ** 2 for y in rb)
    return None if va == 0 or vb == 0 else round(cov / (va * vb) ** 0.5, 3)


def _weights(profile: dict) -> dict[str, float]:
    return {s["skillId"]: s["weight"] for s in profile["skills"]}


def compare(v1: list[dict], v2: list[dict]) -> list[dict]:
    v2_by = {p["id"]: p for p in v2}
    out = []
    for p1 in v1:
        p2 = v2_by[p1["id"]]
        w1, w2 = _weights(p1), _weights(p2)
        out.append({
            "roleId": p1["id"],
            "adsV1Synthetic": p1["adCount"],
            "adsV2Real": p2["adCount"],
            "lowData": p2["adCount"] < LOW_DATA_ADS,
            "topV1": [{"skillId": s["skillId"], "weight": round(s["weight"], 3)} for s in p1["skills"][:TOP_N]],
            "topV2": [{"skillId": s["skillId"], "weight": round(s["weight"], 3)} for s in p2["skills"][:TOP_N]],
            "spearman": spearman(w1, w2),
            "added": sorted(set(w2) - set(w1)),
            "dropped": sorted(set(w1) - set(w2)),
        })
    return out


def example_profile(v1: list[dict], v2: list[dict], skill_order: list[str], levels: dict[str, int] = EXAMPLE_LEVELS) -> list[dict]:
    v2_by = {p["id"]: p for p in v2}
    rows = []
    for p1 in v1:
        p2 = v2_by[p1["id"]]
        row = {"roleId": p1["id"]}
        for tag, p in (("v1", p1), ("v2", p2)):
            row[tag] = {
                "readiness": round(readiness.proposed_readiness(levels, p)["score"], 1),
                "topGaps": [g["skillId"] for g in readiness.proposed_gaps(levels, p, skill_order)[:3]],
            }
        rows.append(row)
    return rows


def requirements_rows(v2: list[dict], roles: dict, skills: dict, date_range: str) -> list[dict]:
    """Proposal Appendix 3: one row per role and skill, for the expert review."""
    rows = []
    for p in v2:
        for s in p["skills"]:
            rows.append({
                "career_id": p["id"],
                "career_name": roles[p["id"]]["label"]["en"],
                "skill": skills[s["skillId"]]["label"]["en"],
                "required_level": s["requiredLevel"],
                "importance": round(s["weight"], 4),
                "evidence_source": f"{p['adCount']} public Sri Lankan IT job ads (intern/associate), manual labels; in {round(100 * s['tf'])}% of them",
                "source_date": date_range,
                "validation_status": "not yet expert-reviewed",
            })
    return rows


def export_v2(profiles: list[dict], stats: dict, total_ads: int, date_range: str, taxonomy: dict, roles: dict) -> dict:
    return {
        "schemaVersion": "1.0.0",
        "version": V2_VERSION,
        "trainedOn": "Public Sri Lankan IT job advertisements collected manually (intern and associate ads), researcher's labels",
        "warning": LABEL,
        "generatedAt": datetime.now(timezone.utc).date().isoformat(),
        "params": {
            "lambdaGapPenalty": readiness.LAMBDA,
            "minSupport": MIN_SUPPORT,
            "preferredMentionWeight": PREFERRED_MENTION_WEIGHT,
            "levelRule": "parser level when it came from a cue, else seniority default (intern 1, associate 2)",
        },
        "adCorpus": {
            "total": total_ads,
            "usedForProfiles": stats["adsUsed"],
            "sourceType": "public_web (manual sheet)",
            "seniority": list(SENIORITIES),
            "collected": date_range,
            "skipped": stats["skipped"],
            "levelSources": stats["levelSources"],
        },
        "taxonomy": {"version": taxonomy["taxonomyVersion"]},
        "roles": [{"id": p["id"], "label": roles[p["id"]]["label"], "adCount": p["adCount"], "skills": p["skills"]} for p in profiles],
        "notes": [NETWORK_NOTE],
    }


def run(clean_path: Path | None = None, labels_path: Path | None = None, out_dir: Path = EVIDENCE, v1_model: dict | None = None) -> dict | None:
    import import_sheet

    clean_path = clean_path or import_sheet.CLEAN_OUT
    labels_path = labels_path or import_sheet.LABELS_OUT
    if not clean_path.exists() or not labels_path.exists():
        print("no imported real ads - run `python ml/c3/run_pipeline.py real` first")
        return None
    clean, labels = C.read_jsonl(clean_path), C.read_jsonl(labels_path)
    taxonomy = C.load_taxonomy()
    roles = {r["id"]: r for r in C.load_roles()}
    skills = {s["id"]: s for s in taxonomy["skills"]}
    skill_order = [s["id"] for s in taxonomy["skills"]]
    v1_model = v1_model or C.load_json(C.MODEL_OUT)
    v1 = v1_model["roles"]

    ads, stats = ads_for_profiles(clean, labels)
    v2 = build_role_profiles(ads, C.role_ids(), skill_order)
    dates = sorted(a["collected_at"] for a in clean if a.get("collected_at"))
    date_range = f"{dates[0]} to {dates[-1]}" if dates else "not stated"

    model = export_v2(v2, stats, len(clean), date_range, taxonomy, roles)
    comparison = {
        "label": LABEL,
        "v1": v1_model["version"],
        "v2": V2_VERSION,
        "lowDataThreshold": LOW_DATA_ADS,
        "levelSources": stats["levelSources"],
        "notes": [NETWORK_NOTE],
        "roles": compare(v1, v2),
        "exampleProfile": {"levels": EXAMPLE_LEVELS, "roles": example_profile(v1, v2, skill_order)},
    }
    out_dir.mkdir(parents=True, exist_ok=True)
    C.write_json(out_dir / V2_JSON.name, model)
    C.write_json(out_dir / COMPARISON_JSON.name, comparison)
    with (out_dir / V2_CSV.name).open("w", encoding="utf-8", newline="") as f:
        w = csv.DictWriter(f, fieldnames=CSV_COLUMNS)
        w.writeheader()
        w.writerows(requirements_rows(v2, roles, skills, date_range))

    print(LABEL)
    print(f"ads used {stats['adsUsed']} of {len(clean)} (skipped {stats['skipped']}); levels {stats['levelSources']}")
    for r in comparison["roles"]:
        flag = "  LOW DATA" if r["lowData"] else ""
        print(f"  {r['roleId']:22s} ads v2={r['adsV2Real']:3d}  spearman={r['spearman']}  +{len(r['added'])} -{len(r['dropped'])}{flag}")
    print(f"-> {out_dir / V2_JSON.name}\n-> {out_dir / V2_CSV.name}\n-> {out_dir / COMPARISON_JSON.name}")
    return comparison
