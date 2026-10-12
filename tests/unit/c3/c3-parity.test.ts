/**
 * C3 Python <-> TypeScript parity.
 *
 * tests/fixtures/c3-readiness-parity.json is written by `python ml/c3/run_pipeline.py parity`
 * from the Python reference implementation (synthetic hold-out students, hand-written
 * ads, synthetic CVs and PII edge cases). The TypeScript runtime must reproduce every
 * id and ordering exactly and every number within 1e-9 (the arithmetic order is the
 * same on both sides, so in practice the numbers are bit-identical).
 */
import fixture from "../../fixtures/c3-readiness-parity.json";
import { extractSkills, fuzzRatio } from "@/lib/c3/extract";
import { baselineGaps, proposedGaps } from "@/lib/c3/gaps";
import { planSteps } from "@/lib/c3/graph";
import { careerModel, getRole, type RoleProfile } from "@/lib/c3/model";
import { baselineReadiness, proposedReadiness, rankRoles, rankRolesBaseline } from "@/lib/c3/readiness";

type Fixture = {
  modelVersion: string;
  students: Array<{
    id: string;
    levels: Record<string, number>;
    targetRoleId: string;
    proposed: Array<{ roleId: string; score: number; rawScore: number; points: number[] }>;
    baseline: number[];
    rankedRoles: string[];
    baselineRankedRoles: string[];
    gaps: Array<{ skillId: string; gainToRequired: number; gainNextLevel: number }>;
    baselineGaps: string[];
    plan: {
      readiness: number;
      projectedReadiness: number;
      totalEffortHours: number;
      unplannedGaps: string[];
      steps: Array<Record<string, unknown> & { gain: number }>;
    };
  }>;
  extraction: Array<{
    text: string;
    skillIds: string[];
    redactions: Record<string, number>;
    tokenCount: number;
    matches: Array<{ skillId: string; text: string; start: number; method: string; score: number }>;
  }>;
  fuzz: Array<[string, string, number]>;
};

const fx = fixture as unknown as Fixture;
const TOL = 1e-9;
const role = (id: string) => getRole(id) as RoleProfile;

describe("C3 parity fixture", () => {
  it("was generated from the bundled model version", () => {
    expect(fx.modelVersion).toBe(careerModel.version);
    expect(fx.students.length).toBeGreaterThanOrEqual(60);
    expect(fx.extraction.length).toBeGreaterThanOrEqual(30);
  });
});

describe.each(fx.students.map((s) => [s.id, s] as const))("student %s", (_id, s) => {
  it("proposed readiness and per-skill contributions match Python", () => {
    careerModel.roles.forEach((profile, i) => {
      const ts = proposedReadiness(s.levels, profile);
      const py = s.proposed[i];
      expect(ts.roleId).toBe(py.roleId);
      expect(Math.abs(ts.score - py.score)).toBeLessThan(TOL);
      expect(Math.abs(ts.rawScore - py.rawScore)).toBeLessThan(TOL);
      expect(ts.contributions).toHaveLength(py.points.length);
      ts.contributions.forEach((c, k) => expect(Math.abs(c.points - py.points[k])).toBeLessThan(TOL));
    });
  });

  it("baseline readiness and both role rankings match Python", () => {
    careerModel.roles.forEach((profile, i) => {
      expect(Math.abs(baselineReadiness(s.levels, profile).score - s.baseline[i])).toBeLessThan(TOL);
    });
    expect(rankRoles(s.levels).map((r) => r.roleId)).toEqual(s.rankedRoles);
    expect(rankRolesBaseline(s.levels).map((r) => r.roleId)).toEqual(s.baselineRankedRoles);
  });

  it("gap rankings match Python", () => {
    const gaps = proposedGaps(s.levels, role(s.targetRoleId));
    expect(gaps.map((g) => g.skillId)).toEqual(s.gaps.map((g) => g.skillId));
    gaps.forEach((g, k) => {
      expect(Math.abs(g.gainToRequired - s.gaps[k].gainToRequired)).toBeLessThan(TOL);
      expect(Math.abs(g.gainNextLevel - s.gaps[k].gainNextLevel)).toBeLessThan(TOL);
    });
    expect(baselineGaps(s.levels, role(s.targetRoleId)).map((g) => g.skillId)).toEqual(s.baselineGaps);
  });

  it("Gap-to-Action plan matches Python step for step", () => {
    const plan = planSteps(s.levels, role(s.targetRoleId));
    expect(Math.abs(plan.readiness - s.plan.readiness)).toBeLessThan(TOL);
    expect(Math.abs(plan.projectedReadiness - s.plan.projectedReadiness)).toBeLessThan(TOL);
    expect(plan.totalEffortHours).toBe(s.plan.totalEffortHours);
    expect(plan.unplannedGaps).toEqual(s.plan.unplannedGaps);
    expect(plan.steps).toHaveLength(s.plan.steps.length);
    plan.steps.forEach((st, k) => {
      const { gain, ...rest } = s.plan.steps[k];
      expect(Math.abs(st.gain - gain)).toBeLessThan(TOL);
      expect(st).toMatchObject(rest);
    });
  });
});

describe("skill extraction and PII stripping match Python", () => {
  it.each(fx.extraction.map((e, i) => [i, e] as const))("text %i", (_i, e) => {
    const ts = extractSkills(e.text);
    expect(ts.skills.map((s) => s.skillId)).toEqual(e.skillIds);
    expect(ts.redactions).toEqual(e.redactions);
    expect(ts.tokenCount).toBe(e.tokenCount);
    const matches = ts.skills.flatMap((s) => s.matches);
    expect(matches.map(({ skillId, text, start, method }) => ({ skillId, text, start, method }))).toEqual(
      e.matches.map(({ skillId, text, start, method }) => ({ skillId, text, start, method }))
    );
    matches.forEach((m, k) => expect(Math.abs(m.score - e.matches[k].score)).toBeLessThan(TOL));
  });

  it("fuzzRatio equals rapidfuzz fuzz.ratio", () => {
    for (const [a, b, ratio] of fx.fuzz) expect(Math.abs(fuzzRatio(a, b) - ratio)).toBeLessThan(TOL);
  });
});
