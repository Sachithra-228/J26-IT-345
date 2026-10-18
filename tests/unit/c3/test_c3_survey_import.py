"""C3 survey importer. Every row is FICTIONAL: the fixture starts from the header and first row of the
synthetic test export and changes single answers.

Run: py -3.13 -m pytest tests/unit/c3 -q
"""
import csv
import json
import sys
from pathlib import Path

import pandas as pd
import pytest

import c3_common as C

sys.path.insert(0, str(C.C3_DIR / "src" / "survey"))
from import_survey import CONSENT_YES, classify_columns, row_date, run, split_multi, straight_line  # noqa: E402

SYNTHETIC_CSV = C.SYNTHETIC_DIR / "SLIIT_IT_Career_Readiness_Survey_SYNTHETIC_TEST_100.csv"


def base_row() -> tuple[list[str], dict]:
    with SYNTHETIC_CSV.open(encoding="utf-8") as f:
        reader = csv.reader(f)
        headers = next(reader)
        first = next(reader)
    return headers, dict(zip(headers, first))


def col(headers: list[str], prefix: str) -> str:
    return next(h for h in headers if h.startswith(prefix))


def write_fixture(path: Path) -> Path:
    """Six fictional rows, plus two empty headers like the real export."""
    headers, base = base_row()
    h = lambda p: col(headers, p)  # noqa: E731
    rows = []

    r1 = dict(base)  # ";" separators with a trailing ";"
    r1[h("B1.")] = "QA Engineer;Business Analyst;"
    r1[h("B2.")] = "QA Engineer"
    r1[h("E1.")] = "Problem solving, data structures and algorithms;Software testing and QA;"
    r1[h("E2.")] = "Test automation;Software testing and QA"
    r1[h("E3.")] = "Test automation"
    r1[h("D3.")] = ""
    r1[h("Timestamp")] = "2026/10/17 8:13:00 PM GMT+5:30"
    rows.append(r1)

    r2 = dict(base)  # ", " separators (Sheets export), an "Other" free-text answer and a G2 email
    r2[h("B1.")] = "Data Analyst, Software Engineer"
    r2[h("B2.")] = "Data Analyst"
    r2[h("B5.")] = "Lecturers, Robotics club seniors, LinkedIn"
    r2[h("E1.")] = "Problem solving, data structures and algorithms, Statistics"
    r2[h("E2.")] = "Statistics, Python programming"
    r2[h("E3.")] = "Statistics"
    r2[h("D3.")] = "None"
    r2[h("G2.")] = "Please email me at fictional.student@example.com about the results"
    r2[h("Timestamp")] = "10/17/2026 20:13:00"
    rows.append(r2)

    r3 = dict(base)  # every quality flag
    for k in headers:
        if k.startswith("C") and "[" in k:
            r3[k] = "2 - Intermediate"
        if k.startswith("G1"):
            r3[k] = "Strongly agree"
        if k.startswith("F4"):
            r3[k] = "Very useful"
    r3[h("B1.")] = "QA Engineer"
    r3[h("B2.")] = "Network Engineer"
    r3[h("D3.")] = "None;Cisco CCNA"
    r3[h("B5.")] = "I do not get any guidance;Friends"
    r3[h("B6.")] = "Not sure yet;Healthcare"
    r3[h("E2.")] = "Statistics;Cloud platforms;Linux and shell scripting"
    r3[h("E3.")] = "Machine learning"
    rows.append(r3)

    r4 = dict(base)  # no consent -> dropped
    r4[h("Consent")] = ""
    rows.append(r4)
    r5 = dict(base)  # Year 2 -> dropped
    r5[h("A1.")] = "Year 2"
    rows.append(r5)
    r6 = dict(base)  # unknown single-choice and scale values
    r6[h("A4.")] = "French"
    r6[h("B3.")] = "9"
    rows.append(r6)

    all_headers = headers + ["", ""]
    with path.open("w", encoding="utf-8", newline="") as f:
        w = csv.writer(f)
        w.writerow(all_headers)
        for r in rows:
            w.writerow([r.get(k, "") for k in headers] + ["", ""])
    return path


