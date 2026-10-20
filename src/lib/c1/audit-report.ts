/**
 * C1 - downloadable donor audit report (FR08).
 *
 * Built only from the smart-contract event log, like every other C1 ledger view,
 * so a donor's report and the public ledger can never disagree. Two formats:
 *
 *  - CSV for donors: opens in Excel / Google Sheets; one row per event with its
 *    transaction hash, plus the totals and the integrity fingerprint.
 *  - JSON for auditors: the full event log and the fingerprint, so anyone can
 *    recompute SHA-256 over `canonicalLedgerString(events)` and compare.
 *
 * The report holds only pseudonymous hashes and wallet addresses (NFR02/NFR04).
 */
import {
  EVENT_LABELS,
  explorerTxUrl,
  formatEth,
  summarizeLedger,
  type LedgerEvent,
  type LedgerFile,
  type LedgerSummary
} from "./ledger";

export type AuditReportFormat = "csv" | "json";

export type AuditReport = {
  report: string;
  generatedAt: string;
  meta: LedgerFile["meta"] & { eventCount: number };
  integrity: { algorithm: "sha256"; digest: string; howToVerify: string };
  summary: LedgerSummary;
  events: LedgerEvent[];
};

const REPORT_TITLE = "UniCare Connect - C1 scholarship audit report";
const HOW_TO_VERIFY =
  "Sort events by block then log index, build the canonical list [type, block, logIndex, txHash, sorted args] " +
  "as JSON (canonicalLedgerString in src/lib/c1/ledger.ts) and compare its SHA-256 with this digest.";

/** One CSV cell: quoted when needed, and guarded against spreadsheet formula injection. */
export function csvCell(value: string | number | undefined | null): string {
  let text = value === undefined || value === null ? "" : String(value);
  if (/^[=+\-@\t\r]/.test(text)) text = `'${text}`;
  return /[",\r\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
}

const csvRow = (cells: Array<string | number | undefined | null>) => cells.map(csvCell).join(",");

function chronological(events: LedgerEvent[]): LedgerEvent[] {
  return [...events].sort((a, b) => a.blockNumber - b.blockNumber || a.logIndex - b.logIndex);
}

/** The amount an event moved, if any (wei string). */
function eventAmount(e: LedgerEvent): string | undefined {
  return e.args.amount ?? e.args.totalAmount ?? e.args.returnedToCampaign;
}

export function buildAuditReport(ledger: LedgerFile, digest: string, generatedAt: string): AuditReport {
  return {
    report: REPORT_TITLE,
    generatedAt,
    meta: { ...ledger.meta, eventCount: ledger.events.length },
    integrity: { algorithm: "sha256", digest, howToVerify: HOW_TO_VERIFY },
    summary: summarizeLedger(ledger.events),
    events: chronological(ledger.events)
  };
}

export function auditReportCsv(ledger: LedgerFile, digest: string, generatedAt: string): string {
  const { meta, summary, events } = buildAuditReport(ledger, digest, generatedAt);
  const { totals } = summary;
  const live = meta.source === "live";

  const lines = [
    csvRow([REPORT_TITLE]),
    csvRow(["Source", live ? "Live blockchain" : "Local simulation - not a public-network record"]),
    csvRow(["Network", `${meta.network} (chain ${meta.chainId})`]),
    csvRow(["Contract", `${meta.contract} ${meta.contractAddress}`]),
    csvRow(["Generated (UTC)", generatedAt]),
    csvRow(["Events", meta.eventCount]),
    csvRow(["Integrity fingerprint (SHA-256)", digest]),
    csvRow(["How to verify", HOW_TO_VERIFY]),
    csvRow(["Units", "Test ETH on a test network - no monetary value"]),
    csvRow(["Privacy", "Students appear only as pseudonymous hashes - no personal data"]),
    "",
    csvRow(["Totals"]),
    csvRow(["Funded (ETH)", formatEth(totals.funded)]),
    csvRow(["Released to students (ETH)", formatEth(totals.disbursed)]),
    csvRow(["Committed, awaiting milestones (ETH)", formatEth(totals.committed)]),
    csvRow(["Available in open campaigns (ETH)", formatEth(totals.available)]),
    csvRow(["Campaigns", totals.campaigns]),
    csvRow(["Awards (active / completed / revoked)", `${totals.activeAwards} / ${totals.completedAwards} / ${totals.revokedAwards}`]),
    csvRow(["Students supported", totals.uniqueStudents]),
    csvRow(["Payments released", totals.disbursementCount]),
    "",
    csvRow(["Event log"]),
    csvRow([
      "Date (UTC)",
      "Event",
      "Campaign",
      "Award",
      "Milestone no.",
      "Amount (ETH)",
      "Wallet",
      "Student ref (pseudonymous)",
      "Block",
      "Transaction hash",
      "Explorer link"
    ])
  ];

  for (const e of events) {
    const amount = eventAmount(e);
    const milestone = e.args.milestoneIndex === undefined ? "" : Number(e.args.milestoneIndex) + 1;
    lines.push(
      csvRow([
        new Date(e.timestamp * 1000).toISOString(),
        EVENT_LABELS[e.type],
        e.args.campaignId,
        e.args.awardId,
        milestone,
        amount === undefined ? "" : formatEth(amount, 6),
        e.args.donor ?? e.args.beneficiary ?? e.args.verifier,
        e.args.studentRef,
        e.blockNumber,
        e.txHash,
        explorerTxUrl(meta.chainId, e.txHash) ?? ""
      ])
    );
  }

  return lines.join("\r\n") + "\r\n";
}

export function auditReportFilename(meta: LedgerFile["meta"], generatedAt: string, format: AuditReportFormat): string {
  const network = meta.network.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
  return `unicare-c1-audit-${network}-${generatedAt.slice(0, 10)}.${format}`;
}
