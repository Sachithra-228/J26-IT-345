export type SessionParticipantFields = {
  mentorId?: unknown;
  mentorFirebaseUid?: unknown;
  studentId?: unknown;
  studentFirebaseUid?: unknown;
};

export function participantReference(value: unknown): string | undefined {
  if (typeof value === "string") return value;
  if (value && typeof value === "object" && "toHexString" in value && typeof value.toHexString === "function") {
    return value.toHexString();
  }
  return undefined;
}

export function normalizeMentorshipStatus(status?: string) {
  return String(status ?? "pending").trim().toLowerCase() || "pending";
}

export function sessionBelongsToUser(
  session: SessionParticipantFields,
  userId?: string,
  firebaseUid?: string
) {
  const identities = new Set([userId, firebaseUid].filter((value): value is string => Boolean(value)));
  return [session.mentorId, session.mentorFirebaseUid, session.studentId, session.studentFirebaseUid].some(
    (value) => {
      const identity = participantReference(value);
      return Boolean(identity && identities.has(identity));
    }
  );
}

export function demoIdentityHeaders(userId?: string): Record<string, string> {
  return userId ? { "x-unicare-demo-user-id": userId } : {};
}

export function sessionParticipantQuery(role: "mentor" | "student", userId?: string, firebaseUid?: string) {
  const references = [...new Set([userId, firebaseUid].filter((value): value is string => Boolean(value)))];
  const idField = role === "mentor" ? "mentorId" : "studentId";
  const uidField = role === "mentor" ? "mentorFirebaseUid" : "studentFirebaseUid";
  return {
    $or: [
      ...(references.length ? [{ [idField]: { $in: references } }] : []),
      ...(firebaseUid ? [{ [uidField]: firebaseUid }] : [])
    ]
  };
}

export function isFutureSessionTime(value?: string, now = Date.now()) {
  if (!value?.trim()) return false;
  const timestamp = new Date(value).getTime();
  return Number.isFinite(timestamp) && timestamp > now;
}

export function isPastSessionTime(value?: string, now = Date.now()) {
  if (!value?.trim()) return false;
  const timestamp = new Date(value).getTime();
  return Number.isFinite(timestamp) && timestamp <= now;
}

export function isScheduledStatus(status?: string) {
  const normalized = normalizeMentorshipStatus(status);
  return normalized === "confirmed" || normalized === "scheduled";
}

export type MentorshipStatusActor = "mentor" | "student" | "admin";

/** Restrict status changes so only a mentor can approve a pending request. */
export function canTransitionMentorshipStatus(
  currentStatus: string | undefined,
  requestedStatus: string,
  actor: MentorshipStatusActor
) {
  const current = normalizeMentorshipStatus(currentStatus);
  const requested = normalizeMentorshipStatus(requestedStatus);
  if (actor === "admin") {
    return ["pending", "confirmed", "scheduled", "completed", "cancelled"].includes(requested);
  }
  if (requested === "cancelled") {
    return ["pending", "confirmed", "scheduled"].includes(current);
  }
  if (requested === "confirmed") {
    return actor === "mentor" && ["pending", "confirmed"].includes(current);
  }
  if (requested === "scheduled") {
    return ["confirmed", "scheduled"].includes(current);
  }
  if (requested === "completed") {
    return actor === "student" && ["confirmed", "scheduled"].includes(current);
  }
  return false;
}
