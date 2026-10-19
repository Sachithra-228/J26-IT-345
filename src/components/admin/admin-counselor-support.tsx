"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Card } from "@/components/shared/Card";
import { Button } from "@/components/shared/Button";
import { Input } from "@/components/shared/Input";
import { Select } from "@/components/shared/Select";
import { adminNavyCardClass } from "./admin-card-theme";
import { CONCERNS, type Concern } from "@/lib/c2/assessment";
import type { ProviderMetadata } from "@/lib/c2/support";

type Counselor = ProviderMetadata & {
  _id: string;
  name: string;
  specialization: string;
  availability: string;
  mode: "online" | "in-person" | "hybrid";
  contactEmail?: string;
};

type Booking = {
  _id: string;
  counselorId: string;
  counselorName?: string;
  studentName?: string;
  preferredDate: string;
  preferredTime: string;
  note?: string;
  status: "pending" | "confirmed" | "completed" | "cancelled";
  createdAt?: string;
};

export function AdminCounselorSupportSection() {
  const [counselors, setCounselors] = useState<Counselor[]>([]);
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  const [name, setName] = useState("");
  const [specialization, setSpecialization] = useState("");
  const [availability, setAvailability] = useState("");
  const [mode, setMode] = useState<"online" | "in-person" | "hybrid">("hybrid");
  const [contactEmail, setContactEmail] = useState("");
  const [gender, setGender] =
    useState<NonNullable<ProviderMetadata["gender"]>>("not-specified");
  const [profession, setProfession] =
    useState<NonNullable<ProviderMetadata["profession"]>>("not-specified");
  const [languages, setLanguages] = useState<
    NonNullable<ProviderMetadata["languages"]>
  >([]);
  const [supportAreas, setSupportAreas] = useState<Concern[]>([]);

  const loadData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [counselorsResponse, bookingsResponse] = await Promise.all([
        fetch("/api/wellness-counselors"),
        fetch("/api/counselor-bookings?scope=all"),
      ]);
      const counselorsData = await counselorsResponse.json().catch(() => []);
      const bookingsData = await bookingsResponse.json().catch(() => []);

      setCounselors(Array.isArray(counselorsData) ? counselorsData : []);
      setBookings(Array.isArray(bookingsData) ? bookingsData : []);
    } catch {
      setError("Unable to load counselor support data.");
      setCounselors([]);
      setBookings([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  useEffect(() => {
    const canPoll = () =>
      document.visibilityState === "visible" && document.hasFocus();
    const poll = () => {
      if (canPoll()) loadData();
    };
    const intervalId = window.setInterval(poll, 30000);
    window.addEventListener("focus", poll);
    document.addEventListener("visibilitychange", poll);
    return () => {
      window.clearInterval(intervalId);
      window.removeEventListener("focus", poll);
      document.removeEventListener("visibilitychange", poll);
    };
  }, [loadData]);

  const addCounselor = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!name.trim() || !specialization.trim() || !availability.trim()) {
      setError("Name, specialization and availability are required.");
      return;
    }

    setSaving(true);
    setError(null);
    setMessage(null);
    try {
      const response = await fetch("/api/wellness-counselors", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: name.trim(),
          specialization: specialization.trim(),
          availability: availability.trim(),
          mode,
          contactEmail: contactEmail.trim() || undefined,
          gender,
          profession,
          languages,
          supportAreas,
        }),
      });
      const payload = await response
        .json()
        .catch(() => ({}) as { message?: string });
      if (!response.ok) {
        setError(payload.message ?? "Unable to add counselor.");
        return;
      }
      setMessage("Counselor added.");
      setName("");
      setSpecialization("");
      setAvailability("");
      setMode("hybrid");
      setContactEmail("");
      setGender("not-specified");
      setProfession("not-specified");
      setLanguages([]);
      setSupportAreas([]);
      await loadData();
    } catch {
      setError("Unable to add counselor.");
    } finally {
      setSaving(false);
    }
  };

  const updateBooking = async (
    bookingId: string,
    status: Booking["status"],
  ) => {
    setUpdatingId(`${bookingId}:${status}`);
    setError(null);
    setMessage(null);
    try {
      const response = await fetch(`/api/counselor-bookings/${bookingId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      });
      const payload = await response
        .json()
        .catch(() => ({}) as { message?: string });
      if (!response.ok) {
        setError(payload.message ?? "Unable to update booking.");
        return;
      }
      setMessage(`Booking marked as ${status}.`);
      await loadData();
    } catch {
      setError("Unable to update booking.");
    } finally {
      setUpdatingId(null);
    }
  };

  const pendingBookings = useMemo(
    () => bookings.filter((item) => item.status === "pending"),
    [bookings],
  );
  const activeBookings = useMemo(
    () => bookings.filter((item) => item.status === "confirmed"),
    [bookings],
  );
  const closedBookings = useMemo(
    () =>
      bookings.filter(
        (item) => item.status === "completed" || item.status === "cancelled",
      ),
    [bookings],
  );

  return (
    <div className="space-y-6">
      <Card className={`space-y-4 p-5 ${adminNavyCardClass}`}>
        <h3 className="text-lg font-semibold text-slate-900 dark:text-white">
          Counselor support
        </h3>
        <p className="text-sm text-slate-600 dark:text-slate-300">
          Add counselors and manage student counseling requests from one
          section.
        </p>

        <form className="grid gap-3 md:grid-cols-2" onSubmit={addCounselor}>
          <Input
            value={name}
            onChange={(event) => setName(event.target.value)}
            placeholder="Counselor name"
          />
          <Input
            value={specialization}
            onChange={(event) => setSpecialization(event.target.value)}
            placeholder="Specialization"
          />
          <Input
            value={availability}
            onChange={(event) => setAvailability(event.target.value)}
            placeholder="Availability (e.g. Mon-Fri 9:00-15:00)"
          />
          <Select
            value={mode}
            onChange={(event) =>
              setMode(event.target.value as "online" | "in-person" | "hybrid")
            }
          >
            <option value="hybrid">Hybrid</option>
            <option value="online">Online</option>
            <option value="in-person">In-person</option>
          </Select>
          <div className="md:col-span-2">
            <Input
              value={contactEmail}
              onChange={(event) => setContactEmail(event.target.value)}
              placeholder="Contact email (optional)"
            />
          </div>
          <label className="space-y-2 text-sm">
            Listed gender
            <Select
              aria-label="Professional gender"
              value={gender}
              onChange={(event) =>
                setGender(event.target.value as typeof gender)
              }
            >
              <option value="not-specified">Not specified</option>
              <option value="male">Male</option>
              <option value="female">Female</option>
              <option value="other">Another gender</option>
            </Select>
          </label>
          <label className="space-y-2 text-sm">
            Professional type
            <Select
              aria-label="Listed professional type"
              value={profession}
              onChange={(event) =>
                setProfession(event.target.value as typeof profession)
              }
            >
              <option value="not-specified">Not specified</option>
              <option value="counselor">Counselor</option>
              <option value="psychologist">Psychologist</option>
              <option value="psychiatrist">Psychiatrist</option>
            </Select>
          </label>
          <fieldset className="space-y-2">
            <legend className="mb-2 text-sm">Confirmed languages</legend>
            {(["en", "si", "ta"] as const).map((code) => (
              <label
                key={code}
                className="mr-3 inline-flex items-center gap-2 text-sm"
              >
                <input
                  type="checkbox"
                  checked={languages.includes(code)}
                  onChange={(event) =>
                    setLanguages((previous) =>
                      event.target.checked
                        ? [...previous, code]
                        : previous.filter((value) => value !== code),
                    )
                  }
                />
                {{ en: "English", si: "Sinhala", ta: "Tamil" }[code]}
              </label>
            ))}
          </fieldset>
          <fieldset className="space-y-2">
            <legend className="mb-2 text-sm">Confirmed support areas</legend>
            {(Object.keys(CONCERNS) as Concern[]).map((topic) => (
              <label
                key={topic}
                className="mr-3 inline-flex items-center gap-2 text-sm"
              >
                <input
                  type="checkbox"
                  checked={supportAreas.includes(topic)}
                  onChange={(event) =>
                    setSupportAreas((previous) =>
                      event.target.checked
                        ? [...previous, topic]
                        : previous.filter((value) => value !== topic),
                    )
                  }
                />
                {CONCERNS[topic].label}
              </label>
            ))}
          </fieldset>
          <p className="text-xs text-slate-500 dark:text-slate-400 md:col-span-2">
            Record details confirmed with the professional. Do not infer gender,
            credentials or languages from their name or title. Verify
            qualifications through the university’s normal process.
          </p>
          {error ? (
            <p className="text-sm text-rose-600 md:col-span-2">{error}</p>
          ) : null}
          {message ? (
            <p className="text-sm text-emerald-600 md:col-span-2">{message}</p>
          ) : null}
          <div className="md:col-span-2 flex justify-end">
            <Button type="submit" disabled={saving}>
              {saving ? "Adding..." : "Add counselor"}
            </Button>
          </div>
        </form>
      </Card>

      <Card className={`space-y-3 p-5 ${adminNavyCardClass}`}>
        <h4 className="text-base font-semibold text-slate-900 dark:text-white">
          Available counselors
        </h4>
        {loading ? (
          <p className="text-sm text-slate-500">Loading counselors...</p>
        ) : !counselors.length ? (
          <p className="text-sm text-slate-500">No counselors added yet.</p>
        ) : (
          <div className="grid gap-3 md:grid-cols-2">
            {counselors.map((item) => (
              <div
                key={item._id}
                className="rounded-xl border border-slate-200 bg-slate-50 p-3 dark:border-slate-700 dark:bg-slate-800/30"
              >
                <p className="font-semibold text-slate-900 dark:text-white">
                  {item.name}
                </p>
                <p className="text-sm text-slate-500">{item.specialization}</p>
                <p className="text-xs text-slate-500">
                  Availability: {item.availability}
                </p>
                <p className="text-xs text-slate-500">Mode: {item.mode}</p>
                {item.contactEmail ? (
                  <p className="text-xs text-slate-500">{item.contactEmail}</p>
                ) : null}
              </div>
            ))}
          </div>
        )}
      </Card>

      <Card className={`space-y-3 p-5 ${adminNavyCardClass}`}>
        <h4 className="text-base font-semibold text-slate-900 dark:text-white">
          Pending booking requests
        </h4>
        {loading ? (
          <p className="text-sm text-slate-500">Loading requests...</p>
        ) : !pendingBookings.length ? (
          <p className="text-sm text-slate-500">No pending booking requests.</p>
        ) : (
          <div className="space-y-2">
            {pendingBookings.map((booking) => (
              <div
                key={booking._id}
                className="rounded-xl border border-slate-200 bg-slate-50 p-3 dark:border-slate-700 dark:bg-slate-800/30"
              >
                <p className="font-medium text-slate-900 dark:text-white">
                  {booking.counselorName ?? "Counselor"}
                </p>
                <p className="text-xs text-slate-500">
                  Student: {booking.studentName ?? "Student"}
                </p>
                <p className="text-xs text-slate-500">
                  Slot: {booking.preferredDate} at {booking.preferredTime}
                </p>
                {booking.note ? (
                  <p className="text-xs text-slate-500">Note: {booking.note}</p>
                ) : null}
                <div className="mt-2 flex flex-wrap gap-2">
                  <Button
                    variant="secondary"
                    disabled={updatingId !== null}
                    onClick={() => updateBooking(booking._id, "confirmed")}
                  >
                    {updatingId === `${booking._id}:confirmed`
                      ? "Updating..."
                      : "Accept"}
                  </Button>
                  <Button
                    variant="ghost"
                    disabled={updatingId !== null}
                    onClick={() => updateBooking(booking._id, "cancelled")}
                  >
                    {updatingId === `${booking._id}:cancelled`
                      ? "Updating..."
                      : "Reject"}
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>

      <div className="grid gap-4 md:grid-cols-2">
        <Card className={`space-y-3 p-5 ${adminNavyCardClass}`}>
          <h4 className="text-base font-semibold text-slate-900 dark:text-white">
            Confirmed bookings
          </h4>
          {!activeBookings.length ? (
            <p className="text-sm text-slate-500">No confirmed bookings.</p>
          ) : (
            <div className="space-y-2">
              {activeBookings.map((booking) => (
                <div
                  key={booking._id}
                  className="rounded-lg border border-slate-200 p-3 dark:border-slate-700"
                >
                  <p className="font-medium text-slate-900 dark:text-white">
                    {booking.counselorName ?? "Counselor"}
                  </p>
                  <p className="text-xs text-slate-500">
                    {booking.studentName ?? "Student"} · {booking.preferredDate}{" "}
                    {booking.preferredTime}
                  </p>
                  <div className="mt-2">
                    <Button
                      variant="secondary"
                      disabled={updatingId !== null}
                      onClick={() => updateBooking(booking._id, "completed")}
                    >
                      {updatingId === `${booking._id}:completed`
                        ? "Updating..."
                        : "Mark completed"}
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </Card>

        <Card className={`space-y-3 p-5 ${adminNavyCardClass}`}>
          <h4 className="text-base font-semibold text-slate-900 dark:text-white">
            Recent closed bookings
          </h4>
          {!closedBookings.length ? (
            <p className="text-sm text-slate-500">No closed bookings yet.</p>
          ) : (
            <div className="space-y-2">
              {closedBookings.slice(0, 8).map((booking) => (
                <div
                  key={booking._id}
                  className="rounded-lg border border-slate-200 p-3 dark:border-slate-700"
                >
                  <p className="font-medium text-slate-900 dark:text-white">
                    {booking.counselorName ?? "Counselor"}
                  </p>
                  <p className="text-xs text-slate-500">
                    {booking.studentName ?? "Student"} · {booking.preferredDate}{" "}
                    {booking.preferredTime}
                  </p>
                  <p className="mt-1 text-xs text-slate-500 capitalize">
                    Status: {booking.status}
                  </p>
                </div>
              ))}
            </div>
          )}
        </Card>
      </div>
    </div>
  );
}
