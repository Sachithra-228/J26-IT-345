"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Card } from "@/components/shared/Card";
import { Badge } from "@/components/shared/Badge";
import { Button } from "@/components/shared/Button";
import { Input } from "@/components/shared/Input";
import { Select } from "@/components/shared/Select";
import { TextArea } from "@/components/shared/text-area";
import { studentBlueCardClass } from "@/components/dashboard/student/student-card-theme";
import Link from "next/link";
import {
  EMPTY_PREFERENCES,
  matchProviders,
  type Provider,
  type SupportPreferences,
} from "@/lib/c2/support";
import type { Concern } from "@/lib/c2/assessment";

type Counselor = Provider;

type Booking = {
  _id: string;
  counselorId: string;
  counselorName?: string;
  preferredDate: string;
  preferredTime: string;
  note?: string;
  status: "pending" | "confirmed" | "completed" | "cancelled";
  createdAt?: string;
};

export function CounselorBooking({ topics = [] }: { topics?: Concern[] }) {
  const [counselors, setCounselors] = useState<Counselor[]>([]);
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [selectedCounselorId, setSelectedCounselorId] = useState("");
  const [preferredDate, setPreferredDate] = useState("");
  const [preferredTime, setPreferredTime] = useState("");
  const [note, setNote] = useState("");
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [preferences, setPreferences] =
    useState<SupportPreferences>(EMPTY_PREFERENCES);
  const [directoryError, setDirectoryError] = useState<string | null>(null);
  const [needsSignIn, setNeedsSignIn] = useState(false);
  const matched = matchProviders(counselors, topics, preferences);

  const refreshData = useCallback(() => {
    setLoading(true);
    setDirectoryError(null);
    Promise.all([
      fetch("/api/wellness-counselors").then(async (response) => {
        setNeedsSignIn(response.status === 401 || response.status === 403);
        if (!response.ok) throw new Error("Directory unavailable");
        return response.json();
      }),
      fetch("/api/counselor-bookings").then((response) =>
        response.ok ? response.json() : [],
      ),
    ])
      .then(([counselorData, bookingData]) => {
        setCounselors(Array.isArray(counselorData) ? counselorData : []);
        setBookings(Array.isArray(bookingData) ? bookingData : []);
      })
      .catch(() => {
        setCounselors([]);
        setBookings([]);
        setDirectoryError(
          "The counselor directory could not be loaded. Sign in if needed, or retry.",
        );
      })
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    refreshData();
  }, [refreshData]);

  useEffect(() => {
    const canPoll = () =>
      document.visibilityState === "visible" && document.hasFocus();
    const poll = () => {
      if (canPoll()) refreshData();
    };
    const intervalId = window.setInterval(poll, 30000);
    window.addEventListener("focus", poll);
    document.addEventListener("visibilitychange", poll);
    return () => {
      window.clearInterval(intervalId);
      window.removeEventListener("focus", poll);
      document.removeEventListener("visibilitychange", poll);
    };
  }, [refreshData]);

  const selectedCounselor = useMemo(
    () => counselors.find((item) => item._id === selectedCounselorId),
    [counselors, selectedCounselorId],
  );

  const submitBooking = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);
    setMessage(null);
    if (!selectedCounselorId || !preferredDate || !preferredTime) {
      setError("Please choose counselor, date and time.");
      return;
    }
    if (preferredDate < new Date().toLocaleDateString("en-CA")) {
      setError("Please choose today or a future date.");
      return;
    }
    setSubmitting(true);
    try {
      const response = await fetch("/api/counselor-bookings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          counselorId: selectedCounselorId,
          preferredDate,
          preferredTime,
          note: note.trim() || undefined,
        }),
      });
      const body = await response
        .json()
        .catch(() => ({}) as { message?: string });
      if (!response.ok) {
        setError(body.message ?? "Unable to submit booking.");
        return;
      }
      setMessage("Booking request submitted successfully.");
      setSelectedCounselorId("");
      setPreferredDate("");
      setPreferredTime("");
      setNote("");
      refreshData();
    } catch {
      setError("Unable to submit booking.");
    } finally {
      setSubmitting(false);
    }
  };

  const cancelBooking = async (bookingId: string) => {
    setError(null);
    setMessage(null);
    try {
      const response = await fetch(`/api/counselor-bookings/${bookingId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "cancelled" }),
      });
      const body = await response
        .json()
        .catch(() => ({}) as { message?: string });
      if (!response.ok) {
        setError(body.message ?? "Unable to cancel booking.");
        return;
      }
      setMessage("Booking cancelled.");
      refreshData();
    } catch {
      setError("Unable to cancel booking.");
    }
  };

  return (
    <div className="space-y-4">
      <Card className={`space-y-4 p-4 ${studentBlueCardClass}`}>
        <h3 className="text-lg font-semibold">Find a professional</h3>
        <p className="text-sm leading-6 text-slate-600 dark:text-slate-300">
          Choose the preferences that matter to you. Suggestions use listed
          expertise and the topics from your check-in; they are not a clinical
          assignment. Your answers are not sent to this directory.
        </p>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <label className="space-y-2 text-sm">
            Gender preference
            <Select
              aria-label="Gender preference"
              value={preferences.gender}
              onChange={(event) => {
                setSelectedCounselorId("");
                setPreferences((previous) => ({
                  ...previous,
                  gender: event.target.value,
                }));
              }}
            >
              <option value="any">No preference</option>
              <option value="male">Male</option>
              <option value="female">Female</option>
              <option value="other">Another gender</option>
            </Select>
          </label>
          <label className="space-y-2 text-sm">
            Language
            <Select
              aria-label="Preferred language"
              value={preferences.language}
              onChange={(event) => {
                setSelectedCounselorId("");
                setPreferences((previous) => ({
                  ...previous,
                  language: event.target.value,
                }));
              }}
            >
              <option value="any">Any language</option>
              <option value="en">English</option>
              <option value="si">Sinhala</option>
              <option value="ta">Tamil</option>
            </Select>
          </label>
          <label className="space-y-2 text-sm">
            Professional type
            <Select
              aria-label="Professional type"
              value={preferences.profession}
              onChange={(event) => {
                setSelectedCounselorId("");
                setPreferences((previous) => ({
                  ...previous,
                  profession: event.target.value,
                }));
              }}
            >
              <option value="any">Any professional</option>
              <option value="counselor">Counselor</option>
              <option value="psychologist">Psychologist</option>
              <option value="psychiatrist">Psychiatrist</option>
            </Select>
          </label>
          <label className="space-y-2 text-sm">
            Appointment mode
            <Select
              aria-label="Appointment mode"
              value={preferences.mode}
              onChange={(event) => {
                setSelectedCounselorId("");
                setPreferences((previous) => ({
                  ...previous,
                  mode: event.target.value,
                }));
              }}
            >
              <option value="any">Any mode</option>
              <option value="online">Online</option>
              <option value="in-person">In person</option>
            </Select>
          </label>
        </div>
        <p className="text-xs leading-5 text-slate-500 dark:text-slate-400">
          A profile with missing gender, profession or language details cannot
          match that specific filter. Names and titles are never used to infer
          them.
        </p>
        {directoryError ? (
          <div
            role="alert"
            className="space-y-3 rounded-xl border border-amber-200 p-4 text-sm"
          >
            <p>{directoryError}</p>
            {needsSignIn ? (
              <Link
                href="/login"
                className="mr-4 font-medium text-blue-700 underline dark:text-blue-300"
              >
                Sign in to view support
              </Link>
            ) : null}
            <Button variant="secondary" onClick={refreshData}>
              Retry directory
            </Button>
          </div>
        ) : null}
        {loading ? (
          <p className="text-sm text-slate-500">Loading counselors...</p>
        ) : matched.length === 0 ? (
          <p className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-500 dark:border-slate-800 dark:bg-slate-800/30">
            {counselors.length
              ? "No profiles match these preferences. Try widening a filter, or contact your university counseling service about your preference."
              : "No active profiles are available in the directory right now. You can contact your university counseling service directly."}
          </p>
        ) : (
          <div className="grid gap-3 md:grid-cols-2">
            {matched.map(({ provider: counselor, reasons }) => (
              <div
                key={counselor._id}
                className="rounded-xl border border-slate-200 bg-white p-3 dark:border-slate-700 dark:bg-slate-900"
              >
                <p className="font-medium text-slate-900 dark:text-white">
                  {counselor.name}
                </p>
                <p className="text-sm text-slate-500">
                  {counselor.specialization}
                </p>
                <p className="mt-2 text-xs capitalize text-slate-500 dark:text-slate-400">
                  {counselor.profession?.replace(
                    "not-specified",
                    "Profession not listed",
                  ) ?? "Profession not listed"}{" "}
                  ·{" "}
                  {counselor.gender?.replace(
                    "not-specified",
                    "Gender not listed",
                  ) ?? "Gender not listed"}
                </p>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Languages:{" "}
                  {counselor.languages?.length
                    ? counselor.languages
                        .map(
                          (value) =>
                            ({ en: "English", si: "Sinhala", ta: "Tamil" })[
                              value
                            ],
                        )
                        .join(", ")
                    : "Not listed"}
                </p>
                <p className="text-xs text-slate-500">
                  Availability: {counselor.availability}
                </p>
                <p className="text-xs text-slate-500">Mode: {counselor.mode}</p>
                {counselor.contactEmail ? (
                  <p className="truncate text-xs text-slate-500">
                    {counselor.contactEmail}
                  </p>
                ) : null}
                <ul className="my-3 space-y-1 text-xs leading-5 text-blue-700 dark:text-blue-300">
                  {reasons.map((reason) => (
                    <li key={reason}>{reason}</li>
                  ))}
                </ul>
                <Button
                  type="button"
                  variant={
                    selectedCounselorId === counselor._id
                      ? "primary"
                      : "secondary"
                  }
                  onClick={() => setSelectedCounselorId(counselor._id)}
                >
                  {selectedCounselorId === counselor._id
                    ? "Selected"
                    : "Choose this professional"}
                </Button>
              </div>
            ))}
          </div>
        )}
      </Card>

      <Card className={`space-y-4 p-4 ${studentBlueCardClass}`}>
        <h3 className="text-lg font-semibold">Request a counseling slot</h3>
        <p className="text-xs leading-5 text-slate-500 dark:text-slate-400">
          Your request is reviewed through the university booking service by
          authorized administration/faculty staff. Include only information you
          want to share with that service. Check-in scores, reflections and chat
          are not attached. A request is not a confirmed appointment or
          emergency response.
        </p>
        <form className="space-y-3" onSubmit={submitBooking}>
          <div className="grid gap-3 md:grid-cols-3">
            <Select
              aria-label="Select professional"
              value={selectedCounselorId}
              onChange={(event) => setSelectedCounselorId(event.target.value)}
              required
            >
              <option value="">Select counselor</option>
              {matched.map(({ provider: counselor }) => (
                <option key={counselor._id} value={counselor._id}>
                  {counselor.name}
                </option>
              ))}
            </Select>
            <Input
              type="date"
              aria-label="Preferred date"
              value={preferredDate}
              onChange={(event) => setPreferredDate(event.target.value)}
              required
            />
            <Input
              type="time"
              aria-label="Preferred time"
              value={preferredTime}
              onChange={(event) => setPreferredTime(event.target.value)}
              required
            />
          </div>
          {selectedCounselor ? (
            <p className="text-xs text-slate-500">
              Selected: {selectedCounselor.name} ({selectedCounselor.mode})
            </p>
          ) : null}
          <TextArea
            aria-label="Optional booking note"
            rows={3}
            value={note}
            onChange={(event) => setNote(event.target.value)}
            placeholder="Optional note about what you want to discuss"
          />
          {error ? <p className="text-sm text-rose-600">{error}</p> : null}
          {message ? (
            <p className="text-sm text-emerald-600">{message}</p>
          ) : null}
          <div className="flex justify-end">
            <Button type="submit" disabled={submitting}>
              {submitting ? "Submitting..." : "Submit booking request"}
            </Button>
          </div>
        </form>
      </Card>

      <Card className={`space-y-3 p-4 ${studentBlueCardClass}`}>
        <h3 className="text-lg font-semibold">My counseling bookings</h3>
        {!bookings.length ? (
          <p className="text-sm text-slate-500">No bookings yet.</p>
        ) : (
          <ul className="space-y-2">
            {bookings.map((booking) => (
              <li
                key={booking._id}
                className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-slate-200 bg-slate-50 p-3 dark:border-slate-800 dark:bg-slate-800/30"
              >
                <div>
                  <p className="font-medium">
                    {booking.counselorName ?? "Counselor"}
                  </p>
                  <p className="text-xs text-slate-500">
                    {booking.preferredDate} at {booking.preferredTime}
                  </p>
                  {booking.note ? (
                    <p className="text-xs text-slate-500">{booking.note}</p>
                  ) : null}
                </div>
                <div className="flex items-center gap-2">
                  <Badge
                    variant={
                      booking.status === "confirmed"
                        ? "success"
                        : booking.status === "cancelled"
                          ? "warning"
                          : "info"
                    }
                  >
                    {booking.status}
                  </Badge>
                  {booking.status === "pending" ? (
                    <Button
                      variant="ghost"
                      onClick={() => cancelBooking(booking._id)}
                    >
                      Cancel
                    </Button>
                  ) : null}
                </div>
              </li>
            ))}
          </ul>
        )}
      </Card>
    </div>
  );
}
