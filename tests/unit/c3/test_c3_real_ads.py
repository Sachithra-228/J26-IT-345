"""C3 real job-ads import (manual sheet) and its preliminary evaluation.

All rows below are FICTIONAL; the real sheet export stays in git-ignored folders.
Run: python -m pytest tests/unit/c3 -q
"""
import json
from datetime import date

import pytest

import c3_common as C
from evaluate_real_ads import DEV_LAST_JOB_NUMBER, build_data_status, evaluate, evaluate_with_splits, job_number, split_labels
from import_sheet import COLUMNS, import_sheet, map_skill_terms, read_sheet, report, validate_rows, label_map
from skill_extractor import SkillExtractor

TODAY = date(2026, 10, 14)
TEXT = (
    "We are looking for an intern software engineer to join our product team in Colombo. "
    "You will build REST APIs with Java and Spring Boot, store data in MySQL and use Git every day. "
    "Knowledge of React is an added advantage. Contact Nimal Perera on 0771234567 or nimal.perera@example.com to apply. "
    "Good communication skills and a degree in IT or a related field are expected."
)


def row(job_id="JOB001", **over):
    r = {c: "" for c in COLUMNS}
    r.update({
        "Job_ID": job_id, "Job_Title": "Software Engineer Intern", "Company": "Fictional Labs", "Source": "TopJobs",
        "URL": f"https://www.topjobs.lk/employer/JobAdvertismentServlet?rid={job_id[-3:]}&jc=000{job_id[-3:]}",
        "Date_Posted": "2026-10-01", "Date_Collected": "2026-10-08", "Role_Category": "software_engineer",
        "Seniority": "intern", "Job_Type": "Internship", "Location": "Colombo", "Min_Experience_Years": "0",
        "Education": "Undergraduate", "Required_Skills": "Back-end and REST APIs; Java; Relational databases and SQL; Git",
        "Preferred_Skills": "React", "Full_Ad_Text": f"{TEXT} Reference {job_id}.", "Status": "Active",
    })
    r.update(over)
    return r


@pytest.fixture(scope="module")
def taxonomy():
    return C.load_taxonomy()


@pytest.fixture(scope="module")
def extractor(taxonomy):
    return SkillExtractor(taxonomy)


@pytest.fixture(scope="module")
def roles():
    return C.load_roles()


@pytest.fixture(scope="module")
def role_ids(roles):
    return {r["id"] for r in roles}


def codes(issues):
    return {(i["jobId"], i["code"]) for i in issues}


def test_read_sheet_needs_the_ads_tab_columns(tmp_path):
    good = tmp_path / "ads.csv"
    good.write_text(",".join(COLUMNS) + "\n" + ",".join("JOB001" if c == "Job_ID" else "" for c in COLUMNS) + "\n\n", encoding="utf-8")
    assert [r["Job_ID"] for r in read_sheet(good)] == ["JOB001"]
    bad = tmp_path / "progress.csv"
    bad.write_text("role_id,role,count\nsoftware_engineer,Software Engineer,3\n", encoding="utf-8")
    with pytest.raises(ValueError, match="missing columns"):
        read_sheet(bad)


def test_skill_labels_map_by_taxonomy_label_or_synonym(taxonomy, extractor):
    ids, unmapped = map_skill_terms("Cloud platforms; Java; - ; Go; Claude Code", label_map(taxonomy), extractor)
    assert ids == ["prog_oop", "cloud"]
    assert unmapped == ["Go", "Claude Code"]


def test_duplicates_are_found_by_url_title_or_text_but_not_by_topjobs_query(role_ids):
    rows = [
        row("JOB001"),
        row("JOB002", URL="https://www.topjobs.lk/employer/JobAdvertismentServlet?rid=999&jc=0009", Job_Title="QA Intern",
            Role_Category="qa_engineer", Full_Ad_Text=TEXT + " Different ad."),
        row("JOB003", URL="https://www.linkedin.com/jobs/view/4463115290/?trackingId=abc", Job_Title="Data Intern",
            Company="Other Co", Role_Category="data_analyst", Full_Ad_Text=TEXT + " Third ad."),
        row("JOB004", URL="https://www.linkedin.com/jobs/view/4463115290/", Job_Title="Another title",
            Company="Another Co", Full_Ad_Text=TEXT + " Fourth ad."),
        row("JOB005", URL="https://example.com/x", Full_Ad_Text=TEXT + " Fifth ad."),  # same title + company as JOB001
        row("JOB006", URL="https://example.com/y", Job_Title="New title", Company="New Co",
            Full_Ad_Text=f"{TEXT} Reference JOB001."),  # same text as JOB001
    ]
    keep, issues = validate_rows(rows, role_ids, TODAY)
    assert [r["Job_ID"] for r in keep] == ["JOB001", "JOB002", "JOB003"]
    assert {("JOB004", "duplicate_ad"), ("JOB005", "duplicate_ad"), ("JOB006", "duplicate_ad")} <= codes(issues)


