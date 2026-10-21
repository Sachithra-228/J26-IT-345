/**
 * @jest-environment node
 */
import { NextRequest } from "next/server";
import { ObjectId } from "mongodb";
import { GET as getMentors } from "@/app/api/mentors/route";
import { GET as getMentees } from "@/app/api/mentor/mentees/route";
import { GET as getSessions, POST as createSession } from "@/app/api/mentorship-sessions/route";
import { GET as getMessages } from "@/app/api/mentorship-messages/route";
import { GET as getNotes } from "@/app/api/mentor/mentee-notes/route";
import { getMongoDatabase } from "@/lib/mongodb";
import { requireSession } from "@/lib/session-auth";

jest.mock("@/lib/mongodb", () => ({ getMongoDatabase: jest.fn() }));
jest.mock("@/lib/session-auth", () => {
  const actual = jest.requireActual("@/lib/session-auth");
  return { ...actual, requireSession: jest.fn() };
});

const databaseMock = getMongoDatabase as jest.MockedFunction<typeof getMongoDatabase>;
const sessionMock = requireSession as jest.MockedFunction<typeof requireSession>;
const objectId = () => new ObjectId();
const originalMongoUri = process.env.MONGODB_URI;
const originalDemoMode = process.env.NEXT_PUBLIC_DEMO_MODE;

function cursor<T>(rows: T[]) {
  return { sort: jest.fn().mockReturnThis(), project: jest.fn().mockReturnThis(), toArray: jest.fn().mockResolvedValue(rows) };
}

function mockDb(collections: Record<string, Record<string, jest.Mock>>) {
  databaseMock.mockResolvedValue({ collection: jest.fn((name: string) => collections[name]) } as never);
}

beforeEach(() => {
  jest.clearAllMocks();
  process.env.MONGODB_URI = "mongodb://test.invalid/unic-care";
  process.env.NEXT_PUBLIC_DEMO_MODE = "false";
  sessionMock.mockResolvedValue({ session: {
    idToken: "token",
    firebase: { uid: "mentor-fb", email: "mentor@example.test", displayName: "Mentor", emailVerified: true },
    user: { _id: "mentor-id", role: "mentor", name: "Mentor", email: "mentor@example.test" }
  } } as never);
});

afterAll(() => {
  if (originalMongoUri === undefined) delete process.env.MONGODB_URI;
  else process.env.MONGODB_URI = originalMongoUri;
  if (originalDemoMode === undefined) delete process.env.NEXT_PUBLIC_DEMO_MODE;
  else process.env.NEXT_PUBLIC_DEMO_MODE = originalDemoMode;
});

