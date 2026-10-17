"""
Imports the manually collected job-ads sheet (C3) into the pipeline.

    python ml/c3/run_pipeline.py real                          # import + evaluate
    python ml/c3/src/job-ad-nlp/import_sheet.py [path.csv]     # import only

Input: the "Ads" tab of the C3 job-ads Google Sheet, downloaded as CSV to
ml/c3/data/raw/job_ads_sheet.csv (git-ignored). One row per PUBLIC advertisement,
with the researcher's manual labels: Role_Category, Seniority and the skills the ad
asks for (Required_Skills / Preferred_Skills, written as taxonomy labels or
synonyms, separated by ";").

Steps: validate every row (IDs, duplicates, URLs, dropdown values, dates, numbers)
-> drop duplicate advertisements (same URL, same title + company, or same text;
the first row is kept) -> clean with the same PII stripping and parser as every other
ad (clean_records) -> apply the MANUAL role and seniority -> map the labelled skills
to taxonomy ids.

Outputs (git-ignored, because they hold ad text and company names):
    ml/c3/data/raw/sheet-ads.jsonl              raw records (collector format)
    ml/c3/data/private/sheet-ads-clean.jsonl    cleaned JobAd records
    ml/c3/data/private/sheet-ads-labels.jsonl   manual labels per ad
    ml/c3/data/private/sheet-import-issues.json every issue with its Job_ID
Committed: docs/c3/evidence/real-ads-import.json - counts and coverage only, no ad
text, company names or URLs.
"""
from __future__ import annotations

import csv
import re
import sys
from collections import Counter
from datetime import date
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[2]))
import c3_common  # noqa: E402
from clean_ads import clean_records, normalise  # noqa: E402
from skill_extractor import SkillExtractor  # noqa: E402

SHEET_CSV = c3_common.RAW_DIR / "job_ads_sheet.csv"
RAW_OUT = c3_common.RAW_DIR / "sheet-ads.jsonl"
CLEAN_OUT = c3_common.PRIVATE_DIR / "sheet-ads-clean.jsonl"
LABELS_OUT = c3_common.PRIVATE_DIR / "sheet-ads-labels.jsonl"
ISSUES_OUT = c3_common.PRIVATE_DIR / "sheet-import-issues.json"
REPORT_OUT = c3_common.EVIDENCE_DIR / "real-ads-import.json"

TARGET_PER_ROLE = 25
MIN_WORDS = 40

COLUMNS = [
    "Job_ID", "Job_Title", "Company", "Source", "URL", "Date_Posted", "Date_Collected", "Role_Category",
    "Seniority", "Job_Type", "Duration", "Location", "Min_Experience_Years", "Experience", "Education",
    "Certifications", "Required_Skills", "Preferred_Skills", "Full_Ad_Text", "Status", "Duplicate_Check", "Notes",
]
REQUIRED_CELLS = ("Job_ID", "Job_Title", "Role_Category", "Seniority", "Full_Ad_Text", "Required_Skills")
SENIORITY = ("intern", "associate", "senior")
JOB_TYPES = ("Internship", "Full-Time", "Part-Time", "Contract")
EDUCATION = ("Undergraduate", "Diploma / HND", "Bachelor's Degree", "Master's Degree", "Not stated")
SOURCES = ("TopJobs", "XpressJobs", "Company careers page", "LinkedIn (manual)", "SLIIT career unit", "Other")
STATUS = ("Active", "Closed")
EMPTY_LABELS = {"", "-", "none", "not stated", "n/a"}

# Every issue code, with whether the row is still used.
ISSUE_CODES = {
    "missing_cell": "required cell is empty - row skipped",
    "bad_role": "Role_Category is not a catalogue role or 'other' - row skipped",
    "duplicate_id": "Job_ID used before - row skipped",
    "duplicate_ad": "same advertisement as an earlier row (URL, title + company or text) - row skipped",
    "bad_id": "Job_ID is not JOB + 3 digits (e.g. JOB099)",
    "bad_url": "URL is missing, shortened with '...' or holds two links",
    "bad_value": "value is not one of the sheet's dropdown options",
    "bad_date": "date is not YYYY-MM-DD or lies in the future",
    "bad_number": "Min_Experience_Years is not a number",
    "unmapped_skill": "labelled skill matches no taxonomy competency (kept as evidence for the taxonomy)",
    "short_text": f"Full_Ad_Text has fewer than {MIN_WORDS} words",
}
SKIPPING = {"missing_cell", "bad_role", "duplicate_id", "duplicate_ad"}


