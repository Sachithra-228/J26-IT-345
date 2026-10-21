import { NextRequest } from "next/server";
import { ObjectId } from "mongodb";
import { demoUsers } from "@/lib/demo-data";
import { getDemoSessions, addDemoSession } from "@/lib/mentorship-demo-store";
import { listDemoMentorshipMessages } from "@/lib/mentorship-chat-demo-store";
import { isDemoMode, jsonResponse } from "@/lib/api";
import { getMongoDatabase } from "@/lib/mongodb";
import { createNotification } from "@/lib/notifications";
import { requireRole, requireSession } from "@/lib/session-auth";
import { canTransitionMentorshipStatus, participantReference, sessionParticipantQuery } from "@/lib/mentorship-session";
import { isEligibleAccount } from "@/lib/mentor-mentees";
import type { MentorshipSession } from "@/types";

type SessionDocument = {
  _id: ObjectId;
  mentorId?: string | ObjectId;
  mentorFirebaseUid?: string;
  mentorName?: string;
  studentId?: string | ObjectId;
  studentFirebaseUid?: string;
  studentName?: string;
  topic?: string;
  scheduledTime?: string;
  status?: string;
  message?: string;
  feedback?: string;
  rating?: number;
  review?: string;
  createdAt?: Date | string;
  updatedAt?: Date | string;
  studentArchivedAt?: Date | string | null;
};

type UserDocument = {
  _id: ObjectId;
  name: string;
  firebaseUid?: string;
  isDeleted?: boolean;
  status?: string;
};

function studentSafeId(value: unknown): string {
  return value && typeof value === "object" && "toString" in value
    ? (value as { toString: () => string }).toString()
    : String(value ?? "");
}

