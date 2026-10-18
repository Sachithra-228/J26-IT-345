"""
C3 - import the anonymous career-readiness survey (Google Form export).

    python ml/c3/src/survey/import_survey.py <export.csv> [--out <folder>]

Reads the CSV, maps every column by its question prefix (A1..G2, not by position),
turns answers into clean values (grid levels 0-3, skill ids from the competency
taxonomy, Likert answers 1-5), keeps only consenting Year 3 / Year 4 students,
adds quality flags (rows are never dropped for a flag) and reports every value
that is not one of the known options.

Privacy: the Timestamp is replaced by a row id (R001, ...) and only the date is
kept; G2 free text and every unknown value go through the same strip_pii used
for CVs and job ads. Real exports are written only to the git-ignored
ml/c3/data/private/processed/. A file whose name contains "SYNTHETIC" is
written to ml/c3/data/synthetic/processed/ and is never written to private/.
"""
from __future__ import annotations

import argparse
import re
import sys
from collections import Counter
from pathlib import Path

import pandas as pd

sys.path.insert(0, str(Path(__file__).resolve().parents[2]))
import c3_common as C  # noqa: E402  (also puts skill-extraction/ on sys.path)
from pii import strip_pii  # noqa: E402

SYNTHETIC_OUT = C.SYNTHETIC_DIR / "processed"
PRIVATE_OUT = C.PRIVATE_DIR / "processed"

# ---------------------------------------------------------------------------
# Option lists, checked against the Google Form on 18 Oct 2026. "Other" free text
# (A2, B5, B6, D3, F3) and any answer not listed
# here is reported as an unknown value, never dropped silently.
# ---------------------------------------------------------------------------
CONSENT_YES = "I have read the information above, I am 18 years or older, and I agree to take part."
YEARS = {"Year 3": 3, "Year 4": 4}

ROLES = [
    "Software Engineer", "Front-end Engineer", "Mobile App Developer", "QA Engineer", "DevOps / Cloud Engineer",
    "Data Analyst", "Data Scientist / ML Engineer", "Business Analyst", "UI/UX Designer", "Network Engineer",
    "Cybersecurity Analyst", "IT Project Coordinator / Associate PM", "Not sure yet",
]
SINGLE = {
    "A2": ["Information Technology", "Software Engineering", "Data Science", "Computer Systems & Network Engineering",
           "Cyber Security", "Information Systems Engineering", "Interactive Media"],
    "A3": ["Completed", "Currently doing it", "Not started yet"],
    "A4": ["English", "Sinhala", "Tamil"],
    "A5": ["Yes, within 2 years of graduating", "Yes, later in my career", "Not sure yet", "No"],
    "B2": ROLES,
    "D1": ["0", "1-2", "3-5", "6 or more"],
    "D2": ["Yes", "No"],
    "F1": ["Less than 2", "2-5", "6-10", "More than 10"],
}
SCALES = {"B3": (1, 5), "B4": (0, 10)}
MULTI = {
    "B1": ROLES,
    "B5": ["Lecturers", "Seniors or alumni", "Friends", "Family", "SLIIT career guidance unit / events", "LinkedIn",
           "YouTube / online courses", "Job advertisement sites", "I do not get any guidance"],
    "B6": ["Software product company", "IT services / outsourcing", "Banking and finance", "Telecommunications",
           "Healthcare", "Education / EdTech", "Retail / e-commerce", "Government / public sector", "Start-up",
           "Research / academia", "Not sure yet"],
    "D3": ["AWS Certified Cloud Practitioner", "Microsoft Azure Fundamentals (AZ-900)", "Cisco CCNA",
           "CompTIA Security+", "ISTQB Certified Tester Foundation Level", "Professional Scrum Master (PSM I)",
           "Google Data Analytics Professional Certificate", "Oracle Java SE certification", "GitHub Foundations",
           "PMI CAPM", "None"],
    "F2": ["SLIIT modules or electives", "Free online courses and tutorials", "Professional certifications",
           "Building personal projects", "Internships", "Mentoring by industry professionals",
           "Open-source contributions", "Workshops / bootcamps"],
    "F3": ["Lack of time", "Not knowing where to start / what to learn first", "Not knowing which skills employers want",
           "Cost of courses or exams", "No mentor or guidance", "Low confidence",
           "Lack of internet or a suitable computer", "Nothing - I am on track"],
}
SKILL_QUESTIONS = ("E1", "E2", "E3")  # options = the taxonomy skill labels; E3 is single choice

