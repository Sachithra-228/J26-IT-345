"use client";

import { useEffect, useState } from "react";
import {
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell
} from "recharts";
import { ArrowUpRight, CalendarDays, HeartHandshake, PieChart as PieChartIcon } from "lucide-react";
import { Badge } from "@/components/shared/Badge";
import type { Scholarship } from "@/types";
import type { JobListing } from "@/types";
import { getNgoCommunications, type NgoCommunication } from "@/lib/ngo-demo-store";

type AidRequest = { id?: string; _id?: string; category?: string; status?: string; submittedAt?: string };
type MentorshipSession = { _id: string; topic: string; scheduledTime: string; status: string };

const CHART_COLORS = ["#2563eb", "#10b981", "#f59e0b", "#6366f1", "#ec4899"];
const APPLICATION_STATUS_COLORS = ["#52525b", "#3b82f6", "#10b981", "#f43f5e"];

export function StudentHome() {
  const [scholarships, setScholarships] = useState<Scholarship[]>([]);
  const [jobs, setJobs] = useState<JobListing[]>([]);
  const [aidRequests, setAidRequests] = useState<AidRequest[]>([]);
  const [sessions, setSessions] = useState<MentorshipSession[]>([]);
  const [ngoComms, setNgoComms] = useState<NgoCommunication[]>([]);
  useEffect(() => {
    Promise.all([
      fetch("/api/scholarships").then((r) => r.json()),
      fetch("/api/jobs").then((r) => r.json()),
      fetch("/api/jobs/feed").then((r) => r.json()).catch(() => []),
      fetch("/api/aid-requests").then((r) => r.json()).catch(() => []),
      fetch("/api/mentorship-sessions").then((r) => r.json()).catch(() => [])
    ]).then(([sch, jb, feed, aid, sess]) => {
      setScholarships(Array.isArray(sch) ? sch : []);
      const localJobs = Array.isArray(jb) ? jb : [];
      const externalJobs = Array.isArray(feed) ? feed : [];
      setJobs([...localJobs, ...externalJobs]);
      setAidRequests(Array.isArray(aid) ? aid : []);
      setSessions(Array.isArray(sess) ? sess : []);
    });

    // Load NGO communications for beneficiaries
    setNgoComms(getNgoCommunications().filter((c) => c.audience === "beneficiaries" || c.audience === "all-applicants"));
  }, []);

  const upcomingDeadlines = [
    ...scholarships.slice(0, 4).map((s) => ({ name: s.title.slice(0, 26), deadline: s.deadline, type: "Scholarship" })),
    ...jobs.slice(0, 3).map((j) => ({ name: j.title.slice(0, 26), deadline: j.applicationDeadline, type: "Job" }))
  ]
    .sort((a, b) => (a.deadline > b.deadline ? 1 : -1))
    .slice(0, 5);

  const applicationStatusCounts = aidRequests.reduce(
    (acc, a) => {
      const s = (a.status || "Pending").toLowerCase();
      const key = s === "approved" ? "Approved" : s === "rejected" ? "Rejected" : "Pending";
      acc[key] = (acc[key] || 0) + 1;
      return acc;
    },
    {} as Record<string, number>
  );
  let pieData = [
    { name: "Pending", value: applicationStatusCounts.Pending || 0, color: APPLICATION_STATUS_COLORS[1] },
    { name: "Approved", value: applicationStatusCounts.Approved || 0, color: APPLICATION_STATUS_COLORS[2] },
    { name: "Rejected", value: applicationStatusCounts.Rejected || 0, color: APPLICATION_STATUS_COLORS[3] }
  ].filter((d) => d.value > 0);
  const isEmptyState = pieData.length === 0;
  if (isEmptyState) {
    pieData = [
      { name: "No applications", value: 1, color: APPLICATION_STATUS_COLORS[0] }
    ];
  }

  const today = new Date();
  const calendarYear = today.getFullYear();
  const calendarMonth = today.getMonth();
  const firstDay = new Date(calendarYear, calendarMonth, 1);
  const lastDay = new Date(calendarYear, calendarMonth + 1, 0);
  const startOffset = firstDay.getDay();
  const daysInMonth = lastDay.getDate();
  const deadlineDatesSet = new Set(
    upcomingDeadlines.map((d) => d.deadline).filter(Boolean)
  );
  const calendarDays: (number | null)[] = [];
  for (let i = 0; i < startOffset; i++) calendarDays.push(null);
  for (let d = 1; d <= daysInMonth; d++) calendarDays.push(d);
  const weekDays = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
  const monthLabel = firstDay.toLocaleString("default", { month: "long", year: "numeric" });
  function dateKey(day: number) {
    const y = calendarYear;
    const m = String(calendarMonth + 1).padStart(2, "0");
    const dd = String(day).padStart(2, "0");
    return `${y}-${m}-${dd}`;
  }

  // Keep unused references intact
  void CHART_COLORS;
  void sessions;

  return (
    <div className="space-y-4">
      {/* Middle Bento Row: Application Status (5 cols) + Deadlines & Calendar (7 cols) */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-12">
        {/* Bento Tile: Application Status */}
        <div className="flex flex-col justify-between rounded-3xl border border-slate-200/80 bg-white p-6 shadow-[0_2px_12px_-4px_rgba(15,23,42,0.05)] lg:col-span-5 dark:border-white/10 dark:bg-neutral-950">
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-center gap-3">
              <span className="flex size-10 shrink-0 items-center justify-center rounded-2xl bg-slate-100 text-slate-700 dark:bg-neutral-900 dark:text-neutral-300">
                <PieChartIcon className="size-5" />
              </span>
              <div>
                <h3 className="text-base font-bold tracking-tight text-slate-900 dark:text-white">
                  Application status
                </h3>
                <p className="text-xs text-slate-500 dark:text-neutral-400">
                  Overview of your submitted aid requests
                </p>
              </div>
            </div>
            <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-700 dark:bg-neutral-900 dark:text-neutral-300">
              {aidRequests.length} total
            </span>
          </div>

          <div className="my-2 h-[185px]">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={pieData}
                  cx="50%"
                  cy="50%"
                  innerRadius={54}
                  outerRadius={78}
                  paddingAngle={isEmptyState ? 0 : 4}
                  dataKey="value"
                  nameKey="name"
                  stroke="none"
                >
                  {pieData.map((entry, i) => (
                    <Cell key={i} fill={entry.color} />
                  ))}
                </Pie>
                {!isEmptyState && <Tooltip formatter={(value: number) => [value, "Count"]} />}
              </PieChart>
            </ResponsiveContainer>
          </div>

          <div className="grid grid-cols-3 gap-2.5">
            <div className="rounded-2xl bg-slate-50/90 px-3 py-2.5 dark:bg-neutral-900/80">
              <div className="flex items-center gap-1.5">
                <span className="h-2 w-2 rounded-full bg-blue-500" />
                <span className="text-[11px] font-medium text-slate-500 dark:text-neutral-400">Pending</span>
              </div>
              <p className="mt-1 text-lg font-bold text-slate-900 dark:text-white">
                {applicationStatusCounts.Pending || 0}
              </p>
            </div>
            <div className="rounded-2xl bg-slate-50/90 px-3 py-2.5 dark:bg-neutral-900/80">
              <div className="flex items-center gap-1.5">
                <span className="h-2 w-2 rounded-full bg-emerald-500" />
                <span className="text-[11px] font-medium text-slate-500 dark:text-neutral-400">Approved</span>
              </div>
              <p className="mt-1 text-lg font-bold text-slate-900 dark:text-white">
                {applicationStatusCounts.Approved || 0}
              </p>
            </div>
            <div className="rounded-2xl bg-slate-50/90 px-3 py-2.5 dark:bg-neutral-900/80">
              <div className="flex items-center gap-1.5">
                <span className="h-2 w-2 rounded-full bg-rose-500" />
                <span className="text-[11px] font-medium text-slate-500 dark:text-neutral-400">Rejected</span>
              </div>
              <p className="mt-1 text-lg font-bold text-slate-900 dark:text-white">
                {applicationStatusCounts.Rejected || 0}
              </p>
            </div>
          </div>
        </div>

        {/* Bento Tile: Upcoming Deadlines & Calendar */}
        <div className="flex flex-col justify-between rounded-3xl border border-slate-200/80 bg-white p-6 shadow-[0_2px_12px_-4px_rgba(15,23,42,0.05)] lg:col-span-7 dark:border-white/10 dark:bg-neutral-950">
          <div className="mb-4 flex items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <span className="flex size-10 shrink-0 items-center justify-center rounded-2xl bg-slate-100 text-slate-700 dark:bg-neutral-900 dark:text-neutral-300">
                <CalendarDays className="size-5" />
              </span>
              <div>
                <h3 className="text-base font-bold tracking-tight text-slate-900 dark:text-white">
                  Upcoming deadlines
                </h3>
                <p className="text-xs text-slate-500 dark:text-neutral-400">
                  Scholarship & career application schedule
                </p>
              </div>
            </div>
            <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-700 dark:bg-neutral-900 dark:text-neutral-300">
              {monthLabel}
            </span>
          </div>

          <div className="grid gap-5 md:grid-cols-12">
            {/* Compact Calendar */}
            <div className="rounded-2xl bg-slate-50/80 p-3.5 md:col-span-7 dark:bg-neutral-900/70">
              <div className="grid grid-cols-7 gap-1 text-center">
                {weekDays.map((w) => (
                  <div key={w} className="py-1 text-[11px] font-semibold uppercase tracking-wider text-slate-400 dark:text-neutral-500">
                    {w}
                  </div>
                ))}
                {calendarDays.map((day, i) => {
                  if (day === null) {
                    return <div key={`e-${i}`} className="min-h-[30px]" />;
                  }
                  const key = dateKey(day);
                  const hasDeadline = deadlineDatesSet.has(key);
                  const isToday =
                    today.getDate() === day &&
                    today.getMonth() === calendarMonth &&
                    today.getFullYear() === calendarYear;
                  return (
                    <div
                      key={key}
                      className={`relative flex min-h-[30px] items-center justify-center rounded-xl text-xs font-medium transition-colors ${
                        isToday
                          ? "bg-slate-900 font-bold text-white shadow-sm dark:bg-white dark:text-black"
                          : hasDeadline
                            ? "bg-blue-50 font-semibold text-blue-600 ring-1 ring-blue-200 dark:bg-blue-950/60 dark:text-blue-400 dark:ring-blue-800"
                            : "text-slate-600 hover:bg-slate-100 dark:text-neutral-400 dark:hover:bg-neutral-800"
                      }`}
                    >
                      {day}
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Upcoming List */}
            <div className="flex flex-col justify-between md:col-span-5">
              {upcomingDeadlines.length === 0 ? (
                <div className="flex h-full items-center justify-center rounded-2xl bg-slate-50/80 p-4 text-center text-xs text-slate-500 dark:bg-neutral-900/70 dark:text-neutral-500">
                  No upcoming deadlines.
                </div>
              ) : (
                <ul className="space-y-2">
                  {upcomingDeadlines.map((d, i) => (
                    <li
                      key={`${d.deadline}-${d.name}-${i}`}
                      className="flex items-center justify-between gap-2.5 rounded-2xl bg-slate-50/80 px-3 py-2.5 transition-colors hover:bg-slate-100/80 dark:bg-neutral-900/70 dark:hover:bg-neutral-900"
                    >
                      <div className="min-w-0">
                        <p className="truncate text-xs font-semibold text-slate-800 dark:text-neutral-200">
                          {d.name}
                        </p>
                        <p className="text-[11px] text-slate-400 dark:text-neutral-500">{d.type}</p>
                      </div>
                      <span className="shrink-0 rounded-lg bg-white px-2 py-1 text-[11px] font-semibold text-slate-700 shadow-sm ring-1 ring-slate-200/70 dark:bg-neutral-950 dark:text-neutral-300 dark:ring-white/10">
                        {d.deadline}
                      </span>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Bottom Bento Row: AI Scholarship Matching + NGO Updates */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-12">
        <div
          className={`rounded-3xl border border-slate-200/80 bg-white p-6 shadow-[0_2px_12px_-4px_rgba(15,23,42,0.05)] dark:border-white/10 dark:bg-neutral-950 ${
            ngoComms.length > 0 ? "lg:col-span-8" : "lg:col-span-12"
          }`}
        >
          <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
            <div>
              <h3 className="text-base font-bold tracking-tight text-slate-900 dark:text-white">
                AI scholarship matching
              </h3>
              <p className="mt-0.5 text-xs text-slate-500 dark:text-neutral-400">
                Recommendations based on financial need, academic performance, and interests.
              </p>
            </div>
            <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-700 dark:bg-neutral-900 dark:text-neutral-300">
              {scholarships.length} matches
            </span>
          </div>

          {scholarships.length === 0 ? (
            <div className="rounded-2xl bg-slate-50/80 py-10 text-center text-sm text-slate-500 dark:bg-neutral-900/70 dark:text-neutral-500">
              No scholarships loaded.
            </div>
          ) : (
            <div
              className={`grid gap-3.5 sm:grid-cols-2 ${
                ngoComms.length > 0 ? "xl:grid-cols-2" : "lg:grid-cols-3"
              }`}
            >
              {scholarships.map((s) => (
                <a
                  key={s._id}
                  href={s.applicationLink}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="group flex flex-col justify-between rounded-2xl bg-slate-50/80 p-4 transition-all duration-200 hover:-translate-y-0.5 hover:bg-slate-100/90 dark:bg-neutral-900/70 dark:hover:bg-neutral-900"
                >
                  <div>
                    <div className="flex items-start justify-between gap-2">
                      <h4 className="font-semibold text-slate-900 dark:text-white">{s.title}</h4>
                      <ArrowUpRight className="size-4 shrink-0 text-slate-400 transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5 group-hover:text-slate-900 dark:text-neutral-500 dark:group-hover:text-white" />
                    </div>
                    <p className="mt-1 text-xs font-medium text-slate-600 dark:text-neutral-400">{s.provider}</p>
                    <p className="mt-1 text-xs font-semibold text-slate-900 dark:text-neutral-200">{s.amount}</p>
                  </div>
                  <div className="mt-4 flex flex-wrap items-center gap-2">
                    <Badge variant="info">{s.deadline}</Badge>
                    <Badge variant="success">{s.status}</Badge>
                  </div>
                </a>
              ))}
            </div>
          )}
        </div>

        {/* NGO Communications Bento Tile */}
        {ngoComms.length > 0 && (
          <div className="flex flex-col rounded-3xl border border-slate-200/80 bg-white p-6 shadow-[0_2px_12px_-4px_rgba(15,23,42,0.05)] lg:col-span-4 dark:border-white/10 dark:bg-neutral-950">
            <div className="mb-5 flex items-center gap-3">
              <span className="flex size-10 shrink-0 items-center justify-center rounded-2xl bg-emerald-50 text-emerald-600 dark:bg-neutral-900 dark:text-emerald-400">
                <HeartHandshake className="size-5" />
              </span>
              <div>
                <h3 className="text-base font-bold tracking-tight text-slate-900 dark:text-white">
                  Updates from Supporting NGOs
                </h3>
                <p className="text-xs text-slate-500 dark:text-neutral-400">
                  NGO-funded programs & support initiatives
                </p>
              </div>
            </div>

            <div className="space-y-3">
              {ngoComms.map((comm) => (
                <div
                  key={comm._id}
                  className="rounded-2xl bg-slate-50/80 p-4 dark:bg-neutral-900/70"
                >
                  <div className="flex items-start justify-between gap-2">
                    <h4 className="text-sm font-semibold text-slate-900 dark:text-white">{comm.subject}</h4>
                    <Badge variant={comm.type === "program-update" ? "success" : "info"}>
                      {comm.type.replace("-", " ")}
                    </Badge>
                  </div>
                  <p className="mt-1.5 text-xs leading-relaxed text-slate-600 dark:text-neutral-300">
                    {comm.message}
                  </p>
                  <p className="mt-2 text-[11px] text-slate-400 dark:text-neutral-500">
                    Sent {new Date(comm.sentAt).toLocaleDateString()}
                  </p>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
