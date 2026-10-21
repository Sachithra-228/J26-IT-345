import { NextRequest } from "next/server";
import { ObjectId } from "mongodb";
import { isDemoMode, jsonResponse } from "@/lib/api";
import { getMongoDatabase } from "@/lib/mongodb";
import { createNotification } from "@/lib/notifications";
import { requireRole, requireSession } from "@/lib/session-auth";
import {
  addDemoCounselorBooking,
  getDemoCounselorBookings,
  getDemoCounselors
} from "@/lib/wellness-demo-store";

type CounselorDocument = { _id: { toString: () => string }; name?: string };
type BookingDocument = {
  _id?: { toString: () => string };
  counselorId?: string;
  counselorName?: string;
  userId?: string;
  firebaseUid?: string;
  studentName?: string;
  preferredDate?: string;
  preferredTime?: string;
  note?: string;
  status?: string;
  createdAt?: Date;
  updatedAt?: Date;
};

export async function GET(request: NextRequest) {
  const authResult = await requireSession(request);
  if (authResult.error) return authResult.error;

  const scope = request.nextUrl.searchParams.get("scope");
  const isAdmin = ["admin", "faculty", "super_admin"].includes(authResult.session.user?.role ?? "");
  const userId = authResult.session.user?._id;
  const firebaseUid = authResult.session.firebase.uid;

  if (isDemoMode()) {
    const list = getDemoCounselorBookings().filter((item) => {
      if (scope === "all" && isAdmin) return true;
      return (
        (item.userId && userId && item.userId === userId) ||
        (item.firebaseUid && item.firebaseUid === firebaseUid)
      );
    });
    return jsonResponse(list);
  }

  if (scope === "all" && !isAdmin) {
    const roleCheck = requireRole(authResult.session.user?.role, ["admin", "faculty", "super_admin"]);
    if (roleCheck) return roleCheck;
  }

  const database = await getMongoDatabase();
  const bookingsCollection = database.collection("wellness_counselor_bookings");
  const filter =
    scope === "all" && isAdmin
      ? {}
      : {
          $or: [
            ...(userId ? [{ userId }] : []),
            ...(firebaseUid ? [{ firebaseUid }] : [])
          ]
        };
  const bookings = await bookingsCollection.find(filter).sort({ createdAt: -1 }).toArray();

  const counselorIds = [...new Set(bookings.map((item) => String(item.counselorId ?? "")).filter(Boolean))];
  const objectIds = counselorIds
    .filter((id) => id.length === 24 && /^[a-f0-9]{24}$/i.test(id))
    .map((id) => new ObjectId(id));
  const counselors = objectIds.length
    ? await database
        .collection("wellness_counselors")
        .find({ _id: { $in: objectIds } })
        .project({ name: 1 })
        .toArray()
    : [];
  const nameById = new Map<string, string>();
  counselors.forEach((item) => {
    const counselor = item as CounselorDocument;
    nameById.set(counselor._id.toString(), String(counselor.name ?? "Counselor"));
  });

  return jsonResponse(
    bookings.map((item: BookingDocument) => ({
      ...item,
      _id: item._id?.toString?.() ?? "",
      counselorName: item.counselorName ?? nameById.get(String(item.counselorId ?? "")) ?? "Counselor"
    }))
  );
}

export async function POST(request: NextRequest) {
  const payload = await request.json().catch(() => ({} as Record<string, unknown>));
  const counselorId = String(payload.counselorId ?? "").trim();
  const preferredDate = String(payload.preferredDate ?? "").trim();
  const preferredTime = String(payload.preferredTime ?? "").trim();
  const note =
    typeof payload.note === "string" && payload.note.trim().length
      ? payload.note.trim().slice(0, 600)
      : "";

  if (!counselorId || !preferredDate || !preferredTime) {
    return jsonResponse({ message: "Counselor, date and time are required." }, 400);
  }

  const authResult = await requireSession(request);
  if (authResult.error) return authResult.error;

  const studentName = authResult.session.user?.name ?? authResult.session.firebase.displayName ?? "Student";
  if (counselorId.startsWith("c2-research-")) {
    return jsonResponse({ message: "Demonstration profiles cannot receive real appointment requests. Choose the university directory for a real booking." }, 400);
  }
  const userId = authResult.session.user?._id;
  const firebaseUid = authResult.session.firebase.uid;
  const now = new Date();

  if (isDemoMode()) {
    const counselor = getDemoCounselors().find((item) => item._id === counselorId);
    if (!counselor) return jsonResponse({ message: "Counselor not found." }, 404);
    const booking = addDemoCounselorBooking({
      counselorId,
      counselorName: counselor.name,
      userId,
      firebaseUid,
      studentName,
      preferredDate,
      preferredTime,
      note,
      status: "pending",
      createdAt: now.toISOString(),
      updatedAt: now.toISOString()
    });
    return jsonResponse({ message: "Booking request submitted", booking }, 201);
  }

  const database = await getMongoDatabase();
  const counselor = counselorId.length === 24 && /^[a-f0-9]{24}$/i.test(counselorId)
    ? await database.collection("wellness_counselors").findOne({ _id: new ObjectId(counselorId), isActive: { $ne: false } })
    : null;
  if (!counselor) {
    return jsonResponse({ message: "Counselor not found." }, 404);
  }

  const document = {
    counselorId,
    counselorName: String((counselor as { name?: string }).name ?? "Counselor"),
    userId,
    firebaseUid,
    studentName,
    preferredDate,
    preferredTime,
    note,
    status: "pending",
    createdAt: now,
    updatedAt: now
  };
  const result = await database.collection("wellness_counselor_bookings").insertOne(document);
  const bookingId = result.insertedId.toString();

  await Promise.allSettled([
    createNotification(database, {
      userId,
      firebaseUid,
      title: "Counselor booking submitted",
      message: `Your booking request with ${document.counselorName} is pending review.`,
      type: "wellness",
      sectionId: "wellness"
    }),
    createNotification(database, {
      audienceRoles: ["admin", "faculty", "super_admin"],
      title: "New counselor booking request",
      message: `${studentName} requested a wellness counselor booking.`,
      type: "wellness",
      sectionId: "counselor-support"
    })
  ]);

  return jsonResponse({ message: "Booking request submitted", booking: { ...document, _id: bookingId } }, 201);
}