@pytest.fixture
def imported(tmp_path):
    src = write_fixture(tmp_path / "survey_fixture_SYNTHETIC.csv")
    out = tmp_path / "out"
    summary = run(src, out)
    clean = pd.read_csv(out / "survey_fixture_SYNTHETIC-clean.csv", dtype=str, keep_default_na=False)
    saved = json.loads((out / "survey_fixture_SYNTHETIC-summary.json").read_text(encoding="utf-8"))
    return summary, clean, saved


# ---- helpers ---------------------------------------------------------------------------------
def test_split_multi_handles_both_separators_commas_in_labels_and_leftovers():
    opts = ["Problem solving, data structures and algorithms", "Statistics", "Python programming"]
    assert split_multi("Problem solving, data structures and algorithms;Statistics;", opts) == (
        ["Problem solving, data structures and algorithms", "Statistics"], None)
    assert split_multi("Statistics, Problem solving, data structures and algorithms", opts) == (
        ["Statistics", "Problem solving, data structures and algorithms"], None)
    assert split_multi("Python programming, Robotics, drones", opts) == (["Python programming"], "Robotics, drones")
    assert split_multi("", opts) == ([], None)
    # an option inside free text (not between separators) is not matched
    assert split_multi("I like Statistics a lot", opts) == ([], "I like Statistics a lot")


def test_row_date_and_straight_line():
    assert row_date("2026/10/17 8:13:00 PM GMT+5:30") == "2026-10-17"
    assert row_date("10/17/2026 20:13:00") == "2026-10-17"
    assert row_date("17/10/2026 20:13") == "2026-10-17"
    assert row_date("SYNTHETIC-TEST-001") is None
    assert straight_line([2, 2, 2]) and not straight_line([2, 2, 3])
    assert not straight_line([2, 2]) and not straight_line([2, None, 2, 2])


def test_columns_are_mapped_by_prefix_for_the_real_header():
    headers, _ = base_row()
    cols = classify_columns(headers + ["", "Unnamed: 66"])
    assert cols["unrecognised"] == [] and len(cols["empty"]) == 2
    assert cols["timestamp"] and cols["consent"]
    assert len(cols["grids"]["C7"]) == 5 and len(cols["grids"]["F4"]) == 6 and len(cols["grids"]["G1"]) == 6
    # order does not matter: reversed headers map to the same questions
    assert classify_columns(list(reversed(headers)))["simple"] == cols["simple"]


# ---- full import -----------------------------------------------------------------------------
def test_filters_rows_and_reports_why(imported):
    summary, clean, _ = imported
    assert summary["rowsRead"] == 6 and summary["rowsKept"] == 4
    assert summary["droppedReasons"] == {"no_consent": 1, "not_year_3_or_4": 1}
    assert summary["droppedYearValues"] == {"Year 2": 1}
    assert summary["columns"]["emptyHeadersIgnored"] == 2 and summary["columns"]["missingQuestions"] == []
    assert list(clean["row_id"]) == ["R001", "R002", "R003", "R004"]


def test_values_are_cleaned(imported):
    _, clean, _ = imported
    r1, r2 = clean.iloc[0], clean.iloc[1]
    assert r1["target_roles"] == "QA Engineer;Business Analyst"
    assert r1["employer_values"] == "problem_solving;testing_manual"
    assert r2["target_roles"] == "Data Analyst;Software Engineer"
    assert r2["employer_values"] == "problem_solving;statistics"
    assert r2["certifications"] == "" and r1["certifications"] == ""
    assert r1["improve_first"] == "test_automation"
    assert r1["skill_prog_oop"] in {"0", "1", "2", "3"} and "soft_leadership" in clean.columns
    assert r1["useful_skill_gap"] in {"1", "2", "3", "4", "5"} and "agree_would_use" in clean.columns
    assert (clean["is_synthetic"] == "True").all()