def read_sheet(path: Path) -> list[dict]:
    with path.open(encoding="utf-8-sig", newline="") as f:
        reader = csv.DictReader(f)
        missing = [c for c in COLUMNS if c not in (reader.fieldnames or [])]
        if missing:
            raise ValueError(f"{path.name}: missing columns {missing} - download the 'Ads' tab as CSV")
        return [{k: (v or "").strip() for k, v in row.items() if k} for row in reader if (row.get("Job_ID") or "").strip()]


def label_map(taxonomy: dict) -> dict[str, str]:
    """Taxonomy labels (English) -> skill id, case-insensitive."""
    return {s["label"]["en"].lower(): s["id"] for s in taxonomy["skills"]}


def map_skill_terms(cell: str, labels: dict[str, str], extractor: SkillExtractor) -> tuple[list[str], list[str]]:
    """'Java; Cloud platforms; Go' -> (skill ids in taxonomy order, terms with no match)."""
    found: set[str] = set()
    unmapped: list[str] = []
    for term in re.split(r"[;\n]", cell):
        term = term.strip()
        if term.lower() in EMPTY_LABELS:
            continue
        if term.lower() in labels:
            found.add(labels[term.lower()])
            continue
        ids = extractor.extract(term).skill_ids
        if ids:
            found.update(ids)
        else:
            unmapped.append(term)
    return [s for s in extractor.skill_order if s in found], unmapped


def _bad_url(url: str) -> bool:
    return not re.match(r"https?://", url) or "..." in url or url.count("http") > 1


def _bad_date(value: str, today: date) -> bool:
    if not value:
        return False
    if not re.fullmatch(r"\d{4}-\d{2}-\d{2}", value):
        return True
    try:
        return date.fromisoformat(value) > today
    except ValueError:
        return True


def _url_key(url: str) -> str:
    """Compares links without tracking parameters. A LinkedIn ad is its numeric job id
    (links carry ?trackingId=...); other sites keep their query, because TopJobs puts
    the advertisement id there (?rid=..&jc=..)."""
    m = re.search(r"linkedin\.com/jobs/view/(\d+)", url, re.I)
    if m:
        return f"linkedin:{m.group(1)}"
    return re.sub(r"#.*$", "", url).rstrip("/").lower()


def validate_rows(rows: list[dict], role_ids: set[str], today: date | None = None) -> tuple[list[dict], list[dict]]:
    """Returns (rows to use, issues). Each issue: {code, jobId, column, detail}."""
    today = today or date.today()
    issues: list[dict] = []
    keep: list[dict] = []
    seen_ids: set[str] = set()
    seen: dict[str, str] = {}  # duplicate key -> first Job_ID

    def add(code: str, row: dict, column: str = "", detail: str = "") -> None:
        issues.append({"code": code, "jobId": row["Job_ID"], "column": column, "detail": detail})

    for row in rows:
        jid = row["Job_ID"]
        empty = [c for c in REQUIRED_CELLS if not row.get(c)]
        if empty:
            add("missing_cell", row, ", ".join(empty))
            continue
        if row["Role_Category"] not in role_ids and row["Role_Category"] != "other":
            add("bad_role", row, "Role_Category", row["Role_Category"])
            continue
        if jid in seen_ids:
            add("duplicate_id", row, "Job_ID")
            continue
        seen_ids.add(jid)
        keys = [f"text:{normalise(row['Full_Ad_Text']).lower()}",
                f"title:{row['Job_Title'].lower()}|{row['Company'].lower()}"]
        if row["URL"] and not _bad_url(row["URL"]):
            keys.append(f"url:{_url_key(row['URL'])}")
        first = next((seen[k] for k in keys if k in seen), None)
        if first:
            add("duplicate_ad", row, "", f"same as {first}")
            continue
        for k in keys:
            seen[k] = jid

        if not re.fullmatch(r"JOB\d{3,}", jid):
            add("bad_id", row, "Job_ID", jid)
        if _bad_url(row["URL"]):
            add("bad_url", row, "URL")
        for col, allowed in (("Seniority", SENIORITY), ("Job_Type", JOB_TYPES), ("Education", EDUCATION),
                             ("Source", SOURCES), ("Status", STATUS)):
            if row.get(col) and row[col] not in allowed:
                add("bad_value", row, col, row[col])
        for col in ("Date_Posted", "Date_Collected"):
            if _bad_date(row.get(col, ""), today):
                add("bad_date", row, col, row.get(col, ""))
        if row["Min_Experience_Years"] and not re.fullmatch(r"\d+(\.\d+)?", row["Min_Experience_Years"]):
            add("bad_number", row, "Min_Experience_Years", row["Min_Experience_Years"])
        if len(row["Full_Ad_Text"].split()) < MIN_WORDS:
            add("short_text", row, "Full_Ad_Text", f"{len(row['Full_Ad_Text'].split())} words")
        keep.append(row)
    return keep, issues