LEVELS = {"0 - None": 0, "1 - Basic": 1, "2 - Intermediate": 2, "3 - Advanced": 3}
SOFT_SKILLS = {"Adaptability": "adaptability", "Leadership": "leadership", "Time management": "time_management",
               "Presentation skills": "presentation"}
F4_SCALE = {"Not useful": 1, "Slightly useful": 2, "Moderately useful": 3, "Very useful": 4, "Extremely useful": 5}
F4_ITEMS = {
    "Skill-gap analysis for a target role": "skill_gap",
    "Certification guidance (which certification, when)": "certification",
    "Higher-education / postgraduate guidance": "higher_education",
    "Interview practice (mock interviews with feedback)": "interview_practice",
    "A conversational AI career assistant": "assistant",
    "A step-by-step learning plan": "learning_plan",
}
G1_SCALE = {"Strongly disagree": 1, "Disagree": 2, "Neutral": 3, "Agree": 4, "Strongly agree": 5}
G1_ITEMS = {
    "I would use such a tool to plan my career.": "would_use",
    "I would trust a readiness score more if it showed which skills raised or lowered it.": "trust_explained_score",
    "I want to know WHY each course, project or certification is recommended.": "want_why",
    "A step-by-step plan (what to do first, next, ...) would be more useful than a list of skills.": "prefer_plan",
    "I would paste my CV text if it were analysed only on my own device and never stored.": "would_paste_cv",
    "I would allow my anonymous answers to be shown to SLIIT career staff as group totals.": "allow_aggregates",
}

QUESTIONS = ["A1", "A2", "A3", "A4", "A5", "B1", "B2", "B3", "B4", "B5", "B6", "C1", "C2", "C3", "C4", "C5", "C6",
             "C7", "D1", "D2", "D3", "E1", "E2", "E3", "F1", "F2", "F3", "F4", "G1", "G2"]
STRAIGHT_LINE_MIN_ITEMS = 3
FLAG_CODES = ["straight_line_c", "straight_line_g1", "straight_line_f4", "b2_not_in_b1", "d3_none_with_certificate",
              "b5_no_guidance_with_sources", "b6_not_sure_with_industries", "e3_not_in_e2"]

HEADER_RE = re.compile(r"^\s*([A-G]\d)\.\s*(.*?)(?:\s*\[(.+)\])?\s*$", re.S)
EMPTY_HEADER_RE = re.compile(r"^\s*$|^Unnamed: \d+$")
SEP = r"[;,]"


# ---------------------------------------------------------------------------
# Parsing helpers
# ---------------------------------------------------------------------------
def classify_columns(headers: list[str]) -> dict:
    """Maps each header to its question. Returns timestamp/consent column names, simple questions,
    grid items ({question: [(item label, column)]}), ignored empty headers and unrecognised headers."""
    out: dict = {"timestamp": None, "consent": None, "simple": {}, "grids": {}, "empty": [], "unrecognised": []}
    for h in headers:
        if EMPTY_HEADER_RE.match(h):
            out["empty"].append(h)
            continue
        if h.strip().lower() == "timestamp":
            out["timestamp"] = h
            continue
        if h.strip().lower().startswith("consent"):
            out["consent"] = h
            continue
        m = HEADER_RE.match(h)
        if not m or m.group(1) not in QUESTIONS:
            out["unrecognised"].append(h)
        elif m.group(3):
            out["grids"].setdefault(m.group(1), []).append((m.group(3).strip(), h))
        else:
            out["simple"][m.group(1)] = h
    return out


def split_multi(cell: str, options: list[str]) -> tuple[list[str], str | None]:
    """Finds the known options in a multi-select cell (longest label first), so ";" and ", " separators both
    work and labels that contain commas stay whole. Returns (options in cell order, leftover text or None)."""
    remaining = cell or ""
    found: list[tuple[int, str]] = []
    for opt in sorted(options, key=len, reverse=True):
        rx = re.compile(rf"(?:^|(?<={SEP}))\s*{re.escape(opt)}\s*(?={SEP}|$)")
        m = rx.search(remaining)
        if m:
            found.append((m.start(), opt))
            remaining = remaining[: m.start()] + " " * (m.end() - m.start()) + remaining[m.end():]
    leftover = re.sub(rf"\s*{SEP}[\s;,]*", ", ", remaining).strip(" ,;")
    return [o for _, o in sorted(found)], (leftover or None)


