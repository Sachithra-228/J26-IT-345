"""
Turns the text of one job advertisement into structured fields (C3).

  * role         - title matched against roles.json titleSynonyms (longest match wins)
  * seniority    - intern / associate / senior from the title and years of experience
  * skills       - skill_extractor on each segment (bullet / line / sentence)
  * level        - an explicit cue in the same segment ("strong knowledge of" -> 3,
                   "hands-on experience with" -> 2, "exposure to" -> 1); without a cue
                   the default comes from seniority (intern 1, associate 2, senior 3)
  * preferred    - the segment says "nice to have / added advantage / a plus", or sits
                   under such a heading
  * experience, education, certifications - simple patterns

Rules, not a trained model: every field can be traced to the phrase that produced it.
"""
from __future__ import annotations

import re

from job_ad_schema import AdSkill
from pii import strip_pii
from skill_extractor import SkillExtractor, tokenize

LEVEL_CUES: dict[int, list[str]] = {
    3: [
        "strong expertise in", "expert in", "expert knowledge of", "advanced knowledge of", "in-depth experience",
        "in-depth knowledge", "extensive experience", "proven experience", "strong experience in",
        "deep understanding of", "strong knowledge of", "strong proficiency in",
    ],
    2: [
        "good knowledge of", "hands-on experience", "working knowledge of", "solid understanding of",
        "experience in", "experience with", "proficiency in", "proficient in", "good understanding of",
        "sound knowledge of", "practical experience",
    ],
    1: [
        "basic knowledge of", "basic understanding of", "exposure to", "familiarity with", "familiar with",
        "awareness of", "understanding of", "knowledge of", "willingness to learn", "interest in",
    ],
}
# longest phrase first so "basic understanding of" wins over "understanding of"
_CUES = sorted(((p, lvl) for lvl, ps in LEVEL_CUES.items() for p in ps), key=lambda x: -len(x[0]))

PREFERRED_CUES = ("nice to have", "good to have", "added advantage", "an advantage", "is a plus", "would be a plus", "desirable", "bonus", "preferred but not required")
# A heading is a line that holds ONLY the heading words (and an optional colon), so a
# bullet such as "Skills: PRINCE2." is content, not a heading.
PREFERRED_HEADINGS = re.compile(r"^\s*(nice to have|good to have|desirable|added advantage|bonus points?|preferred( skills)?)\s*:?\s*$", re.I)
OTHER_HEADINGS = re.compile(r"^\s*(requirements?|qualifications?|responsibilities|key responsibilities|what you.?ll do|what you will need|what we offer|benefits|about (us|the role)|job description|(required |technical )?skills|you should have)\s*:?\s*$", re.I)

SENIORITY_DEFAULT_LEVEL = {"intern": 1, "associate": 2, "senior": 3}

CERTIFICATIONS = {
    "aws_cloud_practitioner": r"aws certified cloud practitioner|aws cloud practitioner",
    "aws_solutions_architect_associate": r"aws certified solutions architect|aws solutions architect",
    "azure_fundamentals": r"az-900|azure fundamentals",
    "azure_administrator": r"az-104|azure administrator",
    "ccna": r"\bccna\b",
    "comptia_security_plus": r"security\+|comptia security",
    "istqb_foundation": r"\bistqb\b",
    "pmp": r"\bpmp\b",
    "prince2": r"\bprince2\b",
    "scrum_master": r"\bpsm\b|\bcsm\b|scrum master certif|professional scrum master",
    "google_data_analytics": r"google data analytics",
    "oracle_java": r"\bocpjp\b|\bocajp\b|oracle certified (associate|professional),? java",
}

_EXPERIENCE = re.compile(r"(\d{1,2})\s*(?:\+|plus)?\s*(?:-|to)?\s*(?:\d{1,2})?\s*\+?\s*years?", re.I)


def _norm(text: str) -> str:
    return re.sub(r"\s+", " ", text.lower()).strip()


