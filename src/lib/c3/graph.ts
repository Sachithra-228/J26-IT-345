/**
 * C3 - Gap-to-Action planner over the knowledge graph (mirror of `Planner` in
 * `ml/c3/src/knowledge-graph/kg.py`; parity-tested).
 *
 * For each of the top gaps: plan prerequisite skills first, then pick, step by step,
 * the action with the highest readiness gain per effort hour (ties: less effort, then
 * id). A project or certification only counts when the student is at most one level
 * below what it demonstrates. Every step carries structured reasons ("why this") that
 * the UI renders in English, Sinhala or Tamil.
 */
import { SKILL_IDS, knowledgeGraph, type ActionType, type GraphNode, type KnowledgeGraph, type RoleProfile } from "./model";
import { proposedGaps } from "./gaps";
import { LAMBDA, proposedReadiness, skillPoints, type SkillLevels } from "./readiness";

export type ActionNode = Extract<GraphNode, { effortHours: number }>;

export type StepReason =
  | { code: "gap"; skillId: string; level: number; requiredLevel: number }
  | { code: "adEvidence"; skillId: string; adShare: number; adCount: number }
  | { code: "gain"; points: number }
  | { code: "efficiency"; effortHours: number; alternatives: number }
  | { code: "prerequisite"; skillId: string; forSkillId: string }
  | { code: "proof"; actionType: ActionType };

export type PlanStep = {
  order: number;
  actionId: string;
  actionType: ActionType;
  kind: "teaches" | "evidences";
  skillId: string;
  fromLevel: number;
  toLevel: number;
  gain: number;
  effortHours: number;
  isPrerequisite: boolean;
  prerequisiteFor: string | null;
  alternatives: number;
};

export type ExplainedStep = PlanStep & { action: ActionNode; reasons: StepReason[] };

export type GapToActionPlan = {
  roleId: string;
  readiness: number;
  projectedReadiness: number;
  steps: ExplainedStep[];
  totalEffortHours: number;
  unplannedGaps: string[];
};

type Option = { ref: string; kind: "teaches" | "evidences"; level: number };

function indexGraph(graph: KnowledgeGraph) {
  const actions = new Map<string, ActionNode>();
  for (const n of graph.nodes) if ("effortHours" in n) actions.set(n.ref, n);
  const options = new Map<string, Option[]>();
  const prereqs = new Map<string, Array<{ skillId: string; minLevel: number }>>();
  for (const e of graph.edges) {
    if (e.type === "teaches" || e.type === "evidences") {
      const skill = e.to.slice(6);
      const list = options.get(skill) ?? [];
      list.push({ ref: e.from.slice(7), kind: e.type, level: e.level });
      options.set(skill, list);
    } else if (e.type === "prerequisite_of") {
      const skill = e.to.slice(6);
      const list = prereqs.get(skill) ?? [];
      list.push({ skillId: e.from.slice(6), minLevel: e.minLevel });
      prereqs.set(skill, list);
    }
  }
  return { actions, options, prereqs };
}

const defaultIndex = indexGraph(knowledgeGraph);

export function getAction(id: string): ActionNode | undefined {
  return defaultIndex.actions.get(id);
}

