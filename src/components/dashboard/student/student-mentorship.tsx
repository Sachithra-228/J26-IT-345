"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Card } from "@/components/shared/Card";
import { Badge } from "@/components/shared/Badge";
import { Button } from "@/components/shared/Button";
import { Input } from "@/components/shared/Input";
import { TextArea } from "@/components/shared/text-area";
import { studentBlueCardClass } from "@/components/dashboard/student/student-card-theme";
import { MentorMatch } from "@/components/c4/mentor-match";
import type { MentorshipSession } from "@/types";

type Mentor = {
  _id: string;
  name: string;
  profilePic?: string | null;
  expertise?: string;
  availability?: string;
};

type MentorshipTab = "requests" | "history" | "schedule" | "review" | "chat";

type MentorshipChatMessage = {
  _id?: string;
  sessionId: string;
  senderRole: "student" | "mentor" | "admin";
  text: string;
  createdAt?: string | Date;
};

function statusVariant(status?: string): "success" | "warning" | "info" {
  const normalized = String(status ?? "").trim().toLowerCase();
  if (normalized === "completed" || normalized === "confirmed" || normalized === "scheduled") return "success";
  if (normalized === "cancelled" || normalized === "rejected") return "warning";
  return "info";
}

function canChat(status?: string) {
  const normalized = String(status ?? "").trim().toLowerCase();
  return normalized === "confirmed" || normalized === "scheduled" || normalized === "completed";
}

function formatDate(value?: string | Date) {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return String(value);
  return date.toLocaleString();
}

