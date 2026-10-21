import { participantReference } from "@/lib/mentorship-session";

export type AccountStatusFields = {
  role?: string;
  status?: string;
  isDeleted?: boolean;
  subscription?: { status?: string };
};

/** Keep directory eligibility aligned with account preflight/admin conventions. */
export function isEligibleAccount(account: AccountStatusFields): boolean {
  const status = String(account.status ?? "").toLowerCase();
  const subscriptionStatus = String(account.subscription?.status ?? "").toLowerCase();
  return account.isDeleted !== true && status !== "blocked" && status !== "deleted" && subscriptionStatus !== "blocked";
}

export type MenteeSessionReference = {
  studentId?: unknown;
  studentFirebaseUid?: unknown;
  status?: string;
  topic?: string;
  createdAt?: string | Date;
  updatedAt?: string | Date;
};

export type CurrentStudentRecord = AccountStatusFields & {
  _id: string;
  firebaseUid?: string;
  name: string;
};

export type MenteeSummary = {
  studentId: string;
  name: string;
  activeSessions: number;
  lastTopic?: string;
};

function timestamp(value?: string | Date) {
  const parsed = value instanceof Date ? value.getTime() : new Date(value ?? 0).getTime();
  return Number.isFinite(parsed) ? parsed : 0;
}

/** Build active mentees only from current eligible students; never use display names as identity. */
export function buildActiveMenteeSummaries(
  sessions: MenteeSessionReference[],
  students: CurrentStudentRecord[],
  eligibleStatuses: string[] = ["confirmed", "scheduled"]
): MenteeSummary[] {
  const eligibleStudents = students.filter((student) => student.role === "student" && isEligibleAccount(student));
  const byId = new Map(eligibleStudents.map((student) => [student._id, student]));
  const byFirebaseUid = new Map(
    eligibleStudents.filter((student) => student.firebaseUid).map((student) => [student.firebaseUid!, student])
  );
  const activeStatuses = new Set(eligibleStatuses.map((status) => status.toLowerCase()));
  const summaries = new Map<string, MenteeSummary>();

  const activeSessions = sessions
    .filter((session) => activeStatuses.has(String(session.status ?? "").toLowerCase()))
    .sort((a, b) => timestamp(b.updatedAt ?? b.createdAt) - timestamp(a.updatedAt ?? a.createdAt));

  for (const session of activeSessions) {
    const studentFirebaseUid = participantReference(session.studentFirebaseUid);
    const studentId = participantReference(session.studentId);
    const student =
      (studentFirebaseUid ? byFirebaseUid.get(studentFirebaseUid) : undefined) ??
      (studentId ? byId.get(studentId) ?? byFirebaseUid.get(studentId) : undefined);
    if (!student) continue;

    const existing = summaries.get(student._id);
    if (existing) {
      existing.activeSessions += 1;
      continue;
    }
    summaries.set(student._id, {
      studentId: student._id,
      name: student.name,
      activeSessions: 1,
      lastTopic: session.topic
    });
  }

  return [...summaries.values()];
}
