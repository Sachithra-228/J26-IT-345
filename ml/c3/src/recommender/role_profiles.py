"""
Evidence-based role profiles from parsed job advertisements (C3).

For each role r and skill s, over the ads classified as r:
  tf(r, s)  = (required mentions + 0.5 x "nice to have" mentions) / number of ads for r
  idf(s)    = ln((1 + R) / (1 + R_s)) + 1        (smoothed, as in scikit-learn)
              R = number of roles, R_s = roles in which tf >= MIN_SUPPORT
  weight    = tf x idf, kept only if tf >= MIN_SUPPORT, then normalised to sum to 1
  required level = median of the levels the ads ask for (required mentions; preferred
              ones only if the skill is never required), rounded half up

So a skill that most Data Analyst ads ask for, and few other roles do, gets a high
weight for Data Analyst; a skill every role asks for (communication) still counts,
but less. Every number is traceable to ad counts, which the UI shows as evidence.
Plain Python floats are used throughout so the exported JSON is exact.
"""
from __future__ import annotations

import math

MIN_SUPPORT = 0.15
PREFERRED_MENTION_WEIGHT = 0.5


def _median_level(levels: list[int]) -> int:
    xs = sorted(levels)
    n = len(xs)
    m = xs[n // 2] if n % 2 else (xs[n // 2 - 1] + xs[n // 2]) / 2
    return int(math.floor(m + 0.5))


def build_role_profiles(ads: list[dict], role_ids: list[str], skill_ids: list[str], min_support: float = MIN_SUPPORT) -> list[dict]:
    """ads: processed JobAd dicts (role_id, skills[{skill_id, required_level, preferred}])."""
    by_role: dict[str, list[dict]] = {r: [] for r in role_ids}
    for ad in ads:
        if ad["role_id"] in by_role:
            by_role[ad["role_id"]].append(ad)

    tf: dict[str, dict[str, float]] = {}
    levels: dict[str, dict[str, dict[str, list[int]]]] = {}
    for r in role_ids:
        n = len(by_role[r])
        counts = {s: 0.0 for s in skill_ids}
        lv: dict[str, dict[str, list[int]]] = {s: {"required": [], "preferred": []} for s in skill_ids}
        for ad in by_role[r]:
            for m in ad["skills"]:
                counts[m["skill_id"]] += PREFERRED_MENTION_WEIGHT if m["preferred"] else 1.0
                lv[m["skill_id"]]["preferred" if m["preferred"] else "required"].append(int(m["required_level"]))
        tf[r] = {s: (counts[s] / n if n else 0.0) for s in skill_ids}
        levels[r] = lv

    n_roles = len(role_ids)
    idf = {}
    for s in skill_ids:
        roles_with = sum(1 for r in role_ids if tf[r][s] >= min_support)
        idf[s] = math.log((1 + n_roles) / (1 + roles_with)) + 1.0

    profiles = []
    for r in role_ids:
        kept = [s for s in skill_ids if tf[r][s] >= min_support]
        raw = {s: tf[r][s] * idf[s] for s in kept}
        total = sum(raw.values())
        skills = []
        for s in kept:
            req = levels[r][s]["required"] or levels[r][s]["preferred"]
            all_lv = levels[r][s]["required"] + levels[r][s]["preferred"]
            skills.append(
                {
                    "skillId": s,
                    "weight": raw[s] / total,
                    "tf": tf[r][s],
                    "idf": idf[s],
                    "requiredLevel": max(1, min(3, _median_level(req))),
                    "levelCounts": [all_lv.count(k) for k in (1, 2, 3)],
                    "adsMentioning": len(all_lv),
                }
            )
        # stable, documented order: highest weight first, then taxonomy order
        skills.sort(key=lambda x: (-x["weight"], skill_ids.index(x["skillId"])))
        profiles.append({"id": r, "adCount": len(by_role[r]), "skills": skills})
    return profiles


def split_ads(ads: list[dict], seed: int) -> tuple[list[int], list[int]]:
    """The single ad train/test split (stratified by parsed role). Profiles use train ads only."""
    from sklearn.model_selection import train_test_split

    strata = [a["role_id"] or "unclassified" for a in ads]
    train, test = train_test_split(list(range(len(ads))), test_size=0.2, stratify=strata, random_state=seed)
    return sorted(train), sorted(test)
