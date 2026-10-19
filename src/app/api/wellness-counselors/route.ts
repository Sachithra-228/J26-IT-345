import { NextRequest } from "next/server";
import { isDemoMode, jsonResponse } from "@/lib/api";
import { getMongoDatabase } from "@/lib/mongodb";
import { createNotification } from "@/lib/notifications";
import { requireRole, requireSession } from "@/lib/session-auth";
import { addDemoCounselor, getDemoCounselors } from "@/lib/wellness-demo-store";
import {
  providerMetadataSchema,
  type ProviderMetadata,
} from "@/lib/c2/support";

type CounselorDocument = ProviderMetadata & {
  _id?: { toString: () => string };
  name?: string;
  specialization?: string;
  availability?: string;
  mode?: "online" | "in-person" | "hybrid";
  contactEmail?: string;
  isActive?: boolean;
  createdAt?: Date;
  updatedAt?: Date;
};

export async function GET(request: NextRequest) {
  if (isDemoMode()) {
    return jsonResponse(getDemoCounselors());
  }

  const authResult = await requireSession(request);
  if (authResult.error) return authResult.error;

  const database = await getMongoDatabase();
  const counselors = await database
    .collection("wellness_counselors")
    .find({ isActive: { $ne: false } })
    .sort({ createdAt: -1 })
    .toArray();

  const list = counselors.map((item: CounselorDocument) => ({
    ...item,
    _id: item._id?.toString?.() ?? "",
  }));
  return jsonResponse(list);
}

export async function POST(request: NextRequest) {
  const payload = await request
    .json()
    .catch(() => ({}) as Record<string, unknown>);
  const name = String(payload.name ?? "").trim();
  const specialization = String(payload.specialization ?? "").trim();
  const availability = String(payload.availability ?? "").trim();
  const modeRaw = String(payload.mode ?? "hybrid")
    .trim()
    .toLowerCase();
  const mode =
    modeRaw === "online" || modeRaw === "in-person" || modeRaw === "hybrid"
      ? modeRaw
      : "hybrid";
  const contactEmail =
    typeof payload.contactEmail === "string" &&
    payload.contactEmail.trim().length
      ? payload.contactEmail.trim()
      : undefined;
  const metadata = providerMetadataSchema.safeParse({
    gender: payload.gender,
    profession: payload.profession,
    languages: payload.languages,
    supportAreas: payload.supportAreas,
  });
  if (!metadata.success)
    return jsonResponse(
      { message: "Invalid professional profile details." },
      400,
    );

  if (!name || !specialization || !availability) {
    return jsonResponse(
      { message: "Name, specialization and availability are required." },
      400,
    );
  }

  if (isDemoMode()) {
    const inserted = addDemoCounselor({
      name,
      specialization,
      availability,
      mode,
      contactEmail,
      ...metadata.data,
      isActive: true,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });
    return jsonResponse(
      { message: "Counselor added", counselor: inserted },
      201,
    );
  }

  const authResult = await requireSession(request);
  if (authResult.error) return authResult.error;
  const roleCheck = requireRole(authResult.session.user?.role, [
    "admin",
    "faculty",
    "super_admin",
  ]);
  if (roleCheck) return roleCheck;

  const database = await getMongoDatabase();
  const now = new Date();
  const document = {
    name,
    specialization,
    availability,
    mode,
    contactEmail,
    ...metadata.data,
    isActive: true,
    createdBy: authResult.session.user?._id ?? authResult.session.firebase.uid,
    createdAt: now,
    updatedAt: now,
  };
  const result = await database
    .collection("wellness_counselors")
    .insertOne(document);
  const counselorId = result.insertedId.toString();

  await Promise.allSettled([
    createNotification(database, {
      audienceRoles: ["student"],
      title: "New counselor available",
      message: `${name} is now available for wellness support bookings.`,
      type: "wellness",
      sectionId: "wellness",
    }),
    createNotification(database, {
      audienceRoles: ["parent"],
      title: "Wellness support update",
      message: `A new counselor (${name}) is available for student support.`,
      type: "wellness",
      sectionId: "resources",
    }),
  ]);

  return jsonResponse(
    {
      message: "Counselor added",
      counselor: { ...document, _id: counselorId },
    },
    201,
  );
}
