/**
 * C3 runtime latency benchmark (a real measurement of this machine, not of accuracy).
 *
 *   npm run c3:benchmark      -> docs/c3/evidence/runtime-benchmark.json
 *
 * Times the full on-device assessment (12 role scores, gaps and Gap-to-Action plans for
 * the target roles) over the profiles in the parity fixture, and CV extraction over a
 * ~1,000-word synthetic CV. Inputs are synthetic; the timings are real.
 */
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { performance } from "node:perf_hooks";
import fixture from "../../tests/fixtures/c3-readiness-parity.json";
import { assessCareer } from "../../src/lib/c3/assessment";
import { extractSkills } from "../../src/lib/c3/extract";
import { careerModel } from "../../src/lib/c3/model";

type Fx = { students: Array<{ levels: Record<string, number>; targetRoleId: string }>; extraction: Array<{ text: string }> };
const fx = fixture as unknown as Fx;

function stats(ms: number[]) {
  const s = [...ms].sort((a, b) => a - b);
  const q = (p: number) => s[Math.min(s.length - 1, Math.floor(p * s.length))];
  return { n: s.length, meanMs: s.reduce((a, b) => a + b, 0) / s.length, p50Ms: q(0.5), p95Ms: q(0.95), maxMs: s[s.length - 1] };
}

const profiles = fx.students.map((s) => ({
  yearOfStudy: 3 as const,
  targetRoleIds: [s.targetRoleId, s.targetRoleId === "qa_engineer" ? "business_analyst" : "qa_engineer"],
  skills: s.levels
}));

for (let i = 0; i < 50; i++) assessCareer(profiles[i % profiles.length]); // warm-up
const assessTimes: number[] = [];
for (let round = 0; round < 10; round++) {
  for (const p of profiles) {
    const t0 = performance.now();
    assessCareer(p);
    assessTimes.push(performance.now() - t0);
  }
}

const cvText = Array.from({ length: 12 }, (_, i) => fx.extraction[i].text).join("\n\n");
const words = cvText.split(/\s+/).length;
for (let i = 0; i < 5; i++) extractSkills(cvText);
const cvTimes: number[] = [];
for (let i = 0; i < 50; i++) {
  const t0 = performance.now();
  extractSkills(cvText);
  cvTimes.push(performance.now() - t0);
}

const report = {
  warning: "Timings are REAL measurements on the machine below; inputs are synthetic profiles and CVs.",
  generatedAt: new Date().toISOString(),
  generatedBy: "npm run c3:benchmark",
  modelVersion: careerModel.version,
  machine: { platform: `${os.platform()} ${os.release()}`, cpu: os.cpus()[0]?.model ?? "unknown", node: process.version },
  fullAssessment: { description: "12 role scores + baseline + gaps + 2 Gap-to-Action plans", ...stats(assessTimes) },
  cvExtraction: { description: `PII stripping + skill extraction, ${words} words`, ...stats(cvTimes) }
};
const out = path.join(__dirname, "..", "..", "docs", "c3", "evidence", "runtime-benchmark.json");
fs.writeFileSync(out, JSON.stringify(report, null, 1) + "\n");
console.log(JSON.stringify({ fullAssessment: report.fullAssessment, cvExtraction: report.cvExtraction }, null, 1));
