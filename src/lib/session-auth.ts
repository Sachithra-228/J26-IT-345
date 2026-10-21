import type { Collection } from "mongodb";
import { NextRequest, NextResponse } from "next/server";
import { isDemoMode, jsonResponse } from "@/lib/api";
import { demoUsers } from "@/lib/demo-data";
import { verifyFirebaseIdToken } from "@/lib/firebase-auth-server";
import { getMongoDatabase } from "@/lib/mongodb";
import { UserProfile } from "@/types";

export const SESSION_COOKIE_NAME = "session";
const SESSION_MAX_AGE_SECONDS = 60 * 60 * 24; // 24 hours - cookie expires after 1 day
const USER_CACHE_TTL_MS = 30 * 1000;
const USER_CACHE_MAX_ENTRIES = 500;
const shouldLogTiming = process.env.DEBUG_AUTH_TIMING === "true";
const inflightUserLookups = new Map<string, Promise<UserProfile | null>>();
const SESSION_USER_LOOKUP_MAX_TIME_MS = Number(process.env.SESSION_USER_LOOKUP_MAX_TIME_MS ?? "5000");
const shouldLogExplain = process.env.DEBUG_AUTH_EXPLAIN === "true" && process.env.NODE_ENV !== "production";

function isMaxTimeError(error: unknown): boolean {
  if (!error || typeof error !== "object") return false;
  const code = (error as { code?: number }).code;
  const message = String((error as { message?: string }).message ?? "");
  return code === 50 || message.toLowerCase().includes("maxtimems");
}

async function logUserLookupExplain(
  usersCollection: Collection<DbUserDocument>,
  query: Record<string, unknown>,
  hint: string
) {
  if (!shouldLogExplain) return;
  try {
    const explain = await usersCollection
      .find(query)
      .hint(hint)
      .maxTimeMS(SESSION_USER_LOOKUP_MAX_TIME_MS)
      .explain("executionStats");
    const stats = (explain as { executionStats?: { totalDocsExamined?: number; totalKeysExamined?: number } })
      .executionStats;
    console.info(
      `[auth] explain ${hint} docsExamined=${stats?.totalDocsExamined ?? "?"} keysExamined=${
        stats?.totalKeysExamined ?? "?"
      }`
    );
  } catch (error) {
    console.warn("[auth] explain failed:", error instanceof Error ? error.message : error);
  }
}

type DbUserDocument = {
  _id: { toString: () => string };
  email: string;
  name: string;
  role: UserProfile["role"] | string;
  university?: string;
  contact?: string;
  roleDetails?: Record<string, string>;
  needsProfileCompletion?: boolean;
  firebaseUid?: string;
  createdAt?: Date;
  updatedAt?: Date;
  isDeleted?: boolean;
  status?: string;
  subscription?: {
    plan?: string;
    status?: string;
    trialEndsAt?: Date | string;
  };
};

type CachedUser = {
  user: UserProfile | null;
  expiresAt: number;
};

const sessionUserCache = new Map<string, CachedUser>();

function buildSessionCacheKey(identity: { uid: string; email: string | null }) {
  return `${identity.uid}:${identity.email?.toLowerCase() ?? ""}`;
}

function getCachedSessionUser(identity: { uid: string; email: string | null }) {
  const key = buildSessionCacheKey(identity);
  const now = Date.now();
  const cached = sessionUserCache.get(key);
  if (!cached) return undefined;
  if (cached.expiresAt <= now) {
    sessionUserCache.delete(key);
    return undefined;
  }
  return cached;
}

function setCachedSessionUser(identity: { uid: string; email: string | null }, user: UserProfile | null) {
  const key = buildSessionCacheKey(identity);
  sessionUserCache.set(key, {
    user,
    expiresAt: Date.now() + USER_CACHE_TTL_MS
  });

  while (sessionUserCache.size > USER_CACHE_MAX_ENTRIES) {
    const oldestKey = sessionUserCache.keys().next().value;
    if (!oldestKey) break;
    sessionUserCache.delete(oldestKey);
  }
}

export function invalidateSessionUserCache(identity?: { uid?: string; email?: string | null }) {
  if (!identity?.uid && !identity?.email) {
    sessionUserCache.clear();
    return;
  }

  for (const key of sessionUserCache.keys()) {
    const [uid, email] = key.split(":", 2);
    const uidMatches = identity.uid ? uid === identity.uid : true;
    const emailMatches = identity.email ? email === identity.email.toLowerCase() : true;
    if (uidMatches && emailMatches) {
      sessionUserCache.delete(key);
    }
  }
}

function mapUserDocument(document: DbUserDocument): UserProfile {
  return {
    _id: document._id.toString(),
    email: document.email,
    name: document.name,
    role: document.role as UserProfile["role"],
    university: document.university,
    contact: document.contact,
    roleDetails: document.roleDetails,
    needsProfileCompletion: document.needsProfileCompletion,
    firebaseUid: document.firebaseUid,
    createdAt: document.createdAt,
    updatedAt: document.updatedAt,
    isDeleted: document.isDeleted,
    status: document.status as UserProfile["status"],
    subscription: document.subscription
      ? {
          plan: document.subscription.plan,
          status: document.subscription.status as UserProfile["subscription"] extends infer T
            ? T extends { status?: infer S }
              ? S
              : never
            : never,
          trialEndsAt: document.subscription.trialEndsAt
        }
      : undefined
  };
}

export function applySessionCookie(response: NextResponse, idToken: string) {
  response.cookies.set({
    name: SESSION_COOKIE_NAME,
    value: idToken,
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    maxAge: SESSION_MAX_AGE_SECONDS,
    path: "/"
  });
}