def test_privacy(imported):
    summary, clean, saved = imported
    assert "Timestamp" not in clean.columns
    assert list(clean["date"])[:2] == ["2026-10-17", "2026-10-17"]
    assert summary["datesMissing"] == 2  # rows copied from the synthetic file have no date
    assert "@" not in clean.iloc[1]["comment"] and "[EMAIL]" in clean.iloc[1]["comment"]
    assert summary["piiRedactions"]["G2"] == 1
    assert "example.com" not in json.dumps(saved)


def test_quality_flags_never_drop_rows(imported):
    summary, clean, _ = imported
    r3 = clean.iloc[2]
    assert int(r3["flag_count"]) == 8
    assert set(r3["flags"].split(";")) == {
        "straight_line_c", "straight_line_g1", "straight_line_f4", "b2_not_in_b1", "d3_none_with_certificate",
        "b5_no_guidance_with_sources", "b6_not_sure_with_industries", "e3_not_in_e2"}
    assert r3["certifications"] == "Cisco CCNA"
    assert int(clean.iloc[0]["flag_count"]) == 0
    assert all(v >= 1 for v in summary["flags"].values())


def test_unknown_values_are_reported(imported):
    summary, _, _ = imported
    unknown = summary["unknownValues"]
    assert unknown["B5"] == [{"value": "Robotics club seniors", "count": 1}]
    assert unknown["A4"] == [{"value": "French", "count": 1}]
    assert unknown["B3"] == [{"value": "9", "count": 1}]


def test_synthetic_label_and_output_folders(tmp_path, imported):
    summary, _, saved = imported
    assert saved["isSynthetic"] is True and saved["warning"] == C.SYNTHETIC_WARNING
    src = write_fixture(tmp_path / "x_SYNTHETIC.csv")
    with pytest.raises(ValueError):
        run(src, C.PRIVATE_DIR / "processed")
    real = write_fixture(tmp_path / "export.csv")
    s = run(real, tmp_path / "real-out")
    assert s["isSynthetic"] is False and "warning" not in s
    assert CONSENT_YES in s["optionLists"]["consent"]


def test_form_options_b4_zero_no_consent_and_year_1_2(tmp_path):
    """Answers that exist on the real Google Form (checked 18 Oct 2026)."""
    src = write_fixture(tmp_path / "form_SYNTHETIC.csv")
    df = pd.read_csv(src, dtype=str, keep_default_na=False)
    b4, a1, consent = (col(list(df.columns), p) for p in ("B4.", "A1.", "Consent"))
    df.loc[0, b4] = "0"
    df.loc[1, consent] = "I do not agree to take part."
    df.loc[2, a1] = "Year 1 or Year 2 (this survey is not for you - thank you!)"
    df.to_csv(src, index=False)
    s = run(src, tmp_path / "out")
    clean = pd.read_csv(tmp_path / "out" / "form_SYNTHETIC-clean.csv", dtype=str, keep_default_na=False)
    assert clean.iloc[0]["self_readiness"] == "0"
    assert "B4" not in s["unknownValues"]
    assert s["droppedReasons"] == {"no_consent": 2, "not_year_3_or_4": 2}
    assert "Year 1 or Year 2 (this survey is not for you - thank you!)" in s["droppedYearValues"]


def test_excluded_specialisation_is_dropped_and_reported(tmp_path):
    """A non-IT degree typed into A2 "Other" (fictional) can be excluded by name, case-insensitively."""
    src = write_fixture(tmp_path / "spec_SYNTHETIC.csv")
    df = pd.read_csv(src, dtype=str, keep_default_na=False)
    df.loc[0, col(list(df.columns), "A2.")] = "Chemistry"
    df.to_csv(src, index=False)
    kept_all = run(src, tmp_path / "a")
    assert kept_all["rowsKept"] == 4 and kept_all["unknownValues"]["A2"] == [{"value": "Chemistry", "count": 1}]
    s = run(src, tmp_path / "b", ("chemistry",))
    assert s["rowsKept"] == 3
    assert s["droppedReasons"]["excluded_specialisation"] == 1
    assert s["excludedSpecialisations"] == ["chemistry"]
    assert "A2" not in s["unknownValues"]
