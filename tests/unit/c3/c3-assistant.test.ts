import { answerIntent, answerQuestion, getIntent, INTENTS, matchIntent, MIN_CONFIDENCE, type AssistantAnswer, type AssistantContext, type IntentId } from "@/lib/c3/assistant";
import { getAssistantText } from "@/lib/c3/assistant-text";
import { assessCareer } from "@/lib/c3/assessment";
import { proposedGaps } from "@/lib/c3/gaps";
import { planForRole } from "@/lib/c3/graph";
import { INTERVIEW_QUESTIONS } from "@/lib/c3/interview-bank";
import { scoreAnswer, summariseSession } from "@/lib/c3/interview";
import { getRole, getSkill, knowledgeGraph, type RoleProfile } from "@/lib/c3/model";
import type { CareerProfile } from "@/lib/c3/validation";

const profile: CareerProfile = {
  yearOfStudy: 3,
  targetRoleIds: ["software_engineer", "qa_engineer"],
  skills: { prog_oop: 2, databases_sql: 2, version_control: 1, communication: 2, testing_manual: 1 }
} as CareerProfile;
const assessment = assessCareer(profile);
const ctx: AssistantContext = { assessment, interview: null };
const empty: AssistantContext = { assessment: null, interview: null };
const role = (id: string) => getRole(id) as RoleProfile;
const skill = (id: string) => getSkill(id)!.label.en;
const all = (a: AssistantAnswer) => a.lines.map((l) => l.text).join("\n");
const ids = INTENTS.map((i) => i.id);

describe("assistant intent catalogue", () => {
  it("has unique intents whose follow-ups are real intents", () => {
    expect(new Set(ids).size).toBe(ids.length);
    for (const intent of INTENTS) {
      expect(intent.cues.length).toBeGreaterThan(0);
      for (const f of intent.followUps) expect(ids).toContain(f);
      for (const c of intent.cues) expect(c).toBe(c.toLowerCase());
    }
  });

  it("answers every intent from a full context, with its sources", () => {
    for (const id of ids) {
      const a = answerIntent(id, ctx, "en");
      expect(a.grounded).toBe(true);
      expect(a.intent).toBe(id);
      expect(a.lines.length).toBeGreaterThan(0);
      expect(a.sources).toEqual(getIntent(id).sources);
    }
  });
});

describe("intent matching", () => {
  it.each<[string, IntentId]>([
    ["How ready am I?", "readiness"],
    ["Why is my readiness so low?", "scoreReason"],
    ["Which role suits me best?", "bestRole"],
    ["What are my biggest gaps?", "gaps"],
    ["What should I do next?", "nextStep"],
    ["Compare software engineer and QA engineer", "compareRoles"],
    ["what does a business analyst need", "roleRequirements"],
    ["How can I learn Docker?", "resources"],
    ["Any certifications for cloud?", "certifications"],
    ["How can I do better in my interview?", "interview"],
    ["Is my data private?", "about"],
    ["help", "help"],
    ["redyness score", "readiness"],
    ["certifcation", "certifications"],
    ["මගේ සූදානම අඩු ඇයි?", "scoreReason"],
    ["මගේ හිඩැස් මොනවාද", "gaps"],
    ["அடுத்து என்ன செய்ய வேண்டும்", "nextStep"],
    ["சான்றிதழ்", "certifications"]
  ])("%s -> %s", (question, intent) => {
    expect(matchIntent(question).intent).toBe(intent);
  });

  it("pulls out the roles and skills named, without reading role words as skills", () => {
    const m = matchIntent("should i be a ml engineer or a data analyst");
    expect(m.intent).toBe("compareRoles");
    expect(m.roleIds).toEqual(["data_scientist", "data_analyst"]);
    expect(m.skillIds).toEqual([]);
    expect(matchIntent("How do I learn Docker and SQL?").skillIds).toEqual(["containers", "databases_sql"]);
    expect(matchIntent("certifications for cloud").skillIds).toEqual(["cloud"]);
  });

  it("falls back on what was named when there are no cue words", () => {
    expect(matchIntent("data scientist?").intent).toBe("roleRequirements");
    expect(matchIntent("docker").intent).toBe("resources");
  });

  it("does not guess when nothing matches", () => {
    const m = matchIntent("asdf qwerty");
    expect(m.confidence).toBeLessThan(MIN_CONFIDENCE);
    const a = answerQuestion("asdf qwerty", ctx, "en");
    expect(a.grounded).toBe(false);
    expect(a.lines[0].text).toBe(getAssistantText("en").unknown);
  });
});

