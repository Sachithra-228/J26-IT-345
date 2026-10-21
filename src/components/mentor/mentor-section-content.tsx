"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Card } from "@/components/shared/Card";
import { StatCard } from "@/components/shared/stat-card";
import { Badge } from "@/components/shared/Badge";
import { Button } from "@/components/shared/Button";
import { Input } from "@/components/shared/Input";
import { TextArea } from "@/components/shared/text-area";
import { useAuth } from "@/context/auth-context";
import {
  defaultPreferences,
  mergePreferences,
  tabVariants,
  type ProfilePreferences,
  type ProfileTab
} from "@/components/profile/profile-preferences";
import { MentorMyMenteesCrudSection } from "./mentor-my-mentees";
import { MentorCareerInsightsCrudSection } from "./mentor-career-insights";
import { MentorWebinarsCrudSection } from "./mentor-webinars";
import { MentorImpactTrackerCrudSection } from "./mentor-impact-tracker";
import type { MentorshipSession } from "@/types";
import { demoIdentityHeaders, normalizeMentorshipStatus } from "@/lib/mentorship-session";

type Notification = {
  id?: string;
  _id?: string;
  title?: string;
  message?: string;
  date?: string;
  read?: boolean;
};

type MentorSectionContentProps = {
  sectionId: string;
};

type EnrichedSession = MentorshipSession & {
  menteeName?: string;
};

type CurrentMenteeOption = { studentId: string; name: string };

type MentorshipChatMessage = {
  _id?: string;
  sessionId: string;
  senderRole: "student" | "mentor" | "admin";
  senderUserId?: string;
  senderFirebaseUid?: string;
  text: string;
  createdAt?: string | Date;
};

function mentorshipStatusVariant(status?: string): "success" | "warning" | "info" {
  const normalized = String(status ?? "").trim().toLowerCase();
  if (normalized === "completed" || normalized === "confirmed" || normalized === "scheduled") {
    return "success";
  }
  if (normalized === "cancelled" || normalized === "rejected") {
    return "warning";
  }
  return "info";
}

function mentorshipCanChat(status?: string) {
  const normalized = String(status ?? "").trim().toLowerCase();
  return normalized === "confirmed" || normalized === "scheduled" || normalized === "completed";
}

function formatMentorshipDate(value?: string | Date) {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return String(value);
  return date.toLocaleString();
}

function toDateTimeLocal(value?: string | Date) {
  if (!value) return "";
  const date = new Date(value);
  if (!Number.isFinite(date.getTime())) return "";
  return new Date(date.getTime() - date.getTimezoneOffset() * 60_000).toISOString().slice(0, 16);
}

export function MentorSectionContent({ sectionId }: MentorSectionContentProps) {
  const Section = useMemo(() => {
    switch (sectionId) {
      case "mentor-home":
        return MentorHomeSection;
      case "my-mentees":
        return MentorMyMenteesCrudSection;
      case "sessions":
        return MentorSessionsSection;
      case "messages":
        return MentorMessagesSection;
      case "career-insights":
        return MentorCareerInsightsCrudSection;
      case "webinars":
        return MentorWebinarsCrudSection;
      case "impact-tracker":
        return MentorImpactTrackerCrudSection;
      case "profile":
        return MentorProfileSection;
      default:
        return MentorHomeSection;
    }
  }, [sectionId]);

  return <Section />;
}

function useMentorSessions() {
  const { user } = useAuth();
  const demoHeaders = demoIdentityHeaders(user?._id);
  const [sessions, setSessions] = useState<EnrichedSession[]>([]);
  const [loading, setLoading] = useState(true);

  const refreshSessions = useCallback(() => {
    setLoading(true);
    fetch("/api/mentorship-sessions", { cache: "no-store", headers: demoHeaders })
      .then((r) => (r.ok ? r.json() : []))
      .then((data) => {
        if (Array.isArray(data)) {
          setSessions(
            data.map((s: MentorshipSession) => ({
              ...s,
              menteeName: s.studentName,
              status: normalizeMentorshipStatus(s.status) as MentorshipSession["status"]
            }))
          );
        } else {
          setSessions([]);
        }
      })
      .catch(() => {
        setSessions([]);
      })
      .finally(() => setLoading(false));
  }, [user?._id]);

  useEffect(() => {
    refreshSessions();
  }, [refreshSessions]);

  return { sessions, loading, refreshSessions };
}

function useMentorNotifications() {
  const { user } = useAuth();
  const demoHeaders = demoIdentityHeaders(user?._id);
  const [notifications, setNotifications] = useState<Notification[]>([]);

  useEffect(() => {
    let cancelled = false;
    fetch("/api/notifications", { headers: demoHeaders })
      .then((r) => (r.ok ? r.json() : {}))
      .then((data) => {
        if (cancelled) return;
        if (Array.isArray((data as { notifications?: unknown[] }).notifications)) {
          setNotifications(
            ((data as { notifications: Notification[] }).notifications ?? []).map((n) => ({
              ...n,
              id: n.id ?? n._id
            }))
          );
        }
      })
      .catch(() => {
        if (!cancelled) setNotifications([]);
      });

    return () => {
      cancelled = true;
    };
  }, [user?._id]);

  return notifications;
}

function MentorHomeSection() {
  const { sessions } = useMentorSessions();
  const notifications = useMentorNotifications();

  const upcomingSessions = sessions.filter(
    (s) => s.status === "scheduled" || s.status === "confirmed"
  ).length;
  const totalMentees = new Set(sessions.map((s) => s.studentId)).size;
  const pendingRequests = sessions.filter((s) => s.status === "pending").length;

  return (
    <div className="space-y-8">
      <Card className="space-y-2 p-4">
        <h2 className="text-base font-semibold text-slate-900 dark:text-white">
          Welcome back, mentor
        </h2>
        <p className="text-sm text-slate-600 dark:text-slate-300">
          Support your mentees, keep track of sessions, and share career insights with students.
        </p>
      </Card>

      <div className="grid gap-4 md:grid-cols-4">
        <StatCard
          label="Active mentees"
          value={String(totalMentees)}
          description="Students currently connected to you"
        />
        <StatCard
          label="Upcoming sessions"
          value={String(upcomingSessions)}
          description="Confirmed or scheduled meetings"
        />
        <StatCard
          label="Pending requests"
          value={String(pendingRequests)}
          description="New mentee requests to review"
        />
        <StatCard
          label="Unread updates"
          value={String(notifications.filter((n) => !n.read).length)}
          description="Messages from mentees or admin"
        />
      </div>

      <Card className="space-y-3 p-4">
        <h3 className="text-sm font-semibold">Upcoming sessions</h3>
        <div className="space-y-2 text-sm">
          {sessions
            .filter((s) => s.status === "scheduled" || s.status === "confirmed")
            .slice(0, 5)
            .map((s) => (
              <div
                key={s._id}
                className="flex flex-col gap-1 rounded-xl border border-slate-200 bg-slate-50 p-3 dark:border-slate-800 dark:bg-slate-950"
              >
                <p className="font-medium">
                  {s.topic}{" "}
                  {s.menteeName && (
                    <span className="text-xs font-normal text-slate-500">
                      with {s.menteeName}
                    </span>
                  )}
                </p>
                <p className="text-xs text-slate-500">Status: {s.status}</p>
              </div>
            ))}
          {!sessions.length && (
            <p className="text-sm text-slate-500">
              No mentorship sessions yet. Once students request or you schedule sessions, they will
              appear here.
            </p>
          )}
        </div>
      </Card>
    </div>
  );
}

