/**
 * Writes the C1 donor audit report (FR08) for the current ledger source as evidence.
 *
 *   npm run c1:audit-report
 *
 * Output: docs/c1/evidence/audit-report.csv and audit-report.json - the same files a
 * donor downloads from /api/c1/ledger/report. Without C1_RPC_URL / C1_ESCROW_ADDRESS the
 * source is the bundled local simulation, and both files say so.
 */
import fs from "node:fs";
import path from "node:path";
import { auditReportCsv, buildAuditReport } from "../../src/lib/c1/audit-report";
import { ledgerDigest, loadLedger } from "../../src/lib/c1/chain";

async function main() {
  const ledger = await loadLedger();
  const digest = ledgerDigest(ledger.events);
  const generatedAt = new Date().toISOString();

  const dir = path.join(__dirname, "..", "..", "docs", "c1", "evidence");
  fs.writeFileSync(path.join(dir, "audit-report.csv"), auditReportCsv(ledger, digest, generatedAt));
  fs.writeFileSync(path.join(dir, "audit-report.json"), JSON.stringify(buildAuditReport(ledger, digest, generatedAt), null, 2) + "\n");

  console.log(`source: ${ledger.meta.source ?? "simulation"} (${ledger.meta.network}), ${ledger.events.length} events`);
  console.log(`fingerprint: ${digest}`);
  console.log("wrote docs/c1/evidence/audit-report.csv and audit-report.json");
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
