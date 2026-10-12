"""
Synthetic Sri Lankan IT job-advertisement generator (C3).

!!! SYNTHETIC - every ad is made up (seed 42). Companies are "Illustrative Company NN",
contacts use reserved example domains and a +94 11 000 0xxx number pattern so the
PII stripper has something realistic to remove. No text is copied from a real ad. !!!

Each ad is written as free text (title, intro, "Requirements:" bullets with level cue
phrases such as "Strong knowledge of", an optional "Nice to have:" section, experience,
education, benefits, contact). The hidden truth (role, skills, levels, preferred flags)
is stored next to the text under "truth" so the parser can be evaluated; the cleaner
and the models never read it.

Assumptions (documented, not measured): seniority mix 30% intern / 50% associate /
20% senior; 25% of skill bullets carry no level cue; 15% of required levels deviate
by one from the template; 5% of long skill terms contain a one-letter typo; 8% of
titles are generic ("Graduate Trainee - Technology") and match no role.
"""
from __future__ import annotations

from datetime import date, timedelta

import numpy as np

from synthetic_world import CERT_TEXT, ROLE_TEMPLATES, SURFACE

GENERATOR_ID = "synthetic://c3-job-ad-generator/v1"
N_PER_ROLE = 50

CUES = {
    3: ["Strong knowledge of {s}", "Proven experience with {s}", "In-depth knowledge of {s}", "Advanced knowledge of {s}"],
    2: ["Good knowledge of {s}", "Hands-on experience with {s}", "Working knowledge of {s}", "Experience in {s}"],
    1: ["Basic knowledge of {s}", "Exposure to {s}", "Familiarity with {s}", "Understanding of {s}"],
}
NO_CUE = ["{s}", "Tech stack: {s}", "Skills: {s}"]
LOCATIONS = ["Colombo 03", "Colombo 07", "Malabe", "Kandy", "Galle", "Negombo", "Remote (Sri Lanka)", "Hybrid - Colombo"]
GENERIC_TITLES = ["Graduate Trainee - Technology", "Technology Associate", "IT Executive"]
RESPONSIBILITIES = [
    "Participate in design discussions and code reviews.",
    "Work closely with product owners and the delivery team.",
    "Document your work and share knowledge with the team.",
    "Support production releases and resolve issues on time.",
]
OFFER = ["Competitive salary and medical insurance.", "Hybrid working arrangement.", "Training and certification support.", "Friendly, fast-growing team."]


def _typo(word: str, rng: np.random.Generator) -> str:
    i = int(rng.integers(1, len(word) - 1))
    return word[:i] + word[i + 1 :]


def _surface(skill: str, rng: np.random.Generator) -> str:
    s = str(rng.choice(SURFACE[skill]))
    if len(s) >= 8 and " " not in s and rng.random() < 0.05:
        s = _typo(s, rng)
    return s


def _title(role: str, seniority: str, rng: np.random.Generator, roles_by_id: dict) -> str:
    if rng.random() < 0.08:
        return str(rng.choice(GENERIC_TITLES))
    base = [t for t in roles_by_id[role]["titleSynonyms"] if not any(k in t for k in ("intern", "trainee", "associate", "junior"))]
    t = str(rng.choice(base)).title().replace("Qa ", "QA ").replace("Ui/Ux", "UI/UX").replace("Devops", "DevOps").replace("It ", "IT ")
    if seniority == "intern":
        return f"{t} Intern" if rng.random() < 0.6 else f"Trainee {t}"
    if seniority == "senior":
        return f"Senior {t}"
    return f"Associate {t}" if rng.random() < 0.5 else t


