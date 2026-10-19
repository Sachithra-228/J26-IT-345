"use client";

import { useEffect, useMemo, useState } from "react";
import {
  ArrowUpRight,
  Briefcase,
  Building2,
  Clock3,
  Globe2,
  MapPin
} from "lucide-react";
import { Card } from "@/components/shared/Card";
import { Badge } from "@/components/shared/Badge";
import { useJobMatch } from "@/components/c3/use-job-match";
import type { JobListing } from "@/types";

const typeAccentClass: Record<JobListing["type"], string> = {
  "part-time": "from-blue-500/20 to-blue-600/10 text-blue-700 dark:text-blue-300",
  internship: "from-emerald-500/20 to-emerald-600/10 text-emerald-700 dark:text-emerald-300",
  "full-time": "from-violet-500/20 to-violet-600/10 text-violet-700 dark:text-violet-300"
};

const typeBorderClass: Record<JobListing["type"], string> = {
  "part-time": "border-l-blue-500",
  internship: "border-l-emerald-500",
  "full-time": "border-l-violet-500"
};

const quickChips = [
  { id: "all", label: "All", type: "", location: "" },
  { id: "remote", label: "Remote", type: "", location: "Remote" },
  { id: "part-time", label: "Part-time", type: "part-time", location: "" },
  { id: "internship", label: "Internship", type: "internship", location: "" },
  { id: "full-time", label: "Full-time", type: "full-time", location: "" }
] as const;

