import { assessCareer, cvSkillIdsFromText, mergeLevels } from "@/lib/c3/assessment";
import { extractSkills, stripPii, tokenize } from "@/lib/c3/extract";
import { proposedGaps } from "@/lib/c3/gaps";
import { getAction, planForRole } from "@/lib/c3/graph";
import { ROLE_IDS, SKILL_IDS, careerModel, careerModelInfo, getRole, knowledgeGraph, type RoleProfile } from "@/lib/c3/model";
import { proposedReadiness, readinessBand, skillPoints } from "@/lib/c3/readiness";
import { assessmentRequestSchema, careerProfileSchema, MAX_CV_CHARS, planRequestSchema } from "@/lib/c3/validation";

const qa = getRole("qa_engineer") as RoleProfile;

describe("C3 model artefacts", () => {
  it("are labelled synthetic and internally consistent", () => {
    expect(careerModelInfo.syntheticTraining).toBe(true);
    expect(careerModel.warning).toMatch(/SYNTHETIC/);
    expect(SKILL_IDS.length).toBeGreaterThanOrEqual(24);
    expect(ROLE_IDS).toHaveLength(12);
    for (const role of careerModel.roles) {
      const sum = role.skills.reduce((s, x) => s + x.weight, 0);
      expect(sum).toBeCloseTo(1, 12);
      for (const s of role.skills) expect(SKILL_IDS).toContain(s.skillId);
    }
    expect(knowledgeGraph.modelVersion).toBe(careerModel.version);
  });

  it("every skill and role has English, Sinhala and Tamil labels", () => {
    for (const s of careerModel.taxonomy.skills) expect(s.label.si && s.label.ta && s.label.en).toBeTruthy();
    for (const r of careerModel.roles) expect(r.label.si && r.label.ta && r.label.en).toBeTruthy();
  });
});

describe("readiness explanation", () => {
  it("contributions add up to the score and show what each skill is worth", () => {
    const levels = { testing_manual: 2, test_automation: 1, communication: 2 };
    const r = proposedReadiness(levels, qa);
    const sum = r.contributions.reduce((s, c) => s + c.points, 0);
    expect(sum).toBeCloseTo(r.rawScore, 10);
    for (const c of r.contributions) expect(c.points).toBeLessThanOrEqual(c.maxPoints + 1e-12);
    expect(skillPoints(0, 2, 0.4).points).toBeCloseTo(-20, 10);
  });

  it("bands the score for wording only", () => {
    expect(readinessBand(85)).toBe("strong");
    expect(readinessBand(55)).toBe("developing");
    expect(readinessBand(10)).toBe("early");
  });

  it("ranks the gap that adds the most readiness first", () => {
    const gaps = proposedGaps({ communication: 2 }, qa);
    for (let i = 1; i < gaps.length; i++) expect(gaps[i - 1].gainToRequired).toBeGreaterThanOrEqual(gaps[i].gainToRequired);
    expect(gaps[0].skillId).toBe(qa.skills[0].skillId);
  });
});

describe("Gap-to-Action plan", () => {
  it("explains every step and links to a real graph action", () => {
    const plan = planForRole({}, getRole("data_scientist") as RoleProfile);
    expect(plan.steps.length).toBeGreaterThan(0);
    for (const step of plan.steps) {
      expect(getAction(step.actionId)).toBeDefined();
      expect(step.action.title.length).toBeGreaterThan(3);
      expect(step.reasons.some((r) => r.code === "efficiency")).toBe(true);
      if (step.isPrerequisite) expect(step.reasons[0]).toMatchObject({ code: "prerequisite", forSkillId: step.prerequisiteFor });
      if (step.kind === "evidences") expect(step.reasons.some((r) => r.code === "proof")).toBe(true);
    }
    expect(plan.projectedReadiness).toBeGreaterThan(plan.readiness);
  });
});

