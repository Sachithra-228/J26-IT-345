"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import clsx from "clsx";
import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { User, PanelLeftClose, ChevronRight, UserCircle, LogOut, Moon, Sun } from "lucide-react";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
  SidebarTrigger,
  useSidebar
} from "@/components/ui/sidebar";
import { getSectionIcon } from "@/lib/dashboard-icons";
import {
  DASHBOARD_ROLE_CONFIG,
  type DashboardRole,
  type DashboardSection
} from "@/lib/role-dashboard-config";
import {
  getNotificationSectionId,
  type DashboardNotification
} from "@/lib/dashboard-notification-routing";
import { useAuth } from "@/context/auth-context";
import { useLanguage } from "@/context/language-context";
import { useTheme } from "@/context/theme-context";
import type { UserProfile } from "@/types";

type AppSidebarProps = {
  role: DashboardRole;
  user: UserProfile | null;
};

export function AppSidebar({ role, user }: AppSidebarProps) {
  const pathname = usePathname();
  const { collapsed, isMobile, setMobileOpen } = useSidebar();
  const isCompact = !isMobile && collapsed;
  const { signOutUser } = useAuth();
  const { language } = useLanguage();
  const { theme, toggleTheme } = useTheme();
  const [hash, setHash] = useState("");
  const [accountOpen, setAccountOpen] = useState(false);
  const [notifications, setNotifications] = useState<DashboardNotification[]>([]);
  const markingIdsRef = useRef<Set<string>>(new Set());
  const accountRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const close = (e: MouseEvent) => {
      if (accountRef.current && !accountRef.current.contains(e.target as Node)) setAccountOpen(false);
    };
    if (accountOpen) {
      document.addEventListener("click", close);
      return () => document.removeEventListener("click", close);
    }
  }, [accountOpen]);

  useEffect(() => {
    setHash(typeof window !== "undefined" ? window.location.hash.slice(1) : "");
    const onHash = () => setHash(window.location.hash.slice(1));
    window.addEventListener("hashchange", onHash);
    return () => window.removeEventListener("hashchange", onHash);
  }, [role]);

  useEffect(() => {
    if (isMobile) setMobileOpen(false);
  }, [isMobile, pathname, setMobileOpen]);

  const config = DASHBOARD_ROLE_CONFIG[role];
  const text =
    language === "si"
      ? { menu: "මෙනුව", account: "ගිණුම", signOut: "ඉවත් වන්න" }
      : language === "ta"
        ? { menu: "மெனு", account: "கணக்கு", signOut: "வெளியேறு" }
        : { menu: "Menu", account: "Account", signOut: "Sign out" };
  useEffect(() => {
    let cancelled = false;

    const canPoll = () => document.visibilityState === "visible" && document.hasFocus();

    const fetchNotifications = () => {
      if (!canPoll()) return;
      fetch("/api/notifications")
        .then((response) => (response.ok ? response.json() : {}))
        .then((data) => {
          if (cancelled) return;
          const list = Array.isArray((data as { notifications?: unknown[] }).notifications)
            ? ((data as { notifications: DashboardNotification[] }).notifications ?? []).map((item) => ({
                ...item,
                id: item.id ?? item._id
              }))
            : [];
          setNotifications(list);
        })
        .catch(() => {
          if (!cancelled) setNotifications([]);
        });
    };

    fetchNotifications();
    const intervalId = window.setInterval(fetchNotifications, 60000);
    const handleVisibilityOrFocus = () => {
      fetchNotifications();
    };
    window.addEventListener("focus", handleVisibilityOrFocus);
    document.addEventListener("visibilitychange", handleVisibilityOrFocus);
    return () => {
      cancelled = true;
      window.clearInterval(intervalId);
      window.removeEventListener("focus", handleVisibilityOrFocus);
      document.removeEventListener("visibilitychange", handleVisibilityOrFocus);
    };
  }, []);

  const sectionIds = useMemo(() => new Set(config.sections.map((section) => section.id)), [config.sections]);
  const sectionNotificationCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    config.sections.forEach((section) => {
      counts[section.id] = 0;
    });

    notifications
      .filter((item) => !item.read)
      .forEach((item) => {
        const sectionId = getNotificationSectionId(role, item, sectionIds);
        if (sectionId && sectionId in counts) {
          counts[sectionId] += 1;
        }
      });

    return counts;
  }, [config.sections, notifications, role, sectionIds]);

  const activeSectionId = hash || config.sections[0]?.id || "";

  useEffect(() => {
    if (!activeSectionId) return;

    const unreadIdsForActiveSection = notifications
      .filter((item) => !item.read)
      .filter((item) => getNotificationSectionId(role, item, sectionIds) === activeSectionId)
      .map((item) => String(item.id ?? item._id ?? "").trim())
      .filter(Boolean)
      .filter((id) => !markingIdsRef.current.has(id));

    if (!unreadIdsForActiveSection.length) return;

    unreadIdsForActiveSection.forEach((id) => markingIdsRef.current.add(id));

    fetch("/api/notifications", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ids: unreadIdsForActiveSection })
    })
      .then((response) => {
        if (!response.ok) return;
        setNotifications((current) =>
          current.map((item) =>
            unreadIdsForActiveSection.includes(String(item.id ?? item._id ?? "").trim())
              ? { ...item, read: true }
              : item
          )
        );
      })
      .finally(() => {
        unreadIdsForActiveSection.forEach((id) => markingIdsRef.current.delete(id));
      });
  }, [activeSectionId, notifications, role, sectionIds]);

  return (
    <Sidebar>
      <SidebarHeader className="gap-2">
        {!isCompact ? (
          <Link href="/" className="flex min-w-0 flex-1 items-center gap-2.5" aria-label="UniCare Connect">
            <Image
              src="/logo.png"
              alt="UniCare Connect"
              width={136}
              height={38}
              className="h-8 w-auto object-contain"
              priority
            />
          </Link>
        ) : null}
        <SidebarTrigger className="shrink-0">
          <PanelLeftClose className="size-5 text-white dark:text-neutral-800" />
        </SidebarTrigger>
      </SidebarHeader>

      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>{text.menu}</SidebarGroupLabel>
          <SidebarMenu>
            {config.sections.map((section: DashboardSection) => {
              const href = `/dashboard/${role}#${section.id}`;
              const isActive = pathname === `/dashboard/${role}` && (hash || config.sections[0]?.id) === section.id;
              const SectionIcon = getSectionIcon(section.id);
              const unreadCount = sectionNotificationCounts[section.id] ?? 0;
              const handleClick = (e: React.MouseEvent) => {
                if (pathname === `/dashboard/${role}`) {
                  e.preventDefault();
                  window.location.hash = section.id;
                }
                if (isMobile) setMobileOpen(false);
              };
              return (
                <SidebarMenuItem key={section.id}>
                  <SidebarMenuButton asChild isActive={isActive}>
                    <Link href={href} onClick={handleClick} className="flex w-full items-center gap-3.5">
                      <span className="relative inline-flex shrink-0">
                        <SectionIcon
                          className={clsx(
                            "size-[18px] transition-colors",
                            isActive
                              ? "text-white dark:text-white"
                              : "text-white dark:text-neutral-800"
                          )}
                        />
                        {isCompact && unreadCount > 0 ? (
                          <span className="absolute -right-1 -top-1 h-2 w-2 rounded-full bg-white dark:bg-neutral-900" aria-hidden />
                        ) : null}
                      </span>
                      {!isCompact && (
                        <>
                          <span
                            className={clsx(
                              "flex-1 truncate transition-colors",
                              isActive
                                ? "text-white dark:text-white"
                                : "text-white dark:text-neutral-800"
                            )}
                          >
                            {section.menuLabel}
                          </span>
                          {unreadCount > 0 ? (
                            <span
                              className={clsx(
                                "inline-flex min-w-5 items-center justify-center rounded-full px-1.5 py-0.5 text-[10px] font-bold leading-none",
                                isActive
                                  ? "bg-white text-black dark:bg-white dark:text-black"
                                  : "bg-white text-black dark:bg-neutral-900 dark:text-white"
                              )}
                            >
                              {unreadCount > 99 ? "99+" : unreadCount}
                            </span>
                          ) : null}
                        </>
                      )}
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              );
            })}
          </SidebarMenu>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter>
        <div className="relative" ref={accountRef}>
          <button
            type="button"
            onClick={() => setAccountOpen((o) => !o)}
            className={clsx(
              "flex w-full items-center gap-2.5 rounded-xl border border-white/15 bg-neutral-950 px-3 py-2.5 text-left text-white transition-colors hover:border-white/30 hover:bg-neutral-900 dark:border-neutral-400/50 dark:bg-white/50 dark:text-neutral-900 dark:hover:bg-white/75",
              isCompact && "justify-center px-1.5"
            )}
            aria-expanded={accountOpen}
            aria-haspopup="true"
          >
            <div className="flex size-8 shrink-0 items-center justify-center overflow-hidden rounded-full bg-white/15 text-white dark:bg-neutral-300 dark:text-neutral-800">
              {user?.profilePic ? (
                <img src={user.profilePic} alt="" className="h-full w-full object-cover" />
              ) : (
                <User className="size-4 text-white dark:text-neutral-800" />
              )}
            </div>
            {!isCompact && user && (
              <div className="min-w-0 flex-1">
                <p className="truncate text-xs font-semibold text-white dark:text-neutral-900">{user.name}</p>
                <p className="truncate text-[11px] text-white/60 dark:text-neutral-600">{user.email}</p>
              </div>
            )}
            {!isCompact && (
              <ChevronRight
                className={clsx(
                  "size-4 shrink-0 text-white/70 transition-transform dark:text-neutral-600",
                  accountOpen && "translate-x-0.5"
                )}
              />
            )}
          </button>

          {accountOpen && (
            <div
              className={clsx(
                "absolute z-50 min-w-[11.5rem] overflow-hidden rounded-2xl border border-white/15 bg-neutral-950 p-1.5 text-white shadow-2xl dark:border-neutral-300 dark:bg-neutral-200/95 dark:text-neutral-900 dark:backdrop-blur-xl",
                isMobile
                  ? "bottom-full left-0 right-0 mb-2"
                  : "bottom-0 left-full ml-3"
              )}
              role="menu"
            >
              <Link
                href={`/dashboard/${role}#profile`}
                onClick={() => {
                  setAccountOpen(false);
                  if (isMobile) setMobileOpen(false);
                }}
                className="flex items-center gap-2.5 rounded-xl px-3 py-2 text-xs font-medium text-white/90 transition-colors hover:bg-white/10 hover:text-white dark:text-neutral-800 dark:hover:bg-black/10 dark:hover:text-black"
                role="menuitem"
              >
                <UserCircle className="size-4 shrink-0 text-white dark:text-neutral-800" />
                {text.account}
              </Link>
              <button
                type="button"
                onClick={() => {
                  toggleTheme();
                }}
                className="flex w-full items-center gap-2.5 rounded-xl px-3 py-2 text-xs font-medium text-white/90 transition-colors hover:bg-white/10 hover:text-white dark:text-neutral-800 dark:hover:bg-black/10 dark:hover:text-black"
                role="menuitem"
                aria-label={theme === "dark" ? "Switch to light mode" : "Switch to dark mode"}
              >
                {theme === "dark" ? (
                  <Sun className="size-4 shrink-0 text-white dark:text-neutral-800" />
                ) : (
                  <Moon className="size-4 shrink-0 text-white dark:text-neutral-800" />
                )}
                <span>{theme === "dark" ? "Light mode" : "Dark mode"}</span>
              </button>
              <button
                type="button"
                onClick={() => {
                  setAccountOpen(false);
                  if (isMobile) setMobileOpen(false);
                  signOutUser();
                }}
                className="mt-0.5 flex w-full items-center gap-2.5 rounded-xl border-t border-white/10 px-3 py-2 text-xs font-medium text-rose-400 transition-colors hover:bg-white/10 hover:text-rose-300 dark:border-neutral-300 dark:text-rose-600 dark:hover:bg-rose-500/10"
                role="menuitem"
              >
                <LogOut className="size-4 shrink-0" />
                {text.signOut}
              </button>
            </div>
          )}
        </div>
      </SidebarFooter>
    </Sidebar>
  );
}