def test_validation_flags_bad_cells_and_skips_unusable_rows(role_ids):
    rows = [
        row("JOB99", URL="https://www.linkedin.com/jobs/view/...", Education="Higher Diploma or Degree",
            Date_Collected="2027-01-01", Min_Experience_Years="two"),
        row("JOB002", Role_Category="game_designer", Full_Ad_Text=TEXT + " b"),
        row("JOB003", Required_Skills="", Full_Ad_Text=TEXT + " c"),
        row("JOB99", Job_Title="Repeat id", Full_Ad_Text=TEXT + " d", URL="https://example.com/d"),
        row("JOB005", URL="https://a.lk/1https://a.lk/2", Full_Ad_Text="Too short to be a real advertisement.", Job_Title="Short"),
    ]
    keep, issues = validate_rows(rows, role_ids, TODAY)
    assert [r["Job_ID"] for r in keep] == ["JOB99", "JOB005"]
    found = codes(issues)
    for expected in [("JOB99", "bad_id"), ("JOB99", "bad_url"), ("JOB99", "bad_value"), ("JOB99", "bad_date"),
                     ("JOB99", "bad_number"), ("JOB002", "bad_role"), ("JOB003", "missing_cell"), ("JOB99", "duplicate_id"),
                     ("JOB005", "bad_url"), ("JOB005", "short_text")]:
        assert expected in found


def test_itpro_is_an_accepted_source(role_ids):
    keep, issues = validate_rows([row("JOB001", Source="ITPro.lk")], role_ids, TODAY)
    assert [r["Job_ID"] for r in keep] == ["JOB001"]
    assert ("JOB001", "bad_value") not in codes(issues)


def test_import_applies_manual_labels_strips_pii_and_reports_only_counts(extractor, taxonomy, roles):
    rows = [
        row("JOB001", Job_Title="Graduate Programme 2026", Seniority="associate"),  # title alone gives no role
        row("JOB002", Role_Category="other", Job_Title="Business Development Intern", Full_Ad_Text=TEXT + " Sales.",
            URL="https://example.com/2", Company="Fictional Sales", Preferred_Skills="-", Required_Skills="Go; Communication"),
    ]
    result = import_sheet(rows, extractor, taxonomy, roles, TODAY)
    ads = {a.ad_id: a for a in result["ads"]}
    labels = {lab["ad_id"]: lab for lab in result["labels"]}
    assert ads["JOB001"].role_id == "software_engineer" and labels["JOB001"]["parsed_role_id"] is None
    assert ads["JOB001"].seniority == "associate"
    assert ads["JOB002"].role_id is None and labels["JOB002"]["role_id"] is None
    assert labels["JOB001"]["required"] == ["prog_oop", "version_control", "backend_api", "databases_sql"]
    assert labels["JOB001"]["preferred"] == ["frontend"]
    assert labels["JOB002"]["unmapped"] == ["Go"]
    assert "0771234567" not in ads["JOB001"].text_redacted and "nimal.perera@example.com" not in ads["JOB001"].text_redacted

    summary = report(result, roles)
    text = json.dumps(summary)
    for secret in ("Fictional Labs", "Fictional Sales", "topjobs", "example.com", "Nimal", "REST APIs with Java"):
        assert secret not in text
    cov = {e["roleId"]: e for e in summary["coverage"]["perRole"]}
    assert cov["software_engineer"]["ads"] == 1 and cov["software_engineer"]["stillNeeded"] == 24
    assert cov["other"]["ads"] == 1
    assert summary["unmappedSkillTerms"] == {"Go": 1}


def test_real_ads_evaluation_compares_extraction_with_labels():
    ads = [
        {"ad_id": "A", "skills": [{"skill_id": "python", "preferred": False}, {"skill_id": "cloud", "preferred": True}]},
        {"ad_id": "B", "skills": [{"skill_id": "databases_sql", "preferred": False}]},
    ]
    labels = [
        {"ad_id": "A", "role_id": "data_scientist", "seniority": "intern", "required": ["python", "statistics"],
         "preferred": ["cloud"], "parsed_role_id": "data_scientist", "parsed_seniority": "intern"},
        {"ad_id": "B", "role_id": "data_analyst", "seniority": "associate", "required": ["databases_sql"],
         "preferred": [], "parsed_role_id": None, "parsed_seniority": "intern"},
    ]
    res = evaluate(ads, labels, C.skill_ids())
    m = res["skillExtraction"]["micro"]
    assert (m["tp"], m["fp"], m["fn"]) == (3, 0, 1)
    assert m["precision"] == 1.0 and m["recall"] == 0.75
    assert res["skillExtraction"]["recallRequired"] == round(2 / 3, 3)
    assert res["skillExtraction"]["recallPreferred"] == 1.0
    assert res["preferredFlagAgreement"] == 1.0
    assert res["roleFromTitle"] == {"accuracy": 0.5, "unclassified": 1, "adsWithCatalogueRole": 2,
                                    "topConfusions": {"data_analyst <- unclassified": 1}}
    assert res["seniority"]["accuracy"] == 0.5
    lo, hi = res["skillExtraction"]["microF1ci95"]
    assert 0 <= lo <= hi <= 1
    assert "ONE annotator" in res["warning"]


