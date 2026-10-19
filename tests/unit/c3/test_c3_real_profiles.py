"""C3 role profiles v2 from real ads (preliminary). All ads here are FICTIONAL.

Run: py -3.13 -m pytest tests/unit/c3 -q
"""
import csv
import hashlib
import json

import c3_common as C
from real_profiles import CSV_COLUMNS, DEFAULT_LEVEL, LABEL, V2_VERSION, ads_for_profiles, run, spearman


def clean_ad(ad_id, skills):
    return {"ad_id": ad_id, "collected_at": "2026-10-10", "skills": skills}


def label(ad_id, role, seniority, required, preferred=()):
    return {"ad_id": ad_id, "role_id": role, "seniority": seniority, "required": list(required), "preferred": list(preferred)}


CLEAN = [
    clean_ad("JOB001", [{"skill_id": "testing_manual", "required_level": 3, "preferred": False, "level_source": "cue"},
                        {"skill_id": "databases_sql", "required_level": 1, "preferred": False, "level_source": "seniority"}]),
    clean_ad("JOB002", []),
    clean_ad("JOB003", [{"skill_id": "testing_manual", "required_level": 3, "preferred": False, "level_source": "cue"}]),
    clean_ad("JOB004", []),
]
LABELS = [
    label("JOB001", "qa_engineer", "intern", ["testing_manual", "databases_sql"], ["agile"]),
    label("JOB002", "qa_engineer", "associate", ["testing_manual", "test_automation"]),
    label("JOB003", "qa_engineer", "senior", ["testing_manual"]),  # seniors are left out
    label("JOB004", None, "intern", ["communication"]),  # no catalogue role
]


def test_level_rule_and_seniority_filter():
    ads, stats = ads_for_profiles(CLEAN, LABELS)
    assert [a["ad_id"] for a in ads] == ["JOB001", "JOB002"]
    assert stats["skipped"] == {"seniority_senior": 1, "no_role": 1}
    lv = {(a["ad_id"], s["skill_id"]): (s["required_level"], s["preferred"]) for a in ads for s in a["skills"]}
    assert lv[("JOB001", "testing_manual")] == (3, False)  # from a level cue
    assert lv[("JOB001", "databases_sql")] == (DEFAULT_LEVEL["intern"], False)  # parser default ignored, manual seniority used
    assert lv[("JOB001", "agile")] == (1, True)  # labelled but not found by the parser
    assert lv[("JOB002", "test_automation")] == (DEFAULT_LEVEL["associate"], False)
    assert stats["levelSources"] == {"cue": 1, "seniorityDefault": 4}


def test_spearman():
    assert spearman({"a": 3, "b": 2, "c": 1}, {"a": 3, "b": 2, "c": 1}) == 1.0
    assert spearman({"a": 3, "b": 2, "c": 1}, {"a": 1, "b": 2, "c": 3}) == -1.0
    assert spearman({"a": 1}, {"a": 1}) is None


def test_run_writes_v2_files_and_leaves_v1_unchanged(tmp_path):
    clean, labels = tmp_path / "clean.jsonl", tmp_path / "labels.jsonl"
    C.write_jsonl(clean, CLEAN)
    C.write_jsonl(labels, LABELS)
    before = hashlib.sha256(C.MODEL_OUT.read_bytes()).hexdigest()
    out = tmp_path / "out"
    res = run(clean, labels, out)
    assert hashlib.sha256(C.MODEL_OUT.read_bytes()).hexdigest() == before

    model = json.loads((out / "career-model-v2-real-preliminary.json").read_text(encoding="utf-8"))
    assert model["version"] == V2_VERSION and model["warning"] == LABEL
    assert model["adCorpus"]["usedForProfiles"] == 2 and model["adCorpus"]["seniority"] == ["intern", "associate"]
    qa = next(r for r in model["roles"] if r["id"] == "qa_engineer")
    assert qa["adCount"] == 2 and abs(sum(s["weight"] for s in qa["skills"]) - 1) < 1e-9

    with (out / "career-requirements-v2.csv").open(encoding="utf-8") as f:
        rows = list(csv.DictReader(f))
    assert list(rows[0].keys()) == CSV_COLUMNS
    assert {r["validation_status"] for r in rows} == {"not yet expert-reviewed"}
    assert all(r["career_id"] == "qa_engineer" for r in rows)

    comparison = json.loads((out / "role-profiles-v1-vs-v2.json").read_text(encoding="utf-8"))
    qa_cmp = next(r for r in comparison["roles"] if r["roleId"] == "qa_engineer")
    assert qa_cmp["lowData"] is True and qa_cmp["adsV2Real"] == 2
    assert res["label"] == LABEL
    assert len(comparison["exampleProfile"]["roles"]) == 12
    assert "JOB0" not in json.dumps(comparison) and "JOB0" not in json.dumps(model)


def test_run_without_imported_ads_does_nothing(tmp_path):
    assert run(tmp_path / "missing.jsonl", tmp_path / "missing2.jsonl", tmp_path / "out") is None
    assert not (tmp_path / "out").exists()