describe("grounded answers", () => {
  it("readiness quotes the engine's score and rank", () => {
    const se = assessment.roles.findIndex((r) => r.roleId === "software_engineer");
    const text = all(answerQuestion("How ready am I?", ctx, "en"));
    expect(text).toContain(`Software Engineer is ${Math.round(assessment.roles[se].score)}/100`);
    expect(text).toContain(`ranks ${se + 1} of ${assessment.roles.length}`);
  });

  it("score reasons are the role's largest contributions and missing points", () => {
    const r = assessment.roles.find((x) => x.roleId === "software_engineer")!;
    const top = [...r.contributions].sort((x, y) => y.points - x.points)[0];
    const held = r.contributions.filter((c) => c.level < c.requiredLevel).sort((x, y) => y.maxPoints - y.points - (x.maxPoints - x.points))[0];
    const text = all(answerQuestion("Why did I get this score?", ctx, "en"));
    expect(text).toContain(`${skill(top.skillId)}: +${top.points.toFixed(1)} points`);
    expect(text).toContain(`${skill(held.skillId)}: ${(held.maxPoints - held.points).toFixed(1)} points still to gain`);
  });

  it("gaps follow the ranked gap list for the role asked about", () => {
    const gaps = proposedGaps(assessment.levels, role("data_scientist"));
    const a = answerQuestion("what are my gaps for data scientist", ctx, "en");
    const bullets = a.lines.filter((l) => l.kind === "bullet").map((l) => l.text);
    expect(bullets.length).toBe(Math.min(5, gaps.length));
    bullets.forEach((b, i) => expect(b).toContain(`${skill(gaps[i].skillId)}:`));
    expect(bullets[0]).toContain(`+${gaps[0].gainToRequired.toFixed(1)} points`);
  });

  it("answers a named skill directly", () => {
    const text = all(answerQuestion("how big is my sql gap for qa", ctx, "en"));
    expect(text).toContain("You already meet the Relational databases and SQL level that QA Engineer ads ask for.");
  });

  it("the next step is the first Gap-to-Action step, with its reasons and the plan total", () => {
    const plan = assessment.targets[0].plan;
    const a = answerQuestion("What should I do next?", ctx, "en");
    expect(a.lines[0].text).toContain(`"${plan.steps[0].action.title}"`);
    expect(all(a)).toContain(`${plan.steps.length} steps, about ${plan.totalEffortHours} hours`);
    expect(a.lines.filter((l) => l.kind === "bullet").length).toBeGreaterThanOrEqual(plan.steps[0].reasons.length);
  });

  it("plans for a role that is not a target the same way the engine does", () => {
    const plan = planForRole(assessment.levels, role("devops_engineer"));
    const a = answerQuestion("next steps for devops", ctx, "en");
    expect(a.lines[0].text).toContain(plan.steps[0].action.title);
  });

  it("compares the two roles named, with shared and separate gaps", () => {
    const a = answerQuestion("compare software engineer vs qa engineer", ctx, "en");
    const se = Math.round(assessment.roles.find((r) => r.roleId === "software_engineer")!.score);
    const qa = Math.round(assessment.roles.find((r) => r.roleId === "qa_engineer")!.score);
    const text = all(a);
    expect(text).toContain(`Software Engineer: ${se}/100`);
    expect(text).toContain(`QA Engineer: ${qa}/100`);
    expect(text).toContain(`${Math.abs(se - qa)} points closer`);
    expect(text).toContain("Gaps they share");
  });

  it("role requirements come from the role profile and work without an analysis", () => {
    const r = role("devops_engineer");
    const a = answerQuestion("what does a devops engineer need", empty, "en");
    expect(a.grounded).toBe(true);
    expect(a.lines[0].text).toContain(`(${r.adCount} ads analysed)`);
    const heaviest = [...r.skills].sort((x, y) => y.weight - x.weight)[0];
    expect(a.lines[1].text).toContain(skill(heaviest.skillId));
    expect(a.lines[1].text).not.toContain("you:");
  });

  it("resources and certifications only list actions that exist in the knowledge graph for that skill", () => {
    const linked = (skillId: string) =>
      new Set(
        knowledgeGraph.edges
          .filter((e) => (e.type === "teaches" || e.type === "evidences") && e.to === `skill:${skillId}`)
          .map((e) => (knowledgeGraph.nodes.find((n) => n.id === e.from) as { title: string }).title)
      );
    const res = answerQuestion("How can I learn Docker?", ctx, "en").lines.filter((l) => l.kind === "bullet");
    expect(res.length).toBeGreaterThan(0);
    for (const l of res) expect([...linked("containers")].some((title) => l.text.startsWith(title))).toBe(true);

    const certs = answerQuestion("certifications for cloud", empty, "en").lines.filter((l) => l.kind === "bullet");
    expect(certs.length).toBeGreaterThan(0);
    const certTitles = knowledgeGraph.nodes.filter((n) => n.type === "Certification").map((n) => (n as { title: string }).title);
    for (const l of certs) expect(certTitles.some((title) => l.text.startsWith(title))).toBe(true);
  });

  it("uses the mock-interview summary when there is one", () => {
    const q = INTERVIEW_QUESTIONS.find((x) => x.type === "technical")!;
    const summary = summariseSession([{ question: q, feedback: scoreAnswer(q, "It is a thing.") }]);
    const a = answerQuestion("how did my interview go", { assessment, interview: summary }, "en");
    expect(a.lines[0].text).toBe(`In your mock interview you averaged ${summary.average}/100 over 1 answers.`);
    expect(all(a)).toContain("Your weakest area was");
    const none = answerQuestion("how did my interview go", ctx, "en");
    expect(none.lines[0].text).toBe(getAssistantText("en").ivNone);
  });
});

