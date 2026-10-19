/**
 * C1 - server side of the chain notifications (FR11): links a signed-in student to
 * their pseudonymous studentRef and remembers which chain notifications they have read.
 *
 *  - Demo mode: the demo student is the simulation's "demo-student-001".
 *  - Otherwise: studentRef = keccak256("<platform user id>:<C1_STUDENT_REF_SALT>").
 *    Admins must award with the same formula; without the salt no chain events can be
 *    linked to anyone, so no chain notifications are shown.
 */
import type { Db } from "mongodb";
import { isDemoMode } from "@/lib/api";
import { loadLedger } from "./chain";
import {
  chainNotificationsFor,
  DEMO_STUDENT_ID,
  DEMO_STUDENT_SALT,
  studentRefFor,
  type ChainNotification
} from "./chain-notifications";

const READS_COLLECTION = "c1_notification_reads";

export function chainIdentity(studentId?: string): { studentId: string; salt: string } | null {
  if (isDemoMode()) return { studentId: DEMO_STUDENT_ID, salt: DEMO_STUDENT_SALT };
  const salt = process.env.C1_STUDENT_REF_SALT;
  if (!salt || !studentId) return null;
  return { studentId, salt };
}

/** The student's chain notifications; an unreachable chain gives none rather than breaking the caller. */
export async function loadChainNotifications(
  studentId: string | undefined,
  readIds: ReadonlySet<string> = new Set()
): Promise<ChainNotification[]> {
  const identity = chainIdentity(studentId);
  if (!identity) return [];
  try {
    const ledger = await loadLedger();
    return chainNotificationsFor(
      ledger.events,
      studentRefFor(identity.studentId, identity.salt),
      ledger.meta.chainId,
      readIds
    );
  } catch {
    return [];
  }
}

export async function readChainNotificationIds(database: Db, userKey: string): Promise<Set<string>> {
  const doc = await database.collection(READS_COLLECTION).findOne({ userKey });
  return new Set(Array.isArray(doc?.eventIds) ? (doc.eventIds as string[]) : []);
}

export async function markChainNotificationsRead(database: Db, userKey: string, ids: string[]): Promise<number> {
  if (!ids.length) return 0;
  await database
    .collection(READS_COLLECTION)
    .updateOne(
      { userKey },
      { $addToSet: { eventIds: { $each: ids } }, $set: { updatedAt: new Date() } },
      { upsert: true }
    );
  return ids.length;
}
