"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowUpRight, Bell, CalendarClock, FileCheck2 } from "lucide-react";
import { useAuth } from "@/context/auth-context";
import { useLanguage } from "@/context/language-context";
import {
  DASHBOARD_ROLE_CONFIG,
  DASHBOARD_ROLE_ORDER,
  DashboardRole,
  resolveDashboardRole
} from "@/lib/role-dashboard-config";
import { getSectionIcon } from "@/lib/dashboard-icons";
import { DashboardHeader } from "@/components/dashboard/dashboard-header";
import { StudentSectionContent } from "@/components/dashboard/student/student-section-content";
import { AdminSectionContent } from "@/components/admin/admin-section-content";
import { DonorSectionContent } from "@/components/donor/donor-section-content";
import { NgoSectionContent } from "@/components/ngo/ngo-section-content";
import { EmployerSectionContent } from "@/components/employer/employer-section-content";
import { ParentSectionContent } from "@/components/parent/parent-section-content";
import { MentorSectionContent } from "@/components/mentor/mentor-section-content";

type RoleDashboardPageProps = {
  params: { role: string };
};

function resolveRouteRole(value: string): DashboardRole | null {
  const normalized = value.toLowerCase();
  return DASHBOARD_ROLE_ORDER.find((r) => r === normalized) ?? null;
}

type QuickStats = {
  pendingApplications: number;
  upcomingDeadlines: number;
  unreadNotifications: number;
};

type DashboardNotification = {
  id?: string;
  _id?: string;
  title?: string;
  message?: string;
  date?: string;
  createdAt?: string;
  read?: boolean;
};

