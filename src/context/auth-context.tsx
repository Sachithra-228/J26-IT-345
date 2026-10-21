"use client";

import { createContext, ReactNode, useContext, useEffect, useRef, useState } from "react";
import {
  GoogleAuthProvider,
  onIdTokenChanged,
  signInWithEmailAndPassword,
  signInWithPopup,
  signOut,
  createUserWithEmailAndPassword,
  deleteUser,
  sendEmailVerification
} from "firebase/auth";
import { getFirebaseAuth } from "@/lib/firebase";
import { UserProfile, UserRole } from "@/types";
import { demoUsers } from "@/lib/demo-data";

type FirebaseAuthUser = {
  uid: string;
  email: string | null;
  displayName: string | null;
  emailVerified?: boolean;
  reload?: () => Promise<void>;
  getIdToken: (forceRefresh?: boolean) => Promise<string>;
};

type RegisterProfileInput = {
  name?: string;
  role?: UserRole;
  fieldA?: string;
  fieldB?: string;
  fieldC?: string;
};

type AuthContextValue = {
  user: UserProfile | null;
  firebaseUser: FirebaseAuthUser | null;
  loading: boolean;
  refreshUser: () => Promise<void>;
  updateUserProfile: (partial: Partial<UserProfile>) => void;
  signInWithEmail: (email: string, password: string) => Promise<void>;
  signInWithGoogle: () => Promise<void>;
  registerWithEmail: (email: string, password: string, profile?: RegisterProfileInput) => Promise<void>;
  requestPasswordReset: (email: string) => Promise<void>;
  signOutUser: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

type AuthProviderProps = {
  children: ReactNode;
};

const VALID_USER_ROLES: UserRole[] = [
  "student",
  "faculty",
  "mentor",
  "donor",
  "admin",
  "super_admin",
  "employer",
  "ngo",
  "parent"
];

const DEMO_SIGNED_OUT_KEY = "unicare:demo-signed-out";

function wasDemoSignedOut() {
  if (typeof window === "undefined") return false;
  try {
    return window.localStorage.getItem(DEMO_SIGNED_OUT_KEY) === "true";
  } catch {
    return false;
  }
}

function setDemoSignedOut(signedOut: boolean) {
  if (typeof window === "undefined") return;
  try {
    if (signedOut) window.localStorage.setItem(DEMO_SIGNED_OUT_KEY, "true");
    else window.localStorage.removeItem(DEMO_SIGNED_OUT_KEY);
  } catch {
    // Ignore storage failures; demo auth can still work for the current page load.
  }
}

function normalizeUserRole(role?: string | null): UserRole | null {
  if (!role) return null;
  const normalized = role.toLowerCase();
  return VALID_USER_ROLES.includes(normalized as UserRole) ? (normalized as UserRole) : null;
}

function getRoleHintStorageKey(email: string) {
  return `unicare:role-hint:${email.toLowerCase()}`;
}

function saveRoleHint(email: string | null | undefined, role: string | null | undefined) {
  if (typeof window === "undefined" || !email) return;
  const normalizedRole = normalizeUserRole(role);
  if (!normalizedRole) return;
  try {
    window.localStorage.setItem(getRoleHintStorageKey(email), normalizedRole);
  } catch {
    // Ignore storage failures.
  }
}

function loadRoleHint(email: string | null | undefined): UserRole | null {
  if (typeof window === "undefined" || !email) return null;
  try {
    const stored = window.localStorage.getItem(getRoleHintStorageKey(email));
    return normalizeUserRole(stored);
  } catch {
    return null;
  }
}

function createFallbackProfile(currentUser: FirebaseAuthUser, roleHint?: UserRole | null): UserProfile {
  const nameFromEmail = currentUser.email?.split("@")[0] ?? "User";
  return {
    _id: currentUser.uid,
    email: currentUser.email ?? "",
    name: currentUser.displayName ?? nameFromEmail,
    role: roleHint ?? "student"
  };
}

export function AuthProvider({ children }: AuthProviderProps) {
  const [firebaseUser, setFirebaseUser] = useState<FirebaseAuthUser | null>(null);
  const [user, setUser] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const registeringUidRef = useRef<string | null>(null);
  const syncPromiseRef = useRef<Promise<UserProfile | null> | null>(null);
  const syncKeyRef = useRef<string | null>(null);
  const signInRoleHintRef = useRef<UserRole | null>(null);

  const setServerSession = async (idToken: string) => {
    return fetch("/api/auth/session", {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({ idToken })
    });
  };

  const clearServerSession = async () => {
    await fetch("/api/auth/session", {
      method: "DELETE"
    });
  };

  const runSignInPreflight = async (email: string): Promise<UserRole | null> => {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 20_000);
    let response: Response;
    try {
      response = await fetch("/api/auth/preflight", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({ email }),
        signal: controller.signal
      });
    } catch (err) {
      clearTimeout(timeoutId);
      if (err instanceof Error && err.name === "AbortError") {
        throw new Error("DB_CONNECTION_FAILED");
      }
      throw new Error("SIGNIN_PRECHECK_FAILED");
    }
    clearTimeout(timeoutId);

    if (response.ok) {
      try {
        const data = (await response.json()) as { role?: string | null };
        return normalizeUserRole(data.role);
      } catch {
        return null;
      }
    }

    let errorCode = "SIGNIN_PRECHECK_FAILED";
    try {
      const data = (await response.json()) as { code?: string };
      if (data.code) {
        errorCode = data.code;
      }
    } catch {
      // Keep fallback error code.
    }

    throw new Error(errorCode);
  };

  const syncUserWithDatabase = async (
    currentUser: FirebaseAuthUser,
    profile?: RegisterProfileInput
  ): Promise<UserProfile | null> => {
    if (!currentUser.email) {
      return null;
    }

    const payloadData: {
      firebaseUid: string;
      email: string;
      name?: string;
      role?: UserRole;
      university?: string;
      contact?: string;
      roleDetails?: {
        fieldA: string;
        fieldB: string;
        fieldC: string;
      };
    } = {
      firebaseUid: currentUser.uid,
      email: currentUser.email.toLowerCase()
    };

    // Keep basic auth sync minimal so it doesn't overwrite profile edits on refresh/sign-in.
    if (profile) {
      payloadData.name = profile.name ?? currentUser.displayName ?? currentUser.email.split("@")[0];
      payloadData.role = profile.role;
      payloadData.university = profile.fieldA;
      payloadData.contact = profile.fieldC;
      payloadData.roleDetails = {
        fieldA: profile.fieldA ?? "",
        fieldB: profile.fieldB ?? "",
        fieldC: profile.fieldC ?? ""
      };
    }

    const payload = JSON.stringify(payloadData);

    const doSync = async () =>
      fetch("/api/users", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: payload
      });

    let response = await doSync();

    if (!response.ok && response.status >= 500) {
      await new Promise((resolve) => setTimeout(resolve, 3000));
      response = await doSync();
    }

    if (!response.ok) {
      let errorCode = "ACCOUNT_SYNC_FAILED";
      let errorDetail: string | undefined;
      try {
        const errorData = (await response.json()) as { code?: string; error?: string };
        if (errorData.code) errorCode = errorData.code;
        if (errorData.error) errorDetail = errorData.error;
      } catch {
        // Fall through to generic sync error.
      }
      throw new Error(errorDetail ?? errorCode);
    }

    const data = (await response.json()) as { user?: UserProfile };
    return data.user ?? null;
  };

  const syncUserOnce = async (
    currentUser: FirebaseAuthUser,
    profile?: RegisterProfileInput
  ): Promise<UserProfile | null> => {
    if (!currentUser.email) {
      return null;
    }

    const key = `${currentUser.uid}:${currentUser.email.toLowerCase()}:${profile ? "profile" : "basic"}`;
    if (syncPromiseRef.current && syncKeyRef.current === key) {
      return syncPromiseRef.current;
    }

    const nextPromise = syncUserWithDatabase(currentUser, profile);
    syncKeyRef.current = key;
    syncPromiseRef.current = nextPromise.finally(() => {
      syncPromiseRef.current = null;
      syncKeyRef.current = null;
    });
    return syncPromiseRef.current;
  };

  const enforceUserAccess = async (profile: UserProfile | null) => {
    if (!profile) {
      return;
    }

    if (profile.isDeleted || profile.status === "blocked" || profile.subscription?.status === "blocked") {
      const auth = getFirebaseAuth();
      if (auth) {
        await signOut(auth);
      }
      await clearServerSession();
      throw new Error("ACCOUNT_BLOCKED");
    }
  };

  useEffect(() => {
    const auth = getFirebaseAuth();
    if (!auth) {
      setUser(wasDemoSignedOut() ? null : demoUsers[0] ?? null);
      setLoading(false);
      return;
    }

    const unsubscribe = onIdTokenChanged(auth, async (currentUser: FirebaseAuthUser | null) => {
      setFirebaseUser(currentUser);
      if (currentUser?.email) {
        if (registeringUidRef.current === currentUser.uid) {
          setLoading(false);
          return;
        }
        try {
          let idToken = await currentUser.getIdToken();
          let sessionResponse = await setServerSession(idToken);
          if (!sessionResponse.ok) {
            idToken = await currentUser.getIdToken(true);
            sessionResponse = await setServerSession(idToken);
          }
          if (!sessionResponse.ok) {
            throw new Error("SESSION_SET_FAILED");
          }
          const syncedUser = await syncUserOnce(currentUser);
          if (syncedUser) {
            await enforceUserAccess(syncedUser);
            setUser(syncedUser);
            saveRoleHint(currentUser.email, syncedUser.role);
          } else {
            const hintedRole = signInRoleHintRef.current ?? loadRoleHint(currentUser.email);
            setUser(createFallbackProfile(currentUser, hintedRole));
          }
        } catch (error) {
          if (error instanceof Error && error.message === "ACCOUNT_BLOCKED") {
            setUser(null);
            setLoading(false);
            return;
          }
          const matched = demoUsers.find((demoUser) => demoUser.email === currentUser.email);
          const hintedRole = signInRoleHintRef.current ?? loadRoleHint(currentUser.email);
          const fallbackRole = hintedRole ?? matched?.role ?? null;
          setUser(matched ?? createFallbackProfile(currentUser, fallbackRole));
        }
        signInRoleHintRef.current = null;
      } else {
        registeringUidRef.current = null;
        signInRoleHintRef.current = null;
        try {
          await clearServerSession();
        } catch {
          // Ignore session clear failures during sign-out transitions.
        }
        setUser(null);
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const signInWithEmail = async (email: string, password: string) => {
    const auth = getFirebaseAuth();
    if (!auth) {
      setDemoSignedOut(false);
      setUser(demoUsers[0] ?? null);
      return;
    }

    const cachedRoleHint = loadRoleHint(email);
    if (cachedRoleHint) {
      signInRoleHintRef.current = cachedRoleHint;
    } else {
      try {
        signInRoleHintRef.current = await runSignInPreflight(email);
        if (signInRoleHintRef.current) {
          saveRoleHint(email, signInRoleHintRef.current);
        }
      } catch (preflightError) {
        if (preflightError instanceof Error) {
          const code = preflightError.message;
          if (code === "USER_NOT_FOUND" || code === "ACCOUNT_DELETED" || code === "ACCOUNT_BLOCKED") {
            throw preflightError;
          }
        }
        signInRoleHintRef.current = null;
      }
    }

    setLoading(true);
    try {
      const credential = await signInWithEmailAndPassword(auth, email, password);
      const signedInUser = credential.user as FirebaseAuthUser;
      if (signedInUser.reload) {
        await signedInUser.reload();
      }

      if (!signedInUser.emailVerified) {
        await signOut(auth);
        throw new Error("EMAIL_NOT_VERIFIED");
      }
    } catch (error) {
      setLoading(false);
      throw error;
    }
  };

  const signInWithGoogle = async () => {
    const auth = getFirebaseAuth();
    if (!auth) {
      setDemoSignedOut(false);
      setUser(demoUsers[0] ?? null);
      return;
    }
    const provider = new GoogleAuthProvider();
    setLoading(true);
    try {
      const credential = await signInWithPopup(auth, provider);
      const signedInUser = credential.user as FirebaseAuthUser;
      signInRoleHintRef.current = loadRoleHint(signedInUser.email);
    } catch (error) {
      setLoading(false);
      throw error;
    }
  };

  const registerWithEmail = async (
    email: string,
    password: string,
    profile?: RegisterProfileInput
  ) => {
    const auth = getFirebaseAuth();
    if (!auth) {
      setDemoSignedOut(false);
      setUser(demoUsers[0] ?? null);
      return;
    }
    const credential = await createUserWithEmailAndPassword(auth, email, password);
    registeringUidRef.current = credential.user.uid;

    try {
      const idToken = await credential.user.getIdToken(true);
      const sessionResponse = await setServerSession(idToken);
      if (!sessionResponse.ok) {
        throw new Error("SESSION_SET_FAILED");
      }
      const syncedUser = await syncUserOnce(credential.user, profile);
      if (!syncedUser) {
        throw new Error("ACCOUNT_SYNC_FAILED");
      }
      saveRoleHint(credential.user.email, syncedUser.role);

      const continueUrl = `${window.location.origin}/login?mode=signin&verified=1`;
      let verificationSent = false;

      try {
        await sendEmailVerification(credential.user, { url: continueUrl });
        verificationSent = true;
      } catch {
        // Fallback to server endpoint when client-side send fails.
      }

      if (!verificationSent) {
        const verificationResponse = await fetch("/api/auth/verification", {
          method: "POST",
          headers: {
            "Content-Type": "application/json"
          },
          body: JSON.stringify({ continueUrl })
        });

        if (!verificationResponse.ok) {
          throw new Error("VERIFICATION_EMAIL_SEND_FAILED");
        }

        try {
          const verificationPayload = (await verificationResponse.json()) as { message?: string };
          if (verificationPayload.message?.toLowerCase().includes("demo mode")) {
            throw new Error("VERIFICATION_EMAIL_SEND_FAILED");
          }
        } catch (parseError) {
          if (parseError instanceof Error && parseError.message === "VERIFICATION_EMAIL_SEND_FAILED") {
            throw parseError;
          }
          // If parsing fails but request succeeded, continue.
        }
      }

      setUser(syncedUser);
      await signOut(auth);
      await clearServerSession();
    } catch (error) {
      try {
        await deleteUser(credential.user);
      } catch {
        // Best-effort rollback if post-create steps fail.
      }
      await clearServerSession();
      throw error;
    } finally {
      registeringUidRef.current = null;
    }
  };

  const requestPasswordReset = async (email: string) => {
    const response = await fetch("/api/auth/password-reset", {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        email,
        continueUrl: `${window.location.origin}/login?mode=signin`
      })
    });

    if (!response.ok) {
      throw new Error("PASSWORD_RESET_FAILED");
    }
  };

  const signOutUser = async () => {
    const auth = getFirebaseAuth();
    if (!auth) {
      setDemoSignedOut(true);
      setUser(null);
      await clearServerSession();
      return;
    }
    await signOut(auth);
    await clearServerSession();
  };

  const refreshUser = async () => {
    if (!firebaseUser?.uid) return;
    try {
      const res = await fetch(`/api/users?firebaseUid=${encodeURIComponent(firebaseUser.uid)}`);
      if (!res.ok) return;
      const data = (await res.json()) as { user?: UserProfile };
      if (data.user) setUser(data.user);
    } catch {
      // Ignore refresh errors
    }
  };

  const updateUserProfile = (partial: Partial<UserProfile>) => {
    setUser((prev) => (prev ? { ...prev, ...partial } : null));
  };

  const value = {
    user,
    firebaseUser,
    loading,
    refreshUser,
    updateUserProfile,
    signInWithEmail,
    signInWithGoogle,
    registerWithEmail,
    requestPasswordReset,
    signOutUser
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within AuthProvider");
  }
  return context;
}
