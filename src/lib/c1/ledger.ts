/**
 * C1 - audit-ledger model.
 *
 * The smart contract emits an event for every state change. This module turns
 * that raw event log into the campaign / award / totals view the donor and
 * admin dashboards show, WITHOUT trusting any server-side database: every
 * number is derived from events, so anyone holding the event log (or reading the
 * chain) reproduces exactly the same figures.
 *
 * Amounts are wei strings (testnet ETH). Student identities are pseudonymous
 * hashes - no personal data is ever on the ledger (NFR02/NFR04).
 */

export type LedgerEventType =
  | "CampaignCreated"
  | "CampaignToppedUp"
  | "CampaignClosed"
  | "ScholarshipAwarded"
  | "MilestoneVerified"
  | "FundsDisbursed"
  | "DisbursementQueued"
  | "AwardCompleted"
  | "AwardRevoked"
  | "PendingWithdrawn";

export type LedgerEvent = {
  id: string;
  type: LedgerEventType;
  blockNumber: number;
  /** Unix seconds (block timestamp). */
  timestamp: number;
  txHash: string;
  logIndex: number;
  gasUsed?: number;
  args: Record<string, string>;
};

export type LedgerMeta = {
  network: string;
  chainId: number;
  contractAddress: string;
  contract: string;
  note?: string;
  eventCount?: number;
  /** "live" = read from an RPC node; "simulation" = bundled local-chain log. */
  source?: "live" | "simulation";
};

export type LedgerFile = { meta: LedgerMeta; events: LedgerEvent[] };

export type AwardStatus = "active" | "completed" | "revoked";

export type CampaignSummary = {
  id: string;
  donor: string;
  metadataHash: string;
  /** wei */ funded: string;
  /** wei - committed to awards and not yet released */ allocated: string;
  /** wei */ disbursed: string;
  closed: boolean;
  awardCount: number;
  createdAt: number;
};

export type AwardSummary = {
  id: string;
  campaignId: string;
  studentRef: string;
  beneficiary: string;
  assessmentHash: string;
  /** wei */ totalAmount: string;
  /** wei */ released: string;
  milestoneCount: number;
  milestonesVerified: number;
  status: AwardStatus;
  awardedAt: number;
  lastActivityAt: number;
};

export type LedgerTotals = {
  /** wei */ funded: string;
  /** wei */ disbursed: string;
  /** wei - committed and awaiting milestones */ committed: string;
  /** wei - unallocated across open campaigns */ available: string;
  campaigns: number;
  awards: number;
  activeAwards: number;
  completedAwards: number;
  revokedAwards: number;
  uniqueStudents: number;
  disbursementCount: number;
};

export type LedgerSummary = {
  totals: LedgerTotals;
  campaigns: CampaignSummary[];
  awards: AwardSummary[];
};

export const EVENT_LABELS: Record<LedgerEventType, string> = {
  CampaignCreated: "Campaign funded",
  CampaignToppedUp: "Campaign topped up",
  CampaignClosed: "Campaign closed",
  ScholarshipAwarded: "Scholarship awarded",
  MilestoneVerified: "Milestone verified",
  FundsDisbursed: "Funds released",
  DisbursementQueued: "Release queued (pull)",
  AwardCompleted: "Award completed",
  AwardRevoked: "Award revoked",
  PendingWithdrawn: "Queued funds withdrawn"
};

const big = (v: string | undefined) => BigInt(v ?? "0");

