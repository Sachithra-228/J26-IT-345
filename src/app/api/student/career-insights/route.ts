import { NextRequest } from "next/server";
import { ObjectId } from "mongodb";
import { demoUsers } from "@/lib/demo-data";
import { isDemoMode, jsonResponse } from "@/lib/api";
import { listAllDemoMentorCareerInsights } from "@/lib/mentor-content-demo-store";
import { getDemoSessions } from "@/lib/mentorship-demo-store";
import { getMongoDatabase } from "@/lib/mongodb";
import { requireRole, requireSession } from "@/lib/session-auth";
import { normalizeMentorshipStatus, participantReference, sessionParticipantQuery } from "@/lib/mentorship-session";

type InsightDocument = {
  _id: ObjectId;
  mentorUserId?: string;
  mentorFirebaseUid?: string;
  title?: string;
  category?: string;
  content?: string;
  referenceUrl?: string;
  visibility?: "mentees" | "public";
  createdAt?: Date | string;
  updatedAt?: Date | string;
};

const eligibleRelationshipStatuses = new Set(["confirmed", "scheduled", "completed"]);

function toIsoDate(value?: Date | string) {
  if (value instanceof Date) return value.toISOString();
  return typeof value === "string" ? value : "";
}

function toStudentInsight(item: InsightDocument, mentorName: string) {
  return {
    _id: item._id.toString(),
    title: item.title ?? "",
    category: item.category ?? "General",
    content: item.content ?? "",
    referenceUrl: item.referenceUrl ?? "",
    mentorName,
    createdAt: toIsoDate(item.createdAt),
    updatedAt: toIsoDate(item.updatedAt ?? item.createdAt)
  };
}

export async function GET(request: NextRequest) {
  const authResult = await requireSession(request);
  if (authResult.error) return authResult.error;
  const roleCheck = requireRole(authResult.session.user?.role, ["student"]);
  if (roleCheck) return roleCheck;

  const studentId = authResult.session.user?._id;
  const studentUid = authResult.session.firebase.uid;
  const studentIdentities = new Set([studentId, studentUid].filter((value): value is string => Boolean(value)));

  if (isDemoMode()) {
    const eligibleSessions = getDemoSessions().filter((session) =>
      studentIdentities.has(session.studentId) && eligibleRelationshipStatuses.has(normalizeMentorshipStatus(session.status))
    );
    const eligibleMentors = new Set(eligibleSessions.map((session) => session.mentorId));
    const mentorNames = new Map(demoUsers.map((mentor) => [mentor._id, mentor.name]));
    const items = listAllDemoMentorCareerInsights()
      .filter((item) => item.visibility === "public" || (
        item.visibility === "mentees" && Boolean(
          (item.mentorUserId && eligibleMentors.has(item.mentorUserId)) ||
          (item.mentorFirebaseUid && eligibleMentors.has(item.mentorFirebaseUid))
        )
      ))
      .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))
      .map((item) => ({
        ...item,
        mentorName: mentorNames.get(item.mentorUserId ?? "") ?? "Mentor"
      }));
    return jsonResponse({ items });
  }

  const database = await getMongoDatabase();
  const studentObjectIds = [...studentIdentities].filter(ObjectId.isValid).map((value) => new ObjectId(value));
  const sessions = await database.collection("mentorship_sessions").find({
    $and: [
      { status: { $in: [...eligibleRelationshipStatuses] } },
      {
        $or: [
          ...sessionParticipantQuery("student", studentId, studentUid).$or,
          ...(studentObjectIds.length ? [{ studentId: { $in: studentObjectIds } }] : [])
        ]
      }
    ]
  }).project({ mentorId: 1, mentorFirebaseUid: 1 }).toArray();
  const eligibleMentorIds = [...new Set(sessions.flatMap((session) =>
    [participantReference(session.mentorId), participantReference(session.mentorFirebaseUid)]
      .filter((value): value is string => Boolean(value))
  ))];

  const visibilityBranches: Record<string, unknown>[] = [{ visibility: "public" }];
  if (eligibleMentorIds.length) {
    visibilityBranches.push({
      visibility: "mentees",
      $or: [
        { mentorUserId: { $in: eligibleMentorIds } },
        { mentorFirebaseUid: { $in: eligibleMentorIds } }
      ]
    });
  }
  const insights = await database.collection<InsightDocument>("mentor_career_insights")
    .find({ $or: visibilityBranches })
    .sort({ updatedAt: -1, createdAt: -1 })
    .toArray();

  const authorIds = [...new Set(insights.flatMap((item) =>
    [item.mentorUserId, item.mentorFirebaseUid].filter((value): value is string => Boolean(value))
  ))];
  const authorObjectIds = authorIds.filter(ObjectId.isValid).map((value) => new ObjectId(value));
  const authors = authorIds.length ? await database.collection<{
    _id: ObjectId;
    firebaseUid?: string;
    name?: string;
  }>("users").find({
    isDeleted: { $ne: true },
    status: { $nin: ["deleted", "blocked"] },
    $or: [
      ...(authorObjectIds.length ? [{ _id: { $in: authorObjectIds } }] : []),
      { firebaseUid: { $in: authorIds } }
    ]
  }).project({ _id: 1, firebaseUid: 1, name: 1 }).toArray() : [];
  const authorNames = new Map<string, string>();
  authors.forEach((author) => {
    authorNames.set(author._id.toString(), author.name ?? "Mentor");
    if (author.firebaseUid) authorNames.set(author.firebaseUid, author.name ?? "Mentor");
  });

  return jsonResponse({
    items: insights.map((item) => toStudentInsight(
      item,
      authorNames.get(item.mentorUserId ?? "") ?? authorNames.get(item.mentorFirebaseUid ?? "") ?? "Mentor"
    ))
  });
}
