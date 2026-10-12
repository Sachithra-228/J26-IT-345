"""
Readiness scoring and skill-gap ranking (C3). Mirrored line for line by
`src/lib/c3/readiness.ts` and `src/lib/c3/gaps.ts`; the parity fixture proves it.

Student input: a level 0-3 for each taxonomy skill (questionnaire, optionally raised
to 1 for skills found in CV text). Role profile: weight w and required level Q per
skill (role_profiles.py).

BASELINE (transparent, unweighted content-based matching)
  readiness = 100 x (required skills the student has at level >= 1) / (required skills)
  gaps      = missing levels, largest shortfall (Q - L) first, then taxonomy order

PROPOSED (weighted, with a gap penalty)
  attainment a = min(L / Q, 1)      shortfall g = max(Q - L, 0) / Q
  points(s)    = 100 x w x (a - LAMBDA x g^2)
  readiness    = clamp(sum of points, 0, 100)
  The per-skill points ARE the explanation: they add up to the score (before the
  clamp). The squared shortfall penalises a completely missing important skill more
  than several partial ones. LAMBDA = 0.5 was fixed before evaluation and not tuned;
  the evaluation reports a sensitivity check on the training split only.
  gaps: every skill with L < Q, ranked by readiness gain if raised to Q
        (gain = 100 x w - points), then weight, then taxonomy order.

All arithmetic uses plain floats in a fixed order so Python and TypeScript agree.
"""
from __future__ import annotations

LAMBDA = 0.5


def skill_points(level: int, required: int, weight: float, lam: float = LAMBDA) -> tuple[float, float, float]:
    attainment = min(level / required, 1.0)
    shortfall = max(required - level, 0) / required
    return attainment, shortfall, 100.0 * weight * (attainment - lam * shortfall * shortfall)


def proposed_readiness(levels: dict[str, int], profile: dict, lam: float = LAMBDA) -> dict:
    total = 0.0
    contributions = []
    for item in profile["skills"]:
        level = levels.get(item["skillId"], 0)
        attainment, shortfall, points = skill_points(level, item["requiredLevel"], item["weight"], lam)
        total += points
        contributions.append(
            {
                "skillId": item["skillId"],
                "level": level,
                "requiredLevel": item["requiredLevel"],
                "weight": item["weight"],
                "attainment": attainment,
                "shortfall": shortfall,
                "points": points,
                "maxPoints": 100.0 * item["weight"],
            }
        )
    return {"roleId": profile["id"], "score": min(max(total, 0.0), 100.0), "rawScore": total, "contributions": contributions}


def baseline_readiness(levels: dict[str, int], profile: dict) -> dict:
    required = [item["skillId"] for item in profile["skills"]]
    covered = sum(1 for s in required if levels.get(s, 0) >= 1)
    return {"roleId": profile["id"], "score": 100.0 * covered / len(required) if required else 0.0, "covered": covered, "required": len(required)}


def rank_roles(levels: dict[str, int], profiles: list[dict], method: str = "proposed", lam: float = LAMBDA) -> list[dict]:
    """Roles ranked by readiness (ties keep catalogue order)."""
    if method == "proposed":
        scored = [proposed_readiness(levels, p, lam) for p in profiles]
    else:
        scored = [baseline_readiness(levels, p) for p in profiles]
    order = sorted(range(len(scored)), key=lambda i: (-scored[i]["score"], i))
    return [scored[i] for i in order]


def proposed_gaps(levels: dict[str, int], profile: dict, skill_order: list[str], lam: float = LAMBDA) -> list[dict]:
    gaps = []
    for item in profile["skills"]:
        level = levels.get(item["skillId"], 0)
        if level >= item["requiredLevel"]:
            continue
        _, shortfall, points = skill_points(level, item["requiredLevel"], item["weight"], lam)
        _, _, next_points = skill_points(level + 1, item["requiredLevel"], item["weight"], lam)
        gaps.append(
            {
                "skillId": item["skillId"],
                "level": level,
                "requiredLevel": item["requiredLevel"],
                "weight": item["weight"],
                "shortfall": shortfall,
                "gainToRequired": 100.0 * item["weight"] - points,
                "gainNextLevel": next_points - points,
            }
        )
    gaps.sort(key=lambda g: (-g["gainToRequired"], -g["weight"], skill_order.index(g["skillId"])))
    return gaps


def baseline_gaps(levels: dict[str, int], profile: dict, skill_order: list[str]) -> list[dict]:
    gaps = [
        {"skillId": item["skillId"], "level": levels.get(item["skillId"], 0), "requiredLevel": item["requiredLevel"]}
        for item in profile["skills"]
        if levels.get(item["skillId"], 0) < item["requiredLevel"]
    ]
    gaps.sort(key=lambda g: (-(g["requiredLevel"] - g["level"]), skill_order.index(g["skillId"])))
    return gaps
