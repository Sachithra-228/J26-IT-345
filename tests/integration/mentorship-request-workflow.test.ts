/**
 * @jest-environment node
 */
import { NextRequest } from "next/server";
import { ObjectId } from "mongodb";
import { POST as createRequest, GET as listSessions } from "@/app/api/mentorship-sessions/route";
import { PATCH as updateSession } from "@/app/api/mentorship-sessions/[id]/route";
import { GET as getMessages, POST as postMessage } from "@/app/api/mentorship-messages/route";
import { getMongoDatabase } from "@/lib/mongodb";
import { requireSession } from "@/lib/session-auth";

jest.mock("@/lib/mongodb", () => ({ getMongoDatabase: jest.fn() }));
jest.mock("@/lib/notifications", () => ({ createNotification: jest.fn().mockResolvedValue(undefined) }));
jest.mock("@/lib/session-auth", () => {
  const actual = jest.requireActual("@/lib/session-auth");
  return { ...actual, requireSession: jest.fn() };
});

const databaseMock = getMongoDatabase as jest.MockedFunction<typeof getMongoDatabase>;
const sessionMock = requireSession as jest.MockedFunction<typeof requireSession>;
const originalMongoUri = process.env.MONGODB_URI;
const originalDemoMode = process.env.NEXT_PUBLIC_DEMO_MODE;
const mentorId = new ObjectId();
const studentId = new ObjectId();
const otherMentorId = new ObjectId();

function cursor<T>(rows: T[]) {
  return { sort: jest.fn().mockReturnThis(), project: jest.fn().mockReturnThis(), toArray: jest.fn().mockResolvedValue(rows) };
}

function asMentor(id = mentorId, uid = "mentor-firebase") {
  sessionMock.mockResolvedValue({ session: {
    idToken: "test-session",
    firebase: { uid, email: "mentor@example.test", displayName: "Same Name", emailVerified: true },
    user: { _id: id.toHexString(), role: "mentor", name: "Same Name", email: "mentor@example.test" }
  } } as never);
}

function asStudent(id = studentId, uid = "student-firebase") {
  sessionMock.mockResolvedValue({ session: {
    idToken: "test-session",
    firebase: { uid, email: "student@example.test", displayName: "Same Name", emailVerified: true },
    user: { _id: id.toHexString(), role: "student", name: "Same Name", email: "student@example.test" }
  } } as never);
}

function installDb(collections: Record<string, Record<string, jest.Mock>>) {
  databaseMock.mockResolvedValue({ collection: jest.fn((name: string) => collections[name]) } as never);
}

beforeEach(() => {
  jest.clearAllMocks();
  process.env.MONGODB_URI = "mongodb://test.invalid/unicare";
  process.env.NEXT_PUBLIC_DEMO_MODE = "false";
  asStudent();
});

afterAll(() => {
  if (originalMongoUri === undefined) delete process.env.MONGODB_URI;
  else process.env.MONGODB_URI = originalMongoUri;
  if (originalDemoMode === undefined) delete process.env.NEXT_PUBLIC_DEMO_MODE;
  else process.env.NEXT_PUBLIC_DEMO_MODE = originalDemoMode;
});

