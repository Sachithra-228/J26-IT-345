import { NextRequest } from "next/server";
import { ObjectId } from "mongodb";
import { isDemoMode, isMongoConnectionError, jsonResponse } from "@/lib/api";
import { isChainNotificationId } from "@/lib/c1/chain-notifications";
import {
  loadChainNotifications,
  markChainNotificationsRead,
  readChainNotificationIds
} from "@/lib/c1/chain-notifications-server";
import { demoUsers } from "@/lib/demo-data";
import { getMongoDatabase } from "@/lib/mongodb";
import { requireRole, requireSession } from "@/lib/session-auth";

const demoNotifications = [
  {
    id: "n1",
    title: "Aid application update",
    message: "Your emergency aid request is under review.",
    date: "2026-02-07",
    sectionId: "financial-aid",
    read: false
  },
  {
    id: "n2",
    title: "Mentor session confirmed",
    message: "Your session with Ravindu is confirmed for Feb 12.",
    date: "2026-02-06",
    sectionId: "mentorship",
    read: false
  }
];

/** Newest first across stored notifications (createdAt) and demo ones (date only). */
function newestFirst<T extends object>(items: T[]): T[] {
  const key = (item: T) => {
    const { createdAt, date } = item as { createdAt?: unknown; date?: unknown };
    const at = createdAt instanceof Date ? createdAt.toISOString() : createdAt;
    return String(at ?? date ?? "");
  };
  return [...items].sort((a, b) => key(b).localeCompare(key(a)));
}

function buildNotificationVisibilityFilters(input: {
  userId?: string;
  email?: string | null;
  firebaseUid?: string;
  role?: string;
  includeGlobal?: boolean;
}) {
  const filters: Record<string, unknown>[] = [];
  if (input.includeGlobal) {
    filters.push({ audience: "all" });
  }
  if (input.userId) {
    filters.push({ userId: input.userId });
  }
  if (input.email) {
    filters.push({ userEmail: input.email });
  }
  if (input.firebaseUid) {
    filters.push({ firebaseUid: input.firebaseUid });
  }
  if (input.role) {
    filters.push({ audienceRoles: input.role });
  }
  return filters;
}

export async function GET(request: NextRequest) {
  if (isDemoMode()) {
    // The demo session is a student: include their scholarship events from the simulated ledger (C1, FR11).
    const chain = await loadChainNotifications(undefined);
    return jsonResponse({ user: demoUsers[0], notifications: newestFirst([...chain, ...demoNotifications]) });
  }

  const authResult = await requireSession(request);
  if (authResult.error) {
    return authResult.error;
  }

  try {
    const database = await getMongoDatabase();
    const includeGlobal = request.nextUrl.searchParams.get("includeGlobal") === "1";
    const currentRole = authResult.session.user?.role;
    const baseFilters = buildNotificationVisibilityFilters({
      userId: authResult.session.user?._id,
      email: authResult.session.firebase.email,
      firebaseUid: authResult.session.firebase.uid,
      role: currentRole,
      includeGlobal
    });
    if (!baseFilters.length) {
      return jsonResponse({ user: authResult.session.user, notifications: [] });
    }

    const notifications = await database
      .collection("notifications")
      .find({
        $or: baseFilters
      })
      .sort({ createdAt: -1 })
      .toArray();
    const stored = notifications.map((item) => ({
      ...item,
      _id: item._id.toString()
    }));

    // Students also get notifications for their own scholarship events on the blockchain (C1, FR11).
    const userKey = authResult.session.user?._id ?? authResult.session.firebase.uid;
    const chain =
      currentRole === "student" && userKey
        ? await loadChainNotifications(authResult.session.user?._id, await readChainNotificationIds(database, userKey))
        : [];

    return jsonResponse({
      user: authResult.session.user,
      notifications: chain.length ? newestFirst([...stored, ...chain]) : stored
    });
  } catch (error) {
    if (isMongoConnectionError(error)) {
      return jsonResponse({
        user: authResult.session.user,
        notifications: demoNotifications
      });
    }
    throw error;
  }
}

export async function PATCH(request: NextRequest) {
  const payload = (await request.json().catch(() => ({}))) as { ids?: string[] };

  if (isDemoMode()) {
    return jsonResponse({ message: "Notifications marked as read (demo mode)", updatedCount: 0 });
  }

  const authResult = await requireSession(request);
  if (authResult.error) {
    return authResult.error;
  }

  const ids = Array.isArray(payload.ids) ? payload.ids.filter((id) => typeof id === "string" && id.trim()) : [];
  if (!ids.length) {
    return jsonResponse({ message: "No notification ids provided.", updatedCount: 0 });
  }

  const chainIds = ids.filter(isChainNotificationId);
  const objectIds = ids.filter((id) => ObjectId.isValid(id)).map((id) => new ObjectId(id));
  if (!objectIds.length && !chainIds.length) {
    return jsonResponse({ message: "No valid notification ids provided.", updatedCount: 0 });
  }

  try {
    const database = await getMongoDatabase();
    const visibilityFilters = buildNotificationVisibilityFilters({
      userId: authResult.session.user?._id,
      email: authResult.session.firebase.email,
      firebaseUid: authResult.session.firebase.uid,
      role: authResult.session.user?.role,
      includeGlobal: false
    });

    if (!visibilityFilters.length) {
      return jsonResponse({ message: "Unauthorized", updatedCount: 0 }, 401);
    }

    // Chain notifications (C1) are derived from the ledger, so their read state is kept per user.
    const userKey = authResult.session.user?._id ?? authResult.session.firebase.uid;
    const chainUpdated = userKey ? await markChainNotificationsRead(database, userKey, chainIds) : 0;

    let storedUpdated = 0;
    if (objectIds.length) {
      const result = await database.collection("notifications").updateMany(
        {
          _id: { $in: objectIds },
          read: { $ne: true },
          $or: visibilityFilters
        },
        {
          $set: {
            read: true,
            updatedAt: new Date()
          }
        }
      );
      storedUpdated = result.modifiedCount;
    }

    return jsonResponse({ message: "Notifications marked as read", updatedCount: storedUpdated + chainUpdated });
  } catch (error) {
    if (isMongoConnectionError(error)) {
      return jsonResponse(
        { message: "Database temporarily unavailable. Please try again later.", error: "MongoUnavailable" },
        503
      );
    }
    throw error;
  }
}

export async function POST(request: NextRequest) {
  const payload = await request.json();
  if (isDemoMode()) {
    return jsonResponse({ message: "Notification created (demo mode)", payload }, 201);
  }

  const authResult = await requireSession(request);
  if (authResult.error) {
    return authResult.error;
  }

  const roleCheck = requireRole(authResult.session.user?.role, ["admin", "faculty", "super_admin", "mentor"]);
  if (roleCheck) {
    return roleCheck;
  }

  try {
    const database = await getMongoDatabase();
    const notificationsCollection = database.collection("notifications");
    const now = new Date();
    const document = {
      ...payload,
      createdBy: authResult.session.user?._id ?? authResult.session.firebase.uid,
      createdAt: now,
      updatedAt: now
    };
    const result = await notificationsCollection.insertOne(document);

    return jsonResponse(
      {
        message: "Notification created",
        notification: { ...document, _id: result.insertedId.toString() }
      },
      201
    );
  } catch (error) {
    if (isMongoConnectionError(error)) {
      return jsonResponse(
        { message: "Database temporarily unavailable. Please try again later.", error: "MongoUnavailable" },
        503
      );
    }
    throw error;
  }
}