export async function GET(request: NextRequest) {
  const scope = request.nextUrl.searchParams.get("scope");
  const authResult = await requireSession(request);
  if (authResult.error) {
    return authResult.error;
  }
  const isAllScope = scope === "all";

  if (isDemoMode()) {
    if (isAllScope) {
      const roleCheck = requireRole(authResult.session.user?.role, ["admin", "faculty", "super_admin"]);
      if (roleCheck) {
        return roleCheck;
      }
    }
    const demoIdentity = [authResult.session.user?._id, authResult.session.firebase.uid].filter(
      (value): value is string => Boolean(value)
    );
    const allSessions = getDemoSessions();
    const demoUsersByIdentity = new Map<string, { _id: string; name: string }>();
    demoUsers.forEach((user) => {
      demoUsersByIdentity.set(user._id, { _id: user._id, name: user.name });
      const firebaseUid = (user as { firebaseUid?: string }).firebaseUid;
      if (firebaseUid) demoUsersByIdentity.set(firebaseUid, { _id: user._id, name: user.name });
    });
    return jsonResponse(
      (isAllScope
        ? allSessions
        : allSessions.filter(
            (item) => demoIdentity.includes(item.mentorId) || demoIdentity.includes(item.studentId)
          )).map((item) => ({
            ...item,
            status: String(item.status ?? "pending").trim().toLowerCase() || "pending",
            mentorId: demoUsersByIdentity.get(item.mentorId)?._id ?? item.mentorId,
            studentId: demoUsersByIdentity.get(item.studentId)?._id ?? item.studentId,
            mentorName: demoUsersByIdentity.get(item.mentorId)?.name ??
              (item.mentorName?.trim() && item.mentorName.trim().toLowerCase() !== "mentor" ? item.mentorName : "Archived mentor account"),
            studentName: demoUsersByIdentity.get(item.studentId)?.name ??
              (item.studentName?.trim() && item.studentName.trim().toLowerCase() !== "student" ? item.studentName : "Archived student account"),
            lastMessageAt: listDemoMentorshipMessages(item._id).at(-1)?.createdAt ?? null
          }))
    );
  }

  const uid = authResult.session.firebase.uid;
  if (isAllScope) {
    const roleCheck = requireRole(authResult.session.user?.role, ["admin", "faculty", "super_admin"]);
    if (roleCheck) {
      return roleCheck;
    }
  }

  const database = await getMongoDatabase();
  const sessionsCol = database.collection<SessionDocument>("mentorship_sessions");
  const usersCol = database.collection<UserDocument>("users");

  const userId = authResult.session.user?._id;
  const mongoIdentityIds = [userId, uid].filter((value): value is string => Boolean(value && ObjectId.isValid(value)))
    .map((value) => new ObjectId(value));
  const sessions = await sessionsCol
    .find({
      ...(isAllScope
        ? {}
        : {
            $or: [
              ...sessionParticipantQuery("mentor", userId, uid).$or,
              ...sessionParticipantQuery("student", userId, uid).$or,
              ...(mongoIdentityIds.length ? [{ mentorId: { $in: mongoIdentityIds } }, { studentId: { $in: mongoIdentityIds } }] : [])
            ]
          })
    })
    .sort({ scheduledTime: -1, createdAt: -1 })
    .toArray();

  const participantReferences = [...new Set(sessions.flatMap((session) =>
    [session.mentorId, session.mentorFirebaseUid, session.studentId, session.studentFirebaseUid]
      .map(participantReference)
      .filter((value): value is string => Boolean(value))
  ))];
  const userDocs = participantReferences.length
    ? await usersCol.find({
        isDeleted: { $ne: true },
        status: { $ne: "deleted" },
        $or: [
          { firebaseUid: { $in: participantReferences } },
          { _id: { $in: participantReferences.filter(ObjectId.isValid).map((reference) => new ObjectId(reference)) } }
        ]
      }).project({ _id: 1, name: 1, firebaseUid: 1, isDeleted: 1, status: 1 }).toArray()
    : [];
  const sessionIds = sessions.map((session) => session._id.toString());
  const latestMessages = sessionIds.length
    ? await database.collection<{ _id: string; lastMessageAt: Date | string }>("mentorship_messages")
        .aggregate<{ _id: string; lastMessageAt: Date | string }>([
          { $match: { sessionId: { $in: sessionIds } } },
          { $sort: { createdAt: -1 } },
          { $group: { _id: "$sessionId", lastMessageAt: { $first: "$createdAt" } } }
        ])
        .toArray()
    : [];
  const lastMessageAtBySession = new Map(latestMessages.map((item) => [
    item._id,
    item.lastMessageAt instanceof Date ? item.lastMessageAt.toISOString() : String(item.lastMessageAt)
  ]));
  const identityToUser = new Map<string, { _id: string; name: string }>();
  userDocs.filter((user) => user.isDeleted !== true && String(user.status ?? "").toLowerCase() !== "deleted").forEach((u) => {
    const id = u._id.toString();
    identityToUser.set(id, { _id: id, name: u.name });
    if (u.firebaseUid) identityToUser.set(u.firebaseUid, { _id: id, name: u.name });
  });

  const enriched = sessions.map((item) => {
    const mentorIdReference = participantReference(item.mentorId);
    const studentIdReference = participantReference(item.studentId);
    const mentor = identityToUser.get(mentorIdReference ?? "") ?? identityToUser.get(item.mentorFirebaseUid ?? "");
    const student = identityToUser.get(studentIdReference ?? "") ?? identityToUser.get(item.studentFirebaseUid ?? "");
    return {
      _id: item._id.toString(),
      mentorId: mentor?._id ?? mentorIdReference ?? item.mentorFirebaseUid ?? "",
      studentId: student?._id ?? studentIdReference ?? item.studentFirebaseUid ?? "",
      mentorName: mentor?.name ?? (item.mentorName && item.mentorName.trim().toLowerCase() !== "mentor" ? item.mentorName : "Archived mentor account"),
      studentName: student?.name ?? (item.studentName && item.studentName.trim().toLowerCase() !== "student" ? item.studentName : "Archived student account"),
      topic: item.topic ?? "",
      scheduledTime: item.scheduledTime ?? "",
      status: String(item.status ?? "pending").trim().toLowerCase() || "pending",
      message: item.message,
      feedback: item.feedback,
      rating: item.rating,
      review: item.review,
      createdAt: item.createdAt,
      updatedAt: item.updatedAt,
      lastMessageAt: lastMessageAtBySession.get(item._id.toString()) ?? null,
      studentArchivedAt: item.studentArchivedAt instanceof Date
        ? item.studentArchivedAt.toISOString()
        : item.studentArchivedAt ?? null
    };
  });

  return jsonResponse(enriched);
}