describe("without a readiness analysis", () => {
  it("asks for the analysis instead of inventing numbers", () => {
    for (const intent of INTENTS.filter((i) => i.needsAssessment)) {
      const a = answerIntent(intent.id, empty, "en");
      expect(a.grounded).toBe(false);
      expect(a.lines[0].text).toBe(getAssistantText("en").needAnalysis);
      expect(all(a)).not.toMatch(/\d+\/100/);
    }
  });

  it("prefers a topic it can answer on a tie", () => {
    // "skills do I need" (gaps) and "need for" (requirements) score the same
    expect(answerQuestion("What skills do I need for DevOps?", ctx, "en").intent).toBe("gaps");
    expect(answerQuestion("What skills do I need for DevOps?", empty, "en").intent).toBe("roleRequirements");
  });
});

describe("assistant translations", () => {
  const en = getAssistantText("en");
  const placeholders = (s: string) => (s.match(/\{\w+\}/g) ?? []).sort();

  it.each(["si", "ta"] as const)("%s has every template, translated, with the same placeholders", (lang) => {
    const tr = getAssistantText(lang);
    expect(Object.keys(tr).sort()).toEqual(Object.keys(en).sort());
    for (const key of Object.keys(en) as Array<keyof typeof en>) {
      expect(tr[key].trim().length).toBeGreaterThan(0);
      expect(placeholders(tr[key])).toEqual(placeholders(en[key]));
    }
    expect(tr.needAnalysis).not.toBe(en.needAnalysis);
  });

  it.each(["en", "si", "ta"] as const)("every %s answer is fully filled in", (lang) => {
    const q = INTERVIEW_QUESTIONS[0];
    const interview = summariseSession([{ question: q, feedback: scoreAnswer(q, "short") }]);
    for (const id of ids) {
      for (const c of [ctx, empty, { assessment, interview }]) {
        const text = all(answerIntent(id, c, lang));
        expect(text).not.toMatch(/\{\w+\}|undefined|NaN/);
      }
    }
  });
});

describe("suggested questions", () => {
  it("each English suggestion, typed in, reaches its own intent", () => {
    const en = getAssistantText("en");
    const key = (id: IntentId) => `q${id[0].toUpperCase()}${id.slice(1)}` as keyof typeof en;
    for (const id of ids) expect([id, matchIntent(en[key(id)]).intent]).toEqual([id, id]);
  });
});
