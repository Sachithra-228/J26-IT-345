"""
Gap-to-Action knowledge graph (C3).

Nodes  Skill, Role, Module, Project, Certification, Resource
Edges  requires        Role  -> Skill   (weight, requiredLevel; from the ad-derived role profiles)
       prerequisite_of Skill -> Skill   (minLevel of the first skill needed before the second)
       teaches         Module / Resource -> Skill    (toLevel it brings a learner to)
       evidences       Project / Certification -> Skill (level it demonstrates)

The hand-authored content lives in ml/c3/data/reference/gap-to-action-source.json; the
`requires` edges come from the exported model. build_graph() writes the combined graph
to src/lib/c3/model/knowledge-graph.json, which `src/lib/c3/graph.ts` reads.

Planner (mirrored by graph.ts; parity-tested). For each of the top gaps (readiness.
proposed_gaps order):
  1. prerequisites first: for each prerequisite_of edge into the skill whose minLevel
     the student has not reached, plan that skill up to minLevel (recursively);
  2. then repeat up to MAX_STEPS_PER_SKILL times while the skill is below its target:
     among actions not yet in the plan that raise the skill above its current level
     (an evidence action - project or certification - also needs the student to be at
     most one level below what it demonstrates), choose the highest readiness gain per
     effort hour; ties -> less effort -> id. The step moves the skill to
     min(action level, target).
Projected readiness = proposed readiness with the planned levels. Gains use the role
weights, so a prerequisite skill the role does not list has gain 0 (it is chosen for
being cheapest and is labelled as a prerequisite).
"""
from __future__ import annotations

import readiness as R

ACTION_TYPES = ("Module", "Project", "Certification", "Resource")
MAX_GAPS = 5
MAX_STEPS_PER_SKILL = 3


def build_graph(source: dict, model: dict, provenance_note: str) -> dict:
    skill_ids = [s["id"] for s in model["taxonomy"]["skills"]]
    nodes = [{"id": f"skill:{s}", "type": "Skill", "ref": s} for s in skill_ids]
    nodes += [{"id": f"role:{r['id']}", "type": "Role", "ref": r["id"]} for r in model["roles"]]
    edges = []
    for r in model["roles"]:
        for item in r["skills"]:
            edges.append({"type": "requires", "from": f"role:{r['id']}", "to": f"skill:{item['skillId']}",
                          "weight": item["weight"], "requiredLevel": item["requiredLevel"]})
    for p in source["prerequisites"]:
        edges.append({"type": "prerequisite_of", "from": f"skill:{p['from']}", "to": f"skill:{p['to']}", "minLevel": p["minLevel"]})
    for a in source["actions"]:
        node = {"id": f"action:{a['id']}", "type": a["type"], "ref": a["id"], "title": a["title"],
                "description": a.get("description", ""), "effortHours": a["effortHours"]}
        for k in ("url", "provider"):
            if a.get(k):
                node[k] = a[k]
        nodes.append(node)
        for t in a["teaches"]:
            edges.append({"type": "teaches", "from": f"action:{a['id']}", "to": f"skill:{t['skillId']}", "level": t["toLevel"]})
        for e in a["evidences"]:
            edges.append({"type": "evidences", "from": f"action:{a['id']}", "to": f"skill:{e['skillId']}", "level": e["level"]})
    graph = {
        "schemaVersion": "1.0.0",
        "modelVersion": model["version"],
        "provenance": source["provenance"] + " " + provenance_note,
        "planner": {"maxGaps": MAX_GAPS, "maxStepsPerSkill": MAX_STEPS_PER_SKILL},
        "nodes": nodes,
        "edges": edges,
    }
    validate_graph(graph)
    return graph


