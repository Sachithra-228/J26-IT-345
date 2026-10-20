/**
 * C4 Python <-> TypeScript parity and runtime rules.
 *
 * tests/fixtures/c4/matching-parity.json is written by `python ml/c4/run_pipeline.py`
 * from the Python reference matcher (30 synthetic students against the 12 demo mentors).
 * The TypeScript runtime must return the same mentor order and the same scores.
 */
import fixture from "../../fixtures/c4/matching-parity.json";
import { criteriaFor, demoMentors, matchingModel, rankMentors, type MentorProfile, type StudentNeeds } from "@/lib/c4/matching";

type Case = {
  student: StudentNeeds;
  ranking: Array<{ mentorId: string; score: number; criteria: Record<string, number> }>;
};

describe("C4 parity with the Python matcher", () => {
  it("uses the same model version", () => {
    expect(fixture.modelVersion).toBe(matchingModel.version);
  });

  it.each((fixture.cases as Case[]).map((c, i) => [i, c] as const))("case %i ranks and scores identically", (_i, c) => {
    const ranked = rankMentors(c.student);
    expect(ranked.map((m) => m.mentor.id)).toEqual(c.ranking.map((r) => r.mentorId));
    ranked.forEach((m, j) => {
      expect(m.score).toBeCloseTo(c.ranking[j].score, 5);
      for (const [name, value] of Object.entries(c.ranking[j].criteria)) {
        expect(m.criteria[name as keyof typeof m.criteria]).toBeCloseTo(value, 5);
      }
    });
  });
});

describe("C4 runtime rules", () => {
  const student: StudentNeeds = {
    needs: { web_backend: 3 },
    interests: ["startups"],
    preferredLanguage: "si",
    languages: ["si", "en"],
    slots: ["saturday"]
  };
  const mentor = (over: Partial<MentorProfile>): MentorProfile => ({
    id: "X",
    name: "Test Mentor",
    headline: "Software engineer",
    expertise: { web_backend: 3 },
    interests: ["startups"],
    languages: ["si"],
    slots: ["saturday"],
    capacity: 4,
    load: 0,
    ...over
  });

  it("AHP weights sum to one and are consistent", () => {
    const total = Object.values(matchingModel.weights).reduce((a, b) => a + b, 0);
    expect(total).toBeCloseTo(1, 9);
    expect(matchingModel.consistencyRatio).toBeLessThan(0.1);
  });

  it("never recommends a full mentor", () => {
    const ranked = rankMentors(student, [mentor({ id: "FULL", load: 4 }), mentor({ id: "OPEN", load: 1 })]);
    expect(ranked.map((m) => m.mentor.id)).toEqual(["OPEN"]);
  });

  it("the demo pool has a full mentor that is filtered out", () => {
    const full = demoMentors.filter((m) => m.load >= m.capacity).map((m) => m.id);
    expect(full.length).toBeGreaterThan(0);
    const ranked = rankMentors(student).map((m) => m.mentor.id);
    for (const id of full) expect(ranked).not.toContain(id);
  });

  it("explains every match in plain language", () => {
    const [top] = rankMentors(student, [mentor({})]);
    expect(top.reasons).toEqual(
      expect.arrayContaining([
        "Experienced in Web back-end and APIs",
        "Shares your interest in Startups",
        "Mentors in Sinhala",
        "Free on Saturdays",
        "4 of 4 mentee places free"
      ])
    );
  });

  it("scores language 1 / 0.5 / 0", () => {
    expect(criteriaFor(student, mentor({})).language).toBe(1);
    expect(criteriaFor(student, mentor({ languages: ["en"] })).language).toBe(0.5);
    expect(criteriaFor(student, mentor({ languages: ["ta"] })).language).toBe(0);
  });

  it("labels the model as synthetic", () => {
    expect(matchingModel.version).toMatch(/-synthetic$/);
    expect(matchingModel.warning).toMatch(/SYNTHETIC DATA/);
  });
});