def split_segments(text: str) -> list[tuple[str, bool]]:
    """Bullets / lines / sentences, each flagged as preferred if under a 'nice to have' heading."""
    out: list[tuple[str, bool]] = []
    under_preferred = False
    for line in text.splitlines():
        stripped = line.strip(" \t-*•●▪>")
        if not stripped:
            continue
        if PREFERRED_HEADINGS.match(stripped):
            under_preferred = True
            continue
        if OTHER_HEADINGS.match(stripped):
            under_preferred = False
            continue
        for sentence in re.split(r"(?<=[.;!?])\s+", stripped):
            if sentence.strip():
                out.append((sentence.strip(), under_preferred))
    return out


def cue_level(segment: str) -> int | None:
    s = _norm(segment)
    for phrase, lvl in _CUES:
        if phrase in s:
            return lvl
    return None


def is_preferred(segment: str) -> bool:
    s = _norm(segment)
    return any(c in s for c in PREFERRED_CUES)


def classify_role(title: str, roles: list[dict]) -> str | None:
    t = " ".join(tokenize(title))
    best: tuple[int, str] | None = None
    for role in roles:
        for syn in role["titleSynonyms"]:
            s = " ".join(tokenize(syn))
            if re.search(rf"(^| ){re.escape(s)}( |$)", t) and (best is None or len(s) > best[0]):
                best = (len(s), role["id"])
    return best[1] if best else None


def experience_years(text: str) -> int | None:
    found = []
    for seg in re.split(r"[\n.;]", text):
        if "experience" in seg.lower():
            found += [int(m.group(1)) for m in _EXPERIENCE.finditer(seg)]
    return min(found) if found else None


def seniority(title: str, years: int | None) -> str:
    t = title.lower()
    if re.search(r"\b(intern|internship|trainee)\b", t):
        return "intern"
    if re.search(r"\b(senior|lead|principal|manager)\b", t) and "associate" not in t:
        return "senior"
    if years is not None and years >= 4:
        return "senior"
    return "associate"


def education(text: str) -> str:
    t = text.lower()
    if re.search(r"\b(msc|m\.sc|master'?s)\b", t):
        return "master"
    if re.search(r"\b(bsc|b\.sc|bachelor'?s?|degree)\b", t):
        return "bachelor"
    if re.search(r"\b(hnd|diploma)\b", t):
        return "diploma"
    return "none_stated"


def certifications(text: str) -> list[str]:
    t = text.lower()
    return [cid for cid, pattern in CERTIFICATIONS.items() if re.search(pattern, t)]


def _priority(mention: dict) -> tuple[int, int, int]:
    return (0 if mention["preferred"] else 1, 1 if mention["source"] == "cue" else 0, mention["level"])


def parse_ad(title: str, text: str, extractor: SkillExtractor, roles: list[dict]) -> dict:
    """Returns the structured fields of one advertisement (PII is stripped first)."""
    clean, redactions = strip_pii(text)
    years = experience_years(clean)
    level_default_seniority = seniority(title, years)
    default_level = SENIORITY_DEFAULT_LEVEL[level_default_seniority]

    per_skill: dict[str, dict] = {}
    for segment, under_pref in split_segments(clean):
        ext = extractor.extract(segment)
        if not ext.skills:
            continue
        lvl = cue_level(segment)
        pref = under_pref or is_preferred(segment)
        for sid in ext.skill_ids:
            new = {
                "level": lvl if lvl is not None else default_level,
                "preferred": pref,
                "source": "cue" if lvl is not None else "seniority",
            }
            cur = per_skill.get(sid)
            # Mentioned again: a required mention beats a "nice to have" one, an explicit
            # cue beats a level inferred from seniority, then the higher level wins.
            if cur is None or _priority(new) > _priority(cur):
                per_skill[sid] = new

    order = extractor.skill_order
    skills = [
        AdSkill(sid, per_skill[sid]["level"], per_skill[sid]["preferred"], per_skill[sid]["source"])
        for sid in order
        if sid in per_skill
    ]
    return {
        "role_id": classify_role(title, roles),
        "seniority": level_default_seniority,
        "skills": skills,
        "experience_years_min": years,
        "education": education(clean),
        "certifications": certifications(clean),
        "text_redacted": clean,
        "redactions": redactions,
    }
