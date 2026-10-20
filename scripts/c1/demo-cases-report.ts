/**
 * Runs every fictional sample student (src/lib/c1/demo-cases.ts) through the C1
 * vulnerability model and scholarship matcher, and writes the results as evidence.
 *
 *   npm run c1:demo-cases
 *
 * Output: docs/c1/evidence/demo-cases.json
 *
 * CAVEATS: the students are fictional and the model is trained on SYNTHETIC data,
 * so this shows how the system behaves case by case - it is not an accuracy result.
 * The scholarships are the illustrative catalogue, not real offers.
 */
import fs from "node:fs";
import path from "node:path";
import { demoCases } from "../../src/lib/c1/demo-cases";
import { illustrativeScholarships } from "../../src/lib/c1/demo-scholarships";
import { rankScholarships } from "../../src/lib/c1/matching";
import { financialProfileSchema } from "../../src/lib/c1/validation";
import { assessVulnerability, vulnerabilityModelInfo } from "../../src/lib/c1/vulnerability";

/**
 * AHP-TOPSIS score at or above which the explainable method treats a student as in need.
 * The two methods disagree when this conclusion differs from the model's own flag.
 */
const TOPSIS_NEED_CUTOFF = 0.5;

function main() {
  const cases = demoCases.map((c) => {
    if (!financialProfileSchema.safeParse(c.profile).success) throw new Error(`${c.id} is not a valid profile`);
    const assessment = assessVulnerability(c.profile);
    const recs = rankScholarships(c.profile, assessment, illustrativeScholarships);
    return {
      id: c.id,
      label: c.label.en,
      situation: c.situation,
      profile: c.profile,
      vulnerabilityIndex: assessment.vulnerabilityIndex,
      band: assessment.band,
      flaggedVulnerable: assessment.flaggedVulnerable,
      topsisScore: Number(assessment.topsisScore.toFixed(3)),
      topFactors: assessment.topFactors,
      eligibleScholarships: recs.length,
      topScholarships: recs.slice(0, 3).map((r) => ({
        id: r.scholarship.id,
        title: r.scholarship.title,
        fitPercent: Math.round(r.score * 100),
        reasons: r.reasons
      }))
    };
  });

  const bandCounts = { high: 0, moderate: 0, low: 0 };
  for (const c of cases) bandCounts[c.band] += 1;

  const result = {
    warning:
      "FICTIONAL sample students scored by a SYNTHETIC-trained model - shows behaviour case by case, not real-world accuracy.",
    generatedAt: new Date().toISOString(),
    model: vulnerabilityModelInfo,
    casesEvaluated: cases.length,
    bandCounts,
    flaggedVulnerable: cases.filter((c) => c.flaggedVulnerable).length,
    methodDisagreements: {
      rule: `model flag (probability >= ${vulnerabilityModelInfo.decisionThreshold.toFixed(3)}) differs from AHP-TOPSIS score >= ${TOPSIS_NEED_CUTOFF}`,
      cases: cases
        .filter((c) => c.flaggedVulnerable !== c.topsisScore >= TOPSIS_NEED_CUTOFF)
        .map((c) => ({
          id: c.id,
          label: c.label,
          vulnerabilityIndex: c.vulnerabilityIndex,
          flaggedVulnerable: c.flaggedVulnerable,
          topsisScore: c.topsisScore
        }))
    },
    cases
  };

  const root = path.join(__dirname, "..", "..");
  const out = path.join(root, "docs", "c1", "evidence", "demo-cases.json");
  fs.writeFileSync(out, JSON.stringify(result, null, 2) + "\n");

  console.log(`Wrote ${path.relative(root, out)} (${cases.length} cases)`);
  console.log("bands:", bandCounts, "| flagged:", result.flaggedVulnerable);
  for (const c of cases) {
    console.log(
      `${c.id}  VI ${String(c.vulnerabilityIndex).padStart(3)}  ${c.band.padEnd(8)}  TOPSIS ${c.topsisScore.toFixed(2)}  ` +
        `top scholarship: ${c.topScholarships[0]?.id ?? "none"}  ${c.label}`
    );
  }
  const disagree = result.methodDisagreements.cases;
  console.log("model vs AHP-TOPSIS disagree on:", disagree.length > 0 ? disagree.map((d) => d.id).join(", ") : "none");
}

main();