function MentorMyMenteesSection() {
  const { sessions } = useMentorSessions();

  const menteeMap = new Map<
    string,
    {
      studentId: string;
      name?: string;
      activeSessions: number;
      lastTopic?: string;
    }
  >();

  sessions.forEach((s) => {
    const existing = menteeMap.get(s.studentId) ?? {
      studentId: s.studentId,
      name: s.studentName,
      activeSessions: 0,
      lastTopic: s.topic
    };
    const activeSessions =
      existing.activeSessions +
      (s.status === "scheduled" || s.status === "confirmed" || s.status === "completed" ? 1 : 0);
    menteeMap.set(s.studentId, {
      studentId: s.studentId,
      name: s.studentName ?? existing.name,
      activeSessions,
      lastTopic: s.topic ?? existing.lastTopic
    });
  });

  const mentees = [...menteeMap.values()];

  return (
    <div className="space-y-4">
      <p className="text-sm text-slate-600 dark:text-slate-300">
        See students you&apos;re currently mentoring. Financial information is hidden; you only see
        mentoring‑related details and high‑level progress.
      </p>
      <Card className="space-y-3 p-4">
        <h3 className="text-sm font-semibold">My mentees</h3>
        <div className="space-y-2 text-sm">
          {mentees.map((m) => (
            <div
              key={m.studentId}
              className="flex flex-col gap-1 rounded-xl border border-slate-200 bg-slate-50 p-3 dark:border-slate-800 dark:bg-slate-950"
            >
              <p className="font-medium">{m.name ?? "Student"}</p>
              <p className="text-xs text-slate-500">
                Sessions together: {m.activeSessions}{" "}
                {m.lastTopic && <>• Last topic: {m.lastTopic}</>}
              </p>
            </div>
          ))}
          {!mentees.length && (
            <p className="text-sm text-slate-500">
              You don&apos;t have any mentees yet. When students are matched to you, they&apos;ll
              appear here.
            </p>
          )}
        </div>
      </Card>
    </div>
  );
}

