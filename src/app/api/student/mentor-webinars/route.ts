import { NextRequest } from "next/server";
import { ObjectId } from "mongodb";
import { demoUsers } from "@/lib/demo-data";
import { isDemoMode, jsonResponse } from "@/lib/api";
import { listAllDemoMentorWebinars } from "@/lib/mentor-content-demo-store";
import { getMongoDatabase } from "@/lib/mongodb";
import { requireRole, requireSession } from "@/lib/session-auth";

type WebinarDocument = {
  _id: ObjectId;
  mentorUserId?: string;
  mentorFirebaseUid?: string;
  title?: string;
  scheduledAt?: string;
  durationMinutes?: number;
  mode?: "online" | "in-person" | "hybrid";
  joinLink?: string;
  description?: string;
  status?: "upcoming" | "completed" | "cancelled";
  createdAt?: Date | string;
};

function toStudentWebinar(item: WebinarDocument, mentorName: string) {
  return {
    _id: item._id.toString(),
    title: item.title ?? "",
    scheduledAt: item.scheduledAt ?? "",
    durationMinutes: Number(item.durationMinutes ?? 60),
    mode: item.mode ?? "hybrid",
    joinLink: item.joinLink ?? "",
    description: item.description ?? "",
    status: item.status ?? "upcoming",
    mentorName,
    createdAt: item.createdAt instanceof Date ? item.createdAt.toISOString() : item.createdAt ?? ""
  };
}

export async function GET(request: NextRequest) {
  const authResult = await requireSession(request);
  if (authResult.error) return authResult.error;
  const roleCheck = requireRole(authResult.session.user?.role, ["student"]);
  if (roleCheck) return roleCheck;

  if (isDemoMode()) {
    const mentorNames = new Map(demoUsers.map((user) => [user._id, user.name]));
    const items = listAllDemoMentorWebinars()
      .filter((item) => item.status === "upcoming")
      .sort((a, b) => a.scheduledAt.localeCompare(b.scheduledAt))
      .map((item) => ({
        ...item,
        mentorName: mentorNames.get(item.mentorUserId ?? "") ?? "Mentor"
      }));
    return jsonResponse({ items });
  }

  const database = await getMongoDatabase();
  const items = await database.collection<WebinarDocument>("mentor_webinars")
    .find({ status: "upcoming" })
    .sort({ scheduledAt: 1, createdAt: -1 })
    .toArray();

  const authorIds = [...new Set(items.flatMap((item) =>
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
    items: items.map((item) => toStudentWebinar(
      item,
      authorNames.get(item.mentorUserId ?? "") ?? authorNames.get(item.mentorFirebaseUid ?? "") ?? "Mentor"
    ))
  });
}