function getDaysUntil(deadlineStr: string): number | null {
  if (!deadlineStr) return null;
  try {
    const [y, m, d] = deadlineStr.split("-").map(Number);
    const deadline = new Date(y, m - 1, d);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    deadline.setHours(0, 0, 0, 0);
    const diff = Math.ceil((deadline.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
    return diff >= 0 ? diff : null;
  } catch {
    return null;
  }
}

function getApplyUrl(job: JobListing) {
  if (job.externalUrl) return job.externalUrl;
  if (job.contactEmail) return `mailto:${job.contactEmail}`;
  return "#";
}

function isRemoteJob(location: string) {
  const normalized = (location || "").toLowerCase();
  return normalized.includes("remote") || normalized.includes("anywhere");
}

export function PartTimeJobBoardFull() {
  const [jobs, setJobs] = useState<JobListing[]>([]);
  const [jobType, setJobType] = useState("");
  const [jobLocation, setJobLocation] = useState("");
  const [jobTab, setJobTab] = useState<"all" | "campus" | "remotive">("all");
  const [loading, setLoading] = useState(true);
  const jobMatch = useJobMatch(jobs); // C3: only active when the student opened the board from their C3 result

  useEffect(() => {
    let cancelled = false;

    const loadJobs = async () => {
      setLoading(true);
      try {
        const [jobsRes, feedRes] = await Promise.all([
          fetch("/api/jobs").then((r) => r.json()).catch(() => []),
          fetch("/api/jobs/feed").then((r) => r.json()).catch(() => [])
        ]);

        if (cancelled) return;
        const localJobs = Array.isArray(jobsRes) ? jobsRes : [];
        const externalJobs = Array.isArray(feedRes) ? feedRes : [];
        setJobs([...localJobs, ...externalJobs]);
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    loadJobs();

    return () => {
      cancelled = true;
    };
  }, []);

  const filteredJobs = useMemo(
    () =>
      jobs.filter((job) => {
        const matchType = !jobType || job.type === jobType;
        const location = (job.location || "").toLowerCase();
        const matchLocation =
          !jobLocation ||
          job.location === jobLocation ||
          (jobLocation === "Remote" && (location.includes("remote") || location.includes("anywhere")));
        return matchType && matchLocation;
      }),
    [jobs, jobType, jobLocation]
  );

  const campusJobs = useMemo(
    () => filteredJobs.filter((job) => !job.source || job.source !== "Remotive"),
    [filteredJobs]
  );
  const remotiveJobs = useMemo(
    () => filteredJobs.filter((job) => job.source === "Remotive"),
    [filteredJobs]
  );

  const jobsByTab = useMemo(() => {
    if (jobTab === "campus") return campusJobs;
    if (jobTab === "remotive") return remotiveJobs;
    return filteredJobs;
  }, [campusJobs, filteredJobs, jobTab, remotiveJobs]);

  const orderJobs = jobMatch.order;
  const shownJobs = useMemo(() => orderJobs(jobsByTab), [orderJobs, jobsByTab]);
  const featuredJobs = shownJobs.slice(0, 3);

  const tabStats = [
    { id: "all" as const, label: "All jobs", count: filteredJobs.length, icon: Briefcase },
    { id: "campus" as const, label: "Campus jobs", count: campusJobs.length, icon: Building2 },
    { id: "remotive" as const, label: "Remotive", count: remotiveJobs.length, icon: Globe2 }
  ];

  return (
    <Card className="overflow-hidden border-slate-200/70 bg-white p-0 shadow-xl dark:border-slate-700/60 dark:bg-slate-900">
      <div className="relative rounded-2xl border border-blue-900/50 bg-gradient-to-br from-blue-950 via-blue-900 to-blue-800 p-5 dark:border-blue-900/60">
        <div className="pointer-events-none absolute right-0 top-0 h-28 w-28 rounded-bl-full bg-white/10 blur-2xl" />
        <div className="pointer-events-none absolute bottom-0 left-0 h-20 w-20 rounded-tr-full bg-cyan-300/10 blur-2xl" />

        <div className="relative">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <h3 className="text-lg font-semibold text-white">Part-time & internship job board</h3>
              <p className="mt-1 text-sm text-blue-100">
                Explore campus opportunities and remote listings in one place.
              </p>
            </div>
          </div>

          <div className="mt-4 grid gap-2 sm:grid-cols-3">
            {tabStats.map(({ id, label, count, icon: Icon }) => {
              const active = jobTab === id;
              return (
                <button
                  key={id}
                  type="button"
                  onClick={() => setJobTab(id)}
                  className={`rounded-xl border px-3 py-3 text-left transition-all ${
                    active
                      ? "border-primary/60 bg-slate-900/80 shadow-sm ring-2 ring-primary/30"
                      : "border-slate-700/70 bg-slate-900/80 hover:border-slate-500"
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium text-slate-100">{label}</span>
                    <Icon className="h-4 w-4 text-slate-400" />
                  </div>
                  <p className="mt-1 text-2xl font-bold text-white">{count}</p>
                </button>
              );
            })}
          </div>

          <div className="mt-4 flex flex-wrap items-center gap-2">
            <div className="inline-flex items-center gap-1.5 text-xs font-medium text-blue-100">
              <Briefcase className="h-3.5 w-3.5" />
              Quick filters
            </div>
            {quickChips.map((chip) => {
              const isActive = jobType === chip.type && jobLocation === chip.location;
              return (
                <button
                  key={chip.id}
                  type="button"
                  onClick={() => {
                    setJobType(chip.type);
                    setJobLocation(chip.location);
                  }}
                  className={`rounded-full px-3 py-1.5 text-xs font-medium transition-colors ${
                    isActive
                      ? "bg-primary text-white"
                      : "bg-slate-100 text-slate-600 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700"
                  }`}
                >
                  {chip.label}
                </button>
              );
            })}
            {jobMatch.sortControl}
          </div>
        </div>
      </div>

      <div className="p-5">
        {jobMatch.banner}
        {loading ? (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {Array.from({ length: 6 }).map((_, index) => (
              <div
                key={index}
                className="h-44 animate-pulse rounded-2xl border border-slate-200 bg-slate-100 dark:border-slate-700 dark:bg-slate-800"
              />
            ))}
          </div>
        ) : shownJobs.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50/70 px-6 py-12 text-center dark:border-slate-700 dark:bg-slate-800/40">
            <p className="text-sm font-medium text-slate-700 dark:text-slate-200">No jobs match your current filters.</p>
            <p className="mt-1 text-xs text-slate-500">Try changing the source tab or quick filters above.</p>
          </div>
        ) : (
          <>
            {featuredJobs.length > 0 && (
              <div className="mb-6">
                <div className="mb-3 flex items-center justify-between">
                  <h4 className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-500 dark:text-slate-400">Featured roles</h4>
                  <span className="text-xs text-slate-500 dark:text-slate-400">Top matches for current filters</span>
                </div>
                <div className="grid gap-4 md:grid-cols-3">
                  {featuredJobs.map((job) => {
                    const deadlineDays = getDaysUntil(job.applicationDeadline || "");
                    const remote = isRemoteJob(job.location || "");
                    const href = getApplyUrl(job);

                    return (
                      <a
                        key={`featured-${job._id}`}
                        href={href}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="group relative overflow-hidden rounded-2xl border border-slate-200 bg-white p-4 shadow-sm transition-all hover:-translate-y-0.5 hover:border-primary/40 hover:shadow-md dark:border-slate-700 dark:bg-slate-900"
                      >
                        <div className="absolute right-0 top-0 h-24 w-24 rounded-bl-full bg-primary/10 opacity-0 transition-opacity group-hover:opacity-100" />

                        <div className="relative">
                          <div className="mb-3 flex items-center justify-between gap-2">
                            <Badge variant="info">{job.type}</Badge>
                            {job.source && (
                              <span className="rounded-md bg-slate-100 px-2 py-0.5 text-[11px] font-medium text-slate-600 dark:bg-slate-800 dark:text-slate-300">
                                {job.source}
                              </span>
                            )}
                          </div>

                          <h5 className="line-clamp-2 text-base font-semibold text-slate-900 dark:text-white">{job.title}</h5>
                          <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">{job.company}</p>
                          {jobMatch.badge(job)}

                          <div className="mt-3 space-y-1.5 text-xs text-slate-500 dark:text-slate-400">
                            <p className="flex items-center gap-1.5">
                              {remote ? <Globe2 className="h-3.5 w-3.5" /> : <MapPin className="h-3.5 w-3.5" />}
                              <span>{job.location}</span>
                            </p>
                            {job.salary && job.salary !== "Not specified" && (
                              <p className="font-medium text-slate-700 dark:text-slate-200">{job.salary}</p>
                            )}
                          </div>

                          <div className="mt-4 flex items-center justify-between">
                            <span className="text-xs text-slate-500 dark:text-slate-400">
                              {deadlineDays !== null
                                ? `Closes in ${deadlineDays} day${deadlineDays !== 1 ? "s" : ""}`
                                : `Apply by ${job.applicationDeadline || "Open"}`}
                            </span>
                            <span className="inline-flex items-center gap-1 text-xs font-semibold text-primary">
                              Apply
                              <ArrowUpRight className="h-3.5 w-3.5" />
                            </span>
                          </div>
                        </div>
                      </a>
                    );
                  })}
                </div>
              </div>
            )}

            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {shownJobs.map((job) => {
                const deadlineDays = getDaysUntil(job.applicationDeadline || "");
                const remote = isRemoteJob(job.location || "");
                const href = getApplyUrl(job);

                return (
                  <article
                    key={job._id}
                    className={`rounded-2xl border border-slate-200 bg-white p-4 shadow-sm transition-all hover:-translate-y-0.5 hover:border-primary/40 hover:shadow-md dark:border-slate-700 dark:bg-slate-900 border-l-4 ${typeBorderClass[job.type]}`}
                  >
                    <div className="mb-3 flex items-start justify-between gap-2">
                      <h4 className="line-clamp-2 text-lg font-semibold leading-snug text-slate-900 dark:text-white">{job.title}</h4>
                      {job.source && (
                        <span className="shrink-0 rounded-md bg-slate-100 px-2 py-0.5 text-[11px] font-medium text-slate-600 dark:bg-slate-800 dark:text-slate-300">
                          {job.source}
                        </span>
                      )}
                    </div>

                    <p className="text-sm font-medium text-slate-700 dark:text-slate-300">{job.company}</p>
                    {jobMatch.badge(job)}

                    <div className="mt-2 space-y-1 text-xs text-slate-500 dark:text-slate-400">
                      <p className="flex items-center gap-1.5">
                        {remote ? <Globe2 className="h-3.5 w-3.5" /> : <MapPin className="h-3.5 w-3.5" />}
                        {job.location}
                      </p>
                      {job.salary && job.salary !== "Not specified" && (
                        <p className="font-medium text-slate-700 dark:text-slate-200">{job.salary}</p>
                      )}
                    </div>

                    <div className="mt-4 flex items-center justify-between gap-2">
                      <span className={`rounded-full bg-gradient-to-r px-2.5 py-1 text-[11px] font-semibold ${typeAccentClass[job.type]}`}>
                        {job.type}
                      </span>
                      <span className="inline-flex items-center gap-1 text-xs text-slate-500 dark:text-slate-400">
                        <Clock3 className="h-3.5 w-3.5" />
                        {deadlineDays !== null
                          ? `${deadlineDays} day${deadlineDays !== 1 ? "s" : ""} left`
                          : job.applicationDeadline || "Open"}
                      </span>
                    </div>

                    {(job.externalUrl || job.contactEmail) && (
                      <a
                        href={href}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="mt-4 inline-flex w-fit items-center gap-1.5 rounded-lg bg-primary px-3 py-1.5 text-sm font-medium text-white transition-colors hover:bg-primary/90"
                      >
                        Apply now
                        <ArrowUpRight className="h-3.5 w-3.5" />
                      </a>
                    )}
                  </article>
                );
              })}
            </div>
          </>
        )}
        {!loading && jobTab === "all" ? jobMatch.samples : null}
      </div>
    </Card>
  );
}