def test_admin_data_status_holds_only_aggregates(extractor, taxonomy, roles):
    rows = [row("JOB001"), row("JOB002", Role_Category="qa_engineer", Job_Title="QA Intern", URL="https://example.com/2",
                                 Full_Ad_Text=TEXT + " Testing role.", Company="Fictional QA")]
    result = import_sheet(rows, extractor, taxonomy, roles, TODAY)
    summary = report(result, roles)
    ads = [a.to_dict() for a in result["ads"]]
    status = build_data_status(summary, evaluate(ads, result["labels"], C.skill_ids()), "1.1.0", "2026-10-14")
    assert status["realAds"]["adsUsed"] == 2
    per = {r["roleId"]: r for r in status["realAds"]["perRole"]}
    assert per["software_engineer"]["ads"] == 1 and per["qa_engineer"]["target"] == 25
    assert len(per) == len(roles)
    assert 0 <= status["realEvaluation"]["f1"] <= 1 and status["realEvaluation"]["developmentSet"] is True
    text = json.dumps(status)
    for secret in ("Fictional", "topjobs", "example.com", "Nimal", "JOB001"):
        assert secret not in text


def _ad(ad_id, found):
    return {"ad_id": ad_id, "skills": [{"skill_id": s, "preferred": False} for s in found]}


def _label(ad_id, required):
    return {"ad_id": ad_id, "role_id": "software_engineer", "seniority": "intern", "required": required,
            "preferred": [], "parsed_role_id": "software_engineer", "parsed_seniority": "intern"}


def test_job_numbers_and_the_development_held_out_rule():
    assert DEV_LAST_JOB_NUMBER == 98
    assert [job_number(x) for x in ("JOB001", "JOB098", "JOB99", "job150", " JOB100 ", "JOBX", "")] == [1, 98, 99, 150, 100, None, None]
    parts = split_labels([_label(i, []) for i in ("JOB001", "JOB098", "JOB099", "JOB150", "JOBX")])
    assert [x["ad_id"] for x in parts["development"]] == ["JOB001", "JOB098"]
    assert [x["ad_id"] for x in parts["heldOut"]] == ["JOB099", "JOB150"]
    assert [x["ad_id"] for x in parts["unsplit"]] == ["JOBX"]


def test_evaluation_reports_each_split_and_keeps_the_old_fields():
    ads = [_ad("JOB001", ["python"]), _ad("JOB098", ["databases_sql"]), _ad("JOB099", ["cloud"]), _ad("JOB120", []), _ad("JOBX", ["linux"])]
    labels = [_label("JOB001", ["python"]), _label("JOB098", ["databases_sql", "statistics"]), _label("JOB099", ["cloud"]),
              _label("JOB120", ["linux"]), _label("JOBX", ["linux"])]
    res = evaluate_with_splits(ads, labels, C.skill_ids())
    # the top-level result is still the evaluation of every ad
    assert res["ads"] == 5 and res["skillExtraction"]["micro"] == evaluate(ads, labels, C.skill_ids())["skillExtraction"]["micro"]
    sp = res["splits"]
    assert sp["devLastJobNumber"] == 98 and sp["adsWithoutJobNumber"] == 1
    assert sp["all"]["ads"] == 5
    assert sp["development"]["ads"] == 2
    assert sp["development"]["recall"] == 0.667  # 2 of 3 labelled skills found (statistics missed)
    assert sp["development"]["precision"] == 1.0
    assert sp["heldOut"]["ads"] == 2 and sp["heldOut"]["recall"] == 0.5
    assert len(sp["heldOut"]["f1Ci95"]) == 2 and "weakestSkills" in sp["heldOut"]


def test_an_empty_held_out_set_is_null_everywhere(extractor, taxonomy, roles):
    ads = [_ad("JOB001", ["python"])]
    labels = [_label("JOB001", ["python"])]
    res = evaluate_with_splits(ads, labels, C.skill_ids())
    assert res["splits"]["heldOut"] is None
    rows = [row("JOB001")]
    summary = report(import_sheet(rows, extractor, taxonomy, roles, TODAY), roles)
    assert build_data_status(summary, res, "1.1.0", "2026-10-16")["realEvaluation"]["heldOut"] is None
    res2 = evaluate_with_splits(ads + [_ad("JOB120", ["cloud"])], labels + [_label("JOB120", ["cloud"])], C.skill_ids())
    held = build_data_status(summary, res2, "1.1.0", "2026-10-16")["realEvaluation"]["heldOut"]
    assert held == {"ads": 1, "f1": 1.0, "f1Ci95": held["f1Ci95"], "devLastJobNumber": 98}