function MentorSessionsSection() {
  const { user } = useAuth();
  const demoHeaders = demoIdentityHeaders(user?._id);
  const { sessions, loading, refreshSessions } = useMentorSessions();
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [creatingSession, setCreatingSession] = useState(false);
  const [newSessionStudentId, setNewSessionStudentId] = useState("");
  const [currentMentees, setCurrentMentees] = useState<CurrentMenteeOption[]>([]);
  const [newSessionTopic, setNewSessionTopic] = useState("");
  const [newSessionTime, setNewSessionTime] = useState("");
  const [schedulingSessionId, setSchedulingSessionId] = useState<string | null>(null);
  const [scheduledDateTime, setScheduledDateTime] = useState("");

  const upcoming = sessions.filter((s) => ["scheduled", "confirmed", "pending"].includes(normalizeMentorshipStatus(s.status)));
  const history = sessions.filter((s) => ["completed", "cancelled"].includes(normalizeMentorshipStatus(s.status)));

  const refreshCurrentMentees = useCallback(() => {
    fetch("/api/mentor/mentees?includeHistory=true", { cache: "no-store", headers: demoHeaders })
      .then((response) => (response.ok ? response.json() : { items: [] }))
      .then((payload) => setCurrentMentees(Array.isArray(payload.items) ? payload.items : []))
      .catch(() => setCurrentMentees([]));
  }, [user?._id]);

  useEffect(() => {
    refreshCurrentMentees();
  }, [refreshCurrentMentees]);

  const updateSessionStatus = async (sessionId: string, status: "confirmed" | "completed" | "cancelled") => {
    setUpdatingId(`${sessionId}:${status}`);
    setActionError(null);
    try {
      const response = await fetch(`/api/mentorship-sessions/${sessionId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json", ...demoHeaders },
        body: JSON.stringify({ status })
      });
      const body = await response.json().catch(() => ({} as { message?: string }));
      if (!response.ok) {
        setActionError(body.message ?? "Unable to update session status.");
        return;
      }
      refreshSessions();
      refreshCurrentMentees();
    } catch {
      setActionError("Unable to update session status.");
    } finally {
      setUpdatingId(null);
    }
  };

  const scheduleExistingSession = async () => {
    if (!schedulingSessionId || !scheduledDateTime) {
      setActionError("Select a date and time before saving the session.");
      return;
    }
    const parsedDate = new Date(scheduledDateTime);
    if (!Number.isFinite(parsedDate.getTime()) || parsedDate.getTime() <= Date.now()) {
      setActionError("Choose a valid future date and time.");
      return;
    }

    setUpdatingId(`${schedulingSessionId}:scheduled`);
    setActionError(null);
    try {
      const response = await fetch(`/api/mentorship-sessions/${schedulingSessionId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json", ...demoHeaders },
        body: JSON.stringify({ status: "scheduled", scheduledTime: parsedDate.toISOString() })
      });
      const body = await response.json().catch(() => ({} as { message?: string }));
      if (!response.ok) {
        setActionError(body.message ?? "Unable to schedule session.");
        return;
      }
      setSchedulingSessionId(null);
      setScheduledDateTime("");
      refreshSessions();
    } catch {
      setActionError("Unable to schedule session.");
    } finally {
      setUpdatingId(null);
    }
  };

  const createFollowUpSession = async () => {
    if (!newSessionStudentId || !newSessionTopic.trim()) {
      setActionError("Select a mentee and provide a topic to schedule a follow-up session.");
      return;
    }

    setCreatingSession(true);
    setActionError(null);
    try {
      const response = await fetch("/api/mentorship-sessions", {
        method: "POST",
        headers: { "Content-Type": "application/json", ...demoHeaders },
        body: JSON.stringify({
          studentId: newSessionStudentId,
          topic: newSessionTopic.trim(),
          scheduledTime: newSessionTime ? new Date(newSessionTime).toISOString() : ""
        })
      });
      const body = await response.json().catch(() => ({} as { message?: string }));
      if (!response.ok) {
        setActionError(body.message ?? "Unable to create follow-up session.");
        return;
      }
      setNewSessionTopic("");
      setNewSessionTime("");
      setActionError(null);
      refreshSessions();
    } catch {
      setActionError("Unable to create follow-up session.");
    } finally {
      setCreatingSession(false);
    }
  };

  return (
    <div className="space-y-4">
      <p className="text-sm text-slate-600 dark:text-slate-300">
        Schedule and track sessions with your mentees. University admins can use this information to
        understand engagement, but cannot see your private notes unless you share them.
      </p>
      <Card className="space-y-4 border-primary/20 bg-gradient-to-r from-primary/5 via-white to-cyan-50 p-5 dark:from-primary/10 dark:via-slate-900 dark:to-cyan-950/20">
        <h3 className="text-base font-semibold text-slate-900 dark:text-white">Schedule follow-up session</h3>
        <div className="grid gap-3 md:grid-cols-3">
          <select
            value={newSessionStudentId}
            onChange={(event) => setNewSessionStudentId(event.target.value)}
            className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 outline-none focus:border-primary dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100"
          >
            <option value="">Select mentee</option>
            {currentMentees.map((mentee) => (
              <option key={mentee.studentId} value={mentee.studentId}>
                {mentee.name}
              </option>
            ))}
          </select>
          <Input
            value={newSessionTopic}
            onChange={(event) => setNewSessionTopic(event.target.value)}
            placeholder="Session topic"
          />
          <Input
            type="datetime-local"
            value={newSessionTime}
            onChange={(event) => setNewSessionTime(event.target.value)}
          />
        </div>
        <div className="flex justify-end">
          <Button variant="primary" onClick={createFollowUpSession} disabled={creatingSession}>
            {creatingSession ? "Scheduling..." : "Schedule session"}
          </Button>
        </div>
      </Card>
      <div className="grid gap-4 md:grid-cols-2">
        <Card className="space-y-3 p-4">
          <h3 className="text-sm font-semibold">Active & pending</h3>
          {actionError ? <p className="text-xs text-rose-600 dark:text-rose-400">{actionError}</p> : null}
          <div className="space-y-2 text-sm">
            {loading ? (
              <p className="text-sm text-slate-500">Loading sessions...</p>
            ) : (
              upcoming.map((s) => (
                <div
                  key={s._id}
                  className="rounded-xl border border-slate-200 bg-slate-50 p-3 dark:border-slate-800 dark:bg-slate-950"
                >
                  <p className="font-medium">
                    {s.topic}{" "}
                    {s.studentName && (
                      <span className="text-xs font-normal text-slate-500">
                        with {s.studentName}
                      </span>
                    )}
                  </p>
                  <p className="text-xs text-slate-500">Status: {s.status}</p>
                  {s.scheduledTime && <p className="text-xs text-slate-500">Time: {new Date(s.scheduledTime).toLocaleString()}</p>}
                  {(s.status === "confirmed" || s.status === "scheduled") && (
                    <div className="mt-2">
                      {schedulingSessionId === s._id ? (
                        <div className="flex flex-wrap items-center gap-2">
                          <Input
                            type="datetime-local"
                            value={scheduledDateTime}
                            onChange={(event) => setScheduledDateTime(event.target.value)}
                            aria-label={`Schedule ${s.topic}`}
                          />
                          <Button
                            variant="primary"
                            disabled={updatingId !== null}
                            onClick={scheduleExistingSession}
                          >
                            {updatingId === `${s._id}:scheduled` ? "Saving..." : "Save date & time"}
                          </Button>
                          <Button
                            variant="ghost"
                            disabled={updatingId !== null}
                            onClick={() => { setSchedulingSessionId(null); setScheduledDateTime(""); }}
                          >
                            Cancel
                          </Button>
                        </div>
                      ) : (
                        <Button
                          variant="secondary"
                          disabled={updatingId !== null}
                          onClick={() => { setSchedulingSessionId(s._id); setScheduledDateTime(toDateTimeLocal(s.scheduledTime)); }}
                        >
                          {s.scheduledTime ? "Change date & time" : "Set date & time"}
                        </Button>
                      )}
                    </div>
                  )}
                  <div className="mt-2 flex flex-wrap gap-2">
                    {s.status === "pending" && (
                      <>
                        <button
                          type="button"
                          className="rounded-full bg-emerald-50 px-3 py-1 text-xs font-medium text-emerald-700 hover:bg-emerald-100 disabled:cursor-not-allowed disabled:opacity-60 dark:bg-emerald-900/40 dark:text-emerald-300"
                          disabled={updatingId !== null}
                          onClick={() => updateSessionStatus(s._id, "confirmed")}
                        >
                          {updatingId === `${s._id}:confirmed` ? "Updating..." : "Approve request"}
                        </button>
                        <button
                          type="button"
                          className="rounded-full bg-rose-50 px-3 py-1 text-xs font-medium text-rose-700 hover:bg-rose-100 disabled:cursor-not-allowed disabled:opacity-60 dark:bg-rose-900/40 dark:text-rose-300"
                          disabled={updatingId !== null}
                          onClick={() => updateSessionStatus(s._id, "cancelled")}
                        >
                          {updatingId === `${s._id}:cancelled` ? "Updating..." : "Reject request"}
                        </button>
                      </>
                    )}
                  </div>
                </div>
              ))
            )}
            {!loading && !upcoming.length && (
              <p className="text-sm text-slate-500">
                No upcoming sessions yet. When students request or you schedule time slots, they will
                show up here.
              </p>
            )}
          </div>
        </Card>
        <Card className="space-y-3 p-4">
          <h3 className="text-sm font-semibold">Past sessions</h3>
          <div className="space-y-2 text-sm">
            {history.map((s) => (
              <div
                key={s._id}
                className="rounded-xl border border-slate-200 bg-slate-50 p-3 dark:border-slate-800 dark:bg-slate-950"
              >
                <p className="font-medium">
                  {s.topic}{" "}
                  {s.studentName && (
                    <span className="text-xs font-normal text-slate-500">
                      with {s.studentName}
                    </span>
                  )}
                </p>
                {s.feedback && (
                  <p className="text-xs text-slate-500">Feedback: {s.feedback}</p>
                )}
                <p className="text-xs text-slate-500">Status: {normalizeMentorshipStatus(s.status)}</p>
                {s.scheduledTime && <p className="text-xs text-slate-500">Time: {formatMentorshipDate(s.scheduledTime)}</p>}
                {typeof s.rating === "number" && (
                  <p className="text-xs text-slate-500">Student rating: {s.rating}/5</p>
                )}
                {s.review && (
                  <p className="text-xs text-slate-500">Student review: {s.review}</p>
                )}
              </div>
            ))}
            {!history.length && (
              <p className="text-sm text-slate-500">
                No completed sessions recorded yet. Once you finish sessions, they&apos;ll appear
                here as history.
              </p>
            )}
          </div>
        </Card>
      </div>
    </div>
  );
}