export function summarizeLedger(rawEvents: LedgerEvent[]): LedgerSummary {
  // deterministic order: block, then log index
  const events = [...rawEvents].sort((a, b) => a.blockNumber - b.blockNumber || a.logIndex - b.logIndex);

  type MutableCampaign = Omit<CampaignSummary, "funded" | "allocated" | "disbursed"> & {
    funded: bigint;
    allocated: bigint;
    disbursed: bigint;
  };
  type MutableAward = Omit<AwardSummary, "totalAmount" | "released"> & { totalAmount: bigint; released: bigint };

  const campaigns = new Map<string, MutableCampaign>();
  const awards = new Map<string, MutableAward>();
  let disbursementCount = 0;

  for (const e of events) {
    const a = e.args;
    switch (e.type) {
      case "CampaignCreated":
        campaigns.set(a.campaignId, {
          id: a.campaignId,
          donor: a.donor,
          metadataHash: a.metadataHash,
          funded: big(a.amount),
          allocated: 0n,
          disbursed: 0n,
          closed: false,
          awardCount: 0,
          createdAt: e.timestamp
        });
        break;
      case "CampaignToppedUp": {
        const c = campaigns.get(a.campaignId);
        if (c) c.funded += big(a.amount);
        break;
      }
      case "CampaignClosed": {
        const c = campaigns.get(a.campaignId);
        if (c) {
          c.closed = true;
          c.funded -= big(a.refunded);
        }
        break;
      }
      case "ScholarshipAwarded": {
        awards.set(a.awardId, {
          id: a.awardId,
          campaignId: a.campaignId,
          studentRef: a.studentRef,
          beneficiary: a.beneficiary,
          assessmentHash: a.assessmentHash,
          totalAmount: big(a.totalAmount),
          released: 0n,
          milestoneCount: Number(a.milestoneCount),
          milestonesVerified: 0,
          status: "active",
          awardedAt: e.timestamp,
          lastActivityAt: e.timestamp
        });
        const c = campaigns.get(a.campaignId);
        if (c) {
          c.allocated += big(a.totalAmount);
          c.awardCount += 1;
        }
        break;
      }
      case "MilestoneVerified": {
        const w = awards.get(a.awardId);
        if (w) {
          w.milestonesVerified += 1;
          w.lastActivityAt = e.timestamp;
        }
        break;
      }
      case "FundsDisbursed":
      case "DisbursementQueued": {
        const w = awards.get(a.awardId);
        if (w) {
          const amount = big(a.amount);
          w.released += amount;
          w.lastActivityAt = e.timestamp;
          const c = campaigns.get(w.campaignId);
          if (c) {
            c.allocated -= amount;
            c.disbursed += amount;
          }
          disbursementCount += 1;
        }
        break;
      }
      case "AwardCompleted": {
        const w = awards.get(a.awardId);
        if (w) {
          w.status = "completed";
          w.lastActivityAt = e.timestamp;
        }
        break;
      }
      case "AwardRevoked": {
        const w = awards.get(a.awardId);
        if (w) {
          w.status = "revoked";
          w.lastActivityAt = e.timestamp;
          const c = campaigns.get(w.campaignId);
          if (c) {
            c.allocated -= big(a.returnedToCampaign);
            if (c.closed) c.funded -= big(a.returnedToCampaign);
          }
        }
        break;
      }
      default:
        break;
    }
  }

  const campaignList = [...campaigns.values()].map<CampaignSummary>((c) => ({
    ...c,
    funded: c.funded.toString(),
    allocated: c.allocated.toString(),
    disbursed: c.disbursed.toString()
  }));
  const awardList = [...awards.values()].map<AwardSummary>((w) => ({
    ...w,
    totalAmount: w.totalAmount.toString(),
    released: w.released.toString()
  }));

  // `funded` is net of refunds and INCLUDES money already released, mirroring the contract's totalFunded.
  let funded = 0n;
  let disbursed = 0n;
  let committed = 0n;
  let available = 0n;
  for (const c of campaigns.values()) {
    funded += c.funded;
    disbursed += c.disbursed;
    committed += c.allocated;
    if (!c.closed) available += c.funded - c.allocated - c.disbursed;
  }

  const students = new Set(awardList.map((w) => w.studentRef));
  return {
    totals: {
      funded: funded.toString(),
      disbursed: disbursed.toString(),
      committed: committed.toString(),
      available: available.toString(),
      campaigns: campaignList.length,
      awards: awardList.length,
      activeAwards: awardList.filter((w) => w.status === "active").length,
      completedAwards: awardList.filter((w) => w.status === "completed").length,
      revokedAwards: awardList.filter((w) => w.status === "revoked").length,
      uniqueStudents: students.size,
      disbursementCount
    },
    campaigns: campaignList,
    awards: awardList
  };
}

/** Wei string -> "12.5" style ETH string (trimmed, max 4 decimals). */
export function formatEth(wei: string | bigint, decimals = 4): string {
  const v = typeof wei === "bigint" ? wei : BigInt(wei);
  const negative = v < 0n;
  const abs = negative ? -v : v;
  const whole = abs / 10n ** 18n;
  const frac = (abs % 10n ** 18n).toString().padStart(18, "0").slice(0, decimals).replace(/0+$/, "");
  return `${negative ? "-" : ""}${whole.toString()}${frac ? `.${frac}` : ""}`;
}

/** Block-explorer link for a transaction, or null on networks without a public explorer (local simulation). */
export function explorerTxUrl(chainId: number, txHash: string): string | null {
  if (chainId === 11155111) return `https://sepolia.etherscan.io/tx/${txHash}`;
  return null;
}

export function shortHash(value: string, head = 6, tail = 4): string {
  if (!value || value.length <= head + tail + 2) return value;
  return `${value.slice(0, head + 2)}…${value.slice(-tail)}`;
}

/**
 * Deterministic canonical string of the event log used for the integrity fingerprint.
 * Fields that depend on how the log was fetched (gas, ids) are excluded so two parties
 * reading the same chain always derive the same fingerprint.
 */
export function canonicalLedgerString(events: LedgerEvent[]): string {
  const sorted = [...events].sort((a, b) => a.blockNumber - b.blockNumber || a.logIndex - b.logIndex);
  return JSON.stringify(
    sorted.map((e) => [
      e.type,
      e.blockNumber,
      e.logIndex,
      e.txHash,
      Object.keys(e.args)
        .sort()
        .map((k) => [k, e.args[k]])
    ])
  );
}
