import { NextRequest } from "next/server";
import { errorMessageForDev, jsonResponse } from "@/lib/api";
import { ledgerDigest, loadLedger } from "@/lib/c1/chain";
import { summarizeLedger } from "@/lib/c1/ledger";

export const dynamic = "force-dynamic";

/**
 * Public audit ledger (C1 transparency).
 *
 * Everything returned is derived from smart-contract events and contains only
 * pseudonymous hashes and wallet addresses - no personal data - so this endpoint
 * is intentionally public, exactly like a block explorer. Money figures are
 * testnet ETH; they are recomputed from events on every request.
 */
export async function GET(request: NextRequest) {
  const limitParam = Number(request.nextUrl.searchParams.get("limit") ?? "100");
  const limit = Number.isFinite(limitParam) ? Math.min(Math.max(Math.trunc(limitParam), 1), 500) : 100;

  try {
    const ledger = await loadLedger();
    const summary = summarizeLedger(ledger.events);
    const digest = ledgerDigest(ledger.events);
    const recent = [...ledger.events]
      .sort((a, b) => b.blockNumber - a.blockNumber || b.logIndex - a.logIndex)
      .slice(0, limit);

    return jsonResponse({
      meta: { ...ledger.meta, eventCount: ledger.events.length },
      summary,
      events: recent,
      digest,
      generatedAt: new Date().toISOString()
    });
  } catch (error) {
    return jsonResponse(
      { message: "The blockchain ledger is temporarily unavailable.", error: errorMessageForDev(error) },
      502
    );
  }
}