function MentorMessagesSection() {
  const { user } = useAuth();
  const demoHeaders = demoIdentityHeaders(user?._id);
  const { sessions, loading, refreshSessions } = useMentorSessions();
  const [selectedSessionId, setSelectedSessionId] = useState<string | null>(null);
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const [messages, setMessages] = useState<MentorshipChatMessage[]>([]);
  const [loadingMessages, setLoadingMessages] = useState(false);
  const [messageDraft, setMessageDraft] = useState("");
  const [sendingMessage, setSendingMessage] = useState(false);
  const [deletingMessageId, setDeletingMessageId] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  const sortedSessions = useMemo(
    () =>
      [...sessions].sort((a, b) => {
        const left = new Date(String(a.lastMessageAt ?? a.updatedAt ?? a.createdAt ?? "")).getTime();
        const right = new Date(String(b.lastMessageAt ?? b.updatedAt ?? b.createdAt ?? "")).getTime();
        return right - left;
      }),
    [sessions]
  );

  const pendingSessions = useMemo(
    () => sortedSessions.filter((session) => session.status === "pending"),
    [sortedSessions]
  );

  const conversationSessions = useMemo(
    () => sortedSessions.filter((session) => session.status !== "pending"),
    [sortedSessions]
  );

  const selectedSession = useMemo(
    () => sortedSessions.find((session) => session._id === selectedSessionId) ?? null,
    [sortedSessions, selectedSessionId]
  );

  const fetchMessages = useCallback(async (sessionId: string) => {
    setLoadingMessages(true);
    try {
      const response = await fetch(`/api/mentorship-messages?sessionId=${encodeURIComponent(sessionId)}`, { headers: demoHeaders });
      const data = await response.json().catch(() => [] as MentorshipChatMessage[]);
      setMessages(Array.isArray(data) ? data : []);
    } catch {
      setMessages([]);
    } finally {
      setLoadingMessages(false);
    }
  }, [user?._id]);

  useEffect(() => {
    if (!selectedSessionId && sortedSessions.length) {
      setSelectedSessionId(sortedSessions[0]._id);
    }
  }, [selectedSessionId, sortedSessions]);

  useEffect(() => {
    const canPoll = () => document.visibilityState === "visible" && document.hasFocus();
    const pollSessions = () => {
      if (canPoll()) refreshSessions();
    };
    const intervalId = window.setInterval(pollSessions, 30000);
    window.addEventListener("focus", pollSessions);
    document.addEventListener("visibilitychange", pollSessions);
    return () => {
      window.clearInterval(intervalId);
      window.removeEventListener("focus", pollSessions);
      document.removeEventListener("visibilitychange", pollSessions);
    };
  }, [refreshSessions]);

  useEffect(() => {
    if (!selectedSession?._id) return;
    if (!mentorshipCanChat(selectedSession.status)) {
      setMessages([]);
      return;
    }

    const canPoll = () => document.visibilityState === "visible" && document.hasFocus();
    const pollMessages = () => {
      if (canPoll()) fetchMessages(selectedSession._id);
    };
    pollMessages();
    const intervalId = window.setInterval(pollMessages, 12000);
    window.addEventListener("focus", pollMessages);
    document.addEventListener("visibilitychange", pollMessages);

    return () => {
      window.clearInterval(intervalId);
      window.removeEventListener("focus", pollMessages);
      document.removeEventListener("visibilitychange", pollMessages);
    };
  }, [fetchMessages, selectedSession]);

  const updateSessionStatus = async (sessionId: string, status: "confirmed" | "cancelled") => {
    setUpdatingId(`${sessionId}:${status}`);
    setActionError(null);
    try {
      const response = await fetch(`/api/mentorship-sessions/${sessionId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json", ...demoHeaders },
        body: JSON.stringify({ status })
      });
      const body = await response.json().catch(() => ({} as { message?: string }));
      if (!response.ok) {
        setActionError(body.message ?? "Unable to update request.");
        return;
      }
      refreshSessions();
      setSelectedSessionId(sessionId);
      if (status === "cancelled") {
        setMessages([]);
      }
    } catch {
      setActionError("Unable to update request.");
    } finally {
      setUpdatingId(null);
    }
  };

  const sendMessage = async () => {
    if (!selectedSession?._id || !messageDraft.trim()) return;

    setSendingMessage(true);
    setActionError(null);
    try {
      const response = await fetch("/api/mentorship-messages", {
        method: "POST",
        headers: { "Content-Type": "application/json", ...demoHeaders },
        body: JSON.stringify({
          sessionId: selectedSession._id,
          text: messageDraft.trim()
        })
      });
      const body = await response.json().catch(() => ({} as { message?: string }));
      if (!response.ok) {
        setActionError(body.message ?? "Unable to send message.");
        return;
      }
      setMessageDraft("");
      fetchMessages(selectedSession._id);
      refreshSessions();
    } catch {
      setActionError("Unable to send message.");
    } finally {
      setSendingMessage(false);
    }
  };

  const deleteMessage = async (messageId?: string) => {
    if (!selectedSession?._id || !messageId) return;
    setDeletingMessageId(messageId);
    setActionError(null);
    try {
      const response = await fetch("/api/mentorship-messages", {
        method: "DELETE",
        headers: { "Content-Type": "application/json", ...demoHeaders },
        body: JSON.stringify({ sessionId: selectedSession._id, messageId })
      });
      const body = await response.json().catch(() => ({} as { message?: string }));
      if (!response.ok) {
        setActionError(body.message ?? "Unable to delete message.");
        return;
      }
      setMessages((current) => current.filter((message) => message._id !== messageId));
    } catch {
      setActionError("Unable to delete message.");
    } finally {
      setDeletingMessageId(null);
    }
  };

  return (
    <div className="space-y-4">
      <p className="text-sm text-slate-600 dark:text-slate-300">
        Review new mentorship requests and chat with approved mentees in one place.
      </p>
      {actionError ? <p className="text-xs text-rose-600 dark:text-rose-400">{actionError}</p> : null}

      <div className="grid gap-4 lg:grid-cols-[320px_1fr]">
        <Card className="space-y-4 p-4">
          <div>
            <h3 className="text-sm font-semibold">Pending requests</h3>
            <p className="mt-1 text-xs text-slate-500">Approve a request to unlock chat.</p>
          </div>

          <div className="space-y-2">
            {loading ? (
              <p className="text-sm text-slate-500">Loading requests...</p>
            ) : pendingSessions.length ? (
              pendingSessions.map((session) => (
                <div
                  key={session._id}
                  className="rounded-xl border border-slate-200 bg-slate-50 p-3 dark:border-slate-800 dark:bg-slate-950"
                >
                  <button
                    type="button"
                    onClick={() => setSelectedSessionId(session._id)}
                    className="w-full text-left"
                  >
                    <p className="truncate text-sm font-semibold text-slate-900 dark:text-white">
                      {session.studentName || "Student"}
                    </p>
                    <p className="mt-1 line-clamp-1 text-xs text-slate-500">{session.topic}</p>
                  </button>
                  <div className="mt-3 flex gap-2">
                    <button
                      type="button"
                      className="rounded-full bg-emerald-50 px-3 py-1 text-xs font-medium text-emerald-700 hover:bg-emerald-100 disabled:cursor-not-allowed disabled:opacity-60 dark:bg-emerald-900/40 dark:text-emerald-300"
                      disabled={updatingId !== null}
                      onClick={() => updateSessionStatus(session._id, "confirmed")}
                    >
                      {updatingId === `${session._id}:confirmed` ? "Approving..." : "Approve"}
                    </button>
                    <button
                      type="button"
                      className="rounded-full bg-rose-50 px-3 py-1 text-xs font-medium text-rose-700 hover:bg-rose-100 disabled:cursor-not-allowed disabled:opacity-60 dark:bg-rose-900/40 dark:text-rose-300"
                      disabled={updatingId !== null}
                      onClick={() => updateSessionStatus(session._id, "cancelled")}
                    >
                      {updatingId === `${session._id}:cancelled` ? "Rejecting..." : "Reject"}
                    </button>
                  </div>
                </div>
              ))
            ) : (
              <p className="text-sm text-slate-500">No pending requests right now.</p>
            )}
          </div>

          <div className="border-t border-slate-200 pt-3 dark:border-slate-700">
            <h4 className="text-sm font-semibold text-slate-900 dark:text-white">Conversations</h4>
            <div className="mt-2 space-y-2">
              {loading ? (
                <p className="text-sm text-slate-500">Loading conversations...</p>
              ) : conversationSessions.length ? (
                conversationSessions.map((session) => (
                  <button
                    key={session._id}
                    type="button"
                    onClick={() => setSelectedSessionId(session._id)}
                    className={`w-full rounded-xl border p-3 text-left transition-colors ${
                      selectedSessionId === session._id
                        ? "border-primary bg-primary/5 dark:bg-primary/10"
                        : "border-slate-200 hover:border-slate-300 dark:border-slate-700"
                    }`}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <p className="truncate text-sm font-semibold text-slate-900 dark:text-white">
                        {session.studentName || "Student"}
                      </p>
                      <Badge variant={mentorshipStatusVariant(session.status)}>{session.status || "pending"}</Badge>
                    </div>
                    <p className="mt-1 line-clamp-1 text-xs text-slate-500">{session.topic}</p>
                    {session.lastMessageAt ? (
                      <p className="mt-1 text-[11px] text-slate-400">
                        Last message: {formatMentorshipDate(session.lastMessageAt)}
                      </p>
                    ) : null}
                  </button>
                ))
              ) : (
                <p className="text-sm text-slate-500">No conversation history yet.</p>
              )}
            </div>
          </div>
        </Card>

        <Card className="space-y-3 p-4">
          {!selectedSession ? (
            <p className="text-sm text-slate-500">
              Select a request or conversation from the left to continue.
            </p>
          ) : (
            <>
              <div className="border-b border-slate-200 pb-3 dark:border-slate-700">
                <div className="flex items-center justify-between gap-2">
                  <p className="font-semibold text-slate-900 dark:text-white">
                    {selectedSession.studentName || "Student"}
                  </p>
                  <Badge variant={mentorshipStatusVariant(selectedSession.status)}>
                    {selectedSession.status || "pending"}
                  </Badge>
                </div>
                <p className="mt-1 text-sm text-slate-500">Topic: {selectedSession.topic}</p>
                {selectedSession.scheduledTime ? (
                  <p className="mt-1 text-xs text-slate-500">
                    Scheduled: {formatMentorshipDate(selectedSession.scheduledTime)}
                  </p>
                ) : null}
              </div>

              {selectedSession.status === "pending" ? (
                <div className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-700 dark:border-amber-900/40 dark:bg-amber-900/20 dark:text-amber-300">
                  <p>Approve this request to start mentoring chat.</p>
                  <div className="mt-3 flex gap-2">
                    <button
                      type="button"
                      className="rounded-full bg-emerald-50 px-3 py-1 text-xs font-medium text-emerald-700 hover:bg-emerald-100 disabled:cursor-not-allowed disabled:opacity-60 dark:bg-emerald-900/40 dark:text-emerald-300"
                      disabled={updatingId !== null}
                      onClick={() => updateSessionStatus(selectedSession._id, "confirmed")}
                    >
                      {updatingId === `${selectedSession._id}:confirmed` ? "Approving..." : "Approve request"}
                    </button>
                    <button
                      type="button"
                      className="rounded-full bg-rose-50 px-3 py-1 text-xs font-medium text-rose-700 hover:bg-rose-100 disabled:cursor-not-allowed disabled:opacity-60 dark:bg-rose-900/40 dark:text-rose-300"
                      disabled={updatingId !== null}
                      onClick={() => updateSessionStatus(selectedSession._id, "cancelled")}
                    >
                      {updatingId === `${selectedSession._id}:cancelled` ? "Rejecting..." : "Reject request"}
                    </button>
                  </div>
                </div>
              ) : !mentorshipCanChat(selectedSession.status) ? (
                <p className="rounded-lg border border-slate-200 bg-slate-50 p-3 text-sm text-slate-600 dark:border-slate-700 dark:bg-slate-900/40 dark:text-slate-300">
                  Chat is unavailable for this session status.
                </p>
              ) : (
                <>
                  <div className="max-h-[360px] space-y-2 overflow-auto rounded-lg border border-slate-200 bg-slate-50 p-3 dark:border-slate-700 dark:bg-slate-900/40">
                    {loadingMessages ? (
                      <p className="text-sm text-slate-500">Loading messages...</p>
                    ) : messages.length === 0 ? (
                      <p className="text-sm text-slate-500">No messages yet. Start the conversation.</p>
                    ) : (
                      messages.map((message) => {
                        const mine = message.senderRole === "mentor";
                        return (
                          <div
                            key={message._id}
                            className={`flex ${mine ? "justify-end" : "justify-start"}`}
                          >
                            <div
                              className={`max-w-[85%] rounded-lg px-3 py-2 text-sm ${
                                mine
                                  ? "bg-primary text-white"
                                  : "bg-white text-slate-700 dark:bg-slate-800 dark:text-slate-200"
                              }`}
                            >
                              <p>{message.text}</p>
                              <p className={`mt-1 text-[11px] ${mine ? "text-white/80" : "text-slate-400"}`}>
                                {formatMentorshipDate(message.createdAt)}
                              </p>
                              {mine && message._id ? (
                                <button
                                  type="button"
                                  className="mt-1 text-[11px] text-white/80 underline"
                                  disabled={deletingMessageId === message._id}
                                  onClick={() => deleteMessage(message._id)}
                                >
                                  {deletingMessageId === message._id ? "Deleting..." : "Delete"}
                                </button>
                              ) : null}
                            </div>
                          </div>
                        );
                      })
                    )}
                  </div>

                  <div className="space-y-2">
                    <TextArea
                      rows={3}
                      value={messageDraft}
                      onChange={(event) => setMessageDraft(event.target.value)}
                      placeholder="Write a message to your mentee..."
                    />
                    <div className="flex justify-end">
                      <Button
                        variant="primary"
                        onClick={sendMessage}
                        disabled={sendingMessage || !messageDraft.trim()}
                      >
                        {sendingMessage ? "Sending..." : "Send"}
                      </Button>
                    </div>
                  </div>
                </>
              )}
            </>
          )}
        </Card>
      </div>
    </div>
  );
}

function MentorCareerInsightsSection() {
  return (
    <div className="space-y-4">
      <p className="text-sm text-slate-600 dark:text-slate-300">
        Share trends, openings, and advice with your mentees and relevant students. You won&apos;t
        be able to message students who are not connected to you or your programs.
      </p>
      <Card className="space-y-3 p-4">
        <h3 className="text-sm font-semibold">Career insights hub</h3>
        <p className="text-sm text-slate-500">
          This section can be connected to a content API to store posts, job referrals, and
          articles. For now, it&apos;s a placeholder where mentors can plan what to share with their
          mentees.
        </p>
      </Card>
    </div>
  );
}

function MentorWebinarsSection() {
  return (
    <div className="space-y-4">
      <p className="text-sm text-slate-600 dark:text-slate-300">
        Host or contribute to webinars that are visible to interested students. Donors and NGOs are
        not part of this workspace.
      </p>
      <Card className="space-y-4 p-4">
        <h3 className="text-sm font-semibold">Webinar scheduling</h3>
        <div className="grid gap-4 md:grid-cols-3">
          <div className="space-y-2">
            <label className="text-xs font-medium text-slate-600 dark:text-slate-300">
              Session title
            </label>
            <input
              className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm outline-none ring-primary/20 focus:ring-2 dark:border-slate-700 dark:bg-slate-900"
              placeholder="E.g. Breaking into data science"
            />
          </div>
          <div className="space-y-2">
            <label className="text-xs font-medium text-slate-600 dark:text-slate-300">
              Date
            </label>
            <input
              type="date"
              className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm outline-none ring-primary/20 focus:ring-2 dark:border-slate-700 dark:bg-slate-900"
            />
          </div>
          <div className="space-y-2">
            <label className="text-xs font-medium text-slate-600 dark:text-slate-300">
              Time
            </label>
            <input
              type="time"
              className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm outline-none ring-primary/20 focus:ring-2 dark:border-slate-700 dark:bg-slate-900"
            />
          </div>
        </div>
        <div className="space-y-2">
          <label className="text-xs font-medium text-slate-600 dark:text-slate-300">
            Session description
          </label>
          <textarea
            className="min-h-[100px] w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm outline-none ring-primary/20 focus:ring-2 dark:border-slate-700 dark:bg-slate-900"
            placeholder="Describe what students will learn, target audience, and how to join..."
          />
        </div>
        <div className="flex justify-end">
          <button className="rounded-full bg-primary px-4 py-2 text-sm font-medium text-white hover:bg-primary/90">
            Publish webinar
          </button>
        </div>
      </Card>
    </div>
  );
}

function MentorImpactTrackerSection() {
  const { sessions } = useMentorSessions();

  const completedSessions = sessions.filter((s) => s.status === "completed").length;
  const uniqueMentees = new Set(sessions.map((s) => s.studentId)).size;

  return (
    <div className="space-y-4">
      <p className="text-sm text-slate-600 dark:text-slate-300">
        Track your contribution in terms of hours mentored and students helped. Only mentors and
        admins can access this view.
      </p>
      <div className="grid gap-4 md:grid-cols-3">
        <StatCard
          label="Completed sessions"
          value={String(completedSessions)}
          description="Total conversations with mentees"
        />
        <StatCard
          label="Students helped"
          value={String(uniqueMentees)}
          description="Unique mentees you&apos;ve supported"
        />
        <StatCard
          label="Recognition badges"
          value="—"
          description="Configured with admin criteria"
        />
      </div>
      <Card className="space-y-3 p-4">
        <h3 className="text-sm font-semibold">Success stories</h3>
        <p className="text-sm text-slate-500">
          This section can later show anonymized mentee success stories curated by the university,
          based on your completed sessions and feedback.
        </p>
      </Card>
    </div>
  );
}

function MentorProfileSection() {
  const { user, refreshUser, updateUserProfile, requestPasswordReset } = useAuth();
  const [message, setMessage] = useState<{ type: "ok" | "err"; text: string } | null>(null);
  const [securityMessage, setSecurityMessage] = useState<{ type: "ok" | "err"; text: string } | null>(null);
  const [activeTab, setActiveTab] = useState<ProfileTab>("profile");

  const [name, setName] = useState(user?.name ?? "");
  const [contact, setContact] = useState(user?.contact ?? "");
  const [expertiseAreas, setExpertiseAreas] = useState(user?.roleDetails?.expertiseAreas ?? "");
  const [availability, setAvailability] = useState(user?.roleDetails?.availability ?? "");
  const [linkedIn, setLinkedIn] = useState(user?.roleDetails?.linkedIn ?? "");
  const [notificationMode, setNotificationMode] = useState(user?.roleDetails?.notificationMode ?? "email_in_app");

  const [profilePicUploading, setProfilePicUploading] = useState(false);
  const [personalSaving, setPersonalSaving] = useState(false);
  const [mentorSaving, setMentorSaving] = useState(false);
  const [preferencesLoading, setPreferencesLoading] = useState(false);
  const [preferencesSaving, setPreferencesSaving] = useState(false);
  const [preferences, setPreferences] = useState<ProfilePreferences>(defaultPreferences);

  const [deleteReason, setDeleteReason] = useState("");
  const [deleteSubmitting, setDeleteSubmitting] = useState(false);
  const [deletePending, setDeletePending] = useState(false);

  useEffect(() => {
    if (!user) return;
    setName(user.name ?? "");
    setContact(user.contact ?? "");
    setExpertiseAreas(user.roleDetails?.expertiseAreas ?? "");
    setAvailability(user.roleDetails?.availability ?? "");
    setLinkedIn(user.roleDetails?.linkedIn ?? "");
    setNotificationMode(user.roleDetails?.notificationMode ?? "email_in_app");
  }, [user]);

  useEffect(() => {
    if (!user?.email) return;
    let cancelled = false;

    async function loadPreferences() {
      setPreferencesLoading(true);
      try {
        const response = await fetch("/api/profile/preferences", { cache: "no-store" });
        const payload = (await response.json()) as Partial<ProfilePreferences>;
        if (!cancelled && response.ok) {
          setPreferences(mergePreferences(payload));
        }
      } catch {
        if (!cancelled) setPreferences(mergePreferences(null));
      } finally {
        if (!cancelled) setPreferencesLoading(false);
      }
    }

    async function loadDeleteRequestStatus() {
      try {
        const response = await fetch("/api/profile/delete-request", { cache: "no-store" });
        const payload = (await response.json()) as {
          pending?: boolean;
          request?: { status?: "pending" | "approved" | "rejected" } | null;
        };
        if (!cancelled && response.ok) {
          const isPending = Boolean(payload.pending || payload.request?.status === "pending");
          setDeletePending(isPending);
        }
      } catch {
        if (!cancelled) setDeletePending(false);
      }
    }

    void loadPreferences();
    void loadDeleteRequestStatus();

    return () => {
      cancelled = true;
    };
  }, [user?.email]);

  const savePersonal = async () => {
    if (!user?.email) return;
    setMessage(null);
    setPersonalSaving(true);
    try {
      const response = await fetch("/api/users", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          firebaseUid: (user as { firebaseUid?: string }).firebaseUid,
          email: user.email,
          name: name.trim() || user.name,
          contact: contact.trim() || undefined
        })
      });
      const payload = (await response.json()) as { user?: { name?: string; contact?: string }; message?: string };
      if (response.ok && payload.user) {
        updateUserProfile({ name: payload.user.name, contact: payload.user.contact });
        await refreshUser();
        setMessage({ type: "ok", text: "Personal details updated." });
      } else {
        setMessage({ type: "err", text: payload.message ?? "Could not save." });
      }
    } catch {
      setMessage({ type: "err", text: "Could not save. Try again." });
    } finally {
      setPersonalSaving(false);
    }
  };

  const saveMentorProfile = async () => {
    if (!user?.email) return;
    setMessage(null);
    setMentorSaving(true);

    const currentRoleDetails = { ...(user.roleDetails ?? {}) };
    const nextExpertise = expertiseAreas.trim();
    const nextAvailability = availability.trim();
    const nextLinkedIn = linkedIn.trim();

    if (nextExpertise) {
      currentRoleDetails.expertiseAreas = nextExpertise;
    } else {
      delete currentRoleDetails.expertiseAreas;
    }
    if (nextAvailability) {
      currentRoleDetails.availability = nextAvailability;
    } else {
      delete currentRoleDetails.availability;
    }
    if (nextLinkedIn) {
      currentRoleDetails.linkedIn = nextLinkedIn;
    } else {
      delete currentRoleDetails.linkedIn;
    }
    if (notificationMode) {
      currentRoleDetails.notificationMode = notificationMode;
    }

    try {
      const response = await fetch("/api/users", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          firebaseUid: (user as { firebaseUid?: string }).firebaseUid,
          email: user.email,
          name: user.name,
          roleDetails: currentRoleDetails
        })
      });
      const payload = (await response.json()) as {
        user?: { roleDetails?: Record<string, string> };
        message?: string;
      };
      if (response.ok && payload.user) {
        updateUserProfile({ roleDetails: payload.user.roleDetails });
        await refreshUser();
        setMessage({ type: "ok", text: "Mentor profile updated." });
      } else {
        setMessage({ type: "err", text: payload.message ?? "Could not save." });
      }
    } catch {
      setMessage({ type: "err", text: "Could not save. Try again." });
    } finally {
      setMentorSaving(false);
    }
  };

  const savePreferences = async (successText: string) => {
    setMessage(null);
    setPreferencesSaving(true);
    try {
      const response = await fetch("/api/profile/preferences", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          privacy: preferences.privacy,
          notifications: preferences.notifications
        })
      });
      const payload = (await response.json()) as { message?: string; preferences?: Partial<ProfilePreferences> };
      if (response.ok) {
        if (payload.preferences) {
          setPreferences(mergePreferences(payload.preferences));
        }
        setMessage({ type: "ok", text: successText });
      } else {
        setMessage({ type: "err", text: payload.message ?? "Could not save preferences." });
      }
    } catch {
      setMessage({ type: "err", text: "Could not save preferences. Try again." });
    } finally {
      setPreferencesSaving(false);
    }
  };

  const handleProfilePicChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file || !user?.email) return;

    const reader = new FileReader();
    reader.onload = async () => {
      const dataUrl = typeof reader.result === "string" ? reader.result : "";
      if (!dataUrl) return;
      setProfilePicUploading(true);
      setMessage(null);
      try {
        const response = await fetch("/api/users", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            firebaseUid: (user as { firebaseUid?: string }).firebaseUid,
            email: user.email,
            profilePic: dataUrl
          })
        });
        const payload = (await response.json()) as { user?: { profilePic?: string }; message?: string };
        if (response.ok && payload.user) {
          updateUserProfile({ profilePic: payload.user.profilePic });
          await refreshUser();
          setMessage({ type: "ok", text: "Profile picture updated." });
        } else {
          setMessage({ type: "err", text: payload.message ?? "Could not update picture." });
        }
      } catch {
        setMessage({ type: "err", text: "Could not update picture. Try again." });
      } finally {
        setProfilePicUploading(false);
      }
    };

    reader.readAsDataURL(file);
  };

  const handleSendResetEmail = async () => {
    if (!user?.email) return;
    setSecurityMessage(null);
    try {
      await requestPasswordReset(user.email);
      setSecurityMessage({ type: "ok", text: "Password reset link sent to your email." });
    } catch {
      setSecurityMessage({ type: "err", text: "Could not send reset email. Try again." });
    }
  };

  const handleSubmitDeleteRequest = async () => {
    if (!window.confirm("Submit account deletion request for admin review?")) {
      return;
    }

    setSecurityMessage(null);
    setDeleteSubmitting(true);
    try {
      const response = await fetch("/api/profile/delete-request", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          reason: deleteReason.trim() || undefined
        })
      });
      const payload = (await response.json()) as { message?: string };
      if (response.ok || response.status === 409) {
        setDeletePending(true);
        setSecurityMessage({
          type: "ok",
          text: payload.message ?? "Deletion request submitted for admin review."
        });
      } else {
        setSecurityMessage({
          type: "err",
          text: payload.message ?? "Could not submit deletion request. Try again."
        });
      }
    } catch {
      setSecurityMessage({ type: "err", text: "Could not submit deletion request. Try again." });
    } finally {
      setDeleteSubmitting(false);
    }
  };

  const tabs: { id: ProfileTab; label: string }[] = [
    { id: "profile", label: "Profile" },
    { id: "settings", label: "Preferences" },
    { id: "security", label: "Security" }
  ];

  const initials =
    (user?.name ?? user?.email ?? "U")
      .split(/\s+/)
      .map((segment) => segment[0])
      .join("")
      .slice(0, 2)
      .toUpperCase();

  return (
    <div className="space-y-6">
      {message && (
        <p
          className={`rounded-xl border px-4 py-2 text-sm ${
            message.type === "ok"
              ? "border-green-200 bg-green-50 text-green-800 dark:border-green-800 dark:bg-green-950/40 dark:text-green-200"
              : "border-red-200 bg-red-50 text-red-800 dark:border-red-800 dark:bg-red-950/40 dark:text-red-200"
          }`}
        >
          {message.text}
        </p>
      )}

      {securityMessage && (
        <p
          className={`rounded-xl border px-4 py-2 text-sm ${
            securityMessage.type === "ok"
              ? "border-green-200 bg-green-50 text-green-800 dark:border-green-800 dark:bg-green-950/40 dark:text-green-200"
              : "border-red-200 bg-red-50 text-red-800 dark:border-red-800 dark:bg-red-950/40 dark:text-red-200"
          }`}
        >
          {securityMessage.text}
        </p>
      )}

      <Card className="flex flex-wrap items-center justify-between gap-4 border-primary/20 bg-gradient-to-r from-primary/5 via-white to-emerald-50 p-5 dark:from-primary/10 dark:via-slate-900 dark:to-emerald-900/20">
        <div className="flex items-center gap-4">
          <div className="relative">
            <div className="flex h-16 w-16 items-center justify-center overflow-hidden rounded-full border-2 border-primary/40 bg-slate-100 dark:border-primary/60 dark:bg-slate-800">
              {user?.profilePic ? (
                <img src={user.profilePic} alt="Profile" className="h-full w-full object-cover" />
              ) : (
                <span className="text-lg font-semibold text-primary">{initials}</span>
              )}
            </div>
          </div>
          <div>
            <p className="text-sm font-medium uppercase tracking-wide text-primary">Mentor profile</p>
            <p className="text-lg font-semibold text-slate-900 dark:text-white">{user?.name ?? "Your name"}</p>
            <p className="text-xs text-slate-600 dark:text-slate-300">{user?.email}</p>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <label className="cursor-pointer text-xs font-medium text-primary hover:underline">
            <input
              type="file"
              accept="image/*"
              className="hidden"
              onChange={handleProfilePicChange}
              disabled={profilePicUploading}
            />
            {profilePicUploading ? "Uploading..." : "Change picture"}
          </label>
        </div>
      </Card>

      <Card className="border-primary/20 bg-primary/5 p-4">
        <p className="text-sm font-medium text-slate-700 dark:text-slate-200">
          Update how students see you as a mentor. Financial and wellness data remains hidden.
        </p>
      </Card>

      <div className="border-b border-slate-200 dark:border-slate-700">
        <nav className="flex flex-wrap gap-1" role="tablist" aria-label="Profile sections">
          {tabs.map(({ id, label }) => (
            <button
              key={id}
              type="button"
              role="tab"
              aria-selected={activeTab === id}
              onClick={() => setActiveTab(id)}
              className={`whitespace-nowrap border-b-2 px-3 py-2.5 text-sm font-medium transition-colors ${
                activeTab === id
                  ? "border-primary text-primary"
                  : "border-transparent text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-300"
              }`}
            >
              {label}
            </button>
          ))}
        </nav>
      </div>

      <AnimatePresence mode="wait">
        {activeTab === "profile" && (
          <motion.div
            key="profile"
            variants={tabVariants}
            initial="initial"
            animate="animate"
            exit="exit"
            transition={{ duration: 0.18, ease: "easeOut" }}
            className="space-y-4"
          >
            <Card className="space-y-4 p-5">
              <h3 className="text-lg font-semibold text-slate-900 dark:text-white">Personal details</h3>
              <div className="grid gap-3 sm:grid-cols-2">
                <div className="space-y-1">
                  <label className="text-sm font-medium text-slate-700 dark:text-slate-300">Full name</label>
                  <Input value={name} onChange={(event) => setName(event.target.value)} placeholder="Full name" />
                </div>
                <div className="space-y-1">
                  <label className="text-sm font-medium text-slate-700 dark:text-slate-300">Email</label>
                  <Input type="email" defaultValue={user?.email ?? ""} placeholder="Email" disabled />
                </div>
                <div className="space-y-1">
                  <label className="text-sm font-medium text-slate-700 dark:text-slate-300">Contact</label>
                  <Input
                    value={contact}
                    onChange={(event) => setContact(event.target.value)}
                    placeholder="Phone number"
                  />
                </div>
              </div>
              <Button variant="primary" onClick={savePersonal} disabled={personalSaving}>
                {personalSaving ? "Saving..." : "Save changes"}
              </Button>
            </Card>

            <Card className="space-y-4 p-5">
              <h3 className="text-lg font-semibold text-slate-900 dark:text-white">Mentor profile</h3>
              <p className="text-sm text-slate-600 dark:text-slate-300">
                Expertise, availability, and profile links that students can see.
              </p>
              <div className="grid gap-3 sm:grid-cols-2">
                <div className="space-y-1 sm:col-span-2">
                  <label className="text-sm font-medium text-slate-700 dark:text-slate-300">Expertise areas</label>
                  <Input
                    value={expertiseAreas}
                    onChange={(event) => setExpertiseAreas(event.target.value)}
                    placeholder="Software engineering, data science, product management"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-sm font-medium text-slate-700 dark:text-slate-300">Availability</label>
                  <Input
                    value={availability}
                    onChange={(event) => setAvailability(event.target.value)}
                    placeholder="Weekends, evenings, limited slots"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-sm font-medium text-slate-700 dark:text-slate-300">LinkedIn profile</label>
                  <Input
                    value={linkedIn}
                    onChange={(event) => setLinkedIn(event.target.value)}
                    placeholder="https://linkedin.com/in/..."
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-sm font-medium text-slate-700 dark:text-slate-300">
                    Notification mode
                  </label>
                  <select
                    className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 outline-none focus:border-primary dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100"
                    value={notificationMode}
                    onChange={(event) => setNotificationMode(event.target.value)}
                  >
                    <option value="email_in_app">Email + in-app</option>
                    <option value="email_only">Email only</option>
                    <option value="in_app_only">In-app only</option>
                  </select>
                </div>
              </div>
              <Button variant="primary" onClick={saveMentorProfile} disabled={mentorSaving}>
                {mentorSaving ? "Saving..." : "Update mentor profile"}
              </Button>
            </Card>
          </motion.div>
        )}

        {activeTab === "settings" && (
          <motion.div
            key="settings"
            variants={tabVariants}
            initial="initial"
            animate="animate"
            exit="exit"
            transition={{ duration: 0.18, ease: "easeOut" }}
            className="space-y-4"
          >
            <Card className="space-y-4 p-5">
              <h3 className="text-lg font-semibold text-slate-900 dark:text-white">Privacy preferences</h3>
              <p className="text-sm text-slate-600 dark:text-slate-300">
                Control what is shared with students and university coordinators.
              </p>
              <div className="space-y-2 text-sm">
                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    className="rounded"
                    checked={preferences.privacy.shareCareerInterestsWithMentors}
                    onChange={(event) =>
                      setPreferences((current) => ({
                        ...current,
                        privacy: {
                          ...current.privacy,
                          shareCareerInterestsWithMentors: event.target.checked
                        }
                      }))
                    }
                    disabled={preferencesLoading}
                  />
                  Share my career interests with mentorship coordinators
                </label>
                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    className="rounded"
                    checked={preferences.privacy.shareFinancialAidWithAdmins}
                    onChange={(event) =>
                      setPreferences((current) => ({
                        ...current,
                        privacy: {
                          ...current.privacy,
                          shareFinancialAidWithAdmins: event.target.checked
                        }
                      }))
                    }
                    disabled={preferencesLoading}
                  />
                  Share mentoring activity summary with admin teams
                </label>
              </div>
              <Button
                variant="secondary"
                onClick={() => savePreferences("Privacy settings saved.")}
                disabled={preferencesLoading || preferencesSaving}
              >
                {preferencesSaving ? "Saving..." : "Save privacy settings"}
              </Button>
            </Card>

            <Card className="space-y-4 p-5">
              <h3 className="text-lg font-semibold text-slate-900 dark:text-white">Notification settings</h3>
              <p className="text-sm text-slate-600 dark:text-slate-300">
                Choose how you receive updates about mentees and sessions.
              </p>
              <div className="space-y-2 text-sm">
                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    className="rounded"
                    checked={preferences.notifications.emailApplicationStatus}
                    onChange={(event) =>
                      setPreferences((current) => ({
                        ...current,
                        notifications: {
                          ...current.notifications,
                          emailApplicationStatus: event.target.checked
                        }
                      }))
                    }
                    disabled={preferencesLoading}
                  />
                  Email for mentorship status changes
                </label>
                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    className="rounded"
                    checked={preferences.notifications.mentorshipSessionReminders}
                    onChange={(event) =>
                      setPreferences((current) => ({
                        ...current,
                        notifications: {
                          ...current.notifications,
                          mentorshipSessionReminders: event.target.checked
                        }
                      }))
                    }
                    disabled={preferencesLoading}
                  />
                  Reminders for scheduled sessions
                </label>
                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    className="rounded"
                    checked={preferences.notifications.weeklyWellnessReminder}
                    onChange={(event) =>
                      setPreferences((current) => ({
                        ...current,
                        notifications: {
                          ...current.notifications,
                          weeklyWellnessReminder: event.target.checked
                        }
                      }))
                    }
                    disabled={preferencesLoading}
                  />
                  Weekly mentorship digest reminder
                </label>
              </div>
              <Button
                variant="secondary"
                onClick={() => savePreferences("Notification settings saved.")}
                disabled={preferencesLoading || preferencesSaving}
              >
                {preferencesSaving ? "Saving..." : "Save notification settings"}
              </Button>
              {preferences.updatedAt ? (
                <p className="text-xs text-slate-500">Last updated: {new Date(preferences.updatedAt).toLocaleString()}</p>
              ) : null}
            </Card>
          </motion.div>
        )}

        {activeTab === "security" && (
          <motion.div
            key="security"
            variants={tabVariants}
            initial="initial"
            animate="animate"
            exit="exit"
            transition={{ duration: 0.18, ease: "easeOut" }}
            className="space-y-4"
          >
            <Card className="space-y-3 p-5">
              <h3 className="text-lg font-semibold text-slate-900 dark:text-white">Password and sign-in</h3>
              <p className="text-sm text-slate-600 dark:text-slate-300">
                Send yourself a secure link to reset your password.
              </p>
              <div className="flex flex-wrap items-center gap-3 text-sm">
                <Input type="email" value={user?.email ?? ""} disabled className="max-w-xs" />
                <Button variant="secondary" onClick={handleSendResetEmail} disabled={!user?.email}>
                  Send reset link
                </Button>
              </div>
            </Card>

            <Card className="space-y-3 border-red-200 bg-red-50/60 p-5 dark:border-red-900 dark:bg-red-950/40">
              <h3 className="text-lg font-semibold text-red-800 dark:text-red-200">Delete account request</h3>
              <p className="text-sm text-red-800 dark:text-red-200">
                Submit a request and the university admin team will review it.
              </p>
              <textarea
                value={deleteReason}
                onChange={(event) => setDeleteReason(event.target.value)}
                placeholder="Optional reason for deletion request"
                className="min-h-[90px] w-full rounded-xl border border-red-200 bg-white px-3 py-2 text-sm text-slate-700 outline-none ring-0 focus:border-red-300 dark:border-red-700 dark:bg-slate-900 dark:text-slate-100"
                disabled={deletePending || deleteSubmitting}
              />
              <Button
                variant="secondary"
                className="border-red-400 text-red-800 hover:bg-red-100 dark:border-red-700 dark:text-red-200 dark:hover:bg-red-900/40"
                onClick={handleSubmitDeleteRequest}
                disabled={deletePending || deleteSubmitting}
              >
                {deletePending ? "Deletion request pending" : deleteSubmitting ? "Submitting..." : "Request account deletion"}
              </Button>
            </Card>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}


