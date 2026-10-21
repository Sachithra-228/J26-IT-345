import { NextRequest } from "next/server";
import { demoUsers } from "@/lib/demo-data";
import { isDemoMode, jsonResponse } from "@/lib/api";
import { getMongoDatabase } from "@/lib/mongodb";
import { isEligibleAccount } from "@/lib/mentor-mentees";
import { requireSession } from "@/lib/session-auth";

type MentorUserDocument = {
  _id: { toString: () => string };
  name: string;
  email?: string;
  profilePic?: string;
  roleDetails?: Record<string, string>;
  status?: string;
  isDeleted?: boolean;
  subscription?: { status?: string };
};

export async function GET(request: NextRequest) {
  if (isDemoMode()) {
    const mentors = demoUsers.filter((u) => u.role === "mentor" && isEligibleAccount(u)).map((u) => ({
      _id: u._id,
      name: u.name,
      email: u.email,
      profilePic: (u as { profilePic?: string }).profilePic ?? null,
      expertise: (u.roleDetails as Record<string, string> | undefined)?.expertise ?? "Career guidance",
      availability: (u.roleDetails as Record<string, string> | undefined)?.availability ?? "By request"
    }));
    return jsonResponse(mentors);
  }

  const authResult = await requireSession(request);
  if (authResult.error) {
    return authResult.error;
  }

  const database = await getMongoDatabase();
  const users = await database
    .collection<MentorUserDocument>("users")
    .find({
      role: "mentor",
      isDeleted: { $ne: true },
      status: { $nin: ["blocked", "deleted"] },
      "subscription.status": { $ne: "blocked" }
    })
    .project({ name: 1, email: 1, profilePic: 1, roleDetails: 1, status: 1, isDeleted: 1, subscription: 1 })
    .toArray();

  const mentors = users.filter(isEligibleAccount).map((u) => ({
    _id: u._id.toString(),
    name: u.name,
    email: u.email,
    profilePic: u.profilePic ?? null,
    expertise: u.roleDetails?.expertise ?? "Career guidance",
    availability: u.roleDetails?.availability ?? "By request"
  }));

  return jsonResponse(mentors);
}
