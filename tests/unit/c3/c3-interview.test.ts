import { tokenize } from "@/lib/c3/extract";
import { proposedGaps } from "@/lib/c3/gaps";
import { INTERVIEW_QUESTIONS } from "@/lib/c3/interview-bank";
import { coversKeyPoint, RUBRIC_WEIGHTS, scoreAnswer, selectQuestions, summariseSession } from "@/lib/c3/interview";
import { ROLE_IDS, SKILL_IDS, getRole, type RoleProfile } from "@/lib/c3/model";

const role = (id: string) => getRole(id) as RoleProfile;
const q = (id: string) => INTERVIEW_QUESTIONS.find((x) => x.id === id)!;

describe("interview question bank", () => {
  it("has unique ids and valid, well-formed questions", () => {
    const ids = INTERVIEW_QUESTIONS.map((x) => x.id);
    expect(new Set(ids).size).toBe(ids.length);
    for (const item of INTERVIEW_QUESTIONS) {
      expect([1, 2, 3]).toContain(item.level);
      expect(item.prompt.length).toBeGreaterThan(20);
      expect(item.keyPoints.length).toBeGreaterThanOrEqual(3);
      expect(item.minWords).toBeLessThan(item.idealWords);
      if (item.type === "technical") expect(SKILL_IDS).toContain(item.skillId);
      for (const r of item.roleIds) expect(ROLE_IDS).toContain(r);
      for (const p of item.keyPoints) {
        for (const term of p.terms) {
          expect(term).toBe(term.toLowerCase());
          expect(tokenize(term).length).toBeGreaterThan(0);
        }
      }
    }
  });

  it("covers every taxonomy skill and gives every role a situational question", () => {
    for (const s of SKILL_IDS) expect(INTERVIEW_QUESTIONS.some((x) => x.type === "technical" && x.skillId === s)).toBe(true);
    for (const r of ROLE_IDS) expect(INTERVIEW_QUESTIONS.some((x) => x.type === "situational" && x.roleIds.includes(r))).toBe(true);
    expect(INTERVIEW_QUESTIONS.filter((x) => x.type === "behavioural").length).toBeGreaterThanOrEqual(5);
  });
});

describe("question selection", () => {
  const levels = { testing_manual: 1, communication: 2, prog_oop: 2 };

  it("focuses technical questions on the highest-gain gaps, then a strength, then STAR and a role scenario", () => {
    const sel = selectQuestions(levels, role("qa_engineer"), 6);
    expect(sel).toHaveLength(6);
    expect(new Set(sel.map((s) => s.question.id)).size).toBe(6);
    const gapSkills = proposedGaps(levels, role("qa_engineer")).map((g) => g.skillId);
    const asked = sel.filter((s) => s.reason.code === "gap").map((s) => (s.reason as { skillId: string }).skillId);
    expect(asked).toEqual(gapSkills.filter((id) => asked.includes(id)));
    expect(asked[0]).toBe(gapSkills[0]);
    expect(sel.some((s) => s.reason.code === "strength")).toBe(true);
    expect(sel[4].question.type).toBe("behavioural");
    expect(sel[5].question.type).toBe("situational");
    expect(sel[5].question.roleIds).toContain("qa_engineer");
  });

  it("works without an analysis and for every role and length", () => {
    for (const r of ROLE_IDS) {
      for (const n of [4, 6, 8]) {
        const sel = selectQuestions({}, role(r), n);
        expect(sel).toHaveLength(n);
        expect(new Set(sel.map((s) => s.question.id)).size).toBe(n);
      }
    }
  });

  it("is deterministic and rotates questions between rounds", () => {
    const a = selectQuestions(levels, role("software_engineer"), 6, 0).map((s) => s.question.id);
    expect(selectQuestions(levels, role("software_engineer"), 6, 0).map((s) => s.question.id)).toEqual(a);
    const b = selectQuestions(levels, role("software_engineer"), 6, 1).map((s) => s.question.id);
    expect(b).not.toEqual(a);
  });
});