def row_date(value: str) -> str | None:
    """The date part of a Forms / Sheets timestamp as YYYY-MM-DD; None when there is no date."""
    v = (value or "").strip()
    m = re.match(r"(\d{4})[/-](\d{1,2})[/-](\d{1,2})", v)
    if m:
        y, mo, d = m.groups()
    else:
        m = re.match(r"(\d{1,2})/(\d{1,2})/(\d{4})", v)
        if not m:
            return None
        a, b, y = m.groups()
        mo, d = (b, a) if int(a) > 12 else (a, b)  # Google's default is month/day/year
    if not (1 <= int(mo) <= 12 and 1 <= int(d) <= 31):
        return None
    return f"{int(y):04d}-{int(mo):02d}-{int(d):02d}"


def straight_line(values: list) -> bool:
    answered = [v for v in values if v is not None]
    return len(answered) >= STRAIGHT_LINE_MIN_ITEMS and len(answered) == len(values) and len(set(answered)) == 1


def safe(text: str) -> tuple[str, int]:
    clean, counts = strip_pii(text)
    return clean, sum(counts.values())


# ---------------------------------------------------------------------------
# Import
# ---------------------------------------------------------------------------
def import_rows(df: pd.DataFrame, taxonomy: dict) -> tuple[list[dict], dict]:
    cols = classify_columns(list(df.columns))
    skill_by_label = {s["label"]["en"]: s["id"] for s in taxonomy["skills"]}
    skill_labels = list(skill_by_label)
    unknown: dict[str, Counter] = {}
    redactions = {"G2": 0, "unknownValues": 0}

    def note_unknown(question: str, value: str) -> None:
        clean, n = safe(value)
        redactions["unknownValues"] += n
        unknown.setdefault(question, Counter())[clean] += 1

    def cell(row, q: str) -> str:
        col = cols["simple"].get(q)
        return str(row[col]).strip() if col is not None else ""

    def single(row, q: str, options) -> str | None:
        v = cell(row, q)
        if not v:
            return None
        if v in options:
            return v
        note_unknown(q, v)
        return None

    def multi(row, q: str, options: list[str]) -> list[str]:
        found, leftover = split_multi(cell(row, q), options)
        if leftover:
            note_unknown(q, leftover)
        return found

    # grid columns: C (skills + soft skills), F4, G1; unknown item labels are reported
    c_items: list[tuple[str, str]] = []
    for q in ("C1", "C2", "C3", "C4", "C5", "C6", "C7"):
        for label, col in cols["grids"].get(q, []):
            if label in skill_by_label:
                c_items.append((f"skill_{skill_by_label[label]}", col))
            elif label in SOFT_SKILLS:
                c_items.append((f"soft_{SOFT_SKILLS[label]}", col))
            else:
                note_unknown(f"{q} item", label)
    f4_items = [(F4_ITEMS[l], col) for l, col in cols["grids"].get("F4", []) if l in F4_ITEMS]
    g1_items = [(G1_ITEMS[l], col) for l, col in cols["grids"].get("G1", []) if l in G1_ITEMS]
    for q, items in (("F4", F4_ITEMS), ("G1", G1_ITEMS)):
        for label, _ in cols["grids"].get(q, []):
            if label not in items:
                note_unknown(f"{q} item", label)

    def grid(row, q: str, items, scale) -> dict:
        out = {}
        for key, col in items:
            v = str(row[col]).strip()
            if not v:
                out[key] = None
            elif v in scale:
                out[key] = scale[v]
            else:
                note_unknown(q, v)
                out[key] = None
        return out

    dropped: Counter = Counter()
    dropped_years: Counter = Counter()
    kept: list[dict] = []
    dates_missing = 0
    for _, row in df.iterrows():
        consent = str(row[cols["consent"]]).strip() if cols["consent"] else ""
        if consent != CONSENT_YES:
            dropped["no_consent"] += 1
            continue
        year = cell(row, "A1")
        if year not in YEARS:
            dropped["not_year_3_or_4"] += 1
            dropped_years[year or "(empty)"] += 1
            continue

        rec: dict = {"row_id": f"R{len(kept) + 1:03d}"}
        rec["date"] = row_date(str(row[cols["timestamp"]])) if cols["timestamp"] else None
        dates_missing += rec["date"] is None
        rec["year"] = YEARS[year]
        rec["specialisation"] = single(row, "A2", SINGLE["A2"])
        rec["internship"] = single(row, "A3", SINGLE["A3"])
        rec["language"] = single(row, "A4", SINGLE["A4"])
        rec["postgraduate"] = single(row, "A5", SINGLE["A5"])
        b1 = multi(row, "B1", MULTI["B1"])
        rec["target_roles"] = b1
        rec["first_choice"] = single(row, "B2", SINGLE["B2"])
        for q, key in (("B3", "certainty"), ("B4", "self_readiness")):
            lo, hi = SCALES[q]
            v = cell(row, q)
            ok = v.isdigit() and lo <= int(v) <= hi
            rec[key] = int(v) if ok else None
            if v and not ok:
                note_unknown(q, v)
        b5 = multi(row, "B5", MULTI["B5"])
        b6 = multi(row, "B6", MULTI["B6"])
        rec["guidance_sources"], rec["industries"] = b5, b6

        c = grid(row, "C", c_items, LEVELS)
        rec.update(c)
        rec["projects"] = single(row, "D1", SINGLE["D1"])
        rec["portfolio"] = single(row, "D2", SINGLE["D2"])
        d3 = multi(row, "D3", MULTI["D3"])
        certs = [x for x in d3 if x != "None"]
        rec["certifications"] = certs
        e = {}
        for q in SKILL_QUESTIONS:
            labels = [single(row, q, skill_labels)] if q == "E3" else multi(row, q, skill_labels)
            e[q] = [skill_by_label[l] for l in labels if l]
        rec["employer_values"], rec["need_to_improve"] = e["E1"], e["E2"]
        rec["improve_first"] = e["E3"][0] if e["E3"] else None
        rec["hours_per_week"] = single(row, "F1", SINGLE["F1"])
        rec["learning_preferences"] = multi(row, "F2", MULTI["F2"])
        rec["barriers"] = multi(row, "F3", MULTI["F3"])
        f4 = grid(row, "F4", f4_items, F4_SCALE)
        g1 = grid(row, "G1", g1_items, G1_SCALE)
        rec.update({f"useful_{k}": v for k, v in f4.items()})
        rec.update({f"agree_{k}": v for k, v in g1.items()})
        g2, n = safe(cell(row, "G2"))
        redactions["G2"] += n
        rec["comment"] = g2 or None

        flags = []
        if straight_line(list(c.values())):
            flags.append("straight_line_c")
        if straight_line(list(g1.values())):
            flags.append("straight_line_g1")
        if straight_line(list(f4.values())):
            flags.append("straight_line_f4")
        if rec["first_choice"] and rec["first_choice"] not in b1:
            flags.append("b2_not_in_b1")
        if "None" in d3 and certs:
            flags.append("d3_none_with_certificate")
        if "I do not get any guidance" in b5 and len(b5) > 1:
            flags.append("b5_no_guidance_with_sources")
        if "Not sure yet" in b6 and len(b6) > 1:
            flags.append("b6_not_sure_with_industries")
        if rec["improve_first"] and rec["improve_first"] not in e["E2"]:
            flags.append("e3_not_in_e2")
        rec["flags"] = flags
        rec["flag_count"] = len(flags)
        kept.append(rec)

    missing = [q for q in QUESTIONS if q not in cols["simple"] and q not in cols["grids"]]
    info = {
        "rowsRead": len(df),
        "rowsKept": len(kept),
        "rowsDropped": sum(dropped.values()),
        "droppedReasons": dict(dropped),
        "droppedYearValues": dict(dropped_years),
        "columns": {
            "total": len(df.columns),
            "emptyHeadersIgnored": len(cols["empty"]),
            "unrecognised": cols["unrecognised"],
            "missingQuestions": missing + (["Consent"] if not cols["consent"] else []) + (["Timestamp"] if not cols["timestamp"] else []),
        },
        "datesMissing": dates_missing,
        "piiRedactions": redactions,
        "flags": {code: sum(code in r["flags"] for r in kept) for code in FLAG_CODES},
        "rowsWithAnyFlag": sum(r["flag_count"] > 0 for r in kept),
        "flagCountDistribution": {str(k): v for k, v in sorted(Counter(r["flag_count"] for r in kept).items())},
        "unknownValues": {q: [{"value": v, "count": n} for v, n in cnt.most_common()] for q, cnt in sorted(unknown.items())},
    }
    return kept, info


