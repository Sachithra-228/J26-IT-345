import {
  isFutureSessionTime,
  isScheduledStatus,
  normalizeMentorshipStatus,
  sessionBelongsToUser,
  sessionParticipantQuery
} from "@/lib/mentorship-session";

describe("mentorship session lifecycle helpers", () => {
  it("normalizes the lifecycle statuses supported by session APIs", () => {
    for (const status of ["pending", "scheduled", "confirmed", "completed", "cancelled"]) {
      expect(normalizeMentorshipStatus(` ${status.toUpperCase()} `)).toBe(status);
    }
    expect(normalizeMentorshipStatus()).toBe("pending");
    expect(isScheduledStatus("CONFIRMED")).toBe(true);
    expect(isScheduledStatus("scheduled")).toBe(true);
    expect(isScheduledStatus("pending")).toBe(false);
  });

  it("matches either stable Mongo user IDs or Firebase UIDs and scopes queries to both", () => {
    const session = { mentorId: "mentor-db", studentFirebaseUid: "student-fb" };
    expect(sessionBelongsToUser(session, "mentor-db", "mentor-fb")).toBe(true);
    expect(sessionBelongsToUser(session, "student-db", "student-fb")).toBe(true);
    expect(sessionBelongsToUser(session, "other-db", "other-fb")).toBe(false);
    expect(sessionParticipantQuery("mentor", "mentor-db", "mentor-fb").$or).toEqual([
      { mentorId: { $in: ["mentor-db", "mentor-fb"] } },
      { mentorFirebaseUid: "mentor-fb" }
    ]);
  });

  it("treats only valid future scheduled timestamps as upcoming", () => {
    const now = Date.parse("2026-10-21T10:00:00.000Z");
    expect(isFutureSessionTime("2026-10-21T11:00:00.000Z", now)).toBe(true);
    expect(isFutureSessionTime("2026-10-21T09:00:00.000Z", now)).toBe(false);
    expect(isFutureSessionTime("not-a-date", now)).toBe(false);
    expect(isFutureSessionTime(undefined, now)).toBe(false);
  });
});