/** The bare plan, field for field identical to Python's Planner.plan (used by the parity test). */
export function planSteps(
  levels: SkillLevels,
  profile: RoleProfile,
  lambda = LAMBDA,
  graph: KnowledgeGraph = knowledgeGraph
): Omit<GapToActionPlan, "steps"> & { steps: PlanStep[] } {
  const { actions, options, prereqs } = graph === knowledgeGraph ? defaultIndex : indexGraph(graph);
  const items = new Map(profile.skills.map((it) => [it.skillId, it]));
  const current: Record<string, number> = {};
  for (const s of SKILL_IDS) current[s] = levels[s] ?? 0;
  const gaps = proposedGaps(levels, profile, lambda).slice(0, graph.planner.maxGaps);
  const steps: PlanStep[] = [];
  const planned = new Set<string>();

  const points = (skill: string, level: number) => {
    const it = items.get(skill);
    return it ? skillPoints(level, it.requiredLevel, it.weight, lambda).points : 0.0;
  };

  const path = (skill: string, target: number, prerequisiteFor: string | null, chain: string[]) => {
    for (const pre of prereqs.get(skill) ?? []) {
      if (current[pre.skillId] < pre.minLevel && !chain.includes(pre.skillId)) {
        path(pre.skillId, pre.minLevel, skill, [...chain, skill]);
      }
    }
    let n = 0;
    while (current[skill] < target && n < graph.planner.maxStepsPerSkill) {
      const lv = current[skill];
      let best: { ratio: number; effort: number; ref: string; kind: Option["kind"]; reach: number; gain: number } | null = null;
      let count = 0;
      for (const o of options.get(skill) ?? []) {
        if (planned.has(o.ref) || o.level <= lv || (o.kind === "evidences" && lv < o.level - 1)) continue;
        count += 1;
        const reach = Math.min(o.level, target);
        const gain = points(skill, reach) - points(skill, lv);
        const effort = (actions.get(o.ref) as ActionNode).effortHours;
        const ratio = gain / effort;
        const better =
          best === null ||
          ratio > best.ratio ||
          (ratio === best.ratio && (effort < best.effort || (effort === best.effort && o.ref < best.ref)));
        if (better) best = { ratio, effort, ref: o.ref, kind: o.kind, reach, gain };
      }
      if (best === null) break;
      steps.push({
        order: steps.length + 1,
        actionId: best.ref,
        actionType: (actions.get(best.ref) as ActionNode).type,
        kind: best.kind,
        skillId: skill,
        fromLevel: lv,
        toLevel: best.reach,
        gain: best.gain,
        effortHours: best.effort,
        isPrerequisite: prerequisiteFor !== null,
        prerequisiteFor,
        alternatives: count - 1
      });
      planned.add(best.ref);
      current[skill] = best.reach;
      n += 1;
    }
  };

  for (const g of gaps) path(g.skillId, g.requiredLevel, null, []);
  return {
    roleId: profile.id,
    readiness: proposedReadiness(levels, profile, lambda).score,
    projectedReadiness: proposedReadiness(current, profile, lambda).score,
    steps,
    totalEffortHours: steps.reduce((sum, s) => sum + s.effortHours, 0),
    unplannedGaps: gaps.filter((g) => current[g.skillId] < g.requiredLevel).map((g) => g.skillId)
  };
}

function reasonsFor(step: PlanStep, profile: RoleProfile): StepReason[] {
  const item = profile.skills.find((s) => s.skillId === step.skillId);
  const reasons: StepReason[] = [];
  if (step.isPrerequisite && step.prerequisiteFor) {
    reasons.push({ code: "prerequisite", skillId: step.skillId, forSkillId: step.prerequisiteFor });
  }
  if (item) {
    reasons.push({ code: "gap", skillId: step.skillId, level: step.fromLevel, requiredLevel: item.requiredLevel });
    reasons.push({ code: "adEvidence", skillId: step.skillId, adShare: item.tf, adCount: profile.adCount });
  }
  if (step.gain > 0) reasons.push({ code: "gain", points: step.gain });
  reasons.push({ code: "efficiency", effortHours: step.effortHours, alternatives: step.alternatives });
  if (step.kind === "evidences") reasons.push({ code: "proof", actionType: step.actionType });
  return reasons;
}

/** Gap-to-Action plan with a "why this" explanation for every step. */
export function planForRole(levels: SkillLevels, profile: RoleProfile, lambda = LAMBDA): GapToActionPlan {
  const plan = planSteps(levels, profile, lambda);
  return {
    ...plan,
    steps: plan.steps.map((s) => ({ ...s, action: defaultIndex.actions.get(s.actionId) as ActionNode, reasons: reasonsFor(s, profile) }))
  };
}
