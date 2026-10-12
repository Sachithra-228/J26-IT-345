"""
Cleans raw advertisements into validated JobAd records (C3).

    python ml/c3/src/job-ad-nlp/clean_ads.py            # all ml/c3/data/raw/*.jsonl -> private/
    (the synthetic corpus is cleaned by run_pipeline.py through clean_records())

Steps: strip PII -> normalise whitespace -> drop exact duplicates (SHA-256 of the
normalised text) -> parse (ad_parser) -> validate (job_ad_schema). Records whose
title matches no catalogue role are kept with role_id = None and reported.
Real-ad output goes to ml/c3/data/private/ (git-ignored), never to a tracked folder.
"""
from __future__ import annotations

import hashlib
import re
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[2]))
import c3_common  # noqa: E402
from ad_parser import parse_ad  # noqa: E402
from job_ad_schema import JobAd, validate  # noqa: E402
from skill_extractor import SkillExtractor  # noqa: E402


def normalise(text: str) -> str:
    text = text.replace("\r\n", "\n").replace(" ", " ")
    lines = [re.sub(r"[ \t]+", " ", line).strip() for line in text.split("\n")]
    return "\n".join(line for line in lines if line)


def clean_records(raw: list[dict], extractor: SkillExtractor, roles: list[dict], provenance: str) -> tuple[list[JobAd], dict]:
    skill_ids = set(extractor.skill_order)
    role_ids = {r["id"] for r in roles}
    seen: set[str] = set()
    ads: list[JobAd] = []
    stats = {"input": len(raw), "duplicates": 0, "unclassified_role": 0, "redactions": {}}
    for r in raw:
        text = normalise(r["text"])
        key = hashlib.sha256(text.lower().encode("utf-8")).hexdigest()
        if key in seen:
            stats["duplicates"] += 1
            continue
        seen.add(key)
        parsed = parse_ad(r["title"], text, extractor, roles)
        for k, v in parsed["redactions"].items():
            stats["redactions"][k] = stats["redactions"].get(k, 0) + v
        if parsed["role_id"] is None:
            stats["unclassified_role"] += 1
        ad = JobAd(
            ad_id=r.get("ad_id") or r.get("raw_id") or key[:16],
            title=r["title"],
            role_id=parsed["role_id"],
            seniority=parsed["seniority"],
            company=r.get("company", "unknown"),
            location=r.get("location", "unknown"),
            posted_date=r.get("posted_date") or r.get("collected_at", "1970-01-01")[:10],
            source_type=r["source_type"],
            source=r["source"],
            collected_at=r.get("collected_at", ""),
            provenance=r.get("provenance", provenance),
            skills=parsed["skills"],
            experience_years_min=parsed["experience_years_min"],
            education=parsed["education"],
            certifications=parsed["certifications"],
            text_redacted=parsed["text_redacted"],
        )
        validate(ad, skill_ids, role_ids)
        ads.append(ad)
    stats["output"] = len(ads)
    return ads, stats


def main() -> None:
    extractor = SkillExtractor(c3_common.load_taxonomy())
    roles = c3_common.load_roles()
    raw = []
    for path in sorted(c3_common.RAW_DIR.glob("*.jsonl")):
        raw += c3_common.read_jsonl(path)
    if not raw:
        print("no raw ads in ml/c3/data/raw/ - run collect_ads.py first")
        return
    ads, stats = clean_records(raw, extractor, roles, "public advertisement collected under collect_ads.py rules")
    out = c3_common.PRIVATE_DIR / "ads-clean.jsonl"
    c3_common.write_jsonl(out, [a.to_dict() for a in ads])
    print(stats)
    print(f"wrote {len(ads)} cleaned ads to {out} (git-ignored)")


if __name__ == "__main__":
    main()