def generate_ad(idx: int, role: str, rng: np.random.Generator, roles_by_id: dict) -> dict:
    seniority = str(rng.choice(["intern", "associate", "senior"], p=[0.3, 0.5, 0.2]))
    offset = {"intern": -1, "associate": 0, "senior": 1}[seniority]
    title = _title(role, seniority, rng, roles_by_id)
    company = f"Illustrative Company {int(rng.integers(1, 61)):02d} (Pvt) Ltd"
    location = str(rng.choice(LOCATIONS))
    posted = date(2026, 1, 5) + timedelta(days=int(rng.integers(0, 268)))

    truth: dict[str, dict] = {}
    for skill, (p, q) in ROLE_TEMPLATES[role].items():
        if rng.random() >= p:
            continue
        level = int(np.clip(q + offset, 1, 3))
        if rng.random() < 0.15:
            level = int(np.clip(level + rng.choice([-1, 1]), 1, 3))
        preferred = bool(rng.random() < (0.35 if p < 0.5 else 0.08))
        truth[skill] = {"level": level, "preferred": preferred}
    if rng.random() < 0.15:  # an off-template "nice to have"
        extra = str(rng.choice([s for s in SURFACE if s not in ROLE_TEMPLATES[role]]))
        truth[extra] = {"level": 1, "preferred": True}
    if not truth:  # every ad names at least its core skill
        core = max(ROLE_TEMPLATES[role].items(), key=lambda kv: kv[1][0])
        truth[core[0]] = {"level": int(np.clip(core[1][1] + offset, 1, 3)), "preferred": False}

    default_level = {"intern": 1, "associate": 2, "senior": 3}[seniority]
    required_lines, preferred_lines = [], []
    items = list(truth.items())
    rng.shuffle(items)
    i = 0
    while i < len(items):
        skill, info = items[i]
        group = [(skill, info)]
        # sometimes join two skills with the same level and section into one bullet
        if i + 1 < len(items) and items[i + 1][1] == info and rng.random() < 0.3:
            group.append(items[i + 1])
        i += len(group)
        phrase = " and ".join(_surface(s, rng) for s, _ in group)
        if rng.random() < 0.25:
            line = str(rng.choice(NO_CUE)).format(s=phrase)
            for s, _ in group:  # without a cue a reader can only infer the level from seniority
                truth[s]["level_from_text"] = default_level
        else:
            line = str(rng.choice(CUES[info["level"]])).format(s=phrase)
            for s, _ in group:
                truth[s]["level_from_text"] = info["level"]
        (preferred_lines if info["preferred"] else required_lines).append(f"- {line}.")

    certs = []
    if rng.random() < 0.3:
        options = [c for c in CERT_TEXT if c[2] in truth]
        if options:
            text, cid, _skill = options[int(rng.integers(0, len(options)))]
            preferred_lines.append(f"- {text} certification is an added advantage.")
            certs.append(cid)

    if seniority == "intern":
        years = None
        exp_line = "- Undergraduates in their third or fourth year are welcome to apply."
    elif seniority == "associate":
        years = int(rng.choice([1, 2]))
        exp_line = f"- {years}+ years of industry experience."
    else:
        years = int(rng.integers(4, 7))
        exp_line = f"- {years}+ years of industry experience."
    edu_bachelor = rng.random() < 0.85
    edu_line = "- BSc in Computer Science, IT or a related field." if edu_bachelor else "- HND or Diploma in IT."

    lines = [
        f"{company} is hiring for its {location} office.",
        "",
        "Key responsibilities:",
        *[f"- {r}" for r in rng.choice(RESPONSIBILITIES, size=2, replace=False)],
        "",
        "Requirements:",
        edu_line,
        exp_line,
        *required_lines,
    ]
    if preferred_lines:
        lines += ["", "Nice to have:", *preferred_lines]
    lines += [
        "",
        "What we offer:",
        *[f"- {o}" for o in rng.choice(OFFER, size=2, replace=False)],
        "",
        f"Send your CV to careers@illustrative-{idx:03d}.example or call +94 11 000 0{idx % 1000:03d} before {posted + timedelta(days=21)}.",
    ]
    return {
        "ad_id": f"SYN-AD-{idx:04d}",
        "title": title,
        "company": company,
        "location": location,
        "posted_date": posted.isoformat(),
        "source_type": "synthetic",
        "source": GENERATOR_ID,
        "collected_at": "2026-10-10T00:00:00+00:00",
        "provenance": "Synthetic advertisement generated by ml/c3/src/job-ad-nlp/synthetic_ads.py (seed 42); not a real job.",
        "text": "\n".join(lines),
        "truth": {
            "role_id": role,
            "title_is_generic": title in GENERIC_TITLES,
            "seniority": seniority,
            "experience_years_min": years,
            "education": "bachelor" if edu_bachelor else "diploma",
            "certifications": certs,
            "skills": {s: truth[s] for s in sorted(truth)},
        },
    }


def generate_corpus(roles: list[dict], seed: int, n_per_role: int = N_PER_ROLE) -> list[dict]:
    rng = np.random.default_rng(seed)
    roles_by_id = {r["id"]: r for r in roles}
    ads = []
    idx = 0
    for role in ROLE_TEMPLATES:
        for _ in range(n_per_role):
            ads.append(generate_ad(idx, role, rng, roles_by_id))
            idx += 1
    order = rng.permutation(len(ads))
    return [ads[int(i)] for i in order]
