import { demoCases } from "@/lib/c1/demo-cases";
import { illustrativeScholarships } from "@/lib/c1/demo-scholarships";
import { rankScholarships } from "@/lib/c1/matching";
import { financialProfileSchema } from "@/lib/c1/validation";
import { assessVulnerability } from "@/lib/c1/vulnerability";

const byId = (id: string) => {
  const found = demoCases.find((c) => c.id === id);
  if (!found) throw new Error(`missing demo case ${id}`);
  return found;
};
const index = (id: string) => assessVulnerability(byId(id).profile).vulnerabilityIndex;

describe("C1 demo cases", () => {
  it("are all valid profiles the API would accept", () => {
    for (const c of demoCases) expect(financialProfileSchema.safeParse(c.profile).success).toBe(true);
  });

  it("have unique ids and a label in English, Sinhala and Tamil", () => {
    expect(new Set(demoCases.map((c) => c.id)).size).toBe(demoCases.length);
    for (const c of demoCases) {
      expect(c.label.en.trim()).not.toBe("");
      expect(c.label.si.trim()).not.toBe("");
      expect(c.label.ta.trim()).not.toBe("");
    }
  });

  it("include both high-need and low-need students", () => {
    const bands = new Set(demoCases.map((c) => assessVulnerability(c.profile).band));
    expect(bands.has("high")).toBe(true);
    expect(bands.has("low")).toBe(true);
  });

  it("rank clearly needier students above comfortable households", () => {
    const needy = ["S01", "S02", "S04", "S07"];
    const comfortable = ["S11", "S12"];
    for (const n of needy) for (const c of comfortable) expect(index(n)).toBeGreaterThan(index(c));
  });

  it("give every student at least one eligible scholarship from the catalogue", () => {
    for (const c of demoCases) {
      const recs = rankScholarships(c.profile, assessVulnerability(c.profile), illustrativeScholarships);
      expect(recs.length).toBeGreaterThan(0);
    }
  });
});