def _iso_or_none(value: str) -> str | None:
    return value if re.fullmatch(r"\d{4}-\d{2}-\d{2}", value or "") else None


def to_raw(row: dict) -> dict:
    posted = _iso_or_none(row["Date_Posted"]) or _iso_or_none(row["Date_Collected"]) or "1970-01-01"
    return {
        "raw_id": row["Job_ID"],
        "ad_id": row["Job_ID"],
        "source_type": "public_web",
        "source": row["URL"],
        "collected_at": row["Date_Collected"],
        "posted_date": posted,
        "title": row["Job_Title"],
        "company": row["Company"] or "not stated",
        "location": row["Location"] or "not stated",
        "text": row["Full_Ad_Text"],
        "provenance": f"public job advertisement copied manually into the C3 job-ads sheet (source: {row['Source'] or 'not stated'})",
    }


def import_sheet(rows: list[dict], extractor: SkillExtractor, taxonomy: dict, roles: list[dict],
                 today: date | None = None) -> dict:
    """Validates, cleans and labels the sheet rows. Pure: writes nothing."""
    role_ids = {r["id"] for r in roles}
    keep, issues = validate_rows(rows, role_ids, today)
    raw = [to_raw(r) for r in keep]
    ads, stats = clean_records(raw, extractor, roles, "manual sheet")
    by_id = {r["Job_ID"]: r for r in keep}
    labels_by_label = label_map(taxonomy)
    labels: list[dict] = []
    unmapped_terms: Counter = Counter()
    for ad in ads:
        row = by_id[ad.ad_id]
        parsed_role, parsed_seniority = ad.role_id, ad.seniority
        # The researcher's manual decisions replace the title-based guesses.
        ad.role_id = None if row["Role_Category"] == "other" else row["Role_Category"]
        ad.seniority = row["Seniority"] if row["Seniority"] in SENIORITY else ad.seniority
        required, un_req = map_skill_terms(row["Required_Skills"], labels_by_label, extractor)
        preferred, un_pref = map_skill_terms(row["Preferred_Skills"], labels_by_label, extractor)
        preferred = [s for s in preferred if s not in required]
        for term in un_req + un_pref:
            unmapped_terms[term] += 1
            issues.append({"code": "unmapped_skill", "jobId": ad.ad_id, "column": "Required_Skills/Preferred_Skills", "detail": term})
        labels.append({
            "ad_id": ad.ad_id,
            "role_id": ad.role_id,
            "seniority": ad.seniority,
            "required": required,
            "preferred": preferred,
            "unmapped": un_req + un_pref,
            "parsed_role_id": parsed_role,
            "parsed_seniority": parsed_seniority,
        })
    return {"rows": len(rows), "kept": keep, "ads": ads, "labels": labels, "issues": issues,
            "clean_stats": stats, "unmapped_terms": unmapped_terms}


