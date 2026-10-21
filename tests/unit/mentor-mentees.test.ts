import { buildActiveMenteeSummaries, isEligibleAccount } from "@/lib/mentor-mentees";

describe("active mentee summaries", () => {
  const students = [
    { _id: "student-a", firebaseUid: "fb-a", name: "Alex Lee", role: "student" },
    { _id: "student-b", firebaseUid: "fb-b", name: "Alex Lee", role: "student" },
    { _id: "student-deleted", firebaseUid: "fb-deleted", name: "Deleted", role: "student", isDeleted: true },
    { _id: "student-blocked", firebaseUid: "fb-blocked", name: "Blocked", role: "student", status: "blocked" }
  ];

  it("joins active sessions by stable identifiers and keeps same-name students distinct", () => {
    const sessions = [
      { studentFirebaseUid: "fb-a", status: "confirmed", topic: "Web", createdAt: "2026-01-01" },
      { studentId: "student-b", status: "scheduled", topic: "Data", createdAt: "2026-01-02" },
      { studentFirebaseUid: "missing", status: "confirmed" },
      { studentFirebaseUid: "fb-deleted", status: "confirmed" },
      { studentFirebaseUid: "fb-blocked", status: "scheduled" },
      { studentFirebaseUid: "fb-a", status: "cancelled" }
    ];
    const originalSessions = JSON.parse(JSON.stringify(sessions));
    const originalStudents = JSON.parse(JSON.stringify(students));

    expect(buildActiveMenteeSummaries(sessions, students)).toEqual([
      { studentId: "student-b", name: "Alex Lee", activeSessions: 1, lastTopic: "Data" },
      { studentId: "student-a", name: "Alex Lee", activeSessions: 1, lastTopic: "Web" }
    ]);
    expect(sessions).toEqual(originalSessions);
    expect(students).toEqual(originalStudents);
  });

  it("uses repository account eligibility conventions", () => {
    expect(isEligibleAccount({ isDeleted: true })).toBe(false);
    expect(isEligibleAccount({ status: "deleted" })).toBe(false);
    expect(isEligibleAccount({ status: "blocked" })).toBe(false);
    expect(isEligibleAccount({ subscription: { status: "blocked" } })).toBe(false);
    expect(isEligibleAccount({ status: "active" })).toBe(true);
  });
});
