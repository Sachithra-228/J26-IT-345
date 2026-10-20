import { NextRequest } from "next/server";
import { errorMessageForDev, jsonResponse } from "@/lib/api";
import { auditReportCsv, auditReportFilename, buildAuditReport, type AuditReportFormat } from "@/lib/c1/audit-report";
import { ledgerDigest, loadLedger } from "@/lib/c1/chain";

export const dynamic = "force-dynamic";

/**
 * Downloadable donor audit report (C1, FR08).
 *
 * Public for the same reason as /api/c1/ledger: it is derived only from smart-contract
 * events and holds pseudonymous hashes and wallet addresses, never personal data.
 *   ?format=csv  (default) - spreadsheet for donors
 *   ?format=json           - full event log + fingerprint for independent verification
 */
export async function GET(request: NextRequest) {
  const format: AuditReportFormat = request.nextUrl.searchParams.get("format") === "json" ? "json" : "csv";

  try {
    const ledger = await loadLedger();
    const digest = ledgerDigest(ledger.events);
    const generatedAt = new Date().toISOString();
    const filename = auditReportFilename(ledger.meta, generatedAt, format);
    const body =
      format === "json"
        ? JSON.stringify(buildAuditReport(ledger, digest, generatedAt), null, 2)
        : // BOM so Excel opens the UTF-8 file with the right encoding
          `﻿${auditReportCsv(ledger, digest, generatedAt)}`;

    return new Response(body, {
      status: 200,
      headers: {
        "Content-Type": format === "json" ? "application/json; charset=utf-8" : "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="${filename}"`,
        "Cache-Control": "no-store"
      }
    });
  } catch (error) {
    return jsonResponse(
      { message: "The blockchain ledger is temporarily unavailable.", error: errorMessageForDev(error) },
      502
    );
  }
}