export function StudentMentorship() {
  const [activeTab, setActiveTab] = useState<MentorshipTab>("requests");
  const [mentors, setMentors] = useState<Mentor[]>([]);
  const [sessions, setSessions] = useState<MentorshipSession[]>([]);
  const [loadingMentors, setLoadingMentors] = useState(true);
  const [loadingSessions, setLoadingSessions] = useState(true);

  const [selectedMentorForRequest, setSelectedMentorForRequest] = useState<Mentor | null>(null);
  const [requestTopic, setRequestTopic] = useState("");
  const [requestMessage, setRequestMessage] = useState("");
  const [sendingRequest, setSendingRequest] = useState(false);
  const [cancelingRequestId, setCancelingRequestId] = useState<string | null>(null);

  const [scheduleSessionId, setScheduleSessionId] = useState<string | null>(null);
  const [scheduleDate, setScheduleDate] = useState("");
  const [scheduleTime, setScheduleTime] = useState("");
  const [scheduleSubmitting, setScheduleSubmitting] = useState(false);

  const [reviewSessionId, setReviewSessionId] = useState<string | null>(null);
  const [reviewRating, setReviewRating] = useState(0);
  const [reviewText, setReviewText] = useState("");
  const [reviewSubmitting, setReviewSubmitting] = useState(false);

  const [selectedSessionId, setSelectedSessionId] = useState<string | null>(null);
  const [messages, setMessages] = useState<MentorshipChatMessage[]>([]);
  const [loadingMessages, setLoadingMessages] = useState(false);
  const [messageDraft, setMessageDraft] = useState("");
  const [sendingMessage, setSendingMessage] = useState(false);

  const [toast, setToast] = useState<string | null>(null);
  const showToast = useCallback((message: string) => {
    setToast(message);
    setTimeout(() => setToast(null), 3000);
  }, []);

  const fetchMentors = useCallback(() => {
    setLoadingMentors(true);
    fetch("/api/mentors")
      .then((response) => response.json())
      .then((data) => setMentors(Array.isArray(data) ? data : []))
      .catch(() => setMentors([]))
      .finally(() => setLoadingMentors(false));
  }, []);

  const fetchSessions = useCallback(() => {
    setLoadingSessions(true);
    fetch("/api/mentorship-sessions")
      .then((response) => response.json())
      .then((data) => setSessions(Array.isArray(data) ? data : []))
      .catch(() => setSessions([]))
      .finally(() => setLoadingSessions(false));
  }, []);

  const fetchMessages = useCallback(async (sessionId: string) => {
    setLoadingMessages(true);
    try {
      const response = await fetch(`/api/mentorship-messages?sessionId=${encodeURIComponent(sessionId)}`);
      const data = await response.json().catch(() => []);
      setMessages(Array.isArray(data) ? data : []);
    } catch {
      setMessages([]);
    } finally {
      setLoadingMessages(false);
    }
  }, []);

  useEffect(() => {
    fetchMentors();
    fetchSessions();
  }, [fetchMentors, fetchSessions]);

  useEffect(() => {
    const canPoll = () => document.visibilityState === "visible" && document.hasFocus();
    const pollSessions = () => {
      if (canPoll()) fetchSessions();
    };
    const intervalId = window.setInterval(pollSessions, 30000);
    window.addEventListener("focus", pollSessions);
    document.addEventListener("visibilitychange", pollSessions);
    return () => {
      window.clearInterval(intervalId);
      window.removeEventListener("focus", pollSessions);
      document.removeEventListener("visibilitychange", pollSessions);
    };
  }, [fetchSessions]);

  useEffect(() => {
    if (activeTab !== "chat" || !selectedSessionId) return;
    const canPoll = () => document.visibilityState === "visible" && document.hasFocus();
    const pollMessages = () => {
      if (canPoll()) fetchMessages(selectedSessionId);
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
  }, [activeTab, selectedSessionId, fetchMessages]);

  const sessionsByUpdated = useMemo(
    () => [...sessions].sort((a, b) => new Date(String(b.updatedAt ?? b.createdAt ?? "")).getTime() - new Date(String(a.updatedAt ?? a.createdAt ?? "")).getTime()),
    [sessions]
  );
  const selectedSession = useMemo(() => sessions.find((item) => item._id === selectedSessionId) ?? null, [sessions, selectedSessionId]);

  const pendingByMentor = useMemo(() => {
    const set = new Set<string>();
    sessions.forEach((item) => {
      if (String(item.status ?? "").toLowerCase() === "pending" && item.mentorId) set.add(item.mentorId);
    });
    return set;
  }, [sessions]);

  const pendingRequests = useMemo(() => sessionsByUpdated.filter((item) => String(item.status ?? "").toLowerCase() === "pending"), [sessionsByUpdated]);
  const mentorHistory = useMemo(() => sessionsByUpdated.filter((item) => String(item.status ?? "").toLowerCase() !== "pending"), [sessionsByUpdated]);
  const upcomingSessions = useMemo(() => sessionsByUpdated.filter((item) => {
    const s = String(item.status ?? "").toLowerCase();
    return (s === "confirmed" || s === "scheduled") && Boolean(item.scheduledTime);
  }), [sessionsByUpdated]);
  const sessionsToSchedule = useMemo(() => sessionsByUpdated.filter((item) => {
    const s = String(item.status ?? "").toLowerCase();
    return (s === "confirmed" || s === "scheduled") && !String(item.scheduledTime ?? "").trim();
  }), [sessionsByUpdated]);
  const sessionsToReview = useMemo(() => sessionsByUpdated.filter((item) => {
    const s = String(item.status ?? "").toLowerCase();
    return s === "completed" && typeof item.rating !== "number" && !String(item.review ?? "").trim();
  }), [sessionsByUpdated]);
  const reviewedSessions = useMemo(() => sessionsByUpdated.filter((item) => {
    const s = String(item.status ?? "").toLowerCase();
    return s === "completed" && (typeof item.rating === "number" || Boolean(String(item.review ?? "").trim()));
  }), [sessionsByUpdated]);

  useEffect(() => {
    if (activeTab === "chat" && !selectedSessionId && sessionsByUpdated.length) setSelectedSessionId(sessionsByUpdated[0]._id);
  }, [activeTab, selectedSessionId, sessionsByUpdated]);

  const submitMentorRequest = async () => {
    if (!selectedMentorForRequest || !requestTopic.trim()) {
      showToast("Please add a topic before sending the request.");
      return;
    }
    setSendingRequest(true);
    try {
      const response = await fetch("/api/mentorship-sessions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ mentorId: selectedMentorForRequest._id, topic: requestTopic.trim(), message: requestMessage.trim() || undefined })
      });
      const payload = await response.json().catch(() => ({} as { message?: string }));
      if (!response.ok) return showToast(payload.message ?? "Unable to send request.");
      setSelectedMentorForRequest(null);
      setRequestTopic("");
      setRequestMessage("");
      showToast("Mentorship request sent.");
      fetchSessions();
    } catch {
      showToast("Unable to send request.");
    } finally {
      setSendingRequest(false);
    }
  };

  const cancelRequest = async (sessionId: string) => {
    setCancelingRequestId(sessionId);
    try {
      const response = await fetch(`/api/mentorship-sessions/${sessionId}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ status: "cancelled" }) });
      const payload = await response.json().catch(() => ({} as { message?: string }));
      if (!response.ok) return showToast(payload.message ?? "Unable to cancel request.");
      showToast("Request cancelled.");
      fetchSessions();
    } catch {
      showToast("Unable to cancel request.");
    } finally {
      setCancelingRequestId(null);
    }
  };

  const submitSchedule = async () => {
    if (!scheduleSessionId || !scheduleDate || !scheduleTime) return showToast("Select date and time first.");
    setScheduleSubmitting(true);
    try {
      const response = await fetch(`/api/mentorship-sessions/${scheduleSessionId}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ status: "scheduled", scheduledTime: `${scheduleDate}T${scheduleTime}:00` }) });
      const payload = await response.json().catch(() => ({} as { message?: string }));
      if (!response.ok) return showToast(payload.message ?? "Unable to schedule session.");
      showToast("Session scheduled.");
      setScheduleSessionId(null);
      setScheduleDate("");
      setScheduleTime("");
      fetchSessions();
    } catch {
      showToast("Unable to schedule session.");
    } finally {
      setScheduleSubmitting(false);
    }
  };

  const submitReview = async () => {
    if (!reviewSessionId || reviewRating < 1 || reviewRating > 5) return showToast("Please select a rating.");
    setReviewSubmitting(true);
    try {
      const response = await fetch(`/api/mentorship-sessions/${reviewSessionId}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ rating: reviewRating, review: reviewText.trim() || undefined }) });
      const payload = await response.json().catch(() => ({} as { message?: string }));
      if (!response.ok) return showToast(payload.message ?? "Unable to submit review.");
      showToast("Review submitted.");
      setReviewSessionId(null);
      setReviewRating(0);
      setReviewText("");
      fetchSessions();
    } catch {
      showToast("Unable to submit review.");
    } finally {
      setReviewSubmitting(false);
    }
  };

  const sendChatMessage = async () => {
    if (!selectedSession || !messageDraft.trim()) return;
    setSendingMessage(true);
    try {
      const response = await fetch("/api/mentorship-messages", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ sessionId: selectedSession._id, text: messageDraft.trim() }) });
      const payload = await response.json().catch(() => ({} as { message?: string }));
      if (!response.ok) return showToast(payload.message ?? "Unable to send message.");
      setMessageDraft("");
      fetchMessages(selectedSession._id);
      fetchSessions();
    } catch {
      showToast("Unable to send message.");
    } finally {
      setSendingMessage(false);
    }
  };

  const tabs: Array<{ id: MentorshipTab; label: string }> = [
    { id: "requests", label: "Send mentorship requests" },
    { id: "history", label: "My mentors & session history" },
    { id: "schedule", label: "Schedule sessions" },
    { id: "review", label: "Rate & review" },
    { id: "chat", label: "Chat with mentor" }
  ];
  const sectionCardClass = studentBlueCardClass;

  return (
    <div className="space-y-6">
      <MentorMatch />

      <div className="border-b border-slate-200 dark:border-slate-700"><nav className="flex flex-wrap gap-1" role="tablist" aria-label="Mentorship sections">{tabs.map((tab) => (<button key={tab.id} type="button" role="tab" aria-selected={activeTab === tab.id} onClick={() => setActiveTab(tab.id)} className={`whitespace-nowrap border-b-2 px-3 py-2.5 text-sm font-medium transition-colors ${activeTab === tab.id ? "border-primary text-primary" : "border-transparent text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-300"}`}>{tab.label}</button>))}</nav></div>

      {activeTab === "requests" && <Card className={`p-5 ${sectionCardClass}`}><h3 className="text-lg font-semibold text-slate-900 dark:text-white">Available mentors</h3><div className="mt-4 space-y-3">{loadingMentors ? <p className="text-sm text-slate-500">Loading mentors...</p> : mentors.length === 0 ? <p className="text-sm text-slate-500">No mentors available right now.</p> : mentors.map((mentor) => { const initials = mentor.name.split(/\s+/).filter(Boolean).map((n) => n[0]).join("").slice(0, 2).toUpperCase(); const hasPendingRequest = pendingByMentor.has(mentor._id); return <div key={mentor._id} className="flex items-start justify-between gap-3 rounded-xl border border-slate-200 p-3 dark:border-slate-700"><div className="flex min-w-0 items-start gap-3"><div className="flex h-12 w-12 shrink-0 items-center justify-center overflow-hidden rounded-lg border border-slate-200 bg-slate-100 text-sm font-semibold text-primary dark:border-slate-600 dark:bg-slate-800">{mentor.profilePic ? <img src={mentor.profilePic} alt="" className="h-full w-full object-cover" /> : initials}</div><div className="min-w-0"><p className="truncate font-semibold text-slate-900 dark:text-white">{mentor.name}</p><p className="truncate text-sm text-slate-500">{mentor.expertise ?? "Career guidance"}</p><p className="truncate text-xs text-slate-500">Availability: {mentor.availability ?? "By request"}</p></div></div><Button variant={hasPendingRequest ? "ghost" : "primary"} className="shrink-0 px-3 py-1 text-xs" disabled={hasPendingRequest} onClick={() => setSelectedMentorForRequest(mentor)}>{hasPendingRequest ? "Request sent" : "Send request"}</Button></div>; })}</div><div className="mt-6 border-t border-slate-200 pt-4 dark:border-slate-700"><h4 className="text-sm font-semibold text-slate-900 dark:text-white">Pending requests</h4><div className="mt-2 space-y-2">{loadingSessions ? <p className="text-sm text-slate-500">Loading requests...</p> : pendingRequests.length === 0 ? <p className="text-sm text-slate-500">No pending requests.</p> : pendingRequests.map((item) => <div key={item._id} className="flex items-center justify-between rounded-lg border border-slate-200 p-3 dark:border-slate-700"><div><p className="font-medium text-slate-900 dark:text-white">{item.topic}</p><p className="text-xs text-slate-500">Mentor: {item.mentorName || "Mentor"}</p></div><Button variant="ghost" className="px-3 py-1 text-xs" disabled={cancelingRequestId === item._id} onClick={() => cancelRequest(item._id)}>{cancelingRequestId === item._id ? "Canceling..." : "Cancel"}</Button></div>)}</div></div></Card>}

      {activeTab === "history" && <Card className={`p-5 ${sectionCardClass}`}><h3 className="text-lg font-semibold text-slate-900 dark:text-white">My mentors & session history</h3>{loadingSessions ? <p className="mt-4 text-sm text-slate-500">Loading history...</p> : mentorHistory.length === 0 ? <p className="mt-4 text-sm text-slate-500">No mentor history yet.</p> : <div className="mt-4 space-y-3">{mentorHistory.map((item) => <div key={item._id} className="rounded-xl border border-slate-200 p-3 dark:border-slate-700"><div className="flex items-center justify-between gap-2"><p className="font-semibold text-slate-900 dark:text-white">{item.mentorName || "Mentor"}</p><Badge variant={statusVariant(item.status)}>{item.status || "pending"}</Badge></div><p className="mt-1 text-sm text-slate-600 dark:text-slate-300">Topic: {item.topic}</p>{item.scheduledTime ? <p className="mt-1 text-xs text-slate-500">Session time: {formatDate(item.scheduledTime)}</p> : null}{typeof item.rating === "number" ? <p className="mt-1 text-xs text-slate-500">Your rating: {item.rating}/5</p> : null}{item.review ? <p className="mt-1 text-xs text-slate-500">Your review: {item.review}</p> : null}</div>)}</div>}</Card>}

      {activeTab === "schedule" && <Card className={`p-5 ${sectionCardClass}`}><h3 className="text-lg font-semibold text-slate-900 dark:text-white">Schedule sessions</h3><div className="mt-4 space-y-4"><div><h4 className="text-sm font-semibold text-slate-900 dark:text-white">Upcoming scheduled sessions</h4><div className="mt-2 space-y-2">{loadingSessions ? <p className="text-sm text-slate-500">Loading...</p> : upcomingSessions.length === 0 ? <p className="text-sm text-slate-500">No upcoming sessions.</p> : upcomingSessions.map((item) => <div key={item._id} className="rounded-lg border border-slate-200 p-3 dark:border-slate-700"><p className="font-medium text-slate-900 dark:text-white">{item.topic}</p><p className="text-xs text-slate-500">Mentor: {item.mentorName || "Mentor"}</p><p className="text-xs text-slate-500">Time: {formatDate(item.scheduledTime)}</p></div>)}</div></div><div className="border-t border-slate-200 pt-4 dark:border-slate-700"><h4 className="text-sm font-semibold text-slate-900 dark:text-white">Sessions waiting for schedule</h4><div className="mt-2 space-y-3">{loadingSessions ? <p className="text-sm text-slate-500">Loading...</p> : sessionsToSchedule.length === 0 ? <p className="text-sm text-slate-500">No sessions waiting for schedule.</p> : sessionsToSchedule.map((item) => <div key={item._id} className="rounded-lg border border-slate-200 p-3 dark:border-slate-700"><p className="font-medium text-slate-900 dark:text-white">{item.topic}</p><p className="text-xs text-slate-500">Mentor: {item.mentorName || "Mentor"}</p>{scheduleSessionId === item._id ? <div className="mt-3 grid gap-2 sm:grid-cols-3"><Input type="date" value={scheduleDate} onChange={(event) => setScheduleDate(event.target.value)} /><Input type="time" value={scheduleTime} onChange={(event) => setScheduleTime(event.target.value)} /><div className="flex gap-2 sm:justify-end"><Button variant="primary" disabled={scheduleSubmitting} onClick={submitSchedule}>{scheduleSubmitting ? "Saving..." : "Save"}</Button><Button variant="ghost" onClick={() => { setScheduleSessionId(null); setScheduleDate(""); setScheduleTime(""); }}>Cancel</Button></div></div> : <Button variant="secondary" className="mt-3" onClick={() => { setScheduleSessionId(item._id); setScheduleDate(""); setScheduleTime(""); }}>Set date & time</Button>}</div>)}</div></div></div></Card>}

      {activeTab === "review" && <Card className={`p-5 ${sectionCardClass}`}><h3 className="text-lg font-semibold text-slate-900 dark:text-white">Rate & review</h3><div className="mt-4 space-y-4"><div><h4 className="text-sm font-semibold text-slate-900 dark:text-white">Pending reviews</h4><div className="mt-2 space-y-3">{loadingSessions ? <p className="text-sm text-slate-500">Loading...</p> : sessionsToReview.length === 0 ? <p className="text-sm text-slate-500">No pending reviews.</p> : sessionsToReview.map((item) => <div key={item._id} className="rounded-lg border border-slate-200 p-3 dark:border-slate-700"><p className="font-medium text-slate-900 dark:text-white">{item.topic}</p><p className="text-xs text-slate-500">Mentor: {item.mentorName || "Mentor"}</p>{reviewSessionId === item._id ? <div className="mt-3 space-y-3"><div className="flex gap-1">{[1, 2, 3, 4, 5].map((star) => <button key={star} type="button" onClick={() => setReviewRating(star)} className={`rounded px-1 text-lg ${reviewRating >= star ? "text-amber-500" : "text-slate-300 dark:text-slate-600"}`} aria-label={`${star} stars`}>*</button>)}</div><TextArea rows={3} value={reviewText} onChange={(event) => setReviewText(event.target.value)} placeholder="Write your feedback (optional)" /><div className="flex gap-2"><Button variant="primary" disabled={reviewSubmitting || reviewRating < 1} onClick={submitReview}>{reviewSubmitting ? "Submitting..." : "Submit review"}</Button><Button variant="ghost" onClick={() => { setReviewSessionId(null); setReviewRating(0); setReviewText(""); }}>Cancel</Button></div></div> : <Button variant="secondary" className="mt-3" onClick={() => { setReviewSessionId(item._id); setReviewRating(0); setReviewText(""); }}>Rate now</Button>}</div>)}</div></div><div className="border-t border-slate-200 pt-4 dark:border-slate-700"><h4 className="text-sm font-semibold text-slate-900 dark:text-white">Submitted reviews</h4><div className="mt-2 space-y-2">{!loadingSessions && reviewedSessions.length === 0 ? <p className="text-sm text-slate-500">No submitted reviews yet.</p> : null}{!loadingSessions && reviewedSessions.map((item) => <div key={item._id} className="rounded-lg border border-slate-200 p-3 dark:border-slate-700"><p className="font-medium text-slate-900 dark:text-white">{item.topic}</p><p className="text-xs text-slate-500">Mentor: {item.mentorName || "Mentor"}</p>{typeof item.rating === "number" ? <p className="text-xs text-slate-500">Rating: {item.rating}/5</p> : null}{item.review ? <p className="text-xs text-slate-500">Review: {item.review}</p> : null}</div>)}</div></div></div></Card>}

      {activeTab === "chat" && <Card className={`p-5 ${sectionCardClass}`}><h3 className="text-lg font-semibold text-slate-900 dark:text-white">Chat with mentor</h3>{loadingSessions ? <p className="mt-4 text-sm text-slate-500">Loading chats...</p> : sessionsByUpdated.length === 0 ? <p className="mt-4 text-sm text-slate-500">No mentorship sessions yet.</p> : <div className="mt-4 grid gap-4 lg:grid-cols-[320px_1fr]"><div className="space-y-2">{sessionsByUpdated.map((item) => <button key={item._id} type="button" onClick={() => setSelectedSessionId(item._id)} className={`w-full rounded-xl border p-3 text-left transition-colors ${selectedSessionId === item._id ? "border-primary bg-primary/5 dark:bg-primary/10" : "border-slate-200 hover:border-slate-300 dark:border-slate-700"}`}><div className="flex items-center justify-between gap-2"><p className="truncate text-sm font-semibold text-slate-900 dark:text-white">{item.mentorName || "Mentor"}</p><Badge variant={statusVariant(item.status)}>{item.status || "pending"}</Badge></div><p className="mt-1 line-clamp-1 text-xs text-slate-500">{item.topic}</p>{item.updatedAt ? <p className="mt-1 text-[11px] text-slate-400">Updated: {formatDate(item.updatedAt)}</p> : null}</button>)}</div><div className="rounded-xl border border-slate-200 p-4 dark:border-slate-700">{!selectedSession ? <p className="text-sm text-slate-500">Select a mentor conversation from the left.</p> : <><div className="mb-3 border-b border-slate-200 pb-3 dark:border-slate-700"><div className="flex items-center justify-between gap-2"><p className="font-semibold text-slate-900 dark:text-white">{selectedSession.mentorName || "Mentor"}</p><Badge variant={statusVariant(selectedSession.status)}>{selectedSession.status || "pending"}</Badge></div><p className="mt-1 text-sm text-slate-500">Topic: {selectedSession.topic}</p></div>{!canChat(selectedSession.status) ? <p className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-700 dark:border-amber-900/40 dark:bg-amber-900/20 dark:text-amber-300">Chat will be enabled once the mentor approves your request.</p> : <><div className="max-h-[360px] space-y-2 overflow-auto rounded-lg border border-slate-200 bg-slate-50 p-3 dark:border-slate-700 dark:bg-slate-900/40">{loadingMessages ? <p className="text-sm text-slate-500">Loading messages...</p> : messages.length === 0 ? <p className="text-sm text-slate-500">No messages yet. Start the conversation.</p> : messages.map((msg) => { const mine = msg.senderRole === "student"; return <div key={msg._id} className={`flex ${mine ? "justify-end" : "justify-start"}`}><div className={`max-w-[85%] rounded-lg px-3 py-2 text-sm ${mine ? "bg-primary text-white" : "bg-white text-slate-700 dark:bg-slate-800 dark:text-slate-200"}`}><p>{msg.text}</p><p className={`mt-1 text-[11px] ${mine ? "text-white/80" : "text-slate-400"}`}>{formatDate(msg.createdAt)}</p></div></div>; })}</div><div className="mt-3 space-y-2"><TextArea rows={3} value={messageDraft} onChange={(event) => setMessageDraft(event.target.value)} placeholder="Write your message..." /><div className="flex justify-end"><Button variant="primary" onClick={sendChatMessage} disabled={sendingMessage || !messageDraft.trim()}>{sendingMessage ? "Sending..." : "Send"}</Button></div></div></>}</>}</div></div>}</Card>}
      {selectedMentorForRequest && <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" role="dialog" aria-modal="true" aria-labelledby="request-modal-title" onClick={() => { setSelectedMentorForRequest(null); setRequestTopic(""); setRequestMessage(""); }}><div className="w-full max-w-md rounded-xl border border-slate-200 bg-white p-5 shadow-xl dark:border-slate-700 dark:bg-slate-900" onClick={(event) => event.stopPropagation()}><h2 id="request-modal-title" className="text-lg font-semibold text-slate-900 dark:text-white">Send request to {selectedMentorForRequest.name}</h2><p className="mt-0.5 text-sm text-slate-500 dark:text-slate-400">{selectedMentorForRequest.expertise ?? "Career guidance"}</p><div className="mt-4 space-y-3"><div><label htmlFor="request-topic" className="mb-1 block text-sm font-medium text-slate-700 dark:text-slate-300">Topic</label><Input id="request-topic" placeholder="Topic (e.g. Career planning)" value={requestTopic} onChange={(event) => setRequestTopic(event.target.value)} /></div><div><label htmlFor="request-message" className="mb-1 block text-sm font-medium text-slate-700 dark:text-slate-300">Message (optional)</label><TextArea id="request-message" placeholder="Anything you want your mentor to know" value={requestMessage} onChange={(event) => setRequestMessage(event.target.value)} rows={3} /></div><div className="flex gap-2 pt-1"><Button variant="primary" disabled={sendingRequest || !requestTopic.trim()} onClick={submitMentorRequest}>{sendingRequest ? "Sending..." : "Send request"}</Button><Button variant="ghost" onClick={() => { setSelectedMentorForRequest(null); setRequestTopic(""); setRequestMessage(""); }}>Cancel</Button></div></div></div></div>}

      {toast && <div className="fixed bottom-4 left-1/2 z-50 -translate-x-1/2 rounded-lg bg-slate-800 px-4 py-2 text-sm text-white shadow-lg dark:bg-slate-700">{toast}</div>}
    </div>
  );
}