export function clearSessionCookie(response: NextResponse) {
  response.cookies.set({
    name: SESSION_COOKIE_NAME,
    value: "",
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    maxAge: 0,
    path: "/"
  });
}

export async function getSessionFromRequest(request: NextRequest) {
  const sessionStart = shouldLogTiming ? Date.now() : 0;
  if (isDemoMode()) {
    const requestedDemoUserId = request.headers.get("x-unicare-demo-user-id");
    const demoUser = demoUsers.find((user) => user._id === requestedDemoUserId) ?? demoUsers[0] ?? null;
    return {
      idToken: "demo-session",
      firebase: {
        uid: (demoUser as { firebaseUid?: string } | null)?.firebaseUid ?? demoUser?._id ?? "demo-user",
        email: demoUser?.email ?? null,
        displayName: demoUser?.name ?? null,
        emailVerified: true
      },
      user: demoUser
    };
  }

  const idToken = request.cookies.get(SESSION_COOKIE_NAME)?.value;
  if (!idToken) {
    return null;
  }

  const verifyStart = shouldLogTiming ? Date.now() : 0;
  const firebase = await verifyFirebaseIdToken(idToken);
  if (shouldLogTiming) {
    console.info(`[auth] session verify in ${Date.now() - verifyStart}ms`);
  }

  if (!process.env.MONGODB_URI) {
    return { idToken, firebase, user: null };
  }

  const cachedUser = getCachedSessionUser(firebase);
  if (cachedUser) {
    if (shouldLogTiming) {
      console.info(`[auth] session user cache hit in ${Date.now() - sessionStart}ms`);
    }
    return { idToken, firebase, user: cachedUser.user };
  }

  try {
    const lookupKey = buildSessionCacheKey(firebase);
    const inflight = inflightUserLookups.get(lookupKey);
    if (inflight) {
      if (shouldLogTiming) {
        console.info(`[auth] session user inflight await`);
      }
      const user = await inflight;
      if (shouldLogTiming) {
        console.info(`[auth] session total in ${Date.now() - sessionStart}ms`);
      }
      return { idToken, firebase, user };
    }

    const lookupPromise = (async () => {
      const dbStart = shouldLogTiming ? Date.now() : 0;
      const database = await getMongoDatabase();
      const usersCollection = database.collection<DbUserDocument>("users");

      const uidQueryStart = shouldLogTiming ? Date.now() : 0;
      let userByUid: DbUserDocument | null = null;
      try {
        userByUid = await usersCollection.findOne(
          { firebaseUid: firebase.uid },
          { hint: "users_firebaseUid", maxTimeMS: SESSION_USER_LOOKUP_MAX_TIME_MS }
        );
      } catch (error) {
        if (isMaxTimeError(error)) {
          console.warn(
            `[auth] session uid lookup exceeded ${SESSION_USER_LOOKUP_MAX_TIME_MS}ms; skipping user lookup`
          );
          setCachedSessionUser(firebase, null);
          return null;
        }
        throw error;
      } finally {
        if (shouldLogTiming) {
          console.info(`[auth] session uid lookup in ${Date.now() - uidQueryStart}ms`);
        }
        await logUserLookupExplain(usersCollection, { firebaseUid: firebase.uid }, "users_firebaseUid");
      }

      let userDocument = userByUid;
      const normalizedEmail = firebase.email ? firebase.email.toLowerCase() : null;
      if (!userDocument && normalizedEmail) {
        const emailQueryStart = shouldLogTiming ? Date.now() : 0;
        try {
          userDocument = await usersCollection.findOne(
            { email: normalizedEmail },
            { hint: "users_email", maxTimeMS: SESSION_USER_LOOKUP_MAX_TIME_MS }
          );
        } catch (error) {
          if (isMaxTimeError(error)) {
            console.warn(
              `[auth] session email lookup exceeded ${SESSION_USER_LOOKUP_MAX_TIME_MS}ms; skipping user lookup`
            );
            setCachedSessionUser(firebase, null);
            return null;
          }
          throw error;
        } finally {
          if (shouldLogTiming) {
            console.info(`[auth] session email lookup in ${Date.now() - emailQueryStart}ms`);
          }
          await logUserLookupExplain(usersCollection, { email: normalizedEmail }, "users_email");
        }
      }

      if (shouldLogTiming) {
        console.info(`[auth] session db lookup in ${Date.now() - dbStart}ms`);
      }

      const user = userDocument ? mapUserDocument(userDocument) : null;
      setCachedSessionUser(firebase, user);
      return user;
    })();

    inflightUserLookups.set(lookupKey, lookupPromise);
    const user = await lookupPromise.finally(() => {
      inflightUserLookups.delete(lookupKey);
    });

    if (shouldLogTiming) {
      console.info(`[auth] session total in ${Date.now() - sessionStart}ms`);
    }
    return { idToken, firebase, user };
  } catch {
    return {
      idToken,
      firebase,
      user: null
    };
  }
}

export async function requireSession(request: NextRequest) {
  try {
    const session = await getSessionFromRequest(request);
    if (!session) {
      return { error: jsonResponse({ message: "Unauthorized" }, 401) };
    }
    return { session };
  } catch {
    return { error: jsonResponse({ message: "Unauthorized" }, 401) };
  }
}

export function requireRole(
  role: string | undefined,
  allowedRoles: string[]
): NextResponse | null {
  if (!role || !allowedRoles.includes(role)) {
    return jsonResponse({ message: "Forbidden" }, 403);
  }
  return null;
}