describe("student-to-mentor request lifecycle", () => {
  it("persists one pending request with canonical participant IDs and request details", async () => {
    const inserted: Record<string, unknown>[] = [];
    const sessions = {
      findOne: jest.fn().mockResolvedValue(null),
      insertOne: jest.fn(async (row: Record<string, unknown>) => { inserted.push(row); return { insertedId: new ObjectId() }; })
    };
    installDb({
      users: { findOne: jest.fn()
        .mockResolvedValueOnce({ _id: mentorId, firebaseUid: "mentor-firebase", name: "Same Name", role: "mentor", status: "active" })
        .mockResolvedValueOnce({ _id: studentId, firebaseUid: "student-firebase", name: "Same Name", role: "student", status: "active" }) },
      mentorship_sessions: sessions,
      notifications: { insertOne: jest.fn().mockResolvedValue({ acknowledged: true }) }
    });

    const response = await createRequest(new NextRequest("http://localhost/api/mentorship-sessions", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ mentorId: mentorId.toHexString(), topic: "Career planning", message: "Please advise." })
    }));

    expect(response.status).toBe(201);
    expect(inserted).toHaveLength(1);
    expect(inserted[0]).toMatchObject({
      mentorId: mentorId.toHexString(), mentorFirebaseUid: "mentor-firebase", mentorName: "Same Name",
      studentId: studentId.toHexString(), studentFirebaseUid: "student-firebase", studentName: "Same Name",
      topic: "Career planning", message: "Please advise.", status: "pending", scheduledTime: ""
    });
    expect(inserted[0].createdAt).toBeInstanceOf(Date);
    expect(inserted[0].updatedAt).toBeInstanceOf(Date);
  });

  it("does not insert a duplicate while an open request already exists", async () => {
    const sessions = {
      findOne: jest.fn().mockResolvedValue({ _id: new ObjectId(), status: "pending" }),
      insertOne: jest.fn()
    };
    installDb({
      users: { findOne: jest.fn()
        .mockResolvedValueOnce({ _id: mentorId, firebaseUid: "mentor-firebase", name: "Mentor", role: "mentor", status: "active" })
        .mockResolvedValueOnce({ _id: studentId, firebaseUid: "student-firebase", name: "Student", role: "student", status: "active" }) },
      mentorship_sessions: sessions
    });
    const response = await createRequest(new NextRequest("http://localhost/api/mentorship-sessions", {
      method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ mentorId: mentorId.toHexString(), topic: "Repeat" })
    }));
    expect(response.status).toBe(409);
    expect(sessions.insertOne).not.toHaveBeenCalled();
  });

  it("lets only the linked mentor approve/reject, and blocks student self-approval", async () => {
    const sessionId = new ObjectId();
    const row = { _id: sessionId, mentorId: mentorId.toHexString(), mentorFirebaseUid: "mentor-firebase", studentId: studentId.toHexString(), studentFirebaseUid: "student-firebase", status: "pending", topic: "Planning" };
    const sessions = {
      findOne: jest.fn(async () => row),
      updateOne: jest.fn(async (_filter: unknown, update: { $set: Record<string, unknown> }) => {
        Object.assign(row, update.$set);
        return { modifiedCount: 1 };
      })
    };
    installDb({ mentorship_sessions: sessions, notifications: { insertOne: jest.fn().mockResolvedValue({ acknowledged: true }) } });

    asStudent();
    const studentAttempt = await updateSession(new NextRequest(`http://localhost/api/mentorship-sessions/${sessionId}`, {
      method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ status: "scheduled" })
    }), { params: Promise.resolve({ id: sessionId.toHexString() }) });
    expect(studentAttempt.status).toBe(403);
    expect(sessions.updateOne).not.toHaveBeenCalled();

    asMentor(otherMentorId, "other-mentor-firebase");
    const outsiderAttempt = await updateSession(new NextRequest(`http://localhost/api/mentorship-sessions/${sessionId}`, {
      method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ status: "confirmed" })
    }), { params: Promise.resolve({ id: sessionId.toHexString() }) });
    expect(outsiderAttempt.status).toBe(403);

    asMentor();
    const approval = await updateSession(new NextRequest(`http://localhost/api/mentorship-sessions/${sessionId}`, {
      method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ status: "confirmed" })
    }), { params: Promise.resolve({ id: sessionId.toHexString() }) });
    expect(approval.status).toBe(200);
    expect(sessions.updateOne).toHaveBeenCalledWith({ _id: sessionId }, { $set: expect.objectContaining({ status: "confirmed" }) });
    expect((await approval.json()).status).toBe("confirmed");

    const rejection = await updateSession(new NextRequest(`http://localhost/api/mentorship-sessions/${sessionId}`, {
      method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ status: "cancelled" })
    }), { params: Promise.resolve({ id: sessionId.toHexString() }) });
    expect(rejection.status).toBe(200);
    expect((await rejection.json()).status).toBe("cancelled");
  });

  it("approves and schedules the same request document and exposes its saved time to the student", async () => {
    const sessionId = new ObjectId();
    const row: Record<string, unknown> = {
      _id: sessionId,
      mentorId: mentorId.toHexString(),
      mentorFirebaseUid: "mentor-firebase",
      studentId: studentId.toHexString(),
      studentFirebaseUid: "student-firebase",
      status: "pending",
      topic: "Portfolio review",
      scheduledTime: "",
      createdAt: new Date("2026-10-01T10:00:00.000Z")
    };
    const sessions = {
      findOne: jest.fn(async () => row),
      updateOne: jest.fn(async (_filter: unknown, update: { $set: Record<string, unknown> }) => {
        Object.assign(row, update.$set);
        return { modifiedCount: 1 };
      }),
      find: jest.fn(() => cursor([row]))
    };
    const users = cursor([
      { _id: mentorId, firebaseUid: "mentor-firebase", name: "Susantha Kumari" },
      { _id: studentId, firebaseUid: "student-firebase", name: "Student Name" }
    ]);
    installDb({ mentorship_sessions: sessions, users: { find: jest.fn(() => users) }, notifications: { insertOne: jest.fn().mockResolvedValue({ acknowledged: true }) } });

    asMentor(otherMentorId, "other-mentor-firebase");
    const unauthorized = await updateSession(new NextRequest(`http://localhost/api/mentorship-sessions/${sessionId}`, {
      method: "PATCH", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: "scheduled", scheduledTime: "2030-05-12T10:30:00.000Z" })
    }), { params: Promise.resolve({ id: sessionId.toHexString() }) });
    expect(unauthorized.status).toBe(403);
    expect(sessions.updateOne).not.toHaveBeenCalled();

    asMentor();
    const approved = await updateSession(new NextRequest(`http://localhost/api/mentorship-sessions/${sessionId}`, {
      method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ status: "confirmed" })
    }), { params: Promise.resolve({ id: sessionId.toHexString() }) });
    expect(approved.status).toBe(200);
    expect((await approved.json())._id).toBe(sessionId.toHexString());

    const selectedTime = "2030-05-12T10:30:00.000Z";
    const scheduled = await updateSession(new NextRequest(`http://localhost/api/mentorship-sessions/${sessionId}`, {
      method: "PATCH", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: "scheduled", scheduledTime: selectedTime })
    }), { params: Promise.resolve({ id: sessionId.toHexString() }) });
    expect(scheduled.status).toBe(200);
    expect(await scheduled.json()).toMatchObject({ _id: sessionId.toHexString(), status: "scheduled", scheduledTime: selectedTime });
    expect(row).toMatchObject({ _id: sessionId, status: "scheduled", scheduledTime: selectedTime });
    expect(sessions.updateOne).toHaveBeenLastCalledWith(
      { _id: sessionId },
      { $set: expect.objectContaining({ status: "scheduled", scheduledTime: selectedTime }) }
    );

    asStudent();
    const studentSessions = await listSessions(new NextRequest("http://localhost/api/mentorship-sessions"));
    const visibleSessions = await studentSessions.json();
    expect(visibleSessions).toContainEqual(expect.objectContaining({
      _id: sessionId.toHexString(),
      mentorId: mentorId.toHexString(),
      status: "scheduled",
      scheduledTime: selectedTime
    }));
    expect(sessions.updateOne).toHaveBeenCalledTimes(2);
  });

  it("keeps pending chat closed and persists/retrieves messages for both stable participants after approval", async () => {
    const sessionId = new ObjectId();
    let row = { _id: sessionId, mentorId: mentorId.toHexString(), mentorFirebaseUid: "mentor-firebase", studentId: studentId.toHexString(), studentFirebaseUid: "student-firebase", status: "pending", topic: "Planning" };
    const storedMessages: Array<Record<string, unknown>> = [];
    const sessions = { findOne: jest.fn(async () => row) };
    const messages = {
      find: jest.fn(() => cursor(storedMessages)),
      insertOne: jest.fn(async (message: Record<string, unknown>) => { storedMessages.push({ ...message, _id: new ObjectId() }); return { insertedId: storedMessages[0]._id }; })
    };
    installDb({ mentorship_sessions: sessions, mentorship_messages: messages, notifications: { insertOne: jest.fn().mockResolvedValue({ acknowledged: true }) } });
    const url = `http://localhost/api/mentorship-messages?sessionId=${sessionId.toHexString()}`;

    asStudent();
    expect((await getMessages(new NextRequest(url))).status).toBe(409);
    expect((await postMessage(new NextRequest("http://localhost/api/mentorship-messages", {
      method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ sessionId: sessionId.toHexString(), text: "Before approval" })
    }))).status).toBe(409);

    row = { ...row, status: "confirmed" };
    const sent = await postMessage(new NextRequest("http://localhost/api/mentorship-messages", {
      method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ sessionId: sessionId.toHexString(), text: "After approval" })
    }));
    expect(sent.status).toBe(201);
    expect(storedMessages[0]).toMatchObject({ sessionId: sessionId.toHexString(), senderRole: "student", senderUserId: studentId.toHexString(), senderFirebaseUid: "student-firebase", text: "After approval" });
    expect((await getMessages(new NextRequest(url))).status).toBe(200);

    asMentor();
    const mentorMessages = await getMessages(new NextRequest(url));
    expect(await mentorMessages.json()).toHaveLength(1);
    row = { ...row, status: "cancelled" };
    expect((await getMessages(new NextRequest(url))).status).toBe(409);
  });

  it("preserves same-name accounts as distinct session participants and queries both ID and Firebase identities", async () => {
    const studentTwo = new ObjectId();
    const rows = cursor([
      { _id: new ObjectId(), mentorId: mentorId.toHexString(), studentId: studentId.toHexString(), studentFirebaseUid: "student-one", status: "pending", topic: "A" },
      { _id: new ObjectId(), mentorId: mentorId.toHexString(), studentId: studentTwo.toHexString(), studentFirebaseUid: "student-two", status: "pending", topic: "B" }
    ]);
    const users = cursor([
      { _id: mentorId, firebaseUid: "mentor-firebase", name: "Mentor" },
      { _id: studentId, firebaseUid: "student-one", name: "Alex" },
      { _id: studentTwo, firebaseUid: "student-two", name: "Alex" }
    ]);
    const findSessions = jest.fn(() => rows);
    installDb({ mentorship_sessions: { find: findSessions }, users: { find: jest.fn(() => users) } });
    asMentor();
    const response = await listSessions(new NextRequest("http://localhost/api/mentorship-sessions"));
    const data = await response.json();
    expect(data.map((item: { studentId: string }) => item.studentId)).toEqual([studentId.toHexString(), studentTwo.toHexString()]);
    expect(data.map((item: { studentName: string }) => item.studentName)).toEqual(["Alex", "Alex"]);
    const query = findSessions.mock.calls[0][0] as { $or: Array<Record<string, unknown>> };
    expect(JSON.stringify(query)).toContain(mentorId.toHexString());
    expect(JSON.stringify(query)).toContain("mentor-firebase");
    expect(rows.toArray).toHaveBeenCalled();
  });
});