def to_frame(rows: list[dict], is_synthetic: bool) -> pd.DataFrame:
    flat = []
    for r in rows:
        flat.append({k: (";".join(v) if isinstance(v, list) else v) for k, v in r.items()} | {"is_synthetic": is_synthetic})
    return pd.DataFrame(flat)


def output_dir(source: Path, is_synthetic: bool, out: Path | None) -> Path:
    target = Path(out) if out else (SYNTHETIC_OUT if is_synthetic else PRIVATE_OUT)
    if is_synthetic and target.resolve().is_relative_to(C.PRIVATE_DIR.resolve()):
        raise ValueError("synthetic survey output must never be written to ml/c3/data/private/")
    return target


def run(path: Path, out: Path | None = None) -> dict:
    path = Path(path)
    is_synthetic = "SYNTHETIC" in path.name.upper()
    target = output_dir(path, is_synthetic, out)
    df = pd.read_csv(path, dtype=str, keep_default_na=False, encoding="utf-8-sig")
    rows, info = import_rows(df, C.load_taxonomy())
    summary = {
        "source": path.name,
        "isSynthetic": is_synthetic,
        **({"warning": C.SYNTHETIC_WARNING} if is_synthetic else {}),
        **info,
        "mappings": {
            "skillLevels": LEVELS,
            "usefulness": F4_SCALE,
            "agreement": G1_SCALE,
            "softSkills": SOFT_SKILLS,
            "rule": "Rows are dropped only for missing consent or a year other than Year 3 / Year 4; flags never drop rows.",
        },
        "optionLists": {"consent": [CONSENT_YES], "A1": list(YEARS), **SINGLE, **MULTI,
                        "E1-E3": "taxonomy skill labels (competency-taxonomy.json)",
                        "B3": "1-5", "B4": "0-10", "F4": list(F4_SCALE), "G1": list(G1_SCALE),
                        "note": "Checked against the Google Form on 18 Oct 2026."},
    }
    target.mkdir(parents=True, exist_ok=True)
    stem = path.stem
    csv_path, json_path = target / f"{stem}-clean.csv", target / f"{stem}-summary.json"
    to_frame(rows, is_synthetic).to_csv(csv_path, index=False, encoding="utf-8")
    C.write_json(json_path, summary)
    summary["outputs"] = {"csv": str(csv_path), "summary": str(json_path)}
    return summary


def main(argv: list[str] | None = None) -> None:
    ap = argparse.ArgumentParser(description="Import the C3 career-readiness survey export.")
    ap.add_argument("csv", type=Path)
    ap.add_argument("--out", type=Path, default=None, help="output folder (default: synthetic/processed or private/processed)")
    a = ap.parse_args(argv)
    s = run(a.csv, a.out)
    if s["isSynthetic"]:
        print(C.SYNTHETIC_WARNING)
    print(f"rows read {s['rowsRead']} -> kept {s['rowsKept']}, dropped {s['rowsDropped']} {s['droppedReasons']}")
    print(f"columns {s['columns']['total']}, empty headers ignored {s['columns']['emptyHeadersIgnored']}, "
          f"unrecognised {len(s['columns']['unrecognised'])}, missing {s['columns']['missingQuestions']}")
    print(f"dates missing {s['datesMissing']}, PII redactions {s['piiRedactions']}")
    print(f"flags {s['flags']} (rows with any flag: {s['rowsWithAnyFlag']})")
    print(f"unknown values: {s['unknownValues'] or 'none'}")
    print(f"-> {s['outputs']['csv']}\n-> {s['outputs']['summary']}")


if __name__ == "__main__":
    main()