describe("mentor account lifecycle reads", () => {
  it("filters deleted and blocked mentors while preserving distinct account IDs", async () => {
    const users = cursor([
      { _id: objectId(), name: "Same Name", role: "mentor", status: "active" },
      { _id: objectId(), name: "Same Name", role: "mentor", status: "active" },
      { _id: objectId(), name: "Removed", role: "mentor", isDeleted: true },
      { _id: objectId(), name: "Blocked", role: "mentor", status: "blocked" }
    ]);
    mockDb({ users: { find: jest.fn(() => users) } });

    const response = await getMentors(new NextRequest("http://localhost/api/mentors"));
    const data = await response.json();
    expect(data).toHaveLength(2);
    expect(data[0]._id).not.toBe(data[1]._id);
    expect(data.map((mentor: { name: string }) => mentor.name)).toEqual(["Same Name", "Same Name"]);
    expect(users.toArray).toHaveBeenCalled();
  });

  it("builds current mentees from the mentor's active sessions and current eligible users", async () => {
    const studentA = objectId();
    const studentB = objectId();
    const deleted = objectId();
    const sessionRows = cursor([
      { studentId: studentA.toHexString(), studentFirebaseUid: "student-a", status: "confirmed", topic: "A" },
      { studentId: studentB.toHexString(), studentFirebaseUid: "student-b", status: "scheduled", topic: "B" },
      { studentId: deleted.toHexString(), studentFirebaseUid: "student-deleted", status: "confirmed", topic: "Old" },
      { studentId: objectId().toHexString(), studentFirebaseUid: "missing", status: "confirmed", topic: "Missing" }
    ]);
    const students = cursor([
      { _id: studentA, firebaseUid: "student-a", name: "Alex", role: "student" },
      { _id: studentB, firebaseUid: "student-b", name: "Alex", role: "student" },
      { _id: deleted, firebaseUid: "student-deleted", name: "Deleted", role: "student", isDeleted: true }
    ]);
    mockDb({
      mentorship_sessions: { find: jest.fn(() => sessionRows) },
      users: { find: jest.fn(() => students) }
    });

    const response = await getMentees(new NextRequest("http://localhost/api/mentor/mentees"));
    const { items } = await response.json();
    expect(items).toEqual([
      { studentId: studentA.toHexString(), name: "Alex", activeSessions: 1, lastTopic: "A" },
      { studentId: studentB.toHexString(), name: "Alex", activeSessions: 1, lastTopic: "B" }
    ]);
    expect(students.toArray).toHaveBeenCalled();
  });

  it("returns no global demo sessions for an authenticated mentor with no DB sessions", async () => {
    const originalNodeEnv = process.env.NODE_ENV;
    process.env.NODE_ENV = "development";
    process.env.NEXT_PUBLIC_DEMO_MODE = "false";
    const sessions = cursor([]);
    mockDb({ mentorship_sessions: { find: jest.fn(() => sessions) }, users: { find: jest.fn(() => cursor([])) } });
    try {
      const response = await getSessions(new NextRequest("http://localhost/api/mentorship-sessions"));
      expect(await response.json()).toEqual([]);
    } finally {
      if (originalNodeEnv === undefined) delete process.env.NODE_ENV;
      else process.env.NODE_ENV = originalNodeEnv;
    }
  });

  it("keeps historical sessions, messages, and notes readable without mutating them", async () => {
    const sessionId = objectId();
    const historicalSession = { _id: sessionId, mentorFirebaseUid: "mentor-fb", studentFirebaseUid: "former-student", status: "completed", topic: "History" };
    const storedMessage = { _id: objectId(), sessionId: sessionId.toHexString(), text: "Earlier message" };
    const storedNote = { _id: objectId(), mentorId: "mentor-id", studentId: "former-student", note: "Earlier note" };
    const sessionRows = cursor([historicalSession]);
    const messageRows = cursor([storedMessage]);
    const noteRows = cursor([storedNote]);
    mockDb({
      mentorship_sessions: { find: jest.fn(() => sessionRows), findOne: jest.fn().mockResolvedValue(historicalSession) },
      users: { find: jest.fn(() => cursor([
        { _id: objectId(), firebaseUid: "mentor-fb", name: "Old Mentor Name", isDeleted: true },
        { _id: objectId(), firebaseUid: "former-student", name: "Old Student Name", status: "deleted" }
      ])) },
      mentorship_messages: { find: jest.fn(() => messageRows) },
      mentor_mentee_notes: { find: jest.fn(() => noteRows) }
    });

    const historicalResponse = await (await getSessions(new NextRequest("http://localhost/api/mentorship-sessions"))).json();
    expect(historicalResponse).toHaveLength(1);
    expect(historicalResponse[0]).toMatchObject({
      mentorName: "Archived mentor account",
      studentName: "Archived student account",
      status: "completed"
    });
    const messagesResponse = await getMessages(new NextRequest(`http://localhost/api/mentorship-messages?sessionId=${sessionId.toHexString()}`));
    expect(await messagesResponse.json()).toHaveLength(1);
    const notesResponse = await getNotes(new NextRequest("http://localhost/api/mentor/mentee-notes"));
    expect((await notesResponse.json()).items).toHaveLength(1);
    expect(historicalSession.status).toBe("completed");
    expect(storedMessage.text).toBe("Earlier message");
    expect(storedNote.note).toBe("Earlier note");
  });

  it("resolves the same legacy ID-only session and participant names for both dashboards", async () => {
    const sessionId = objectId();
    const mentorId = objectId();
    const studentId = objectId();
    const row = {
      _id: sessionId,
      mentorId: mentorId.toHexString(),
      studentId: studentId.toHexString(),
      topic: "Portfolio review",
      scheduledTime: "2026-12-01T10:00:00.000Z",
      status: " Scheduled "
    };
    const sessions = cursor([row]);
    const users = cursor([
      { _id: mentorId, firebaseUid: "mentor-fb", name: "Actual Mentor" },
      { _id: studentId, firebaseUid: "student-fb", name: "Actual Student" }
    ]);
    mockDb({ mentorship_sessions: { find: jest.fn(() => sessions) }, users: { find: jest.fn(() => users) } });

    const mentorResponse = await getSessions(new NextRequest("http://localhost/api/mentorship-sessions"));
    const [mentorView] = await mentorResponse.json();
    expect(mentorView).toMatchObject({
      _id: sessionId.toHexString(),
      mentorId: mentorId.toHexString(),
      studentId: studentId.toHexString(),
      mentorName: "Actual Mentor",
      studentName: "Actual Student",
      status: "scheduled"
    });

    sessionMock.mockResolvedValue({ session: {
      idToken: "token",
      firebase: { uid: "student-fb", email: "student@example.test", displayName: "Student", emailVerified: true },
      user: { _id: studentId.toHexString(), role: "student", name: "Actual Student", email: "student@example.test" }
    } } as never);
    const studentResponse = await getSessions(new NextRequest("http://localhost/api/mentorship-sessions"));
    const [studentView] = await studentResponse.json();
    expect(studentView).toEqual(mentorView);
  });

  it("creates a follow-up for the selected current mentee and authenticated mentor", async () => {
    const studentId = objectId();
    const relationship = { _id: objectId(), mentorId: "mentor-id", studentId: studentId.toHexString(), status: "confirmed" };
    const inserted: Record<string, unknown>[] = [];
    const collections: Record<string, Record<string, jest.Mock>> = {
      users: { findOne: jest.fn().mockResolvedValue({ _id: studentId, firebaseUid: "student-fb", name: "Student", role: "student", status: "active" }) },
      mentorship_sessions: {
        findOne: jest.fn().mockResolvedValue(relationship),
        insertOne: jest.fn(async (document: Record<string, unknown>) => {
          inserted.push(document);
          return { insertedId: objectId() };
        })
      },
      notifications: { insertOne: jest.fn().mockResolvedValue({ acknowledged: true }) }
    };
    mockDb(collections);

    const response = await createSession(new NextRequest("http://localhost/api/mentorship-sessions", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ studentId: studentId.toHexString(), topic: "Follow-up", scheduledTime: "2026-12-02T10:00:00.000Z" })
    }));
    expect(response.status).toBe(201);
    expect(inserted[0]).toMatchObject({
      mentorId: "mentor-id",
      mentorFirebaseUid: "mentor-fb",
      studentId: studentId.toHexString(),
      studentFirebaseUid: "student-fb",
      topic: "Follow-up",
      status: "scheduled"
    });
  });

  it("denies message reads when the requester is not a session participant", async () => {
    const sessionId = objectId();
    mockDb({
      mentorship_sessions: {
        findOne: jest.fn().mockResolvedValue({ _id: sessionId, mentorFirebaseUid: "mentor-fb", studentFirebaseUid: "student-fb" })
      },
      mentorship_messages: { find: jest.fn(() => cursor([])) }
    });
    sessionMock.mockResolvedValue({ session: {
      idToken: "token",
      firebase: { uid: "outsider-fb", email: "other@example.test", displayName: "Other", emailVerified: true },
      user: { _id: "outsider-id", role: "student", name: "Other", email: "other@example.test" }
    } } as never);

    const response = await getMessages(new NextRequest(`http://localhost/api/mentorship-messages?sessionId=${sessionId.toHexString()}`));
    expect(response.status).toBe(403);
  });
});