describe("rubric scoring", () => {
  const good =
    "First I would cover the valid login with the correct username and password and check the expected result is a success message. " +
    "Then invalid cases: wrong password, empty fields and a blank username. I would also test boundary length of 50 characters, " +
    "a locked account after 3 failed attempts and SQL injection input. For example, in my project I wrote 20 test cases in Jira.";

  it("scores a complete answer far above a weak one and explains each criterion", () => {
    const strong = scoreAnswer(q("T-QA-1"), good);
    const weak = scoreAnswer(q("T-QA-1"), "I will test it.");
    expect(strong.total).toBeGreaterThanOrEqual(75);
    expect(strong.band).toBe("strong");
    expect(weak.total).toBeLessThan(25);
    expect(weak.missedPoints).toHaveLength(q("T-QA-1").keyPoints.length);
    expect(strong.criteria.map((c) => c.criterion)).toEqual(Object.keys(RUBRIC_WEIGHTS));
    expect(Object.values(RUBRIC_WEIGHTS).reduce((a, b) => a + b, 0)).toBeCloseTo(1, 10);
  });

  it("gives 0 for an empty answer and stays within 0-100", () => {
    const empty = scoreAnswer(q("T-SQL-1"), "   ");
    expect(empty.total).toBe(0);
    expect(empty.wordCount).toBe(0);
    for (const item of INTERVIEW_QUESTIONS.slice(0, 20)) {
      const s = scoreAnswer(item, item.modelAnswer);
      expect(s.total).toBeGreaterThanOrEqual(0);
      expect(s.total).toBeLessThanOrEqual(100);
    }
  });

  it("finds STAR parts in behavioural answers", () => {
    const star =
      "During my second-year group project our team disagreed about the database. I was responsible for the backend so I had to decide. " +
      "I listened to both sides, I organised a short meeting and we agreed to test both options. As a result we chose PostgreSQL and finished 2 weeks early.";
    const res = scoreAnswer(q("B-TEAM"), star);
    const structure = res.criteria.find((c) => c.criterion === "structure")!;
    expect(structure.score).toBe(3);
    expect(structure.detail.starMissing).toEqual([]);
    const flat = scoreAnswer(q("B-TEAM"), "Teamwork is important and communication is important in every team.");
    expect(flat.criteria.find((c) => c.criterion === "structure")!.score).toBeLessThan(2);
  });

  it("matches key-point terms by prefix and plural, but not inside other words", () => {
    const tokens = tokenize("We prioritised the indexes and communicated clearly");
    expect(coversKeyPoint(tokens, { label: "x", terms: ["priorit"] })).toBe(true);
    expect(coversKeyPoint(tokens, { label: "x", terms: ["index"] })).toBe(true);
    expect(coversKeyPoint(tokens, { label: "x", terms: ["communicat"] })).toBe(true);
    expect(coversKeyPoint(tokenize("the latest results"), { label: "x", terms: ["test"] })).toBe(false);
  });

  it("does not reward padding: a very long answer loses depth points", () => {
    const long = Array.from({ length: 40 }, () => good).join(" ");
    expect(scoreAnswer(q("T-QA-1"), long).criteria.find((c) => c.criterion === "depth")!.score).toBe(2);
  });

  it("credits things the student did themselves, including regular past-tense verbs", () => {
    const own = scoreAnswer(q("T-AUTO-1"), "In my project I automated 40 regression checks and I wrote the API tests.");
    expect(own.criteria.find((c) => c.criterion === "evidence")!.detail.ownership).toBe(2);
    const none = scoreAnswer(q("T-AUTO-1"), "Regression tests should be automated because they are repetitive.");
    expect(none.criteria.find((c) => c.criterion === "evidence")!.detail.ownership).toBe(0);
  });

  it("is deterministic", () => {
    expect(scoreAnswer(q("T-ML-1"), good)).toEqual(scoreAnswer(q("T-ML-1"), good));
  });

  it("summarises a session and names the weakest area and skills to practise", () => {
    const results = [
      { question: q("T-QA-1"), feedback: scoreAnswer(q("T-QA-1"), good) },
      { question: q("T-SQL-1"), feedback: scoreAnswer(q("T-SQL-1"), "joins") }
    ];
    const s = summariseSession(results);
    expect(s.answered).toBe(2);
    expect(s.practiseSkills).toEqual(["databases_sql"]);
    expect(s.weakest).not.toBeNull();
    expect(summariseSession([]).answered).toBe(0);
  });
});
