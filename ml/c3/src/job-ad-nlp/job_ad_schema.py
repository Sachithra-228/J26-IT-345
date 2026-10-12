"""
Schema for a processed job advertisement (C3).

A RAW record (collector output, git-ignored) holds only what was fetched:
    {"raw_id", "source_type", "source", "collected_at", "title", "text", "sha256"}
A PROCESSED record (cleaner output) is a JobAd below. Real-ad processed records are
written to ml/c3/data/private/ (git-ignored); only synthetic or hand-written ads are
committed, always with source_type and provenance set.
"""
from __future__ import annotations

import re
from dataclasses import asdict, dataclass, field

SCHEMA_VERSION = "1.0.0"
SOURCE_TYPES = ("synthetic", "hand_written", "public_web")
EDUCATION = ("none_stated", "diploma", "bachelor", "master")
SENIORITY = ("intern", "associate", "senior")


@dataclass
class AdSkill:
    skill_id: str
    required_level: int  # 1-3
    preferred: bool  # "nice to have" rather than required
    level_source: str  # "cue" (explicit phrase such as "strong knowledge of") | "seniority" (default)


@dataclass
class JobAd:
    ad_id: str
    title: str
    role_id: str | None  # None when the title matches no catalogue role
    seniority: str
    company: str
    location: str
    posted_date: str  # ISO date
    source_type: str
    source: str  # URL for public_web, generator id for synthetic, author note for hand_written
    collected_at: str
    provenance: str
    skills: list[AdSkill] = field(default_factory=list)
    experience_years_min: int | None = None
    education: str = "none_stated"
    certifications: list[str] = field(default_factory=list)
    text_redacted: str = ""  # PII-stripped text
    schema_version: str = SCHEMA_VERSION

    def to_dict(self) -> dict:
        return asdict(self)


def validate(ad: JobAd, skill_ids: set[str], role_ids: set[str]) -> None:
    if ad.source_type not in SOURCE_TYPES:
        raise ValueError(f"{ad.ad_id}: bad source_type {ad.source_type}")
    if ad.role_id is not None and ad.role_id not in role_ids:
        raise ValueError(f"{ad.ad_id}: unknown role {ad.role_id}")
    if ad.seniority not in SENIORITY:
        raise ValueError(f"{ad.ad_id}: bad seniority {ad.seniority}")
    if ad.education not in EDUCATION:
        raise ValueError(f"{ad.ad_id}: bad education {ad.education}")
    if not re.fullmatch(r"\d{4}-\d{2}-\d{2}", ad.posted_date):
        raise ValueError(f"{ad.ad_id}: posted_date must be YYYY-MM-DD")
    if len(ad.provenance) < 5:
        raise ValueError(f"{ad.ad_id}: provenance is required")
    seen = set()
    for s in ad.skills:
        if s.skill_id not in skill_ids:
            raise ValueError(f"{ad.ad_id}: unknown skill {s.skill_id}")
        if s.skill_id in seen:
            raise ValueError(f"{ad.ad_id}: duplicate skill {s.skill_id}")
        seen.add(s.skill_id)
        if s.required_level not in (1, 2, 3):
            raise ValueError(f"{ad.ad_id}: level must be 1-3")
    if ad.experience_years_min is not None and not 0 <= ad.experience_years_min <= 30:
        raise ValueError(f"{ad.ad_id}: implausible experience")
