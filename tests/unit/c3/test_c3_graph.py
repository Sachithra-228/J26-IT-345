"""C3 Phase 3 tests: knowledge-graph validation and the Gap-to-Action planner."""
import copy

import pytest

import c3_common as C
import readiness as R
from kg import Planner, build_graph, validate_graph


@pytest.fixture(scope="module")
def model():
    return C.load_json(C.MODEL_OUT)


@pytest.fixture(scope="module")
def graph(model):
    return build_graph(C.load_json(C.KG_SOURCE_PATH), model, "test")


@pytest.fixture(scope="module")
def planner(graph):
    return Planner(graph)


def _profile(model, role_id):
    return next(r for r in model["roles"] if r["id"] == role_id)


def test_graph_has_all_node_and_edge_types(graph):
    assert {n["type"] for n in graph["nodes"]} == {"Skill", "Role", "Module", "Project", "Certification", "Resource"}
    assert {e["type"] for e in graph["edges"]} == {"requires", "prerequisite_of", "teaches", "evidences"}


def test_every_skill_can_be_learned_from_zero_and_evidenced(graph):
    teaches = {e["to"] for e in graph["edges"] if e["type"] == "teaches"}
    evidences = {e["to"] for e in graph["edges"] if e["type"] == "evidences"}
    for n in graph["nodes"]:
        if n["type"] == "Skill":
            assert n["id"] in teaches and n["id"] in evidences, n["id"]


def test_validation_rejects_cycles_and_bad_edges(graph):
    cyclic = copy.deepcopy(graph)
    cyclic["edges"].append({"type": "prerequisite_of", "from": "skill:machine_learning", "to": "skill:python", "minLevel": 1})
    with pytest.raises(ValueError, match="cycle"):
        validate_graph(cyclic)
    wrong = copy.deepcopy(graph)
    wrong["edges"].append({"type": "teaches", "from": "role:qa_engineer", "to": "skill:python", "level": 1})
    with pytest.raises(ValueError, match="not allowed"):
        validate_graph(wrong)
    dangling = copy.deepcopy(graph)
    dangling["edges"].append({"type": "teaches", "from": "action:NOPE", "to": "skill:python", "level": 1})
    with pytest.raises(ValueError, match="dangling"):
        validate_graph(dangling)


def test_plan_puts_prerequisites_first(model, planner):
    levels = {"prog_oop": 2, "communication": 2}
    plan = planner.plan(levels, _profile(model, "data_scientist"), C.skill_ids())
    order = [s["skillId"] for s in plan["steps"]]
    first_ml = order.index("machine_learning")
    assert "python" in order[:first_ml] and "statistics" in order[:first_ml]
    assert all(s["isPrerequisite"] for s in plan["steps"][:first_ml])


def test_plan_steps_are_unique_valid_and_explained(model, planner):
    levels = {s: 0 for s in C.skill_ids()}
    for role in model["roles"]:
        plan = planner.plan(levels, role, C.skill_ids())
        ids = [s["actionId"] for s in plan["steps"]]
        assert len(ids) == len(set(ids))
        for st in plan["steps"]:
            assert st["toLevel"] > st["fromLevel"]
        assert plan["projectedReadiness"] >= plan["readiness"]
        assert plan["totalEffortHours"] == sum(s["effortHours"] for s in plan["steps"])


def test_evidence_actions_need_a_starting_level(model, planner):
    evidence_steps = 0
    for role in model["roles"]:
        for st in planner.plan({}, role, C.skill_ids())["steps"]:
            if st["kind"] == "evidences":
                evidence_steps += 1
                demonstrated = next(lv for ref, kind, lv in planner.options[st["skillId"]] if ref == st["actionId"] and kind == "evidences")
                assert st["fromLevel"] >= demonstrated - 1
    assert evidence_steps > 0


def test_projected_readiness_matches_planned_levels(model, planner):
    profile = _profile(model, "qa_engineer")
    levels = {"testing_manual": 1, "communication": 1}
    plan = planner.plan(levels, profile, C.skill_ids())
    planned = {s: levels.get(s, 0) for s in C.skill_ids()}
    for st in plan["steps"]:
        planned[st["skillId"]] = st["toLevel"]
    assert plan["projectedReadiness"] == pytest.approx(R.proposed_readiness(planned, profile)["score"])


def test_no_plan_when_role_requirements_are_met(model, planner):
    profile = _profile(model, "ui_ux_designer")
    levels = {it["skillId"]: it["requiredLevel"] for it in profile["skills"]}
    plan = planner.plan(levels, profile, C.skill_ids())
    assert plan["steps"] == [] and plan["readiness"] == pytest.approx(100.0)
