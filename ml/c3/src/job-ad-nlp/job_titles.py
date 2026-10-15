"""
"Search job sites for" - the job titles real ads use for each role (C3).

The 12 roles are families: one role appears in ads under many titles (Associate
Software Engineer, Java Developer, Full Stack Developer...). For each role this counts
the titles in the manually collected sheet, so a student knows which titles to search
for on job sites.

Cleaning (so variants of one title are counted together):
- seniority and contract words are dropped (Intern, Trainee, Associate, Junior,
  Senior, Lead, Remote, ...) - the student adds "intern" when searching for internships
- text in brackets, years and the company name are removed
- a title with several parts ("Intern - Quality Assurance", "Associate Software
  Engineer/ Software Engineer - C++") keeps its most descriptive part (the one with
  the most words; ties keep the first)
- parts that say nothing on their own (Engineer, Executive, IT, ...) are skipped

Output: src/lib/c3/model/job-titles.json - title counts per role only: no company
names, URLs, ad text or Job IDs. Built from ads the researcher assigned to a role
(Role_Category), so "other" ads are not included. Display aid only: never a model input.
"""
from __future__ import annotations

import re
from collections import Counter, defaultdict

import c3_common as C

OUT = C.MODEL_OUT.parent / "job-titles.json"
TOP_TITLES = 6

SENIORITY = {
    "intern", "interns", "internship", "trainee", "trainees", "associate", "junior", "jr", "senior", "sr", "lead",
    "graduate", "fresher", "freshers", "apprentice", "entry", "level", "entry-level", "remote", "hybrid", "onsite",
    "on-site", "full-time", "part-time", "contract", "placement", "program", "programme",
}
# Parts that are not a searchable title on their own.
TOO_GENERIC = {"engineer", "executive", "manager", "it", "technology", "engineering", "information technology", "assistant", "support"}
SEPARATORS = re.compile(r"\s+[-–—|]+\s+|\s*--+\s*|\s*[–—�]\s*|\s*,\s*|\s*:\s+|\s*/\s+|\s+/\s*")


def _clean_part(part: str, company: str) -> str:
    if company and len(company) > 3:
        part = re.sub(re.escape(company), " ", part, flags=re.IGNORECASE)
    words = []
    for w in part.split():
        base = w.strip(".,;").lower()
        # "Intern-Jaffna": a seniority word glued to a place name
        if base in SENIORITY or base.split("-")[0] in SENIORITY or re.fullmatch(r"\d{4}|\d+", base):
            continue
        words.append(w.strip(".,;"))
    return " ".join(words).strip(" -")


def normalise_title(title: str, company: str = "") -> str | None:
    """'Intern - Quality Assurance (QA)' -> 'Quality Assurance'; None if nothing searchable is left."""
    text = re.sub(r"[(\[][^)\]]*[)\]]", " ", title or "")
    parts = [_clean_part(p, company) for p in SEPARATORS.split(text)]
    parts = [p for p in parts if p and p.lower() not in TOO_GENERIC]
    if not parts:
        return None
    best = max(parts, key=lambda p: (len(p.split()), -parts.index(p)))
    return re.sub(r"\s+", " ", best)


def _key(title: str) -> str:
    """Grouping key: case and a final plural 's' ignored (Software Engineers = Software Engineer)."""
    k = title.lower()
    return k[:-1] if k.endswith("s") and not k.endswith("ss") and len(k) > 4 else k


def title_counts(rows: list[dict], labels: list[dict]) -> dict:
    """rows: sheet rows that were used (Job_ID, Job_Title, Company); labels: manual role per ad."""
    role_of = {lab["ad_id"]: lab["role_id"] for lab in labels}
    per_role: dict[str, Counter] = defaultdict(Counter)
    surface: dict[str, Counter] = defaultdict(Counter)
    ads_per_role: Counter = Counter()
    skipped = 0
    for r in rows:
        role = role_of.get(r["Job_ID"])
        if not role:
            continue
        ads_per_role[role] += 1
        t = normalise_title(r["Job_Title"], r.get("Company", ""))
        if t is None:
            skipped += 1
            continue
        per_role[role][_key(t)] += 1
        surface[_key(t)][t] += 1
    roles = {}
    for role in C.role_ids():
        ranked = sorted(per_role[role].items(), key=lambda kv: (-kv[1], kv[0]))[:TOP_TITLES]
        roles[role] = {
            "ads": ads_per_role[role],
            "titles": [{"title": surface[k].most_common(1)[0][0], "ads": n} for k, n in ranked],
        }
    return {"adsUsed": sum(ads_per_role.values()), "titlesWithoutSearchableName": skipped, "roles": roles}


def run(result: dict, generated: str) -> dict:
    """Writes job-titles.json from an import_sheet result (kept rows + labels)."""
    data = {"generatedAt": generated, "source": "manually collected public Sri Lankan IT job ads (title counts only)",
            **title_counts(result["kept"], result["labels"])}
    C.write_json(OUT, data)
    print(f"job titles: {data['adsUsed']} ads -> {OUT.relative_to(C.ROOT)}")
    for role, v in data["roles"].items():
        shown = " · ".join(f"{t['title']} ({t['ads']})" for t in v["titles"][:4])
        print(f"  {role:<22} {shown}")
    return data
