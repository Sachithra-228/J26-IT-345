import { NextRequest } from "next/server";
import { ObjectId } from "mongodb";
import { demoUsers } from "@/lib/demo-data";
import { isDemoMode, jsonResponse } from "@/lib/api";
import { getDemoSessions } from "@/lib/mentorship-demo-store";
import { buildActiveMenteeSummaries, type MenteeSessionReference } from "@/lib/mentor-mentees";
import { getMongoDatabase } from "@/lib/mongodb";
import { requireRole, requireSession } from "@/lib/session-auth";
import { participantReference } from "@/lib/mentorship-session";

type SessionDocument = MenteeSessionReference & {
  mentorId?: unknown;
  mentorFirebaseUid?: string;
};

type StudentDocument = {
  _id: ObjectId;
  firebaseUid?: string;
  name: string;
  role?: string;
  status?: string;
  isDeleted?: boolean;
  subscription?: { status?: string };
};

export async function GET(request: NextRequest) {
  const authResult = await requireSession(request);
  if (authResult.error) return authResult.error;
  const roleCheck = requireRole(authResult.session.user?.role, ["mentor", "super_admin"]);
  if (roleCheck) return roleCheck;

  const userId = authResult.session.user?._id;
  const firebaseUid = authResult.session.firebase.uid;
  const includeHistory = request.nextUrl.searchParams.get("includeHistory") === "true";
  const eligibleStatuses = includeHistory ? ["confirmed", "scheduled", "completed"] : ["confirmed", "scheduled"];

  if (isDemoMode()) {
    const mentorIds = new Set([userId, firebaseUid].filter((value): value is string => Boolean(value)));
    const sessionRows = getDemoSessions().filter(
      (session) => mentorIds.has(session.mentorId) && eligibleStatuses.includes(String(session.status).toLowerCase())
    );
    const studentRefs = new Set(sessionRows.map((session) => session.studentId).filter(Boolean));
    const students = demoUsers
      .filter((user) => user.role === "student" && studentRefs.has(user._id))
      .map((user) => ({
        _id: user._id,
        firebaseUid: user.firebaseUid,
        name: user.name,
        role: user.role,
        status: user.status,
        isDeleted: user.isDeleted
      }));
    const activeItems = buildActiveMenteeSummaries(sessionRows, students, ["confirmed", "scheduled"]);
    const items = buildActiveMenteeSummaries(sessionRows, students, eligibleStatuses);
    return jsonResponse({ items, activeItems });
  }

  const database = await getMongoDatabase();
  const sessionsCol = database.collection<SessionDocument>("mentorship_sessions");
  const mentorIds = [userId, firebaseUid].filter((value): value is string => Boolean(value));
  const mentorObjectIds = mentorIds.filter(ObjectId.isValid).map((value) => new ObjectId(value));
  const sessionRows = await sessionsCol
    .find({
      $and: [
        { status: { $in: eligibleStatuses } },
        {
          $or: [
            { mentorFirebaseUid: firebaseUid },
            ...(mentorIds.length ? [{ mentorId: { $in: mentorIds } }] : []),
            ...(mentorObjectIds.length ? [{ mentorId: { $in: mentorObjectIds } }] : [])
          ]
        }
      ]
    })
    .sort({ updatedAt: -1, createdAt: -1 })
    .toArray();

  const studentReferences = [...new Set(sessionRows.flatMap((session) =>
    [participantReference(session.studentId), participantReference(session.studentFirebaseUid)]
      .filter((value): value is string => Boolean(value))
  ))];
  if (!studentReferences.length) return jsonResponse({ items: [] });

  const objectIds = studentReferences.filter((value) => ObjectId.isValid(value)).map((value) => new ObjectId(value));
  const studentsCol = database.collection<StudentDocument>("users");
  const students = await studentsCol
    .find({
      role: "student",
      isDeleted: { $ne: true },
      status: { $nin: ["blocked", "deleted"] },
      "subscription.status": { $ne: "blocked" },
      $or: [
        ...(objectIds.length ? [{ _id: { $in: objectIds } }] : []),
        { firebaseUid: { $in: studentReferences } }
      ]
    })
    .project<StudentDocument>({ _id: 1, firebaseUid: 1, name: 1, role: 1, status: 1, isDeleted: 1, subscription: 1 })
    .toArray();

  const currentStudents = students.map((student) => ({ ...student, _id: student._id.toString() }));
  const activeItems = buildActiveMenteeSummaries(sessionRows, currentStudents, ["confirmed", "scheduled"]);
  const items = buildActiveMenteeSummaries(sessionRows, currentStudents, eligibleStatuses);
  return jsonResponse({ items, activeItems });
}
