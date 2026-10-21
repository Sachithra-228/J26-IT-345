"use client";

import { useCallback, useEffect, useState } from "react";
import { NotebookPen, Pencil, Trash2, Users } from "lucide-react";
import { Card } from "@/components/shared/Card";
import { Button } from "@/components/shared/Button";
import { Input } from "@/components/shared/Input";
import { TextArea } from "@/components/shared/text-area";
import { useAuth } from "@/context/auth-context";
import { demoIdentityHeaders } from "@/lib/mentorship-session";
import type { MenteeSummary } from "@/lib/mentor-mentees";

type MenteeNote = {
  _id: string;
  studentId: string;
  studentName?: string;
  topic?: string;
  note: string;
  priority: "low" | "medium" | "high";
  createdAt?: string;
  updatedAt?: string;
};

type NoteFormState = {
  studentId: string;
  studentName: string;
  topic: string;
  note: string;
  priority: "low" | "medium" | "high";
};

const initialForm: NoteFormState = {
  studentId: "",
  studentName: "",
  topic: "",
  note: "",
  priority: "medium"
};

function formatDate(value?: string) {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleString();
}

export function MentorMyMenteesCrudSection() {
  const { user } = useAuth();
  const demoHeaders = demoIdentityHeaders(user?._id);
  const [mentees, setMentees] = useState<MenteeSummary[]>([]);
  const [noteMentees, setNoteMentees] = useState<MenteeSummary[]>([]);
  const [notes, setNotes] = useState<MenteeNote[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingNotes, setLoadingNotes] = useState(true);
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<NoteFormState>(initialForm);
  const [feedback, setFeedback] = useState<{ type: "ok" | "err"; text: string } | null>(null);

  const loadMentees = useCallback(async () => {
    setLoading(true);
    try {
      const response = await fetch("/api/mentor/mentees?includeHistory=true", { cache: "no-store", headers: demoHeaders });
      const payload = (await response.json().catch(() => ({}))) as { items?: MenteeSummary[]; activeItems?: MenteeSummary[] };
      setMentees(response.ok && Array.isArray(payload.activeItems) ? payload.activeItems : []);
      setNoteMentees(response.ok && Array.isArray(payload.items) ? payload.items : []);
    } catch {
      setMentees([]);
      setNoteMentees([]);
    } finally {
      setLoading(false);
    }
  }, [user?._id]);

  const loadNotes = useCallback(async () => {
    setLoadingNotes(true);
    try {
      const response = await fetch("/api/mentor/mentee-notes", { cache: "no-store", headers: demoHeaders });
      const payload = (await response.json().catch(() => ({}))) as { items?: MenteeNote[]; message?: string };
      if (!response.ok) {
        setFeedback({ type: "err", text: payload.message ?? "Unable to load mentee notes." });
        setNotes([]);
        return;
      }
      setNotes(Array.isArray(payload.items) ? payload.items : []);
    } catch {
      setFeedback({ type: "err", text: "Unable to load mentee notes." });
      setNotes([]);
    } finally {
      setLoadingNotes(false);
    }
  }, [user?._id]);

  useEffect(() => {
    loadMentees();
    loadNotes();
  }, [loadMentees, loadNotes]);

  const resetForm = () => {
    setForm(initialForm);
    setEditingId(null);
  };

  const onSave = async () => {
    if (!form.studentId || !form.note.trim()) {
      setFeedback({ type: "err", text: "Select a mentee and write a note." });
      return;
    }
    setSaving(true);
    setFeedback(null);
    try {
      const response = await fetch(editingId ? `/api/mentor/mentee-notes/${editingId}` : "/api/mentor/mentee-notes", {
        method: editingId ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json", ...demoHeaders },
        body: JSON.stringify(form)
      });
      const payload = (await response.json().catch(() => ({}))) as { message?: string };
      if (!response.ok) {
        setFeedback({ type: "err", text: payload.message ?? "Unable to save note." });
        return;
      }
      setFeedback({ type: "ok", text: editingId ? "Note updated." : "Note added." });
      resetForm();
      await loadNotes();
    } catch {
      setFeedback({ type: "err", text: "Unable to save note." });
    } finally {
      setSaving(false);
    }
  };

  const onDelete = async (id: string) => {
    setDeletingId(id);
    setFeedback(null);
    try {
      const response = await fetch(`/api/mentor/mentee-notes/${id}`, { method: "DELETE", headers: demoHeaders });
      const payload = (await response.json().catch(() => ({}))) as { message?: string };
      if (!response.ok) {
        setFeedback({ type: "err", text: payload.message ?? "Unable to delete note." });
        return;
      }
      setFeedback({ type: "ok", text: "Note deleted." });
      if (editingId === id) resetForm();
      await loadNotes();
    } catch {
      setFeedback({ type: "err", text: "Unable to delete note." });
    } finally {
      setDeletingId(null);
    }
  };

  const onEdit = (item: MenteeNote) => {
    setEditingId(item._id);
    setForm({
      studentId: item.studentId,
      studentName: item.studentName || "",
      topic: item.topic || "",
      note: item.note,
      priority: item.priority || "medium"
    });
  };

  const onSelectMentee = (studentId: string) => {
    const selected = noteMentees.find((mentee) => mentee.studentId === studentId);
    setForm((prev) => ({
      ...prev,
      studentId,
      studentName: selected?.name ?? prev.studentName
    }));
  };

  return (
    <div className="space-y-6">
      <Card className="border-primary/20 bg-gradient-to-r from-blue-100/70 via-white to-violet-100/60 p-5 dark:from-blue-950/20 dark:via-slate-900 dark:to-violet-950/20">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="space-y-1">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-primary">My Mentees</p>
            <h3 className="text-xl font-semibold text-slate-900 dark:text-white">Mentee relationships and notes</h3>
            <p className="text-sm text-slate-600 dark:text-slate-300">
              Track active mentees and keep structured private notes for follow-up actions.
            </p>
          </div>
          <div className="inline-flex items-center gap-2 rounded-full border border-primary/20 bg-white/70 px-3 py-1 text-xs font-medium text-primary dark:bg-slate-900/60">
            <Users className="h-4 w-4" />
            {mentees.length} mentees
          </div>
        </div>
      </Card>

      <div className="grid gap-4 md:grid-cols-3">
        {(loading ? [] : mentees).map((mentee) => (
          <Card key={mentee.studentId} className="rounded-2xl border border-slate-200 bg-slate-50/70 p-4 dark:border-slate-700 dark:bg-slate-800/30">
            <p className="font-semibold text-slate-900 dark:text-white">{mentee.name}</p>
            <p className="text-xs text-slate-500">Sessions: {mentee.activeSessions}</p>
            {mentee.lastTopic ? <p className="mt-2 text-sm text-slate-600 dark:text-slate-300">Last topic: {mentee.lastTopic}</p> : null}
          </Card>
        ))}
        {loading ? <p className="text-sm text-slate-500">Loading mentees...</p> : null}
        {!loading && !mentees.length ? (
          <p className="text-sm text-slate-500">No mentees yet. Accepted mentorship sessions will appear here.</p>
        ) : null}
      </div>

      {feedback ? (
        <p
          className={`rounded-xl border px-4 py-2 text-sm ${
            feedback.type === "ok"
              ? "border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-900/40 dark:bg-emerald-950/20 dark:text-emerald-300"
              : "border-rose-200 bg-rose-50 text-rose-700 dark:border-rose-900/40 dark:bg-rose-950/20 dark:text-rose-300"
          }`}
        >
          {feedback.text}
        </p>
      ) : null}

      <Card className="space-y-4 p-5">
        <div className="flex items-center gap-2">
          <NotebookPen className="h-4 w-4 text-primary" />
          <h4 className="text-base font-semibold text-slate-900 dark:text-white">
            {editingId ? "Edit mentee note" : "Add mentee note"}
          </h4>
        </div>
        <div className="grid gap-3 md:grid-cols-2">
          <select
            value={form.studentId}
            onChange={(event) => onSelectMentee(event.target.value)}
            className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 outline-none focus:border-primary dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100"
          >
            <option value="">Select mentee</option>
            {noteMentees.map((mentee) => (
              <option key={mentee.studentId} value={mentee.studentId}>
                {mentee.name}
              </option>
            ))}
          </select>
          <Input
            value={form.topic}
            onChange={(event) => setForm((prev) => ({ ...prev, topic: event.target.value }))}
            placeholder="Topic (optional)"
          />
          <select
            value={form.priority}
            onChange={(event) => setForm((prev) => ({ ...prev, priority: event.target.value as NoteFormState["priority"] }))}
            className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 outline-none focus:border-primary dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100 md:col-span-2"
          >
            <option value="low">Low priority</option>
            <option value="medium">Medium priority</option>
            <option value="high">High priority</option>
          </select>
          <div className="md:col-span-2">
            <TextArea
              rows={4}
              value={form.note}
              onChange={(event) => setForm((prev) => ({ ...prev, note: event.target.value }))}
              placeholder="Add observations, follow-up plan, and resources..."
            />
          </div>
        </div>
        <div className="flex flex-wrap justify-end gap-2">
          {editingId ? (
            <Button variant="ghost" onClick={resetForm} disabled={saving}>
              Cancel edit
            </Button>
          ) : null}
          <Button variant="primary" onClick={onSave} disabled={saving}>
            {saving ? "Saving..." : editingId ? "Update note" : "Add note"}
          </Button>
        </div>
      </Card>

      <Card className="space-y-4 p-5">
        <h4 className="text-base font-semibold text-slate-900 dark:text-white">Mentee notes</h4>
        {loadingNotes ? (
          <p className="text-sm text-slate-500">Loading notes...</p>
        ) : !notes.length ? (
          <p className="text-sm text-slate-500">No notes yet.</p>
        ) : (
          <div className="space-y-3">
            {notes.map((item) => (
              <article
                key={item._id}
                className="rounded-2xl border border-slate-200 bg-slate-50/70 p-4 dark:border-slate-700 dark:bg-slate-800/30"
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="font-semibold text-slate-900 dark:text-white">{item.studentName || "Student"}</p>
                    <p className="text-xs text-slate-500">
                      {item.topic || "General note"} · <span className="capitalize">{item.priority}</span> priority
                    </p>
                  </div>
                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      onClick={() => onEdit(item)}
                      className="rounded-lg p-2 text-slate-500 hover:bg-white hover:text-primary dark:hover:bg-slate-900"
                      title="Edit note"
                    >
                      <Pencil className="h-4 w-4" />
                    </button>
                    <button
                      type="button"
                      onClick={() => onDelete(item._id)}
                      disabled={deletingId === item._id}
                      className="rounded-lg p-2 text-slate-500 hover:bg-white hover:text-rose-500 disabled:opacity-60 dark:hover:bg-slate-900"
                      title="Delete note"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </div>
                <p className="mt-3 whitespace-pre-wrap text-sm text-slate-700 dark:text-slate-200">{item.note}</p>
                <p className="mt-3 text-[11px] text-slate-500">{formatDate(item.updatedAt || item.createdAt)}</p>
              </article>
            ))}
          </div>
        )}
      </Card>
    </div>
  );
}
