/**
 * @jest-environment node
 */
import { auditReportCsv, auditReportFilename, buildAuditReport, csvCell } from "@/lib/c1/audit-report";
import { ledgerDigest } from "@/lib/c1/chain";
import demoLedger from "@/lib/c1/demo-ledger.json";
import type { LedgerFile } from "@/lib/c1/ledger";

const ledger = demoLedger as unknown as LedgerFile;
const generatedAt = "2026-10-20T08:00:00.000Z";
const digest = ledgerDigest(ledger.events);

describe("csvCell", () => {
  it("leaves plain values alone and quotes commas, quotes and line breaks", () => {
    expect(csvCell("0xabc123")).toBe("0xabc123");
    expect(csvCell(42)).toBe("42");
    expect(csvCell(undefined)).toBe("");
    expect(csvCell("a,b")).toBe('"a,b"');
    expect(csvCell('say "hi"')).toBe('"say ""hi"""');
    expect(csvCell("line\nbreak")).toBe('"line\nbreak"');
  });

  it("stops spreadsheet formulas from running", () => {
    expect(csvCell("=HYPERLINK(\"http://x\")")).toBe("\"'=HYPERLINK(\"\"http://x\"\")\"");
    expect(csvCell("+1+1")).toBe("'+1+1");
    expect(csvCell("@SUM(A1)")).toBe("'@SUM(A1)");
  });
});

describe("auditReportCsv", () => {
  const csv = auditReportCsv(ledger, digest, generatedAt);
  const lines = csv.trimEnd().split("\r\n");
  const headerIndex = lines.findIndex((l) => l.startsWith("Date (UTC),Event,"));

  it("states the source, the fingerprint and the totals", () => {
    expect(csv).toContain("Local simulation - not a public-network record");
    expect(csv).toContain(`Integrity fingerprint (SHA-256),${digest}`);
    expect(csv).toContain("Funded (ETH),35");
    expect(csv).toContain("Released to students (ETH),16");
  });

  it("has one row per event, in chain order", () => {
    const rows = lines.slice(headerIndex + 1);
    expect(rows).toHaveLength(ledger.events.length);
    const blocks = rows.map((r) => Number(r.split(",")[8]));
    expect(blocks).toEqual([...blocks].sort((a, b) => a - b));
    for (const e of ledger.events) expect(csv).toContain(e.txHash);
  });

  it("shows human milestone numbers and ETH amounts", () => {
    const firstRelease = lines.find((l) => l.includes(",Funds released,"));
    expect(firstRelease).toBeDefined();
    expect(firstRelease!.split(",")[4]).toBe("1"); // milestone index 0 is the first milestone
    expect(firstRelease!.split(",")[5]).toBe("1"); // 1 ETH
  });

  it("links transactions to Etherscan only on Sepolia", () => {
    expect(csv).not.toContain("etherscan.io");
    const sepolia = { ...ledger, meta: { ...ledger.meta, chainId: 11155111, source: "live" as const } };
    const live = auditReportCsv(sepolia, digest, generatedAt);
    expect(live).toContain("Live blockchain");
    expect(live).toContain(`https://sepolia.etherscan.io/tx/${ledger.events[0].txHash}`);
  });
});

describe("buildAuditReport (JSON)", () => {
  it("carries a fingerprint anyone can recompute from its own events", () => {
    const report = buildAuditReport(ledger, digest, generatedAt);
    expect(report.integrity.algorithm).toBe("sha256");
    expect(report.events).toHaveLength(ledger.events.length);
    expect(ledgerDigest(report.events)).toBe(report.integrity.digest);
    expect(report.meta.eventCount).toBe(ledger.events.length);
  });
});

describe("auditReportFilename", () => {
  it("names the file after the network and date", () => {
    expect(auditReportFilename(ledger.meta, generatedAt, "csv")).toBe(
      "unicare-c1-audit-hardhat-local-simulation-2026-10-20.csv"
    );
  });
});