def coverage(labels: list[dict], kept: list[dict], roles: list[dict]) -> dict:
    by_id = {r["Job_ID"]: r for r in kept}
    per_role = []
    for role in roles + [{"id": "other"}]:
        mine = [lab for lab in labels if (lab["role_id"] or "other") == role["id"]]
        if role["id"] == "other" and not mine:
            continue
        sen = Counter(lab["seniority"] for lab in mine)
        entry = {"roleId": role["id"], "ads": len(mine), "intern": sen["intern"], "associate": sen["associate"], "senior": sen["senior"]}
        if role["id"] != "other":
            entry["target"] = TARGET_PER_ROLE
            entry["stillNeeded"] = max(TARGET_PER_ROLE - len(mine), 0)
        per_role.append(entry)
    sources = Counter(by_id[lab["ad_id"]]["Source"] or "not stated" for lab in labels)
    return {
        "perRole": per_role,
        "rolesAtTarget": sum(1 for e in per_role if e.get("target") and e["ads"] >= TARGET_PER_ROLE),
        "sources": dict(sources.most_common()),
    }


def report(result: dict, roles: list[dict]) -> dict:
    """Aggregate, shareable summary: counts only - no ad text, company names or URLs."""
    counts = Counter(i["code"] for i in result["issues"])
    return {
        "dataset": "Public Sri Lankan IT job advertisements copied manually into the C3 job-ads sheet",
        "warning": "PRELIMINARY: one collector and annotator (the researcher); counts change as collection continues.",
        "rowsInSheet": result["rows"],
        "adsUsed": len(result["ads"]),
        "rowsSkipped": result["rows"] - len(result["ads"]),
        "issues": {code: {"count": counts[code], "meaning": ISSUE_CODES[code], "rowSkipped": code in SKIPPING}
                   for code in ISSUE_CODES if counts[code]},
        "piiRedactions": result["clean_stats"]["redactions"],
        "coverage": coverage(result["labels"], result["kept"], roles),
        "unmappedSkillTerms": dict(result["unmapped_terms"].most_common()),
    }


def run(path: Path = SHEET_CSV, today: date | None = None) -> dict | None:
    if not path.exists():
        print(f"no sheet export at {path.relative_to(c3_common.ROOT)} - download the 'Ads' tab as CSV first")
        return None
    taxonomy = c3_common.load_taxonomy()
    roles = c3_common.load_roles()
    result = import_sheet(read_sheet(path), SkillExtractor(taxonomy), taxonomy, roles, today)
    c3_common.write_jsonl(RAW_OUT, [to_raw(r) for r in result["kept"]])
    c3_common.write_jsonl(CLEAN_OUT, [a.to_dict() for a in result["ads"]])
    c3_common.write_jsonl(LABELS_OUT, result["labels"])
    c3_common.write_json(ISSUES_OUT, result["issues"])
    summary = report(result, roles)
    c3_common.write_json(REPORT_OUT, summary)

    print(f"sheet rows {result['rows']} -> ads used {len(result['ads'])} (skipped {summary['rowsSkipped']})")
    for issue in result["issues"]:
        if issue["code"] != "unmapped_skill":
            print(f"  {issue['jobId']:>8}  {issue['code']:<13} {issue['column']} {issue['detail']}".rstrip())
    if result["unmapped_terms"]:
        print("  labelled skills not in the taxonomy: " + ", ".join(f"{t} ({n})" for t, n in result["unmapped_terms"].most_common()))
    print("coverage (target %d per role):" % TARGET_PER_ROLE)
    for e in summary["coverage"]["perRole"]:
        need = f"  need {e['stillNeeded']} more" if e.get("stillNeeded") else ""
        print(f"  {e['roleId']:<22} {e['ads']:>3}  (intern {e['intern']}, associate {e['associate']}, senior {e['senior']}){need}")
    print(f"private outputs in {c3_common.PRIVATE_DIR.relative_to(c3_common.ROOT)} (git-ignored); "
          f"summary -> {REPORT_OUT.relative_to(c3_common.ROOT)}")
    return result


if __name__ == "__main__":
    run(Path(sys.argv[1]) if len(sys.argv) > 1 else SHEET_CSV)