describe("CV handling", () => {
  it("strips PII before extracting and never returns the raw text", () => {
    const cv = "Name: Kamal Perera\nEmail: kamal@example.com, phone 077 123 4567, NIC 200012345678\nSkills: Python, Docker, Figma";
    const { text, redactions } = stripPii(cv);
    expect(text).not.toMatch(/Kamal|kamal@|4567|200012345678/);
    expect(redactions.email + redactions.phone + redactions.nic + redactions.labelled).toBeGreaterThanOrEqual(4);
    const ext = extractSkills(cv);
    expect(ext.skills.map((s) => s.skillId)).toEqual(["python", "containers", "ui_ux"]);
    expect(JSON.stringify(ext)).not.toContain("Kamal");
  });

  it("tokenises technology names like the Python side", () => {
    expect(tokenize("Node.js, C#, .NET and CI/CD.")).toEqual(["node.js", "c#", ".net", "and", "ci", "cd"]);
  });

  it("merges CV evidence as Basic level without lowering questionnaire answers", () => {
    const { levels, sources } = mergeLevels({ python: 3, linux: 0 }, ["python", "linux"]);
    expect(levels.python).toBe(3);
    expect(levels.linux).toBe(1);
    expect(sources.python).toBe("both");
    expect(sources.linux).toBe("cv");
    expect(cvSkillIdsFromText("   ")).toEqual([]);
  });
});

describe("assessCareer", () => {
  it("returns ranked roles, baseline ranks and a plan per target role", () => {
    const result = assessCareer(
      { yearOfStudy: 3, targetRoleIds: ["qa_engineer", "business_analyst"], skills: { testing_manual: 2, communication: 2 } },
      ["agile"]
    );
    expect(result.roles).toHaveLength(12);
    expect(result.baselineRoles).toHaveLength(12);
    expect(result.targets.map((t) => t.roleId)).toEqual(["qa_engineer", "business_analyst"]);
    expect(result.levels.agile).toBe(1);
    expect(result.syntheticTraining).toBe(true);
    expect(result.targets[0].plan.roleId).toBe("qa_engineer");
  });
});

describe("validation", () => {
  const profile = { yearOfStudy: 4, targetRoleIds: ["software_engineer"], skills: { prog_oop: 2 } };

  it("accepts a valid profile and rejects out-of-range or unknown values", () => {
    expect(careerProfileSchema.safeParse(profile).success).toBe(true);
    expect(careerProfileSchema.safeParse({ ...profile, yearOfStudy: 2 }).success).toBe(false);
    expect(careerProfileSchema.safeParse({ ...profile, skills: { prog_oop: 4 } }).success).toBe(false);
    expect(careerProfileSchema.safeParse({ ...profile, skills: { cooking: 2 } }).success).toBe(false);
    expect(careerProfileSchema.safeParse({ ...profile, targetRoleIds: ["astronaut"] }).success).toBe(false);
    expect(careerProfileSchema.safeParse({ ...profile, targetRoleIds: [] }).success).toBe(false);
    expect(careerProfileSchema.safeParse({ ...profile, targetRoleIds: ["qa_engineer", "qa_engineer"] }).success).toBe(false);
  });

  it("requires consent to save, and separate consent for CV text", () => {
    expect(assessmentRequestSchema.safeParse({ profile, consent: true }).success).toBe(true);
    expect(assessmentRequestSchema.safeParse({ profile, consent: false }).success).toBe(false);
    expect(assessmentRequestSchema.safeParse({ profile, consent: true, cvText: "Python" }).success).toBe(false);
    expect(assessmentRequestSchema.safeParse({ profile, consent: true, cvText: "Python", cvConsent: true }).success).toBe(true);
    expect(
      assessmentRequestSchema.safeParse({ profile, consent: true, cvText: "x".repeat(MAX_CV_CHARS + 1), cvConsent: true }).success
    ).toBe(false);
    // unknown fields (e.g. a client-supplied score) are rejected, not silently trusted
    expect(assessmentRequestSchema.safeParse({ profile, consent: true, readiness: 99 }).success).toBe(false);
  });

  it("validates plan requests", () => {
    expect(planRequestSchema.safeParse({ profile, roleId: "devops_engineer" }).success).toBe(true);
    expect(planRequestSchema.safeParse({ profile, roleId: "nope" }).success).toBe(false);
  });
});
