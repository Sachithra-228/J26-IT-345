"use client";

import { usePathname } from "next/navigation";
import { PanelLeftOpen } from "lucide-react";
import { useAuth } from "@/context/auth-context";
import { SidebarProvider, SidebarInset, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/dashboard/app-sidebar";
import {
  DASHBOARD_ROLE_CONFIG,
  DASHBOARD_ROLE_ORDER,
  resolveDashboardRole,
  type DashboardRole
} from "@/lib/role-dashboard-config";

function getRoleFromPathname(pathname: string): DashboardRole | null {
  const match = pathname.match(/^\/dashboard\/([^/]+)/);
  const role = match?.[1]?.toLowerCase();
  return role && DASHBOARD_ROLE_ORDER.includes(role as DashboardRole) ? (role as DashboardRole) : null;
}

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const { user } = useAuth();
  const roleFromPath = getRoleFromPathname(pathname);
  const role = roleFromPath ?? resolveDashboardRole(user?.role ?? null) ?? "student";

  return (
    <SidebarProvider defaultCollapsed={false}>
      <AppSidebar role={role} user={user ?? null} />
      <SidebarInset>
        <div className="flex min-h-screen flex-col bg-[#f8fafc] p-4 transition-colors md:p-6 lg:p-8 dark:bg-black">
          <div className="mb-4 flex items-center gap-3 lg:hidden">
            <SidebarTrigger className="border border-slate-200 bg-white text-slate-700 shadow-sm hover:bg-slate-100 dark:border-white/15 dark:bg-neutral-950 dark:text-neutral-200 dark:hover:bg-neutral-900">
              <PanelLeftOpen className="size-5" />
            </SidebarTrigger>
            <p className="text-sm font-semibold text-slate-700 dark:text-neutral-200">
              {DASHBOARD_ROLE_CONFIG[role].workspaceLabel}
            </p>
          </div>
          {children}
        </div>
      </SidebarInset>
    </SidebarProvider>
  );
}