export async function POST(request: NextRequest) {
  const payload = await request.json().catch(() => ({}));
  const mentorId = payload.mentorId ?? payload.mentor_id;
  const studentId = payload.studentId ?? payload.student_id;
  const scheduledTime = String(payload.scheduledTime ?? "").trim();
  const topic = String(payload.topic ?? "").trim();
  const message = payload.message ? String(payload.message).trim() : undefined;

  if (!topic) {
    return jsonResponse({ message: "Topic is required" }, 400);
  }

  if (isDemoMode()) {
    const session = await requireSession(request);
    if (session.error) return session.error;
    const currentUser = session.session.user ?? session.session.firebase;
    const currentRole = (session.session.user as { role?: string } | null)?.role ?? "";
    const studentId = (currentUser as { _id?: string })._id ?? "u1";
    const mentor = demoUsers.find((u) => u._id === mentorId && u.role === "mentor");

    if ((currentRole === "mentor" || currentRole === "super_admin") && studentId && typeof payload.studentId === "string") {
      const selectedStudent = demoUsers.find((u) => u._id === payload.studentId && u.role === "student");
      if (!selectedStudent) {
        return jsonResponse({ message: "Student not found" }, 404);
      }
      const mentorCurrentId = (currentUser as { _id?: string })._id ?? "u4";
    const activeMentee = getDemoSessions().some((existing) =>
      existing.mentorId === mentorCurrentId && existing.studentId === selectedStudent._id &&
      ["confirmed", "scheduled", "completed"].includes(String(existing.status).toLowerCase())
    );
    if (!activeMentee) return jsonResponse({ message: "Student is not an active mentee." }, 403);
      const newSession: MentorshipSession = {
        _id: `m${Date.now()}`,
        mentorId: mentorCurrentId,
        studentId: selectedStudent._id,
        mentorName: (currentUser as { name?: string }).name ?? "Mentor",
        studentName: selectedStudent.name,
        topic,
        scheduledTime,
        status: scheduledTime ? "scheduled" : "confirmed",
        message,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };
      addDemoSession(newSession);
      return jsonResponse({ message: "Session scheduled", session: newSession }, 201);
    }

    if (currentRole !== "student") {
      return jsonResponse({ message: "Only students can send mentorship requests." }, 403);
    }

    if (!mentor) {
      return jsonResponse({ message: "Mentor not found" }, 404);
    }
    const existingRequest = getDemoSessions().find((item) =>
      item.mentorId === mentor._id && item.studentId === studentId &&
      String(item.status).toLowerCase() === "pending"
    );
    if (existingRequest) {
      return jsonResponse({ message: "An open mentorship request or relationship already exists with this mentor.", session: existingRequest }, 409);
    }
    const newSession: MentorshipSession = {
      _id: `m${Date.now()}`,
      mentorId: mentor._id,
      studentId,
      mentorName: mentor.name,
      studentName: (currentUser as { name?: string }).name ?? "Student",
      topic,
      scheduledTime: "",
      status: "pending",
      message,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    addDemoSession(newSession);
    return jsonResponse({ message: "Request sent", session: newSession }, 201);
  }

  const authResult = await requireSession(request);
  if (authResult.error) {
    return authResult.error;
  }

  const currentRole = authResult.session.user?.role ?? "";
  const isMentorRole = currentRole === "mentor" || currentRole === "super_admin";
  if (!isMentorRole && !mentorId) {
    return jsonResponse({ message: "mentorId is required" }, 400);
  }
  if (isMentorRole && !studentId) {
    return jsonResponse({ message: "studentId is required for mentor scheduling" }, 400);
  }

  const database = await getMongoDatabase();
  const usersCol = database.collection("users");

  if (isMentorRole) {
    const mentorUserId = authResult.session.user?._id;
    const mentorFirebaseUid = authResult.session.firebase.uid;

    const studentQueryId =
      typeof studentId === "string" && studentId.length === 24 ? new ObjectId(studentId) : studentId;
    const studentUser = await usersCol.findOne({
      $or: [
        { _id: studentQueryId },
        { firebaseUid: studentId }
      ],
      role: "student"
    });
    if (!studentUser) {
      return jsonResponse({ message: "Student not found" }, 404);
    }
    if (!isEligibleAccount(studentUser as { status?: string; isDeleted?: boolean; subscription?: { status?: string } })) {
      return jsonResponse({ message: "Student account is not eligible for scheduling." }, 404);
    }

    const mentorIds = [mentorUserId, mentorFirebaseUid].filter((value): value is string => Boolean(value));
    const studentReferences = [studentUser._id.toString(), studentUser.firebaseUid].filter(
      (value): value is string => Boolean(value)
    );
    const studentReferenceIds = studentReferences.filter(ObjectId.isValid).map((value) => new ObjectId(value));
    const mentorReferenceIds = mentorIds.filter(ObjectId.isValid).map((value) => new ObjectId(value));
    const activeRelationship = await database.collection("mentorship_sessions").findOne({
      $and: [
        { status: { $in: ["confirmed", "scheduled", "completed"] } },
        {
          $or: [
            ...(mentorIds.length ? [{ mentorId: { $in: mentorIds } }] : []),
            ...(mentorReferenceIds.length ? [{ mentorId: { $in: mentorReferenceIds } }] : []),
            { mentorFirebaseUid }
          ]
        },
        {
          $or: [
            { studentId: { $in: studentReferences } },
            ...(studentReferenceIds.length ? [{ studentId: { $in: studentReferenceIds } }] : []),
            { studentFirebaseUid: { $in: studentReferences } }
          ]
        }
      ]
    });
    if (!activeRelationship) return jsonResponse({ message: "Student is not an active mentee." }, 403);

    const now = new Date();
    const scheduledStatus: MentorshipSession["status"] = scheduledTime ? "scheduled" : "confirmed";
    const mentorScheduledDocument = {
      mentorId: mentorUserId ?? mentorFirebaseUid,
      mentorFirebaseUid,
      studentFirebaseUid: String(studentUser.firebaseUid ?? studentId),
      studentId: studentUser._id.toString(),
      topic,
      message,
      scheduledTime,
      status: scheduledStatus,
      createdAt: now,
      updatedAt: now
    };

    const sessionsCollection = database.collection("mentorship_sessions");
    const result = await sessionsCollection.insertOne(mentorScheduledDocument as Record<string, unknown>);
    const sessionId = result.insertedId.toString();

    await Promise.allSettled([
      createNotification(database, {
        userId: studentUser._id.toString(),
        firebaseUid: typeof studentUser.firebaseUid === "string" ? studentUser.firebaseUid : undefined,
        title: "New mentorship session scheduled",
        message: scheduledTime
          ? `Your mentor scheduled "${topic}" for ${scheduledTime}.`
          : `Your mentor scheduled "${topic}".`,
        type: "mentorship",
        sectionId: "mentorship",
        relatedSessionId: sessionId
      }),
      createNotification(database, {
        userId: mentorUserId,
        firebaseUid: mentorFirebaseUid,
        title: "Session scheduled",
        message: `You scheduled "${topic}" with your mentee.`,
        type: "mentorship",
        sectionId: "sessions",
        relatedSessionId: sessionId
      }),
      createNotification(database, {
        audienceRoles: ["admin", "faculty", "super_admin"],
        title: "Mentor scheduled a session",
        message: `A mentor scheduled "${topic}" for a student.`,
        type: "mentorship",
        sectionId: "mentorship-program",
        relatedSessionId: sessionId
      })
    ]);

    return jsonResponse(
      {
        message: "Session scheduled",
        session: {
          ...mentorScheduledDocument,
          _id: sessionId
        }
      },
      201
    );
  }

  const requestor = authResult.session.user;
  if (requestor?.role !== "student") {
    return jsonResponse({ message: "Only students can send mentorship requests." }, 403);
  }
  const mentorIdentity = String(mentorId ?? "").trim();
  const studentIdentity = String(requestor._id ?? "").trim();
  if (!mentorIdentity || !studentIdentity) {
    return jsonResponse({ message: "A registered student and mentor identity are required." }, 400);
  }
  const mentorQuery = {
    $or: [
      ...(ObjectId.isValid(mentorIdentity) ? [{ _id: new ObjectId(mentorIdentity) }] : []),
      { firebaseUid: mentorIdentity }
    ],
    role: "mentor"
  };
  const mentorUser = await usersCol.findOne(mentorQuery);
  if (!mentorUser || !mentorUser.firebaseUid || !isEligibleAccount(mentorUser as { status?: string; isDeleted?: boolean; subscription?: { status?: string } })) {
    return jsonResponse({ message: "Mentor not found" }, 404);
  }

  const studentQuery = {
    $or: [
      ...(ObjectId.isValid(studentIdentity) ? [{ _id: new ObjectId(studentIdentity) }] : []),
      { firebaseUid: authResult.session.firebase.uid }
    ],
    role: "student"
  };
  const studentUser = await usersCol.findOne(studentQuery);
  if (!studentUser || !studentUser.firebaseUid || !isEligibleAccount(studentUser as { status?: string; isDeleted?: boolean; subscription?: { status?: string } })) {
    return jsonResponse({ message: "Student account is not eligible to request mentorship." }, 403);
  }

  const mentorIdCanonical = studentSafeId(mentorUser._id);
  const studentIdCanonical = studentSafeId(studentUser._id);
  const mentorReferences = [mentorIdCanonical, mentorUser.firebaseUid].filter((value): value is string => Boolean(value));
  const studentReferences = [studentIdCanonical, studentUser.firebaseUid].filter((value): value is string => Boolean(value));
  const mentorObjectIds = mentorReferences.filter(ObjectId.isValid).map((value) => new ObjectId(value));
  const studentObjectIds = studentReferences.filter(ObjectId.isValid).map((value) => new ObjectId(value));
  const sessionsCollection = database.collection("mentorship_sessions");
  const existingRequest = await sessionsCollection.findOne({
    $and: [
      { status: "pending" },
      { $or: [
        { mentorId: { $in: mentorReferences } },
        ...(mentorObjectIds.length ? [{ mentorId: { $in: mentorObjectIds } }] : []),
        { mentorFirebaseUid: mentorUser.firebaseUid }
      ] },
      { $or: [
        { studentId: { $in: studentReferences } },
        ...(studentObjectIds.length ? [{ studentId: { $in: studentObjectIds } }] : []),
        { studentFirebaseUid: studentUser.firebaseUid }
      ] }
    ]
  });
  if (existingRequest) {
    return jsonResponse({
      message: "An open mentorship request or relationship already exists with this mentor.",
      session: { ...existingRequest, _id: existingRequest._id?.toString?.() }
    }, 409);
  }

  const now = new Date();
  const document = {
    mentorId: mentorIdCanonical,
    mentorFirebaseUid: mentorUser.firebaseUid,
    mentorName: mentorUser.name,
    studentFirebaseUid: studentUser.firebaseUid,
    studentId: studentIdCanonical,
    studentName: studentUser.name,
    topic,
    message,
    scheduledTime: "",
    status: "pending",
    createdAt: now,
    updatedAt: now
  };
  const result = await sessionsCollection.insertOne(document as Record<string, unknown>);
  const sessionId = result.insertedId.toString();

  await Promise.allSettled([
    createNotification(database, {
      userId: mentorIdCanonical,
      firebaseUid: mentorUser.firebaseUid,
      title: "New mentorship request",
      message: `A student requested mentorship on "${topic}".`,
      type: "chat",
      sectionId: "messages",
      relatedSessionId: sessionId
    }),
    createNotification(database, {
      userId: studentIdCanonical,
      firebaseUid: document.studentFirebaseUid,
      title: "Mentorship request sent",
      message: `Your mentorship request "${topic}" was sent successfully.`,
      type: "mentorship",
      sectionId: "mentorship",
      relatedSessionId: sessionId
    }),
    createNotification(database, {
      audienceRoles: ["admin", "faculty", "super_admin"],
      title: "Mentorship request submitted",
      message: `A new mentorship request was submitted for "${topic}".`,
      type: "mentorship",
      sectionId: "mentorship-program",
      relatedSessionId: sessionId
    })
  ]);

  const inserted = {
    ...document,
    _id: sessionId
  };

  return jsonResponse({ message: "Request sent", session: inserted }, 201);
}