export default function RoleDashboardPage({ params }: RoleDashboardPageProps) {
  const routeRole = resolveRouteRole(params.role);
  const { user, loading } = useAuth();
  const { language } = useLanguage();
  const router = useRouter();
  const [activeSectionId, setActiveSectionId] = useState("");
  const [quickStats, setQuickStats] = useState<QuickStats>({
    pendingApplications: 0,
    upcomingDeadlines: 0,
    unreadNotifications: 0
  });
  const [notifications, setNotifications] = useState<DashboardNotification[]>([]);
  const unreadNotificationCount = notifications.filter((item) => !item.read).length;

  const roleConfig = useMemo(
    () => (routeRole ? DASHBOARD_ROLE_CONFIG[routeRole] : null),
    [routeRole]
  );
  const text =
    language === "si"
      ? {
          loading: "ඔබගේ ඩෑෂ්බෝඩ් පූරණය වෙමින්...",
          pendingApplications: "පොරොත්තුවේ ඇති අයදුම්පත්",
          upcomingDeadlines: "ඉදිරි අවසන් දිනයන්",
          unreadNotifications: "නොකියවූ දැනුම්දීම්"
        }
      : language === "ta"
        ? {
            loading: "உங்கள் டாஷ்போர்டு ஏற்றப்படுகிறது...",
            pendingApplications: "நிலுவையில் உள்ள விண்ணப்பங்கள்",
            upcomingDeadlines: "வரவிருக்கும் கடைசி தேதிகள்",
            unreadNotifications: "படிக்காத அறிவிப்புகள்"
          }
        : {
            loading: "Loading your dashboard...",
            pendingApplications: "Pending applications",
            upcomingDeadlines: "Upcoming deadlines",
            unreadNotifications: "Unread notifications"
          };

  useEffect(() => {
    if (!roleConfig) {
      router.replace("/dashboard");
      return;
    }
    if (typeof window === "undefined") return;
    const hash = window.location.hash.slice(1);
    const validFromHash = hash && roleConfig.sections.some((s) => s.id === hash);
    const sectionId = validFromHash ? hash : roleConfig.sections[0]?.id ?? "";
    setActiveSectionId(sectionId);
    if (!validFromHash && sectionId) {
      window.history.replaceState(null, "", `#${sectionId}`);
    }
  }, [roleConfig, router]);

  useEffect(() => {
    if (!roleConfig) return;
    const onHash = () => {
      const hash = window.location.hash.slice(1);
      if (hash && roleConfig.sections.some((s) => s.id === hash)) setActiveSectionId(hash);
    };
    window.addEventListener("hashchange", onHash);
    return () => window.removeEventListener("hashchange", onHash);
  }, [roleConfig]);

  useEffect(() => {
    if (loading) return;
    if (!user) {
      router.replace("/login?mode=signin");
      return;
    }
    const expectedRole = resolveDashboardRole(user.role);
    if (!routeRole || routeRole !== expectedRole) {
      router.replace(`/dashboard/${expectedRole}`);
    }
  }, [loading, routeRole, router, user]);

  const fetchNotifications = useCallback(() => {
    fetch("/api/notifications")
      .then((response) => (response.ok ? response.json() : {}))
      .then((data) => {
        const notificationList = Array.isArray((data as { notifications?: unknown[] }).notifications)
          ? ((data as { notifications: DashboardNotification[] }).notifications ?? []).map((item) => ({
              ...item,
              id: item.id ?? item._id
            }))
          : [];
        setNotifications(notificationList);
      })
      .catch(() => setNotifications([]));
  }, []);

  useEffect(() => {
    if (!user) return;
    fetchNotifications();
    const intervalId = setInterval(fetchNotifications, 30000);
    return () => clearInterval(intervalId);
  }, [fetchNotifications, user]);

  useEffect(() => {
    if (routeRole !== "student") return;
    Promise.all([
      fetch("/api/aid-requests").then((r) => r.json()).catch(() => []),
      fetch("/api/scholarships").then((r) => r.json()).catch(() => []),
      fetch("/api/jobs").then((r) => r.json()).catch(() => [])
    ]).then(([aid, scholarships, jobs]) => {
      const aidList = Array.isArray(aid) ? aid : [];
      const pendingApps = aidList.filter(
        (a: { status?: string }) =>
          a.status && !["Approved", "Rejected", "approved", "rejected"].includes(a.status)
      ).length;
      const schList = Array.isArray(scholarships) ? scholarships : [];
      const jobList = Array.isArray(jobs) ? jobs : [];
      const today = new Date().toISOString().split("T")[0];
      const deadlines = [
        ...schList.map((s: { deadline?: string }) => s.deadline).filter((d): d is string => Boolean(d)),
        ...jobList
          .map((j: { applicationDeadline?: string }) => j.applicationDeadline)
          .filter((d): d is string => Boolean(d))
      ].filter((d) => d >= today).length;
      setQuickStats({
        pendingApplications: pendingApps,
        upcomingDeadlines: deadlines,
        unreadNotifications: unreadNotificationCount
      });
    });
  }, [routeRole, unreadNotificationCount]);

  if (loading || !roleConfig || !routeRole) {
    return (
      <div className="rounded-3xl border border-slate-200/80 bg-white p-6 text-sm text-slate-600 shadow-sm dark:border-white/10 dark:bg-neutral-950 dark:text-neutral-300">
        {text.loading}
      </div>
    );
  }

  if (!user) return null;

  const activeSection =
    roleConfig.sections.find((s) => s.id === activeSectionId) ?? roleConfig.sections[0];
  const ActiveSectionIcon = getSectionIcon(activeSection.id);

  const isHomeSection = activeSectionId === "home";
  // These student sections lead with their own bento tiles, so the title bar is redundant.
  const hideSectionHeader =
    routeRole === "student" && (activeSection.id === "financial-aid" || activeSection.id === "aid-matching");

  return (
    <div className="space-y-4">
      {isHomeSection ? (
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-12">
          <div className="lg:col-span-6">
            <DashboardHeader />
          </div>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3 lg:col-span-6">
            <a
              href={`/dashboard/${routeRole}#my-applications`}
              className="group relative flex flex-col justify-between overflow-hidden rounded-3xl border border-slate-200/80 bg-white p-5 shadow-[0_2px_12px_-4px_rgba(15,23,42,0.05)] transition-all duration-200 hover:-translate-y-0.5 hover:border-slate-300 hover:shadow-md dark:border-white/10 dark:bg-neutral-950 dark:hover:border-white/25"
            >
              <div className="flex items-center justify-between">
                <span className="flex size-10 items-center justify-center rounded-2xl bg-blue-50 text-blue-600 dark:bg-neutral-900 dark:text-blue-400">
                  <FileCheck2 className="size-5" />
                </span>
                <ArrowUpRight className="size-4 text-slate-400 transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5 group-hover:text-slate-700 dark:text-neutral-500 dark:group-hover:text-white" />
              </div>
              <div className="mt-4">
                <p className="text-3xl font-bold tracking-tight text-slate-900 dark:text-white">
                  {quickStats.pendingApplications}
                </p>
                <p className="mt-1 text-xs font-medium text-slate-500 dark:text-neutral-400">
                  {text.pendingApplications}
                </p>
              </div>
            </a>

            <a
              href={`/dashboard/${routeRole}#home`}
              className="group relative flex flex-col justify-between overflow-hidden rounded-3xl border border-slate-200/80 bg-white p-5 shadow-[0_2px_12px_-4px_rgba(15,23,42,0.05)] transition-all duration-200 hover:-translate-y-0.5 hover:border-slate-300 hover:shadow-md dark:border-white/10 dark:bg-neutral-950 dark:hover:border-white/25"
            >
              <div className="flex items-center justify-between">
                <span className="flex size-10 items-center justify-center rounded-2xl bg-amber-50 text-amber-600 dark:bg-neutral-900 dark:text-amber-400">
                  <CalendarClock className="size-5" />
                </span>
                <ArrowUpRight className="size-4 text-slate-400 transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5 group-hover:text-slate-700 dark:text-neutral-500 dark:group-hover:text-white" />
              </div>
              <div className="mt-4">
                <p className="text-3xl font-bold tracking-tight text-slate-900 dark:text-white">
                  {quickStats.upcomingDeadlines}
                </p>
                <p className="mt-1 text-xs font-medium text-slate-500 dark:text-neutral-400">
                  {text.upcomingDeadlines}
                </p>
              </div>
            </a>

            <a
              href={`/dashboard/${routeRole}#profile`}
              className="group relative flex flex-col justify-between overflow-hidden rounded-3xl border border-slate-200/80 bg-white p-5 shadow-[0_2px_12px_-4px_rgba(15,23,42,0.05)] transition-all duration-200 hover:-translate-y-0.5 hover:border-slate-300 hover:shadow-md dark:border-white/10 dark:bg-neutral-950 dark:hover:border-white/25"
            >
              <div className="flex items-center justify-between">
                <span className="flex size-10 items-center justify-center rounded-2xl bg-emerald-50 text-emerald-600 dark:bg-neutral-900 dark:text-emerald-400">
                  <Bell className="size-5" />
                </span>
                <ArrowUpRight className="size-4 text-slate-400 transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5 group-hover:text-slate-700 dark:text-neutral-500 dark:group-hover:text-white" />
              </div>
              <div className="mt-4">
                <p className="text-3xl font-bold tracking-tight text-slate-900 dark:text-white">
                  {quickStats.unreadNotifications}
                </p>
                <p className="mt-1 text-xs font-medium text-slate-500 dark:text-neutral-400">
                  {text.unreadNotifications}
                </p>
              </div>
            </a>
          </div>
        </div>
      ) : hideSectionHeader ? null : (
        <div className="flex items-center justify-between rounded-3xl border border-slate-200/80 bg-white px-6 py-4 shadow-[0_2px_12px_-4px_rgba(15,23,42,0.05)] dark:border-white/10 dark:bg-neutral-950">
          <div className="flex items-center gap-3.5">
            <div className="flex size-10 shrink-0 items-center justify-center rounded-2xl bg-slate-100 text-slate-700 dark:bg-neutral-900 dark:text-neutral-200">
              <ActiveSectionIcon className="size-5" />
            </div>
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-400 dark:text-neutral-500">
                {activeSection.menuLabel}
              </p>
              <h2 className="text-base font-bold tracking-tight text-slate-900 sm:text-lg dark:text-white">
                {activeSection.title}
              </h2>
            </div>
          </div>
        </div>
      )}

      <div>
        {routeRole === "student" ? (
          <StudentSectionContent sectionId={activeSection.id} />
        ) : routeRole === "admin" || routeRole === "faculty" ? (
          <AdminSectionContent sectionId={activeSection.id} />
        ) : routeRole === "donor" ? (
          <DonorSectionContent sectionId={activeSection.id} />
        ) : routeRole === "ngo" ? (
          <NgoSectionContent sectionId={activeSection.id} />
        ) : routeRole === "employer" ? (
          <EmployerSectionContent sectionId={activeSection.id} />
        ) : routeRole === "parent" ? (
          <ParentSectionContent sectionId={activeSection.id} />
        ) : routeRole === "mentor" ? (
          <MentorSectionContent sectionId={activeSection.id} />
        ) : (
          <ul className="grid gap-3 sm:grid-cols-2">
            {activeSection.items.map((item) => (
              <li
                key={item}
                className="rounded-2xl border border-slate-200/80 bg-white px-4 py-3 text-sm text-slate-700 dark:border-white/10 dark:bg-neutral-950 dark:text-neutral-200"
              >
                {item}
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
