import { NextRequest } from "next/server";
import { demoUsers } from "@/lib/demo-data";
import { getDemoSessionById, updateDemoSession } from "@/lib/mentorship-demo-store";
import { isDemoMode, jsonResponse } from "@/lib/api";
import { getMongoDatabase } from "@/lib/mongodb";
import { createNotification } from "@/lib/notifications";
import { requireSession } from "@/lib/session-auth";
import type { MentorshipSession } from "@/types";
import { canTransitionMentorshipStatus, sessionBelongsToUser } from "@/lib/mentorship-session";

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const id = (await params).id;
  if (!id) {
    return jsonResponse({ message: "Session ID required" }, 400);
  }

  const body = await request.json().catch(() => ({}));
  const { status, scheduledTime, rating, review, archiveForStudent } = body;

  if (isDemoMode()) {
    const session = await requireSession(request);
    if (session.error) return session.error;
    const uid = session.session.firebase.uid;
    const currentUserId = (session.session.user as { _id?: string } | null)?._id ?? uid;
    const currentRole = session.session.user?.role ?? "";
    const isAdmin = currentRole === "admin" || currentRole === "faculty" || currentRole === "super_admin";

    const existing = getDemoSessionById(id);
    if (!existing) {
      return jsonResponse({ message: "Session not found" }, 404);
    }
    const isStudent = sessionBelongsToUser({ studentId: existing.studentId }, currentUserId, uid);
    const isMentor = sessionBelongsToUser({ mentorId: existing.mentorId }, currentUserId, uid);
    if (!isStudent && !isMentor && !isAdmin) {
      return jsonResponse({ message: "Forbidden" }, 403);
    }
    const updates: Partial<MentorshipSession> = {};

    if (archiveForStudent !== undefined) {
      if (typeof archiveForStudent !== "boolean" || !isStudent) {
        return jsonResponse({ message: "Only the student can archive this session." }, 403);
      }
      if (archiveForStudent && !["completed", "cancelled"].includes(String(existing.status).toLowerCase())) {
        return jsonResponse({ message: "Only completed or cancelled sessions can be archived." }, 409);
      }
      updates.studentArchivedAt = archiveForStudent ? new Date().toISOString() : null;
    }

    if (status !== undefined) {
      const actor = isAdmin ? "admin" : isMentor ? "mentor" : isStudent ? "student" : null;
      if (typeof status !== "string" || !actor || !canTransitionMentorshipStatus(existing.status, status, actor)) {
        return jsonResponse({ message: "This status transition is not allowed." }, 403);
      }
      updates.status = status as MentorshipSession["status"];
    }
    const canSetScheduledTime =
      isAdmin ||
      (isMentor && (status === "confirmed" || status === "scheduled" || status === undefined)) ||
      (isStudent && (existing.status === "confirmed" || existing.status === "scheduled") && status !== "cancelled");
    if (scheduledTime !== undefined && typeof scheduledTime === "string" && canSetScheduledTime) {
      updates.scheduledTime = scheduledTime;
    }
    if (existing.status === "completed" && isStudent) {
      if (typeof rating === "number" && rating >= 1 && rating <= 5) updates.rating = rating;
      if (typeof review === "string") updates.review = review.trim();
    }

    const applied = { ...updates };
    if (Object.keys(applied).length === 0) {
      return jsonResponse({ message: "No valid updates" }, 400);
    }
    if (!updateDemoSession(id, applied)) {
      return jsonResponse({ message: "Session not found" }, 404);
    }
    const updated = getDemoSessionById(id);
    return jsonResponse(updated ?? {});
  }

  const authResult = await requireSession(request);
  if (authResult.error) {
    return authResult.error;
  }
  const currentRole = authResult.session.user?.role ?? "";
  const isAdmin = currentRole === "admin" || currentRole === "faculty" || currentRole === "super_admin";

  const isDemoId = id.length !== 24 || !/^[a-f0-9]{24}$/i.test(id);
  if (isDemoId && process.env.NODE_ENV === "development") {
    const existing = getDemoSessionById(id);
    if (!existing) {
      return jsonResponse({ message: "Session not found" }, 404);
    }
    const uid = authResult.session.firebase.uid;
    const currentUserId = (authResult.session.user as { _id?: string } | null)?._id ?? uid;
    const isStudent = existing.studentId === currentUserId || existing.studentId === uid;
    const isMentor = existing.mentorId === currentUserId || existing.mentorId === uid;
    if (!isStudent && !isMentor && !isAdmin) {
      return jsonResponse({ message: "Forbidden" }, 403);
    }
    const updates: Partial<MentorshipSession> = {};

    if (archiveForStudent !== undefined) {
      if (typeof archiveForStudent !== "boolean" || !isStudent) {
        return jsonResponse({ message: "Only the student can archive this session." }, 403);
      }
      if (archiveForStudent && !["completed", "cancelled"].includes(String(existing.status).toLowerCase())) {
        return jsonResponse({ message: "Only completed or cancelled sessions can be archived." }, 409);
      }
      updates.studentArchivedAt = archiveForStudent ? new Date().toISOString() : null;
    }

    if (status !== undefined) {
      const actor = isAdmin ? "admin" : isMentor ? "mentor" : isStudent ? "student" : null;
      if (typeof status !== "string" || !actor || !canTransitionMentorshipStatus(existing.status, status, actor)) {
        return jsonResponse({ message: "This status transition is not allowed." }, 403);
      }
      updates.status = status as MentorshipSession["status"];
    }
    const canSetScheduledTime =
      isAdmin ||
      (isMentor && (status === "confirmed" || status === "scheduled" || status === undefined)) ||
      (isStudent && (existing.status === "confirmed" || existing.status === "scheduled") && status !== "cancelled");
    if (scheduledTime !== undefined && typeof scheduledTime === "string" && canSetScheduledTime) {
      updates.scheduledTime = scheduledTime;
    }
    if (existing.status === "completed" && isStudent) {
      if (typeof rating === "number" && rating >= 1 && rating <= 5) updates.rating = rating;
      if (typeof review === "string") updates.review = review.trim();
    }
    if (Object.keys(updates).length === 0) {
      return jsonResponse({ message: "No valid updates" }, 400);
    }
    if (!updateDemoSession(id, updates)) {
      return jsonResponse({ message: "Session not found" }, 404);
    }
    const updated = getDemoSessionById(id);
    return jsonResponse(updated ?? {});
  }

  const database = await getMongoDatabase();
  const sessionsCol = database.collection("mentorship_sessions");
  const { ObjectId } = await import("mongodb");
  let sessionDoc: Record<string, unknown> | null = null;
  try {
    sessionDoc = await sessionsCol.findOne({ _id: new ObjectId(id) });
  } catch {
    sessionDoc = null;
  }
  if (!sessionDoc) {
    return jsonResponse({ message: "Session not found" }, 404);
  }

  const uid = authResult.session.firebase.uid;
  const userId = authResult.session.user?._id;
  const isMentor = sessionBelongsToUser({ mentorId: String(sessionDoc.mentorId ?? ""), mentorFirebaseUid: String(sessionDoc.mentorFirebaseUid ?? "") }, userId, uid);
  const isStudent = sessionBelongsToUser({ studentId: String(sessionDoc.studentId ?? ""), studentFirebaseUid: String(sessionDoc.studentFirebaseUid ?? "") }, userId, uid);
  if (!isMentor && !isStudent && !isAdmin) {
    return jsonResponse({ message: "Forbidden" }, 403);
  }

  const update: Record<string, unknown> = { updatedAt: new Date() };
  if (archiveForStudent !== undefined) {
    if (typeof archiveForStudent !== "boolean" || !isStudent) {
      return jsonResponse({ message: "Only the student can archive this session." }, 403);
    }
    if (archiveForStudent && !["completed", "cancelled"].includes(String(sessionDoc.status ?? "").toLowerCase())) {
      return jsonResponse({ message: "Only completed or cancelled sessions can be archived." }, 409);
    }
    update.studentArchivedAt = archiveForStudent ? new Date() : null;
  }
  if (status !== undefined) {
    const actor = isAdmin ? "admin" : isMentor ? "mentor" : isStudent ? "student" : null;
    if (typeof status !== "string" || !actor || !canTransitionMentorshipStatus(String(sessionDoc.status ?? "pending"), status, actor)) {
      return jsonResponse({ message: "This status transition is not allowed." }, 403);
    }
    update.status = status;
  }
  const canSetScheduledTime =
    isAdmin ||
    (isMentor && (status === "confirmed" || status === "scheduled" || status === undefined)) ||
    (isStudent && (sessionDoc.status === "confirmed" || sessionDoc.status === "scheduled") && status !== "cancelled");
  if (scheduledTime !== undefined && typeof scheduledTime === "string" && canSetScheduledTime) {
    update.scheduledTime = scheduledTime;
  }
  if (sessionDoc.status === "completed" && isStudent) {
    if (typeof rating === "number" && rating >= 1 && rating <= 5) update.rating = rating;
    if (typeof review === "string") update.review = review.trim();
  }

  if (Object.keys(update).length <= 1) {
    return jsonResponse({ message: "No valid updates" }, 400);
  }

  await sessionsCol.updateOne({ _id: new ObjectId(id) }, { $set: update });
  const updatedDoc = await sessionsCol.findOne({ _id: new ObjectId(id) });

  const recipientTargets: Array<{ userId?: string; firebaseUid?: string; sectionId: string }> = [];
  if (isAdmin) {
    recipientTargets.push({
      userId: typeof sessionDoc.studentId === "string" ? sessionDoc.studentId : undefined,
      firebaseUid: typeof sessionDoc.studentFirebaseUid === "string" ? sessionDoc.studentFirebaseUid : undefined,
      sectionId: "mentorship"
    });
    recipientTargets.push({
      userId: typeof sessionDoc.mentorId === "string" ? sessionDoc.mentorId : undefined,
      firebaseUid: typeof sessionDoc.mentorFirebaseUid === "string" ? sessionDoc.mentorFirebaseUid : undefined,
      sectionId: "sessions"
    });
  } else {
    recipientTargets.push({
      userId: isMentor
        ? (typeof sessionDoc.studentId === "string" ? sessionDoc.studentId : undefined)
        : (typeof sessionDoc.mentorId === "string" ? sessionDoc.mentorId : undefined),
      firebaseUid: isMentor
        ? (typeof sessionDoc.studentFirebaseUid === "string" ? sessionDoc.studentFirebaseUid : undefined)
        : (typeof sessionDoc.mentorFirebaseUid === "string" ? sessionDoc.mentorFirebaseUid : undefined),
      sectionId: isMentor ? "mentorship" : "sessions"
    });
  }
  const topic = typeof sessionDoc.topic === "string" ? sessionDoc.topic : "mentorship session";
  const changedStatus = typeof update.status === "string" ? update.status : null;
  const ratingValue = typeof update.rating === "number" ? update.rating : null;
  const reviewValue = typeof update.review === "string" && update.review.trim().length ? update.review.trim() : null;

  if (recipientTargets.length && (changedStatus || ratingValue !== null || reviewValue !== null)) {
    let title = "Mentorship update";
    let message = `Session "${topic}" has a new update.`;

    if (ratingValue !== null || reviewValue !== null) {
      title = "New mentorship feedback";
      if (ratingValue !== null && reviewValue) {
        message = `Your session "${topic}" received a ${ratingValue}/5 rating and a new review.`;
      } else if (ratingValue !== null) {
        message = `Your session "${topic}" received a ${ratingValue}/5 rating.`;
      } else {
        message = `Your session "${topic}" received a new written review.`;
      }
    } else if (changedStatus === "confirmed") {
      message = isAdmin
        ? `Admin approved mentorship session "${topic}".`
        : isMentor
        ? `Your mentorship request "${topic}" was approved by the mentor. You can now start chatting.`
        : `You approved the mentorship request "${topic}".`;
    } else if (changedStatus === "scheduled") {
      message = isAdmin
        ? `Admin updated schedule for mentorship session "${topic}".`
        : isMentor
        ? `Your mentorship session "${topic}" has a scheduled time.`
        : `A student scheduled "${topic}".`;
    } else if (changedStatus === "completed") {
      message = isAdmin
        ? `Admin marked mentorship session "${topic}" as completed.`
        : isMentor
        ? `Your mentorship session "${topic}" was marked completed. You can now rate and review.`
        : `You marked "${topic}" as completed.`;
    } else if (changedStatus === "cancelled") {
      message = isAdmin
        ? `Admin cancelled mentorship session "${topic}".`
        : isMentor
        ? `Your mentorship session "${topic}" was cancelled.`
        : `The mentorship session "${topic}" was cancelled by the other participant.`;
    } else if (changedStatus === "pending") {
      message = `Admin moved mentorship session "${topic}" back to pending review.`;
    }

    await Promise.allSettled([
      ...recipientTargets.map((target) =>
        createNotification(database, {
          userId: target.userId,
          firebaseUid: target.firebaseUid,
          title,
          message,
          type: changedStatus === "confirmed" ? "chat" : "mentorship",
          sectionId: target.sectionId,
          relatedSessionId: id
        })
      ),
      createNotification(database, {
        audienceRoles: ["admin", "faculty", "super_admin"],
        title: "Mentorship activity update",
        message: `Mentorship session "${topic}" has a new ${changedStatus ?? "feedback"} update.`,
        type: "mentorship",
        sectionId: "mentorship-program",
        relatedSessionId: id
      })
    ]);
  }

  return jsonResponse({
    ...updatedDoc,
    _id: (updatedDoc as { _id?: { toString: () => string } })._id?.toString?.() ?? id
  });
}

