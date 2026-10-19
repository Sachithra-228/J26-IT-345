/**
 * C1 - student notifications from smart-contract events (FR11).
 *
 * The contract never stores who a student is: an award names a pseudonymous
 * `studentRef = keccak256("<studentId>:<secret salt>")` computed off-chain (see
 * ScholarshipEscrow.sol). The server holds the salt, so for a signed-in student it
 * recomputes their ref and turns only THEIR events (award, milestone verified,
 * payment released or queued, completed, revoked, withdrawn) into notifications.
 * Nothing about the student is written to the chain or exposed to anyone else.
 *
 * Notification ids are derived from the transaction (`c1-chain:<txHash>:<logIndex>`),
 * so the same event always maps to the same notification and read state can be kept.
 */
import { keccak256, toUtf8Bytes } from "ethers";
import { explorerTxUrl, formatEth, type LedgerEvent } from "./ledger";

/** Identity used by the bundled simulation (blockchain/scripts/simulate-lifecycle.ts) for the demo student. */
export const DEMO_STUDENT_ID = "demo-student-001";
export const DEMO_STUDENT_SALT = "demo-salt";

export const CHAIN_NOTIFICATION_PREFIX = "c1-chain:";

export type ChainNotificationKind = "awarded" | "verified" | "released" | "queued" | "completed" | "revoked" | "withdrawn";

/** Values the UI fills into its translated templates. Amounts are test-ETH strings. */
export type ChainNotificationValues = {
  amount?: string;
  milestone?: number;
  milestones?: number;
  awardId?: string;
  campaignId?: string;
};

export type ChainNotification = {
  id: string;
  type: "c1-chain";
  sectionId: "financial-aid";
  kind: ChainNotificationKind;
  values: ChainNotificationValues;
  /** English title and message, used by views that do not translate (and by the bell's section counts). */
  title: string;
  message: string;
  /** YYYY-MM-DD, like the platform's other notifications. */
  date: string;
  createdAt: string;
  read: boolean;
  txHash: string;
  explorerUrl: string | null;
};

export function studentRefFor(studentId: string, salt: string): string {
  return keccak256(toUtf8Bytes(`${studentId}:${salt}`));
}

export function isChainNotificationId(id: string): boolean {
  return id.startsWith(CHAIN_NOTIFICATION_PREFIX);
}

const amountOf = (wei: string | undefined) => formatEth(wei ?? "0");
const eth = (wei: string | undefined) => `${amountOf(wei)} test ETH`;

/** Notifications for one student, newest first. `readIds` marks the ones already seen. */
export function chainNotificationsFor(
  events: LedgerEvent[],
  studentRef: string,
  chainId: number,
  readIds: ReadonlySet<string> = new Set()
): ChainNotification[] {
  const ref = studentRef.toLowerCase();
  const sorted = [...events].sort((a, b) => a.blockNumber - b.blockNumber || a.logIndex - b.logIndex);

  const awards = new Map<string, { milestones: number }>();
  const wallets = new Set<string>();
  const out: ChainNotification[] = [];

  const push = (
    e: LedgerEvent,
    kind: ChainNotificationKind,
    values: ChainNotificationValues,
    title: string,
    message: string
  ) => {
    const id = `${CHAIN_NOTIFICATION_PREFIX}${e.txHash}:${e.logIndex}`;
    const at = new Date(e.timestamp * 1000).toISOString();
    out.push({
      id,
      type: "c1-chain",
      sectionId: "financial-aid",
      kind,
      values,
      title,
      message,
      date: at.slice(0, 10),
      createdAt: at,
      read: readIds.has(id),
      txHash: e.txHash,
      explorerUrl: explorerTxUrl(chainId, e.txHash)
    });
  };

  for (const e of sorted) {
    const a = e.args;
    if (e.type === "ScholarshipAwarded") {
      if ((a.studentRef ?? "").toLowerCase() !== ref) continue;
      const milestones = Number(a.milestoneCount ?? "0");
      awards.set(a.awardId, { milestones });
      if (a.beneficiary) wallets.add(a.beneficiary.toLowerCase());
      push(
        e,
        "awarded",
        { amount: amountOf(a.totalAmount), milestones, campaignId: a.campaignId },
        "Scholarship awarded",
        `You were awarded ${eth(a.totalAmount)} from campaign #${a.campaignId}, paid in ${milestones} milestone payments.`
      );
      continue;
    }

    if (e.type === "PendingWithdrawn") {
      if (wallets.has((a.beneficiary ?? "").toLowerCase())) {
        push(e, "withdrawn", { amount: amountOf(a.amount) }, "Withdrawal complete", `You withdrew ${eth(a.amount)} that was waiting for you.`);
      }
      continue;
    }

    const award = a.awardId === undefined ? undefined : awards.get(a.awardId);
    if (!award) continue;
    const milestone = a.milestoneIndex === undefined ? undefined : Number(a.milestoneIndex) + 1;

    switch (e.type) {
      case "MilestoneVerified":
        push(
          e,
          "verified",
          { milestone, milestones: award.milestones, awardId: a.awardId },
          `Milestone ${milestone} of ${award.milestones} verified`,
          `The welfare office verified milestone ${milestone} of your scholarship (award #${a.awardId}).`
        );
        break;
      case "FundsDisbursed":
        push(e, "released", { amount: amountOf(a.amount), milestone }, "Payment released", `${eth(a.amount)} for milestone ${milestone} was sent to your wallet.`);
        break;
      case "DisbursementQueued":
        push(
          e,
          "queued",
          { amount: amountOf(a.amount) },
          "Payment ready to withdraw",
          `${eth(a.amount)} is waiting for you: your wallet did not accept the automatic transfer, so withdraw it from the scholarship contract.`
        );
        break;
      case "AwardCompleted":
        push(e, "completed", { milestones: award.milestones, awardId: a.awardId }, "Scholarship completed", `All ${award.milestones} milestone payments of award #${a.awardId} have been released.`);
        break;
      case "AwardRevoked":
        push(e, "revoked", { awardId: a.awardId }, "Scholarship revoked", `Award #${a.awardId} was revoked by the welfare office. Please contact them for details.`);
        break;
      default:
        break;
    }
  }

  return out.reverse();
}