def validate_graph(graph: dict) -> None:
    ids = {n["id"] for n in graph["nodes"]}
    if len(ids) != len(graph["nodes"]):
        raise ValueError("duplicate node id")
    types = {n["id"]: n["type"] for n in graph["nodes"]}
    allowed = {
        "requires": ("Role", "Skill"),
        "prerequisite_of": ("Skill", "Skill"),
        "teaches": (("Module", "Resource"), "Skill"),
        "evidences": (("Project", "Certification"), "Skill"),
    }
    for e in graph["edges"]:
        if e["from"] not in ids or e["to"] not in ids:
            raise ValueError(f"dangling edge {e}")
        src_ok, dst_ok = allowed[e["type"]]
        src_ok = (src_ok,) if isinstance(src_ok, str) else src_ok
        if types[e["from"]] not in src_ok or types[e["to"]] != dst_ok:
            raise ValueError(f"edge {e['type']} not allowed between {types[e['from']]} and {types[e['to']]}")
        if e["type"] in ("teaches", "evidences") and e["level"] not in (1, 2, 3):
            raise ValueError(f"bad level on {e}")
    for n in graph["nodes"]:
        if n["type"] in ACTION_TYPES and not (0 < n["effortHours"] <= 500):
            raise ValueError(f"{n['id']}: effortHours must be in (0, 500]")
    # prerequisite_of must be acyclic (Kahn's algorithm)
    pre = [(e["from"], e["to"]) for e in graph["edges"] if e["type"] == "prerequisite_of"]
    indeg = {n: 0 for n in ids}
    for _, b in pre:
        indeg[b] += 1
    queue = [n for n, d in indeg.items() if d == 0]
    seen = 0
    while queue:
        n = queue.pop()
        seen += 1
        for a, b in pre:
            if a == n:
                indeg[b] -= 1
                if indeg[b] == 0:
                    queue.append(b)
    if seen != len(ids):
        raise ValueError("prerequisite_of edges contain a cycle")


class Planner:
    def __init__(self, graph: dict):
        self.actions = {n["ref"]: n for n in graph["nodes"] if n["type"] in ACTION_TYPES}
        self.options: dict[str, list[tuple[str, str, int]]] = {}  # skill -> [(action ref, kind, level)] in edge order
        self.prereqs: dict[str, list[tuple[str, int]]] = {}
        for e in graph["edges"]:
            if e["type"] in ("teaches", "evidences"):
                self.options.setdefault(e["to"][6:], []).append((e["from"][7:], e["type"], e["level"]))
            elif e["type"] == "prerequisite_of":
                self.prereqs.setdefault(e["to"][6:], []).append((e["from"][6:], e["minLevel"]))
        self.max_gaps = graph["planner"]["maxGaps"]
        self.max_steps = graph["planner"]["maxStepsPerSkill"]

    def plan(self, levels: dict[str, int], profile: dict, skill_order: list[str], lam: float = R.LAMBDA) -> dict:
        items = {it["skillId"]: it for it in profile["skills"]}
        current = {s: levels.get(s, 0) for s in skill_order}
        gaps = R.proposed_gaps(levels, profile, skill_order, lam)[: self.max_gaps]
        steps: list[dict] = []
        planned: set[str] = set()

        def points(skill: str, level: int) -> float:
            it = items.get(skill)
            return R.skill_points(level, it["requiredLevel"], it["weight"], lam)[2] if it else 0.0

        def path(skill: str, target: int, prerequisite_for: str | None, chain: tuple[str, ...]) -> None:
            for pre, min_level in self.prereqs.get(skill, []):
                if current[pre] < min_level and pre not in chain:
                    path(pre, min_level, skill, chain + (skill,))
            n = 0
            while current[skill] < target and n < self.max_steps:
                lv = current[skill]
                best = None
                count = 0
                for ref, kind, to in self.options.get(skill, []):
                    if ref in planned or to <= lv or (kind == "evidences" and lv < to - 1):
                        continue
                    count += 1
                    reach = min(to, target)
                    gain = points(skill, reach) - points(skill, lv)
                    effort = self.actions[ref]["effortHours"]
                    key = (-(gain / effort), effort, ref)
                    if best is None or key < best[0]:
                        best = (key, ref, kind, reach, gain, effort)
                if best is None:
                    break
                _, ref, kind, reach, gain, effort = best
                steps.append({
                    "order": len(steps) + 1,
                    "actionId": ref,
                    "actionType": self.actions[ref]["type"],
                    "kind": kind,
                    "skillId": skill,
                    "fromLevel": lv,
                    "toLevel": reach,
                    "gain": gain,
                    "effortHours": effort,
                    "isPrerequisite": prerequisite_for is not None,
                    "prerequisiteFor": prerequisite_for,
                    "alternatives": count - 1,
                })
                planned.add(ref)
                current[skill] = reach
                n += 1

        for g in gaps:
            path(g["skillId"], g["requiredLevel"], None, ())
        before = R.proposed_readiness(levels, profile, lam)["score"]
        after = R.proposed_readiness(current, profile, lam)["score"]
        return {
            "roleId": profile["id"],
            "readiness": before,
            "projectedReadiness": after,
            "steps": steps,
            "totalEffortHours": sum(s["effortHours"] for s in steps),
            "unplannedGaps": [g["skillId"] for g in gaps if current[g["skillId"]] < g["requiredLevel"]],
        }
