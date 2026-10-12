"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Card } from "@/components/shared/Card";
import { StatCard } from "@/components/shared/stat-card";
import { Button } from "@/components/shared/Button";
import { Input } from "@/components/shared/Input";
import { AdminAnalytics } from "./admin-analytics";
import { AdminCounselorSupportSection } from "./admin-counselor-support";
import { AdminPeerSupportModerationSection } from "./admin-peer-support";
import { AdminCommunicationsSection } from "./admin-communications";
import { AdminAidPrioritisation } from "./admin-aid-prioritisation";
import { AdminFundLedgerSection } from "@/components/c1/ledger-section";
import { CareerInsightsAdmin } from "@/components/c3/career-insights-admin";
import { adminNavyCardClass } from "./admin-card-theme";
import { NgoPartnershipSection } from "@/components/shared/ngo-partnership-section";
import { useAuth } from "@/context/auth-context";
import {
  defaultPreferences,
  mergePreferences,
  tabVariants,
  type ProfilePreferences,
  type ProfileTab
} from "@/components/profile/profile-preferences";

type AdminSectionContentProps = {
  sectionId: string;
};

export function AdminSectionContent({ sectionId }: AdminSectionContentProps) {
  const Section = useMemo(() => {
    switch (sectionId) {
      case "overview":
        return AdminOverviewSection;
      case "verifications":
        return AdminVerificationsSection;
      case "financial-oversight":
        return AdminFinancialOversightSection;
      case "aid-prioritisation":
        return AdminAidPrioritisation;
      case "fund-ledger":
        return AdminFundLedgerSection;
      case "career-services":
        return AdminCareerServicesSection;
      case "career-readiness":
        return CareerInsightsAdmin;
      case "mentorship-program":
        return AdminMentorshipProgramSection;
      case "counselor-support":
        return AdminCounselorSupportSection;
      case "peer-support":
        return AdminPeerSupportModerationSection;
      case "reports":
        return AdminReportsSection;
      case "announcements":
        return AdminAnnouncementsSection;
      case "partnerships":
        return AdminPartnershipsSection;
      case "ngo-partnerships":
        return AdminNgoPartnershipSection;
      case "communications":
        return AdminCommunicationsSection;
      case "profile":
        return AdminProfileSection;
      default:
        return AdminOverviewSection;
    }
  }, [sectionId]);

  return <Section />;
}

function AdminOverviewSection() {
  type OverviewData = {
    stats: {
      activeStudents: number;
      pendingVerifications: number;
      openAidRequests: number;
      openTickets: number;
    };
    recentActivity: Array<{
      id: string;
      type: string;
      status: string;
      owner: string;
      createdAt: string;
    }>;
    upcomingDeadlines: Array<{ id: string; label: string; date: string }>;
    systemHealth: {
      database: string;
      auth: string;
      background: string;
    };
  };

  const [data, setData] = useState<OverviewData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadOverview = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch("/api/admin/overview");
      const payload = (await response.json().catch(() => ({}))) as Partial<OverviewData> & { message?: string };
      if (!response.ok) {
        setError(payload.message ?? "Unable to load overview data.");
        setData(null);
        return;
      }
      setData(payload as OverviewData);
    } catch {
      setError("Unable to load overview data.");
      setData(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadOverview();
  }, [loadOverview]);

  const statValue = (value: number | undefined) => (typeof value === "number" ? String(value) : "-");
  const formatDate = (value: string | undefined) => {
    if (!value) return "";
    const date = new Date(value);
    return Number.isNaN(date.getTime()) ? value : date.toLocaleDateString();
  };

  const recentActivity = data?.recentActivity ?? [];
  const upcomingDeadlines = data?.upcomingDeadlines ?? [];
  const systemHealth = data?.systemHealth;

  return (
    <div className="space-y-8">
      {error ? (
        <p className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-2 text-sm text-rose-700 dark:border-rose-900/40 dark:bg-rose-950/30 dark:text-rose-300">
          {error}
        </p>
      ) : null}

      <div className="grid gap-4 md:grid-cols-4">
        <StatCard
          label="Active students"
          value={loading ? "..." : statValue(data?.stats.activeStudents)}
          description="Students not blocked/deleted"
        />
        <StatCard
          label="Pending verifications"
          value={loading ? "..." : statValue(data?.stats.pendingVerifications)}
          description="Students / NGOs / donors"
        />
        <StatCard
          label="Open aid requests"
          value={loading ? "..." : statValue(data?.stats.openAidRequests)}
          description="Awaiting decision"
        />
        <StatCard
          label="Open tickets"
          value={loading ? "..." : statValue(data?.stats.openTickets)}
          description="Counselor + account deletion queue"
        />
      </div>

      <AdminAnalytics />

      <Card className="space-y-3">
        <h3 className="text-lg font-semibold">Recent activity</h3>
        {loading ? (
          <p className="text-sm text-slate-500">Loading recent activity...</p>
        ) : !recentActivity.length ? (
          <p className="text-sm text-slate-500">No recent activity.</p>
        ) : (
          <div className="space-y-3 text-sm">
            {recentActivity.map((item) => (
              <div
                key={item.id}
                className="rounded-xl border border-slate-200 p-3 dark:border-slate-800"
              >
                <p className="font-semibold">{item.type}</p>
                <p className="text-slate-500">{item.status}</p>
                <p className="text-xs text-slate-400">
                  Owner: {item.owner} {item.createdAt ? `- ${formatDate(item.createdAt)}` : ""}
                </p>
              </div>
            ))}
          </div>
        )}
      </Card>

      <div className="grid gap-6 md:grid-cols-2">
        <Card className="space-y-3 p-5">
          <h3 className="text-lg font-semibold">Upcoming deadlines</h3>
          {loading ? (
            <p className="text-sm text-slate-500">Loading deadlines...</p>
          ) : !upcomingDeadlines.length ? (
            <p className="text-sm text-slate-500">No upcoming deadlines found.</p>
          ) : (
            <ul className="space-y-2 text-sm">
              {upcomingDeadlines.map((deadline) => (
                <li
                  key={deadline.id}
                  className="flex items-center justify-between rounded-xl border border-slate-200 px-3 py-2 dark:border-slate-800"
                >
                  <span>{deadline.label}</span>
                  <span className="text-xs text-slate-500">{formatDate(deadline.date)}</span>
                </li>
              ))}
            </ul>
          )}
        </Card>
        <Card className="space-y-3 p-5">
          <h3 className="text-lg font-semibold">System health</h3>
          <ul className="space-y-2 text-sm">
            <li className="flex items-center justify-between">
              <span>Database connection</span>
              <span className="text-xs font-medium text-emerald-600 dark:text-emerald-300">
                {loading ? "Checking..." : systemHealth?.database ?? "Unknown"}
              </span>
            </li>
            <li className="flex items-center justify-between">
              <span>Auth service</span>
              <span className="text-xs font-medium text-emerald-600 dark:text-emerald-300">
                {loading ? "Checking..." : systemHealth?.auth ?? "Unknown"}
              </span>
            </li>
            <li className="flex items-center justify-between">
              <span>Background jobs</span>
              <span className="text-xs font-medium text-slate-600 dark:text-slate-300">
                {loading ? "Checking..." : systemHealth?.background ?? "Unknown"}
              </span>
            </li>
          </ul>
        </Card>
      </div>
    </div>
  );
}

function AdminVerificationsSection() {
  type VerificationItem = {
    id: string;
    kind: "user" | "aid" | "ngo";
    type: string;
    role: string;
    status: string;
    ngoDecision?: string;
    note: string;
    createdAt: string;
  };

  const [items, setItems] = useState<VerificationItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<"table" | "card">("table");

  const loadItems = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch("/api/admin/verifications");
      const payload = (await response.json().catch(() => ({}))) as {
        message?: string;
        items?: VerificationItem[];
      };
      if (!response.ok) {
        setError(payload.message ?? "Unable to load verification queue.");
        setItems([]);
      } else {
        const fetchedItems = Array.isArray(payload.items) ? payload.items : [];
        import("@/lib/ngo-demo-store").then(({ getNgoApplications, getNgoBeneficiaries }) => {
          const beneficiaries = getNgoBeneficiaries();
          const ngoApps = getNgoApplications().filter(a => a.status === "pending_admin" || a.status === "verified_by_admin" || a.status === "rejected").map(app => {
            const status = app.status === "pending_admin" ? "Pending" 
                  : app.status === "verified_by_admin" ? "Approved" 
                  : "Rejected";
            
            let ngoDecision = "";
            if (app.status === "verified_by_admin") {
              const b = beneficiaries.find(ben => ben.applicationId === app._id);
              ngoDecision = b?.isDisbursed ? "Success" : "Pending";
            }

            return {
              id: app._id,
              kind: "ngo" as const,
              type: "NGO Program Request",
              role: "Student",
              status,
              ngoDecision,
              note: `${app.programTitle} - ${app.amountRequested ? `Requested LKR ${app.amountRequested}` : "Needs Support"}`,
              createdAt: app.appliedAt
            };
          });
          setItems([...fetchedItems, ...ngoApps].sort((a,b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()));
        });
      }
    } catch {
      setError("Unable to load verification queue.");
      setItems([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadItems();
  }, [loadItems]);

  const normalizeStatus = (status: string) => {
    const value = String(status).trim().toLowerCase();
    if (value === "approved" || value === "verified" || value === "active") return "Approved";
    if (value === "rejected" || value === "blocked") return "Rejected";
    if (value === "under review") return "Under review";
    if (value === "documents pending") return "Documents pending";
    return "Pending";
  };

  const canAction = (item: VerificationItem) => {
    const status = normalizeStatus(item.status);
    return status === "Pending" || status === "Under review" || status === "Documents pending";
  };

  const applyDecision = async (item: VerificationItem, decision: "approve" | "reject") => {
    setUpdatingId(item.id);
    setError(null);
    try {
      if (item.kind === "ngo") {
        const { updateNgoApplicationStatus } = await import("@/lib/ngo-demo-store");
        updateNgoApplicationStatus(item.id, decision === "approve" ? "verified_by_admin" : "rejected");
        await loadItems();
        setUpdatingId(null);
        return;
      }

      const response =
        item.kind === "user"
          ? await fetch("/api/admin/verifications", {
              method: "PATCH",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ kind: "user", id: item.id, decision })
            })
          : await fetch(`/api/aid-requests/${item.id}`, {
              method: "PATCH",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ status: decision === "approve" ? "Approved" : "Rejected" })
            });

      if (!response.ok) {
        const payload = (await response.json().catch(() => ({}))) as { message?: string; error?: string };
        setError(payload.message ?? payload.error ?? "Unable to update verification.");
        return;
      }

      await loadItems();
    } catch {
      setError("Unable to update verification.");
    } finally {
      setUpdatingId(null);
    }
  };

  const statusStyle = (status: string) => {
    const normalized = normalizeStatus(status);
    if (normalized === "Approved") {
      return "text-emerald-600 dark:text-emerald-300";
    }
    if (normalized === "Rejected") {
      return "text-rose-600 dark:text-rose-300";
    }
    return "text-amber-600 dark:text-amber-400";
  };

  const formatDate = (value: string) => {
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return value;
    return date.toLocaleDateString();
  };

  const renderNgoDecision = (ngoDecision?: string) => {
    if (ngoDecision === "Success") {
      return <span className="text-xs font-bold text-emerald-600 dark:text-emerald-400">Success</span>;
    }
    if (ngoDecision === "Pending") {
      return <span className="text-xs font-medium text-amber-600 dark:text-amber-400">Pending</span>;
    }
    return <span className="text-xs text-slate-400">N/A</span>;
  };

  return (
    <div className="space-y-4">
      <p className="text-sm text-slate-600 dark:text-slate-300">
        Verifications connect to student, NGO, and donor records. Individual student data cannot be
        edited from here; only verification status is managed.
      </p>
      {error ? (
        <p className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-2 text-sm text-rose-700 dark:border-rose-900/40 dark:bg-rose-950/30 dark:text-rose-300">
          {error}
        </p>
      ) : null}
      <div className="flex justify-end">
        <div className="inline-flex items-center gap-1 rounded-full border border-slate-200 bg-white/70 p-1 text-xs dark:border-slate-700 dark:bg-slate-900/40">
          <button
            type="button"
            onClick={() => setViewMode("table")}
            className={`rounded-full px-3 py-1.5 font-medium transition-colors ${
              viewMode === "table"
                ? "bg-primary text-white"
                : "text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800"
            }`}
          >
            Table view
          </button>
          <button
            type="button"
            onClick={() => setViewMode("card")}
            className={`rounded-full px-3 py-1.5 font-medium transition-colors ${
              viewMode === "card"
                ? "bg-primary text-white"
                : "text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800"
            }`}
          >
            Card view
          </button>
        </div>
      </div>
      <Card className={adminNavyCardClass}>
        {loading ? (
          <p className="px-4 py-3 text-sm text-slate-500">Loading verification queue...</p>
        ) : items.length === 0 ? (
          <p className="px-4 py-3 text-sm text-slate-500">No verification items right now.</p>
        ) : viewMode === "table" ? (
          <>
            <div className="grid grid-cols-6 gap-3 border-b border-slate-200 px-4 py-2 text-xs font-medium uppercase tracking-wide text-slate-500 dark:border-slate-800">
              <span>Type</span>
              <span>Role</span>
              <span>Status</span>
              <span>NGO Decision</span>
              <span>Notes</span>
              <span className="text-right">Action</span>
            </div>
            <div className="divide-y divide-slate-200 text-sm dark:divide-slate-800">
              {items.map((item) => {
                const status = normalizeStatus(item.status);
                const actionDisabled = updatingId === item.id || !canAction(item);
                return (
                  <div key={item.id} className="grid grid-cols-6 gap-3 px-4 py-3">
                    <span className="font-medium">{item.type}</span>
                    <span>{item.role}</span>
                    <span className={`text-xs font-semibold ${statusStyle(item.status)}`}>{status}</span>
                    <span>{renderNgoDecision(item.ngoDecision)}</span>
                    <span className="text-slate-500 dark:text-slate-400">
                      {item.note} {item.createdAt ? `(${formatDate(item.createdAt)})` : ""}
                    </span>
                    <div className="flex items-center justify-end gap-2">
                      <button
                        type="button"
                        className="rounded-full bg-emerald-50 px-3 py-1 text-xs font-medium text-emerald-700 hover:bg-emerald-100 disabled:cursor-not-allowed disabled:opacity-50 dark:bg-emerald-900/40 dark:text-emerald-300"
                        onClick={() => applyDecision(item, "approve")}
                        disabled={actionDisabled || status === "Approved"}
                      >
                        {updatingId === item.id ? "Updating..." : item.kind === "ngo" ? "Verify" : "Approve"}
                      </button>
                      <button
                        type="button"
                        className="rounded-full bg-rose-50 px-3 py-1 text-xs font-medium text-rose-700 hover:bg-rose-100 disabled:cursor-not-allowed disabled:opacity-50 dark:bg-rose-900/40 dark:text-rose-300"
                        onClick={() => applyDecision(item, "reject")}
                        disabled={actionDisabled || status === "Rejected"}
                      >
                        {updatingId === item.id ? "Updating..." : "Reject"}
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </>
        ) : (
          <div className="grid gap-3 p-4 md:grid-cols-2">
            {items.map((item) => {
              const status = normalizeStatus(item.status);
              const actionDisabled = updatingId === item.id || !canAction(item);
              return (
                <article
                  key={item.id}
                  className="space-y-3 rounded-2xl border border-blue-200/70 bg-white/75 p-4 shadow-sm dark:border-blue-400/20 dark:bg-slate-900/40"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="font-semibold text-slate-900 dark:text-white">{item.type}</p>
                      <p className="text-xs text-slate-500 dark:text-slate-400">{item.role}</p>
                    </div>
                    <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${statusStyle(item.status)}`}>
                      {status}
                    </span>
                  </div>
                  <div className="space-y-1 text-xs text-slate-600 dark:text-slate-300">
                    <p>
                      <span className="font-medium text-slate-700 dark:text-slate-200">NGO Decision:</span>{" "}
                      {renderNgoDecision(item.ngoDecision)}
                    </p>
                    <p>
                      <span className="font-medium text-slate-700 dark:text-slate-200">Notes:</span> {item.note}
                    </p>
                    <p>
                      <span className="font-medium text-slate-700 dark:text-slate-200">Date:</span>{" "}
                      {item.createdAt ? formatDate(item.createdAt) : "N/A"}
                    </p>
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    <button
                      type="button"
                      className="rounded-full bg-emerald-50 px-3 py-1 text-xs font-medium text-emerald-700 hover:bg-emerald-100 disabled:cursor-not-allowed disabled:opacity-50 dark:bg-emerald-900/40 dark:text-emerald-300"
                      onClick={() => applyDecision(item, "approve")}
                      disabled={actionDisabled || status === "Approved"}
                    >
                      {updatingId === item.id ? "Updating..." : item.kind === "ngo" ? "Verify" : "Approve"}
                    </button>
                    <button
                      type="button"
                      className="rounded-full bg-rose-50 px-3 py-1 text-xs font-medium text-rose-700 hover:bg-rose-100 disabled:cursor-not-allowed disabled:opacity-50 dark:bg-rose-900/40 dark:text-rose-300"
                      onClick={() => applyDecision(item, "reject")}
                      disabled={actionDisabled || status === "Rejected"}
                    >
                      {updatingId === item.id ? "Updating..." : "Reject"}
                    </button>
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </Card>
    </div>
  );
}

function AdminFinancialOversightSection() {
  type AidQueueItem = {
    _id?: string;
    id?: string;
    category?: string;
    amount?: string;
    status?: string;
    userId?: string;
    firebaseUid?: string;
    createdAt?: string;
    reviewNote?: string | null;
  };

  type FilterKey = "all" | "emergency" | "equipment" | "boarding" | "tuition";

  const [requests, setRequests] = useState<AidQueueItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [oversightError, setOversightError] = useState<string | null>(null);
  const [activeFilter, setActiveFilter] = useState<FilterKey>("all");
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const [reviewNotes, setReviewNotes] = useState<Record<string, string>>({});
  
  // NGO Funding tracking
  const [ngoFunding, setNgoFunding] = useState<any[]>([]);
  const [updatingNgoId, setUpdatingNgoId] = useState<string | null>(null);
  const [ngoNotifications, setNgoNotifications] = useState<any[]>([]);

  const requestId = (request: AidQueueItem, index: number) => request._id || request.id || `request-${index}`;

  const normalizeCategory = (category?: string): FilterKey | "other" => {
    const value = String(category ?? "").trim().toLowerCase();
    if (!value || value.includes("emergency")) return "emergency";
    if (value.includes("equipment")) return "equipment";
    if (value.includes("meal") || value.includes("voucher") || value.includes("boarding")) return "boarding";
    if (value.includes("tuition") || value.includes("maintenance") || value.includes("fee")) return "tuition";
    return "other";
  };

  const formatCategory = (category?: string) => {
    const normalized = normalizeCategory(category);
    if (normalized === "emergency") return "Emergency aid";
    if (normalized === "equipment") return "Equipment support";
    if (normalized === "boarding") return "Meal voucher support";
    if (normalized === "tuition") return "Tuition support";
    return category || "Other aid";
  };

  const normalizeStatus = (status?: string): "Approved" | "Rejected" | "Pending" => {
    const value = String(status ?? "").trim().toLowerCase();
    if (value === "approved") return "Approved";
    if (value === "rejected") return "Rejected";
    return "Pending";
  };

  const canReview = (status?: string) => {
    const value = String(status ?? "").trim().toLowerCase();
    return value === "pending" || value === "under review" || value === "";
  };

  const loadRequests = useCallback(async () => {
    setLoading(true);
    setOversightError(null);
    try {
      const response = await fetch("/api/aid-requests?scope=all");
      if (!response.ok) {
        const body = await response.json().catch(() => ({}));
        setOversightError((body as { message?: string; error?: string }).message ?? "Unable to load aid requests.");
        setRequests([]);
        return;
      }

      const data = await response.json();
      const nextRequests = Array.isArray(data) ? data : [];
      setRequests(nextRequests);
      setReviewNotes((current) => {
        const next = { ...current };
        nextRequests.forEach((item, index) => {
          const id = requestId(item, index);
          if (next[id] === undefined) {
            next[id] = String(item.reviewNote ?? "");
          }
        });
        return next;
      });
      
      // Load NGO Funding & Notifications
      import("@/lib/ngo-demo-store").then(({ getNgoFundingRecords, getAdminNotifications }) => {
        setNgoFunding(getNgoFundingRecords());
        setNgoNotifications(getAdminNotifications());
      });
      
    } catch {
      setOversightError("Unable to load aid requests.");
      setRequests([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadRequests();
  }, [loadRequests]);

  const updateRequestStatus = async (id: string, status: "Approved" | "Rejected") => {
    setUpdatingId(id);
    setOversightError(null);
    const note = (reviewNotes[id] ?? "").trim();
    if (status === "Rejected" && !note) {
      setOversightError("Please add a review note before rejecting this request.");
      setUpdatingId(null);
      return;
    }

    try {
      const response = await fetch(`/api/aid-requests/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status, reviewNote: note || undefined })
      });

      if (!response.ok) {
        const body = await response.json().catch(() => ({}));
        setOversightError((body as { message?: string; error?: string }).message ?? "Unable to update request status.");
        return;
      }

      await loadRequests();
    } catch {
      setOversightError("Unable to update request status.");
    } finally {
      setUpdatingId(null);
    }
  };

  const filteredRequests = requests.filter((request) => {
    if (activeFilter === "all") return true;
    return normalizeCategory(request.category) === activeFilter;
  });

  const pendingApprovals = requests.filter((request) => normalizeStatus(request.status) === "Pending").length;
  const approvedCount = requests.filter((request) => normalizeStatus(request.status) === "Approved").length;
  const equipmentApproved = requests.filter(
    (request) => normalizeCategory(request.category) === "equipment" && normalizeStatus(request.status) === "Approved"
  ).length;

  const filters: { key: FilterKey; label: string }[] = [
    { key: "all", label: "All" },
    { key: "emergency", label: "Emergency" },
    { key: "equipment", label: "Equipment" },
    { key: "boarding", label: "Meal voucher" },
    { key: "tuition", label: "Tuition" }
  ];

  return (
    <div className="space-y-4">
      <p className="text-sm text-slate-600 dark:text-slate-300">
        Review and decide student aid requests by category. Changes here are reflected directly in student dashboards.
      </p>

      <Card className={`space-y-4 p-4 ${adminNavyCardClass}`}>
        <div className="flex flex-wrap items-center gap-2">
          {filters.map((filter) => (
            <button
              key={filter.key}
              type="button"
              onClick={() => setActiveFilter(filter.key)}
              className={`rounded-full px-3 py-1 text-xs font-medium transition-colors ${
                activeFilter === filter.key
                  ? "bg-primary text-white"
                  : "bg-slate-100 text-slate-700 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700"
              }`}
            >
              {filter.label}
            </button>
          ))}
        </div>

        {oversightError ? <p className="text-sm text-rose-600 dark:text-rose-400">{oversightError}</p> : null}

        {loading ? (
          <p className="text-sm text-slate-500">Loading funding queue...</p>
        ) : filteredRequests.length === 0 ? (
          <p className="text-sm text-slate-500">No aid requests in this category.</p>
        ) : (
          <div className="divide-y divide-slate-200 text-sm dark:divide-slate-800">
            {filteredRequests.map((request, index) => {
              const id = requestId(request, index);
              const status = normalizeStatus(request.status);
              const reviewDisabled = !canReview(request.status);
              return (
                <div key={id} className="flex flex-col gap-2 py-3 sm:flex-row sm:items-center sm:justify-between">
                  <div className="min-w-0">
                    <p className="font-medium text-slate-900 dark:text-slate-100">{formatCategory(request.category)}</p>
                    <p className="text-xs text-slate-500 dark:text-slate-400">
                      Requester: {request.userId || request.firebaseUid || "N/A"}
                    </p>
                    <p className="text-xs text-slate-500 dark:text-slate-400">
                      Amount: {request.amount ? `LKR ${request.amount}` : "N/A"}
                    </p>
                    {status !== "Pending" && request.reviewNote ? (
                      <p className="text-xs text-slate-500 dark:text-slate-400">Note: {request.reviewNote}</p>
                    ) : null}
                    {reviewDisabled ? null : (
                      <div className="mt-2 space-y-1">
                        <label className="text-xs font-medium text-slate-500 dark:text-slate-400">
                          Review note (shared with student)
                        </label>
                        <textarea
                          value={reviewNotes[id] ?? ""}
                          onChange={(event) =>
                            setReviewNotes((current) => ({
                              ...current,
                              [id]: event.target.value.slice(0, 500)
                            }))
                          }
                          rows={2}
                          placeholder={status === "Pending" ? "Add note for approval or rejection" : "Add note for this decision"}
                          className="w-full max-w-lg rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs outline-none ring-primary/20 focus:ring-2 dark:border-slate-700 dark:bg-slate-900"
                        />
                      </div>
                    )}
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    <span
                      className={`rounded-full px-3 py-1 text-xs font-semibold ${
                        status === "Approved"
                          ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300"
                          : status === "Rejected"
                            ? "bg-rose-50 text-rose-700 dark:bg-rose-900/30 dark:text-rose-300"
                            : "bg-amber-50 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300"
                      }`}
                    >
                      {status}
                    </span>
                    <button
                      type="button"
                      onClick={() => updateRequestStatus(id, "Approved")}
                      disabled={updatingId === id || reviewDisabled}
                      className="rounded-full bg-emerald-50 px-3 py-1 text-xs font-medium text-emerald-700 hover:bg-emerald-100 disabled:cursor-not-allowed disabled:opacity-50 dark:bg-emerald-900/40 dark:text-emerald-300"
                    >
                      {updatingId === id ? "Updating..." : "Approve"}
                    </button>
                    <button
                      type="button"
                      onClick={() => updateRequestStatus(id, "Rejected")}
                      disabled={updatingId === id || reviewDisabled}
                      className="rounded-full bg-rose-50 px-3 py-1 text-xs font-medium text-rose-700 hover:bg-rose-100 disabled:cursor-not-allowed disabled:opacity-50 dark:bg-rose-900/40 dark:text-rose-300"
                    >
                      {updatingId === id ? "Updating..." : "Reject"}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </Card>

      <Card className={`mt-6 space-y-4 p-4 ${adminNavyCardClass}`}>
        <h3 className="text-base font-semibold text-slate-900 dark:text-white">NGO Funding Distribution</h3>
        <p className="text-sm text-slate-600 dark:text-slate-300">
          Verify funds allocated by NGOs before they are disbursed to student accounts.
        </p>
        
        {ngoFunding.length === 0 ? (
          <p className="text-sm text-slate-500">No NGO funding records available.</p>
        ) : (
          <div className="divide-y divide-slate-200 text-sm dark:divide-slate-800">
            {ngoFunding.filter(f => f.status === "allocated" || f.status === "pending").map((fund) => (
              <div key={fund._id} className="flex flex-col gap-2 py-3 sm:flex-row sm:items-center sm:justify-between">
                <div className="min-w-0">
                  <p className="font-medium text-slate-900 dark:text-slate-100">{fund.allocatedTo}</p>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    Donor: {fund.donorName} ({fund.donorType})
                  </p>
                  <p className="text-xs font-semibold text-primary mt-1">
                    Amount: LKR {fund.amount.toLocaleString()}
                  </p>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <span className="rounded-full bg-amber-50 px-3 py-1 text-xs font-semibold text-amber-700 dark:bg-amber-900/30 dark:text-amber-300">
                    {fund.status}
                  </span>
                  <button
                    type="button"
                    onClick={async () => {
                      setUpdatingNgoId(fund._id);
                      // Faking delay for demo
                      await new Promise(r => setTimeout(r, 600));
                      const { updateNgoFundingStatus } = await import("@/lib/ngo-demo-store");
                      updateNgoFundingStatus(fund._id, "disbursed");
                      const { getNgoFundingRecords } = await import("@/lib/ngo-demo-store");
                      setNgoFunding(getNgoFundingRecords());
                      setUpdatingNgoId(null);
                    }}
                    disabled={updatingNgoId === fund._id}
                    className="rounded-full bg-emerald-50 px-3 py-1 text-xs font-medium text-emerald-700 hover:bg-emerald-100 disabled:cursor-not-allowed disabled:opacity-50 dark:bg-emerald-900/40 dark:text-emerald-300"
                  >
                    {updatingNgoId === fund._id ? "Verifying..." : "Verify Distribution"}
                  </button>
                </div>
              </div>
            ))}
            {ngoFunding.filter(f => f.status === "allocated" || f.status === "pending").length === 0 && (
              <p className="text-sm text-slate-500 pt-2 pb-1">All current NGO distributions have been verified and disbursed.</p>
            )}
          </div>
        )}
      </Card>

      <Card className={`mt-6 space-y-4 p-4 ${adminNavyCardClass}`}>
        <div className="flex items-center justify-between">
          <h3 className="text-base font-semibold text-emerald-700 dark:text-emerald-400">NGO Donation Alerts</h3>
          <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-bold text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-300 uppercase">Live</span>
        </div>
        <p className="text-sm text-slate-600 dark:text-slate-300 italic">
          Confirmed disbursements from NGO partners. Funds are ready for student account transfer.
        </p>

        {ngoNotifications.length === 0 ? (
          <div className="rounded-xl border border-dashed border-slate-200 py-8 text-center dark:border-slate-800">
            <p className="text-sm text-slate-400">No recent donation confirmations from NGOs.</p>
          </div>
        ) : (
          <div className="space-y-2">
            {ngoNotifications.map((notif) => (
              <div key={notif._id} className="rounded-xl border border-emerald-100 bg-emerald-50/30 p-4 dark:border-emerald-800/30 dark:bg-emerald-900/10 transition hover:bg-emerald-50/50">
                <div className="flex items-start justify-between">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <div className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
                      <p className="text-[10px] font-bold text-emerald-800 dark:text-emerald-300 uppercase tracking-wider">Successful Donation</p>
                    </div>
                    <p className="text-sm font-medium text-slate-900 dark:text-white">
                      NGO <span className="font-bold text-primary">{notif.ngoName}</span> has fulfilled request for <span className="font-bold underline">{notif.beneficiaryInitials}</span>.
                    </p>
                    <p className="text-[11px] text-slate-500">
                      Program: {notif.programTitle} • University: {notif.university}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-lg font-black text-emerald-600">LKR {notif.amount.toLocaleString()}</p>
                    <p className="text-[10px] text-slate-400">{new Date(notif.date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>

      <div className="grid gap-4 md:grid-cols-3">
        <StatCard label="Approved requests" value={String(approvedCount)} description="All aid categories" />
        <StatCard label="Pending approvals" value={String(pendingApprovals)} description="Needs review now" />
        <StatCard label="Equipment approved" value={String(equipmentApproved)} description="Handover candidates" />
      </div>
    </div>
  );
}

function AdminCareerServicesSection() {
  type CareerJobItem = {
    _id?: string;
    id?: string;
    title?: string;
    position?: string;
    company?: string;
    employer?: string;
    status?: string;
    moderationStatus?: string;
    reviewNote?: string | null;
    createdAt?: string;
  };

  type ModerationFilter = "all" | "pending" | "approved" | "rejected";

  const [jobs, setJobs] = useState<CareerJobItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeFilter, setActiveFilter] = useState<ModerationFilter>("pending");
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const [reviewNotes, setReviewNotes] = useState<Record<string, string>>({});

  const getJobId = useCallback(
    (job: CareerJobItem, index: number) => job._id || job.id || `job-${index}`,
    []
  );

  const normalizeModerationStatus = (status?: string): "Pending" | "Approved" | "Rejected" => {
    const value = String(status ?? "").trim().toLowerCase();
    if (value === "approved") return "Approved";
    if (value === "rejected") return "Rejected";
    return "Pending";
  };

  const normalizePublishingStatus = (status?: string): "active" | "draft" | "expired" => {
    const value = String(status ?? "").trim().toLowerCase();
    if (value === "draft") return "draft";
    if (value === "expired") return "expired";
    return "active";
  };

  const formatPublishingStatus = (status?: string) => {
    const normalized = normalizePublishingStatus(status);
    if (normalized === "draft") return "Draft";
    if (normalized === "expired") return "Expired";
    return "Active";
  };

  const formatModerationDate = (createdAt?: string) => {
    if (!createdAt) return "Unknown date";
    const date = new Date(createdAt);
    if (Number.isNaN(date.getTime())) return createdAt;
    return date.toLocaleDateString();
  };

  const loadJobs = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch("/api/jobs?scope=all");
      const payload = (await response.json().catch(() => [])) as
        | CareerJobItem[]
        | { message?: string; error?: string };
      if (!response.ok) {
        const errorPayload = payload as { message?: string; error?: string };
        setError(errorPayload.message ?? errorPayload.error ?? "Unable to load career moderation queue.");
        setJobs([]);
        return;
      }

      const nextJobs = (Array.isArray(payload) ? payload : []) as CareerJobItem[];
      setJobs(nextJobs);
      setReviewNotes((current) => {
        const next = { ...current };
        nextJobs.forEach((job, index) => {
          const id = getJobId(job, index);
          if (next[id] === undefined) {
            next[id] = String(job.reviewNote ?? "");
          }
        });
        return next;
      });
    } catch {
      setError("Unable to load career moderation queue.");
      setJobs([]);
    } finally {
      setLoading(false);
    }
  }, [getJobId]);

  useEffect(() => {
    loadJobs();
  }, [loadJobs]);

  const applyModeration = async (id: string, decision: "Approved" | "Rejected") => {
    setUpdatingId(id);
    setError(null);
    try {
      const note = (reviewNotes[id] ?? "").trim();
      const response = await fetch(`/api/jobs/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          moderationStatus: decision,
          reviewNote: note || undefined
        })
      });

      if (!response.ok) {
        const payload = (await response.json().catch(() => ({}))) as {
          message?: string;
          error?: string;
        };
        setError(payload.message ?? payload.error ?? "Unable to update job moderation status.");
        return;
      }

      await loadJobs();
    } catch {
      setError("Unable to update job moderation status.");
    } finally {
      setUpdatingId(null);
    }
  };

  const filteredJobs = jobs.filter((job) => {
    if (activeFilter === "all") return true;
    return normalizeModerationStatus(job.moderationStatus).toLowerCase() === activeFilter;
  });

  const pendingApprovals = jobs.filter((job) => normalizeModerationStatus(job.moderationStatus) === "Pending").length;
  const approvedLive = jobs.filter(
    (job) =>
      normalizeModerationStatus(job.moderationStatus) === "Approved" &&
      normalizePublishingStatus(job.status) === "active"
  ).length;
  const rejectedCount = jobs.filter((job) => normalizeModerationStatus(job.moderationStatus) === "Rejected").length;

  const filters: { key: ModerationFilter; label: string }[] = [
    { key: "all", label: "All" },
    { key: "pending", label: "Pending" },
    { key: "approved", label: "Approved" },
    { key: "rejected", label: "Rejected" }
  ];

  return (
    <div className="space-y-4">
      <p className="text-sm text-slate-600 dark:text-slate-300">
        Review employer postings before they appear to students. Approvals and rejections here
        update employer dashboards and trigger role-based notifications.
      </p>
      {error ? (
        <p className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-2 text-sm text-rose-700 dark:border-rose-900/40 dark:bg-rose-950/30 dark:text-rose-300">
          {error}
        </p>
      ) : null}

      <Card className={`space-y-4 p-4 ${adminNavyCardClass}`}>
        <h3 className="text-sm font-semibold">Job postings moderation</h3>
        <div className="flex flex-wrap items-center gap-2">
          {filters.map((filter) => (
            <button
              key={filter.key}
              type="button"
              onClick={() => setActiveFilter(filter.key)}
              className={`rounded-full px-3 py-1 text-xs font-medium transition-colors ${
                activeFilter === filter.key
                  ? "bg-primary text-white"
                  : "bg-slate-100 text-slate-700 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700"
              }`}
            >
              {filter.label}
            </button>
          ))}
        </div>

        {loading ? (
          <p className="text-sm text-slate-500">Loading job moderation queue...</p>
        ) : !filteredJobs.length ? (
          <p className="text-sm text-slate-500">No job postings in this filter.</p>
        ) : (
          <div className="divide-y divide-slate-200 text-sm dark:divide-slate-800">
            {filteredJobs.map((job, index) => {
              const id = getJobId(job, index);
              const moderationStatus = normalizeModerationStatus(job.moderationStatus);
              const reviewDisabled = moderationStatus !== "Pending";
              return (
                <div key={id} className="flex flex-col gap-3 py-3 lg:flex-row lg:items-start lg:justify-between">
                  <div className="space-y-2">
                    <div>
                      <p className="font-medium">{job.title ?? job.position ?? "Untitled job posting"}</p>
                      <p className="text-xs text-slate-500">
                        Employer: {job.company ?? job.employer ?? "Unknown employer"} - Posted {formatModerationDate(job.createdAt)}
                      </p>
                    </div>
                    <div className="flex flex-wrap items-center gap-2">
                      <span
                        className={`rounded-full px-3 py-1 text-xs font-semibold ${
                          moderationStatus === "Approved"
                            ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300"
                            : moderationStatus === "Rejected"
                              ? "bg-rose-50 text-rose-700 dark:bg-rose-900/30 dark:text-rose-300"
                              : "bg-amber-50 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300"
                        }`}
                      >
                        {moderationStatus}
                      </span>
                      <span className="rounded-full bg-slate-100 px-3 py-1 text-xs text-slate-700 dark:bg-slate-800 dark:text-slate-200">
                        Visibility: {formatPublishingStatus(job.status)}
                      </span>
                    </div>
                    {reviewDisabled && job.reviewNote ? (
                      <p className="text-xs text-slate-500 dark:text-slate-400">Review note: {job.reviewNote}</p>
                    ) : null}
                    {reviewDisabled ? null : (
                      <div className="space-y-1">
                        <label className="text-xs font-medium text-slate-500 dark:text-slate-400">
                          Review note (optional)
                        </label>
                        <textarea
                          value={reviewNotes[id] ?? ""}
                          onChange={(event) =>
                            setReviewNotes((current) => ({
                              ...current,
                              [id]: event.target.value.slice(0, 500)
                            }))
                          }
                          rows={2}
                          className="w-full max-w-lg rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs outline-none ring-primary/20 focus:ring-2 dark:border-slate-700 dark:bg-slate-900"
                          placeholder="Add optional note for employer"
                        />
                      </div>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => applyModeration(id, "Approved")}
                      disabled={updatingId === id || reviewDisabled}
                      className="rounded-full bg-emerald-50 px-3 py-1 text-xs font-medium text-emerald-700 hover:bg-emerald-100 disabled:cursor-not-allowed disabled:opacity-50 dark:bg-emerald-900/40 dark:text-emerald-300"
                    >
                      {updatingId === id ? "Updating..." : "Approve"}
                    </button>
                    <button
                      type="button"
                      onClick={() => applyModeration(id, "Rejected")}
                      disabled={updatingId === id || reviewDisabled}
                      className="rounded-full bg-rose-50 px-3 py-1 text-xs font-medium text-rose-700 hover:bg-rose-100 disabled:cursor-not-allowed disabled:opacity-50 dark:bg-rose-900/40 dark:text-rose-300"
                    >
                      {updatingId === id ? "Updating..." : "Reject"}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </Card>

      <div className="grid gap-4 md:grid-cols-3">
        <StatCard label="Pending approvals" value={String(pendingApprovals)} description="Needs review now" />
        <StatCard label="Approved and live" value={String(approvedLive)} description="Visible to students" />
        <StatCard label="Rejected postings" value={String(rejectedCount)} description="Waiting for employer updates" />
      </div>
    </div>
  );
}

function AdminMentorshipProgramSection() {
  type MentorshipItem = {
    _id?: string;
    id?: string;
    mentorName?: string;
    studentName?: string;
    topic?: string;
    status?: string;
    scheduledTime?: string;
    rating?: number;
    review?: string;
    createdAt?: string;
  };

  type MentorshipFilter = "all" | "pending" | "active" | "completed" | "cancelled";

  const [sessions, setSessions] = useState<MentorshipItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeFilter, setActiveFilter] = useState<MentorshipFilter>("pending");
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const [scheduleInputs, setScheduleInputs] = useState<Record<string, string>>({});

  const sessionId = (item: MentorshipItem, index: number) => item._id || item.id || `session-${index}`;

  const normalizeStatus = (status?: string): "pending" | "confirmed" | "scheduled" | "completed" | "cancelled" => {
    const value = String(status ?? "").trim().toLowerCase();
    if (value === "confirmed") return "confirmed";
    if (value === "scheduled") return "scheduled";
    if (value === "completed") return "completed";
    if (value === "cancelled") return "cancelled";
    return "pending";
  };

  const formatStatus = (status?: string) => {
    const normalized = normalizeStatus(status);
    if (normalized === "confirmed") return "Confirmed";
    if (normalized === "scheduled") return "Scheduled";
    if (normalized === "completed") return "Completed";
    if (normalized === "cancelled") return "Cancelled";
    return "Pending";
  };

  const statusBadgeClass = (status?: string) => {
    const normalized = normalizeStatus(status);
    if (normalized === "completed") return "bg-emerald-50 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300";
    if (normalized === "cancelled") return "bg-rose-50 text-rose-700 dark:bg-rose-900/30 dark:text-rose-300";
    if (normalized === "confirmed" || normalized === "scheduled") {
      return "bg-blue-50 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300";
    }
    return "bg-amber-50 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300";
  };

  const formatDateTime = (value?: string) => {
    if (!value) return "Not scheduled";
    const date = new Date(value);
    return Number.isNaN(date.getTime()) ? value : date.toLocaleString();
  };

  const loadSessions = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch("/api/mentorship-sessions?scope=all");
      const payload = (await response.json().catch(() => [])) as MentorshipItem[] | { message?: string };
      if (!response.ok) {
        setError((payload as { message?: string }).message ?? "Unable to load mentorship program queue.");
        setSessions([]);
        return;
      }
      const nextSessions = Array.isArray(payload) ? payload : [];
      setSessions(nextSessions);
      setScheduleInputs((current) => {
        const next = { ...current };
        nextSessions.forEach((item, index) => {
          const id = sessionId(item, index);
          if (next[id] === undefined) {
            next[id] = item.scheduledTime ?? "";
          }
        });
        return next;
      });
    } catch {
      setError("Unable to load mentorship program queue.");
      setSessions([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadSessions();
  }, [loadSessions]);

  const updateSession = async (id: string, payload: Record<string, unknown>) => {
    setUpdatingId(id);
    setError(null);
    try {
      const response = await fetch(`/api/mentorship-sessions/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });
      if (!response.ok) {
        const body = (await response.json().catch(() => ({}))) as { message?: string };
        setError(body.message ?? "Unable to update mentorship session.");
        return;
      }
      await loadSessions();
    } catch {
      setError("Unable to update mentorship session.");
    } finally {
      setUpdatingId(null);
    }
  };

  const filteredSessions = sessions.filter((item) => {
    if (activeFilter === "all") return true;
    const status = normalizeStatus(item.status);
    if (activeFilter === "active") return status === "confirmed" || status === "scheduled";
    return status === activeFilter;
  });

  const pendingCount = sessions.filter((item) => normalizeStatus(item.status) === "pending").length;
  const activePairs = new Set(
    sessions
      .filter((item) => {
        const status = normalizeStatus(item.status);
        return status === "confirmed" || status === "scheduled";
      })
      .map((item) => `${item.mentorName ?? "mentor"}::${item.studentName ?? "student"}`)
  ).size;
  const sessionReports = sessions.filter((item) => normalizeStatus(item.status) === "completed").length;

  const filters: { key: MentorshipFilter; label: string }[] = [
    { key: "all", label: "All" },
    { key: "pending", label: "Pending" },
    { key: "active", label: "Active" },
    { key: "completed", label: "Completed" },
    { key: "cancelled", label: "Cancelled" }
  ];

  return (
    <div className="space-y-4">
      <p className="text-sm text-slate-600 dark:text-slate-300">
        Oversee mentorship request approvals, active mentor-student pairs, and completed session outcomes.
      </p>
      {error ? (
        <p className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-2 text-sm text-rose-700 dark:border-rose-900/40 dark:bg-rose-950/30 dark:text-rose-300">
          {error}
        </p>
      ) : null}

      <Card className={`space-y-4 p-4 ${adminNavyCardClass}`}>
        <h3 className="text-sm font-semibold">Mentorship program queue</h3>
        <div className="flex flex-wrap items-center gap-2">
          {filters.map((filter) => (
            <button
              key={filter.key}
              type="button"
              onClick={() => setActiveFilter(filter.key)}
              className={`rounded-full px-3 py-1 text-xs font-medium transition-colors ${
                activeFilter === filter.key
                  ? "bg-primary text-white"
                  : "bg-slate-100 text-slate-700 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700"
              }`}
            >
              {filter.label}
            </button>
          ))}
        </div>

        {loading ? (
          <p className="text-sm text-slate-500">Loading mentorship sessions...</p>
        ) : !filteredSessions.length ? (
          <p className="text-sm text-slate-500">No sessions in this filter.</p>
        ) : (
          <div className="divide-y divide-slate-200 text-sm dark:divide-slate-800">
            {filteredSessions.map((item, index) => {
              const id = sessionId(item, index);
              const status = normalizeStatus(item.status);
              const canApproveReject = status === "pending";
              const canComplete = status === "confirmed" || status === "scheduled";
              const scheduleValue = scheduleInputs[id] ?? "";
              const canSchedule = (status === "confirmed" || status === "scheduled") && Boolean(scheduleValue);

              return (
                <div key={id} className="flex flex-col gap-3 py-3 lg:flex-row lg:items-start lg:justify-between">
                  <div className="space-y-2">
                    <div>
                      <p className="font-medium">{item.topic ?? "Mentorship session"}</p>
                      <p className="text-xs text-slate-500">
                        Mentor: {item.mentorName ?? "Unknown"} - Student: {item.studentName ?? "Unknown"}
                      </p>
                      <p className="text-xs text-slate-500">Scheduled: {formatDateTime(item.scheduledTime)}</p>
                    </div>

                    {canComplete ? (
                      <div className="flex flex-wrap items-center gap-2">
                        <input
                          type="datetime-local"
                          value={scheduleValue ? scheduleValue.slice(0, 16) : ""}
                          onChange={(event) =>
                            setScheduleInputs((current) => ({
                              ...current,
                              [id]: event.target.value
                            }))
                          }
                          className="rounded-lg border border-slate-200 bg-white px-2 py-1 text-xs outline-none ring-primary/20 focus:ring-2 dark:border-slate-700 dark:bg-slate-900"
                        />
                        <button
                          type="button"
                          onClick={() =>
                            updateSession(id, {
                              status: "scheduled",
                              scheduledTime: scheduleValue
                            })
                          }
                          disabled={updatingId === id || !canSchedule}
                          className="rounded-full bg-blue-50 px-3 py-1 text-xs font-medium text-blue-700 hover:bg-blue-100 disabled:cursor-not-allowed disabled:opacity-50 dark:bg-blue-900/30 dark:text-blue-300"
                        >
                          {updatingId === id ? "Updating..." : "Save schedule"}
                        </button>
                      </div>
                    ) : null}

                    {typeof item.rating === "number" || item.review ? (
                      <p className="text-xs text-slate-500">
                        Report: {typeof item.rating === "number" ? `${item.rating}/5` : "No rating"}
                        {item.review ? ` - ${item.review}` : ""}
                      </p>
                    ) : null}
                  </div>

                  <div className="flex flex-wrap items-center gap-2">
                    <span className={`rounded-full px-3 py-1 text-xs font-semibold ${statusBadgeClass(item.status)}`}>
                      {formatStatus(item.status)}
                    </span>

                    {canApproveReject ? (
                      <>
                        <button
                          type="button"
                          onClick={() => updateSession(id, { status: "confirmed" })}
                          disabled={updatingId === id}
                          className="rounded-full bg-emerald-50 px-3 py-1 text-xs font-medium text-emerald-700 hover:bg-emerald-100 disabled:cursor-not-allowed disabled:opacity-50 dark:bg-emerald-900/40 dark:text-emerald-300"
                        >
                          {updatingId === id ? "Updating..." : "Approve"}
                        </button>
                        <button
                          type="button"
                          onClick={() => updateSession(id, { status: "cancelled" })}
                          disabled={updatingId === id}
                          className="rounded-full bg-rose-50 px-3 py-1 text-xs font-medium text-rose-700 hover:bg-rose-100 disabled:cursor-not-allowed disabled:opacity-50 dark:bg-rose-900/40 dark:text-rose-300"
                        >
                          {updatingId === id ? "Updating..." : "Reject"}
                        </button>
                      </>
                    ) : null}

                    {canComplete ? (
                      <button
                        type="button"
                        onClick={() => updateSession(id, { status: "completed" })}
                        disabled={updatingId === id}
                        className="rounded-full bg-primary px-3 py-1 text-xs font-medium text-white hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-50"
                      >
                        {updatingId === id ? "Updating..." : "Mark completed"}
                      </button>
                    ) : null}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </Card>

      <div className="grid gap-4 md:grid-cols-3">
        <StatCard label="Mentor approval queue" value={String(pendingCount)} description="Requests awaiting review" />
        <StatCard label="Active mentorship pairs" value={String(activePairs)} description="Confirmed or scheduled pairs" />
        <StatCard label="Session reports" value={String(sessionReports)} description="Completed session outcomes" />
      </div>
    </div>
  );
}

function AdminReportsSection() {
  type ReportTemplateKey =
    | "student-support-metrics"
    | "financial-aid-distribution"
    | "graduation-outcomes";
  type RangeKey = 30 | 90 | 180;

  type ReportsResponse = {
    template: ReportTemplateKey;
    rangeDays: number;
    generatedAt: string;
    summary: {
      totalAidRequests: number;
      pendingAidRequests: number;
      approvedAidRequests: number;
      approvedAidAmountLkr: number;
      mentorshipSessions: number;
      mentorshipCompleted: number;
      counselorBookings: number;
      highRiskCheckins: number;
      jobModerationPending: number;
    };
    aidByCategory: Array<{
      category: string;
      requests: number;
      approved: number;
      rejected: number;
      pending: number;
      approvedAmount: number;
    }>;
    aidByStatus: Array<{ status: string; count: number }>;
    mentorshipByStatus: Array<{ status: string; count: number }>;
    wellness: {
      counselorPending: number;
      counselorConfirmed: number;
      counselorCompleted: number;
      healthLogs: number;
      highRiskCheckins: number;
    };
    outcomes: {
      trackedApplications: number;
      approvedJobApplications: number;
      approvedScholarshipApplications: number;
      activeApprovedJobs: number;
      mentorshipCompleted: number;
    };
    trend: Array<{
      period: string;
      aidRequests: number;
      aidApprovedAmount: number;
      mentorshipCompleted: number;
      wellnessHighRisk: number;
    }>;
  };

  const templates: Array<{
    id: ReportTemplateKey;
    name: string;
    description: string;
    scope: string;
  }> = [
    {
      id: "student-support-metrics",
      name: "Student support metrics",
      description: "Utilization of aid, mentorship, wellness, and career moderation queues.",
      scope: "Anonymized"
    },
    {
      id: "financial-aid-distribution",
      name: "Financial aid distribution",
      description: "Approved, pending, and rejected aid by support category with approved value totals.",
      scope: "Anonymized"
    },
    {
      id: "graduation-outcomes",
      name: "Graduation outcomes",
      description: "Tracked applications, placements, scholarship outcomes, and mentorship completions.",
      scope: "Aggregated"
    }
  ];

  const rangeOptions: Array<{ value: RangeKey; label: string }> = [
    { value: 30, label: "Last 30 days" },
    { value: 90, label: "Last 90 days" },
    { value: 180, label: "Last 180 days" }
  ];

  const [template, setTemplate] = useState<ReportTemplateKey>("student-support-metrics");
  const [rangeDays, setRangeDays] = useState<RangeKey>(30);
  const [report, setReport] = useState<ReportsResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [exportingFormat, setExportingFormat] = useState<"csv" | "pdf" | null>(null);

  const loadReport = useCallback(async (nextTemplate: ReportTemplateKey, nextRangeDays: RangeKey) => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams({
        template: nextTemplate,
        rangeDays: String(nextRangeDays)
      });
      const response = await fetch(`/api/admin/reports?${params.toString()}`);
      const payload = (await response.json().catch(() => ({}))) as ReportsResponse & { message?: string };
      if (!response.ok) {
        setError(payload.message ?? "Unable to load reports data.");
        setReport(null);
        return;
      }
      setReport(payload);
    } catch {
      setError("Unable to load reports data.");
      setReport(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadReport(template, rangeDays);
  }, [loadReport, template, rangeDays]);

  const downloadReport = useCallback(async (format: "csv" | "pdf") => {
    setExportingFormat(format);
    setError(null);
    try {
      const params = new URLSearchParams({
        template,
        rangeDays: String(rangeDays),
        format
      });
      const response = await fetch(`/api/admin/reports?${params.toString()}`);
      if (!response.ok) {
        const payload = (await response.json().catch(() => ({}))) as { message?: string };
        setError(payload.message ?? "Unable to generate report export.");
        return;
      }

      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const anchor = document.createElement("a");
      anchor.href = url;
      anchor.download = `admin-report-${template}-${new Date().toISOString().slice(0, 10)}.${format}`;
      document.body.appendChild(anchor);
      anchor.click();
      anchor.remove();
      URL.revokeObjectURL(url);
    } catch {
      setError("Unable to generate report export.");
    } finally {
      setExportingFormat(null);
    }
  }, [rangeDays, template]);

  const generatedAtLabel = useMemo(() => {
    if (!report?.generatedAt) return "Not generated yet";
    const date = new Date(report.generatedAt);
    if (Number.isNaN(date.getTime())) return report.generatedAt;
    return date.toLocaleString();
  }, [report?.generatedAt]);

  return (
    <div className="space-y-4">
      <p className="text-sm text-slate-600 dark:text-slate-300">
        Reports are anonymized and aggregated. Admin/faculty can export CSV snapshots for audits without exposing personal counseling details.
      </p>

      {error ? (
        <p className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-2 text-sm text-rose-700 dark:border-rose-900/40 dark:bg-rose-950/30 dark:text-rose-300">
          {error}
        </p>
      ) : null}

      <Card className={`space-y-4 p-4 ${adminNavyCardClass}`}>
        <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
          <div className="grid gap-3 md:grid-cols-2">
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-slate-600 dark:text-slate-300">Report template</label>
              <select
                className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm outline-none ring-primary/20 focus:ring-2 dark:border-slate-700 dark:bg-slate-900"
                value={template}
                onChange={(event) => setTemplate(event.target.value as ReportTemplateKey)}
              >
                {templates.map((item) => (
                  <option key={item.id} value={item.id}>
                    {item.name}
                  </option>
                ))}
              </select>
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-slate-600 dark:text-slate-300">Reporting range</label>
              <select
                className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm outline-none ring-primary/20 focus:ring-2 dark:border-slate-700 dark:bg-slate-900"
                value={rangeDays}
                onChange={(event) => setRangeDays(Number(event.target.value) as RangeKey)}
              >
                {rangeOptions.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => loadReport(template, rangeDays)}
              disabled={loading}
              className="rounded-full border border-slate-200 px-3 py-2 text-xs font-medium text-slate-700 hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-60 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800"
            >
              {loading ? "Refreshing..." : "Refresh"}
            </button>
            <button
              type="button"
              onClick={() => downloadReport("csv")}
              disabled={Boolean(exportingFormat)}
              className="rounded-full bg-primary px-3 py-2 text-xs font-medium text-white hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {exportingFormat === "csv" ? "Preparing CSV..." : "Download CSV"}
            </button>
            <button
              type="button"
              onClick={() => downloadReport("pdf")}
              disabled={Boolean(exportingFormat)}
              className="rounded-full border border-slate-200 px-3 py-2 text-xs font-medium text-slate-700 hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-60 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800"
            >
              {exportingFormat === "pdf" ? "Preparing PDF..." : "Download PDF"}
            </button>
          </div>
        </div>
        <p className="text-xs text-slate-500">Generated at: {generatedAtLabel}</p>
      </Card>

      <div className="grid gap-4 md:grid-cols-3">
        <StatCard label="Aid requests" value={loading ? "..." : String(report?.summary.totalAidRequests ?? 0)} description="Total in selected range" />
        <StatCard label="Approved aid (LKR)" value={loading ? "..." : String(report?.summary.approvedAidAmountLkr ?? 0)} description="Approved financial impact" />
        <StatCard label="Mentorship completed" value={loading ? "..." : String(report?.summary.mentorshipCompleted ?? 0)} description="Completed sessions" />
        <StatCard label="High-risk check-ins" value={loading ? "..." : String(report?.summary.highRiskCheckins ?? 0)} description="Wellness escalation signals" />
        <StatCard label="Counselor bookings" value={loading ? "..." : String(report?.summary.counselorBookings ?? 0)} description="Total counseling requests" />
        <StatCard label="Jobs awaiting moderation" value={loading ? "..." : String(report?.summary.jobModerationPending ?? 0)} description="Career queue" />
      </div>

      <Card className={`space-y-3 p-4 ${adminNavyCardClass}`}>
        <h3 className="text-sm font-semibold">Available report templates</h3>
        <div className="grid gap-3 md:grid-cols-3">
          {templates.map((item) => (
            <button
              key={item.id}
              type="button"
              onClick={() => {
                setTemplate(item.id);
                void loadReport(item.id, rangeDays);
              }}
              className={`rounded-xl border p-4 text-left text-sm transition-colors ${
                template === item.id
                  ? "border-primary bg-primary/5"
                  : "border-slate-200 bg-slate-50 hover:bg-slate-100 dark:border-slate-800 dark:bg-slate-950 dark:hover:bg-slate-900"
              }`}
            >
              <p className="font-semibold">{item.name}</p>
              <p className="mt-1 text-xs text-slate-500">{item.description}</p>
              <span className="mt-3 inline-flex rounded-full bg-slate-100 px-2 py-1 text-[11px] font-medium text-slate-700 dark:bg-slate-800 dark:text-slate-200">
                {item.scope}
              </span>
            </button>
          ))}
        </div>
      </Card>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card className={`space-y-3 p-4 ${adminNavyCardClass}`}>
          <h3 className="text-sm font-semibold">Aid category distribution</h3>
          {loading ? (
            <p className="text-sm text-slate-500">Loading category breakdown...</p>
          ) : !report?.aidByCategory.length ? (
            <p className="text-sm text-slate-500">No aid requests found for this period.</p>
          ) : (
            <div className="space-y-2 text-sm">
              {report.aidByCategory.map((item) => (
                <div
                  key={item.category}
                  className="rounded-xl border border-slate-200 px-3 py-2 dark:border-slate-800"
                >
                  <p className="font-medium">{item.category}</p>
                  <p className="mt-1 text-xs text-slate-500">
                    Requests: {item.requests} | Approved: {item.approved} | Pending: {item.pending} | Rejected: {item.rejected}
                  </p>
                  <p className="text-xs text-slate-500">Approved amount: LKR {item.approvedAmount}</p>
                </div>
              ))}
            </div>
          )}
        </Card>

        <Card className={`space-y-3 p-4 ${adminNavyCardClass}`}>
          <h3 className="text-sm font-semibold">Mentorship and wellness status</h3>
          {loading ? (
            <p className="text-sm text-slate-500">Loading wellness and mentorship trends...</p>
          ) : (
            <div className="grid gap-3 md:grid-cols-2">
              <div className="space-y-2">
                <p className="text-xs font-medium uppercase tracking-wide text-slate-500">Mentorship</p>
                {report?.mentorshipByStatus.length ? (
                  report.mentorshipByStatus.map((item) => (
                    <div
                      key={item.status}
                      className="flex items-center justify-between rounded-lg border border-slate-200 px-3 py-2 text-sm dark:border-slate-800"
                    >
                      <span>{item.status}</span>
                      <span className="font-medium">{item.count}</span>
                    </div>
                  ))
                ) : (
                  <p className="text-sm text-slate-500">No mentorship activity in this range.</p>
                )}
              </div>
              <div className="space-y-2">
                <p className="text-xs font-medium uppercase tracking-wide text-slate-500">Wellness</p>
                <div className="rounded-lg border border-slate-200 px-3 py-2 text-sm dark:border-slate-800">
                  <p>Health logs: {report?.wellness.healthLogs ?? 0}</p>
                  <p>High-risk check-ins: {report?.wellness.highRiskCheckins ?? 0}</p>
                  <p>Counselor pending: {report?.wellness.counselorPending ?? 0}</p>
                  <p>Counselor confirmed: {report?.wellness.counselorConfirmed ?? 0}</p>
                  <p>Counselor completed: {report?.wellness.counselorCompleted ?? 0}</p>
                </div>
              </div>
            </div>
          )}
        </Card>
      </div>

      <Card className={`space-y-3 p-4 ${adminNavyCardClass}`}>
        <h3 className="text-sm font-semibold">Outcome snapshot</h3>
        {loading ? (
          <p className="text-sm text-slate-500">Loading outcomes...</p>
        ) : (
          <div className="grid gap-3 md:grid-cols-5">
            <div className="rounded-xl border border-slate-200 px-3 py-2 text-sm dark:border-slate-800">
              <p className="text-xs text-slate-500">Tracked applications</p>
              <p className="font-semibold">{report?.outcomes.trackedApplications ?? 0}</p>
            </div>
            <div className="rounded-xl border border-slate-200 px-3 py-2 text-sm dark:border-slate-800">
              <p className="text-xs text-slate-500">Approved jobs</p>
              <p className="font-semibold">{report?.outcomes.approvedJobApplications ?? 0}</p>
            </div>
            <div className="rounded-xl border border-slate-200 px-3 py-2 text-sm dark:border-slate-800">
              <p className="text-xs text-slate-500">Approved scholarships</p>
              <p className="font-semibold">{report?.outcomes.approvedScholarshipApplications ?? 0}</p>
            </div>
            <div className="rounded-xl border border-slate-200 px-3 py-2 text-sm dark:border-slate-800">
              <p className="text-xs text-slate-500">Active approved jobs</p>
              <p className="font-semibold">{report?.outcomes.activeApprovedJobs ?? 0}</p>
            </div>
            <div className="rounded-xl border border-slate-200 px-3 py-2 text-sm dark:border-slate-800">
              <p className="text-xs text-slate-500">Mentorship completed</p>
              <p className="font-semibold">{report?.outcomes.mentorshipCompleted ?? 0}</p>
            </div>
          </div>
        )}
      </Card>

      <Card className={`space-y-3 p-4 ${adminNavyCardClass}`}>
        <h3 className="text-sm font-semibold">Trend (period summary)</h3>
        {loading ? (
          <p className="text-sm text-slate-500">Loading trends...</p>
        ) : !report?.trend.length ? (
          <p className="text-sm text-slate-500">No trend data for this range.</p>
        ) : (
          <div className="space-y-2 text-sm">
            {report.trend.map((point) => (
              <div
                key={point.period}
                className="grid gap-2 rounded-xl border border-slate-200 px-3 py-2 text-xs md:grid-cols-5 md:text-sm dark:border-slate-800"
              >
                <span className="font-medium">{point.period}</span>
                <span>Aid requests: {point.aidRequests}</span>
                <span>Approved amount: LKR {point.aidApprovedAmount}</span>
                <span>Mentorship completed: {point.mentorshipCompleted}</span>
                <span>High-risk wellness: {point.wellnessHighRisk}</span>
              </div>
            ))}
          </div>
        )}
      </Card>
    </div>
  );
}

function AdminAnnouncementsSection() {
  type CampusPayload = {
    events?: Array<{
      id: string;
      title: string;
      date: string;
      time?: string;
      location?: string;
      type?: string;
      description?: string;
      isActive?: boolean;
    }>;
    announcements?: Array<{ id: string; title: string; date: string; body: string; isActive?: boolean }>;
    volunteerRoles?: Array<{ id: string; title: string; org: string; hoursPerWeek: string; isActive?: boolean }>;
    clubs?: Array<{ id: string; name: string; category: string; description: string; isActive?: boolean }>;
    discounts?: Array<{ id: string; name: string; category: string; description: string; location: string; isActive?: boolean }>;
  };
  type CampusManageItemType = "event" | "announcement" | "volunteer" | "club" | "discount";
  type CampusManageItem = {
    key: string;
    id: string;
    type: CampusManageItemType;
    title: string;
    meta: string;
    isActive: boolean;
    sortDate: string;
  };
  type ContentFilter = "all" | "active" | "archived";
  type EditCampusState =
    | { type: "announcement"; id: string; title: string; date: string; body: string }
    | {
        type: "event";
        id: string;
        title: string;
        date: string;
        time: string;
        location: string;
        eventType: "academic" | "social" | "career";
        description: string;
      };

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [editSaving, setEditSaving] = useState(false);
  const [updatingItemKey, setUpdatingItemKey] = useState<string | null>(null);
  const [deletingItemKey, setDeletingItemKey] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [campusData, setCampusData] = useState<CampusPayload>({});
  const [contentFilter, setContentFilter] = useState<ContentFilter>("all");
  const [editDraft, setEditDraft] = useState<EditCampusState | null>(null);

  const [publishType, setPublishType] = useState<
    "announcement" | "event" | "club" | "discount" | "volunteer"
  >("announcement");
  const [title, setTitle] = useState("");
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const [body, setBody] = useState("");
  const [time, setTime] = useState("");
  const [location, setLocation] = useState("");
  const [eventType, setEventType] = useState<"academic" | "social" | "career">("social");
  const [name, setName] = useState("");
  const [category, setCategory] = useState("");
  const [org, setOrg] = useState("");
  const [hoursPerWeek, setHoursPerWeek] = useState("");
  const [description, setDescription] = useState("");

  const loadCampusData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch("/api/campus-life?scope=admin");
      if (!response.ok) {
        const data = await response.json().catch(() => ({}));
        setError((data as { message?: string }).message ?? "Unable to load campus updates.");
        setCampusData({});
        return;
      }
      const data = (await response.json()) as CampusPayload;
      setCampusData(data ?? {});
    } catch {
      setError("Unable to load campus updates.");
      setCampusData({});
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadCampusData();
  }, [loadCampusData]);

  const resetDraft = () => {
    setTitle("");
    setBody("");
    setTime("");
    setLocation("");
    setName("");
    setCategory("");
    setOrg("");
    setHoursPerWeek("");
    setDescription("");
  };

  const submitCampusUpdate = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);
    setMessage(null);

    const payload: Record<string, unknown> = { type: publishType };
    if (publishType === "announcement") {
      payload.title = title.trim();
      payload.date = date;
      payload.body = body.trim();
    } else if (publishType === "event") {
      payload.title = title.trim();
      payload.date = date;
      payload.time = time.trim();
      payload.location = location.trim();
      payload.eventType = eventType;
      payload.description = description.trim();
    } else if (publishType === "club") {
      payload.name = name.trim();
      payload.category = category.trim();
      payload.description = description.trim();
    } else if (publishType === "discount") {
      payload.name = name.trim();
      payload.category = category.trim();
      payload.description = description.trim();
      payload.location = location.trim();
    } else {
      payload.title = title.trim();
      payload.org = org.trim();
      payload.hoursPerWeek = hoursPerWeek.trim();
      payload.location = location.trim();
      payload.description = description.trim();
    }

    setSaving(true);
    try {
      const response = await fetch("/api/campus-life", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });

      const data = await response.json().catch(() => ({} as { message?: string }));
      if (!response.ok) {
        setError(data.message ?? "Unable to publish campus update.");
        return;
      }

      setMessage("Campus update published successfully.");
      resetDraft();
      await loadCampusData();
    } catch {
      setError("Unable to publish campus update.");
    } finally {
      setSaving(false);
    }
  };

  const managedItems = useMemo<CampusManageItem[]>(() => {
    const eventItems = (campusData.events ?? []).map((item) => ({
      key: `event:${item.id}`,
      id: item.id,
      type: "event" as const,
      title: item.title,
      meta: `${item.date} | ${item.type ?? "social"} event`,
      isActive: item.isActive !== false,
      sortDate: item.date
    }));
    const announcementItems = (campusData.announcements ?? []).map((item) => ({
      key: `announcement:${item.id}`,
      id: item.id,
      type: "announcement" as const,
      title: item.title,
      meta: `${item.date} | Announcement`,
      isActive: item.isActive !== false,
      sortDate: item.date
    }));
    const volunteerItems = (campusData.volunteerRoles ?? []).map((item) => ({
      key: `volunteer:${item.id}`,
      id: item.id,
      type: "volunteer" as const,
      title: item.title,
      meta: `${item.org} | ${item.hoursPerWeek}`,
      isActive: item.isActive !== false,
      sortDate: ""
    }));
    const clubItems = (campusData.clubs ?? []).map((item) => ({
      key: `club:${item.id}`,
      id: item.id,
      type: "club" as const,
      title: item.name,
      meta: `${item.category} club`,
      isActive: item.isActive !== false,
      sortDate: ""
    }));
    const discountItems = (campusData.discounts ?? []).map((item) => ({
      key: `discount:${item.id}`,
      id: item.id,
      type: "discount" as const,
      title: item.name,
      meta: `${item.category} | ${item.location}`,
      isActive: item.isActive !== false,
      sortDate: ""
    }));

    return [...announcementItems, ...eventItems, ...volunteerItems, ...clubItems, ...discountItems]
      .sort((a, b) => {
        const first = Date.parse(a.sortDate);
        const second = Date.parse(b.sortDate);
        if (Number.isNaN(first) && Number.isNaN(second)) return a.title.localeCompare(b.title);
        if (Number.isNaN(first)) return 1;
        if (Number.isNaN(second)) return -1;
        return second - first;
      })
      .slice(0, 20);
  }, [campusData]);

  const activeContentCount = useMemo(
    () => managedItems.filter((item) => item.isActive).length,
    [managedItems]
  );
  const archivedContentCount = useMemo(
    () => managedItems.filter((item) => !item.isActive).length,
    [managedItems]
  );
  const filteredManagedItems = useMemo(() => {
    if (contentFilter === "active") return managedItems.filter((item) => item.isActive);
    if (contentFilter === "archived") return managedItems.filter((item) => !item.isActive);
    return managedItems;
  }, [contentFilter, managedItems]);

  const toggleCampusContent = useCallback(
    async (item: CampusManageItem) => {
      setUpdatingItemKey(item.key);
      setError(null);
      setMessage(null);
      try {
        const response = await fetch("/api/campus-life", {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            type: item.type,
            id: item.id,
            isActive: !item.isActive
          })
        });
        const data = (await response.json().catch(() => ({}))) as { message?: string };
        if (!response.ok) {
          setError(data.message ?? "Unable to update campus content status.");
          return;
        }
        setMessage(data.message ?? "Campus content updated.");
        await loadCampusData();
      } catch {
        setError("Unable to update campus content status.");
      } finally {
        setUpdatingItemKey(null);
      }
    },
    [loadCampusData]
  );

  const startEditCampusContent = useCallback(
    (item: CampusManageItem) => {
      if (item.type === "announcement") {
        const target = (campusData.announcements ?? []).find((entry) => entry.id === item.id);
        if (!target) {
          setError("Announcement not found for editing.");
          return;
        }
        setEditDraft({
          type: "announcement",
          id: target.id,
          title: target.title,
          date: target.date,
          body: target.body
        });
        return;
      }

      if (item.type === "event") {
        const target = (campusData.events ?? []).find((entry) => entry.id === item.id);
        if (!target) {
          setError("Event not found for editing.");
          return;
        }
        const normalizedEventType =
          target.type === "academic" || target.type === "career" ? target.type : "social";
        setEditDraft({
          type: "event",
          id: target.id,
          title: target.title,
          date: target.date,
          time: target.time ?? "",
          location: target.location ?? "",
          eventType: normalizedEventType,
          description: target.description ?? ""
        });
      }
    },
    [campusData.announcements, campusData.events]
  );

  const submitCampusEdit = useCallback(
    async (event: React.FormEvent<HTMLFormElement>) => {
      event.preventDefault();
      if (!editDraft) return;
      setEditSaving(true);
      setError(null);
      setMessage(null);
      try {
        const payload: Record<string, unknown> = {
          action: "update",
          type: editDraft.type,
          id: editDraft.id
        };
        if (editDraft.type === "announcement") {
          payload.title = editDraft.title.trim();
          payload.date = editDraft.date;
          payload.body = editDraft.body.trim();
        } else {
          payload.title = editDraft.title.trim();
          payload.date = editDraft.date;
          payload.time = editDraft.time.trim();
          payload.location = editDraft.location.trim();
          payload.eventType = editDraft.eventType;
          payload.description = editDraft.description.trim();
        }

        const response = await fetch("/api/campus-life", {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload)
        });
        const data = (await response.json().catch(() => ({}))) as { message?: string };
        if (!response.ok) {
          setError(data.message ?? "Unable to update campus content.");
          return;
        }

        setMessage(data.message ?? "Campus content updated.");
        setEditDraft(null);
        await loadCampusData();
      } catch {
        setError("Unable to update campus content.");
      } finally {
        setEditSaving(false);
      }
    },
    [editDraft, loadCampusData]
  );

  const deleteCampusContent = useCallback(
    async (item: CampusManageItem) => {
      if (item.isActive) {
        setError("Archive the item first before permanent deletion.");
        return;
      }
      const confirmed = window.confirm(
        `Permanently delete "${item.title}"? This cannot be undone.`
      );
      if (!confirmed) return;

      setDeletingItemKey(item.key);
      setError(null);
      setMessage(null);
      try {
        const response = await fetch("/api/campus-life", {
          method: "DELETE",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ type: item.type, id: item.id })
        });
        const data = (await response.json().catch(() => ({}))) as { message?: string };
        if (!response.ok) {
          setError(data.message ?? "Unable to delete campus content.");
          return;
        }

        if (editDraft?.id === item.id && editDraft.type === item.type) {
          setEditDraft(null);
        }
        setMessage(data.message ?? "Campus content deleted.");
        await loadCampusData();
      } catch {
        setError("Unable to delete campus content.");
      } finally {
        setDeletingItemKey(null);
      }
    },
    [editDraft, loadCampusData]
  );

  return (
    <div className="space-y-4">
      <p className="text-sm text-slate-600 dark:text-slate-300">
        Publish campus updates for students. These updates appear in Student Campus Life and trigger
        role-based notifications.
      </p>

      <Card className={`space-y-4 p-4 ${adminNavyCardClass}`}>
        <h3 className="text-sm font-semibold">Publish campus update</h3>
        <form className="space-y-3" onSubmit={submitCampusUpdate}>
          <div className="grid gap-3 md:grid-cols-2">
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-slate-600 dark:text-slate-300">Update type</label>
              <select
                className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm outline-none ring-primary/20 focus:ring-2 dark:border-slate-700 dark:bg-slate-900"
                value={publishType}
                onChange={(event) =>
                  setPublishType(event.target.value as "announcement" | "event" | "club" | "discount" | "volunteer")
                }
              >
                <option value="announcement">Announcement</option>
                <option value="event">Event</option>
                <option value="club">Club</option>
                <option value="discount">Discount</option>
                <option value="volunteer">Volunteer role</option>
              </select>
            </div>

            {(publishType === "announcement" || publishType === "event") && (
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-slate-600 dark:text-slate-300">Date</label>
                <input
                  type="date"
                  className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm outline-none ring-primary/20 focus:ring-2 dark:border-slate-700 dark:bg-slate-900"
                  value={date}
                  onChange={(event) => setDate(event.target.value)}
                  required
                />
              </div>
            )}
          </div>

          {(publishType === "announcement" || publishType === "event" || publishType === "volunteer") && (
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-slate-600 dark:text-slate-300">Title</label>
              <input
                className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm outline-none ring-primary/20 focus:ring-2 dark:border-slate-700 dark:bg-slate-900"
                value={title}
                onChange={(event) => setTitle(event.target.value)}
                required
              />
            </div>
          )}

          {(publishType === "club" || publishType === "discount") && (
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-slate-600 dark:text-slate-300">Name</label>
              <input
                className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm outline-none ring-primary/20 focus:ring-2 dark:border-slate-700 dark:bg-slate-900"
                value={name}
                onChange={(event) => setName(event.target.value)}
                required
              />
            </div>
          )}

          {publishType === "event" && (
            <div className="grid gap-3 md:grid-cols-3">
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-slate-600 dark:text-slate-300">Time</label>
                <input
                  className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm outline-none ring-primary/20 focus:ring-2 dark:border-slate-700 dark:bg-slate-900"
                  value={time}
                  onChange={(event) => setTime(event.target.value)}
                  placeholder="10:00-16:00"
                  required
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-slate-600 dark:text-slate-300">Location</label>
                <input
                  className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm outline-none ring-primary/20 focus:ring-2 dark:border-slate-700 dark:bg-slate-900"
                  value={location}
                  onChange={(event) => setLocation(event.target.value)}
                  required
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-slate-600 dark:text-slate-300">Event category</label>
                <select
                  className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm outline-none ring-primary/20 focus:ring-2 dark:border-slate-700 dark:bg-slate-900"
                  value={eventType}
                  onChange={(event) => setEventType(event.target.value as "academic" | "social" | "career")}
                >
                  <option value="social">Social</option>
                  <option value="academic">Academic</option>
                  <option value="career">Career</option>
                </select>
              </div>
            </div>
          )}

          {(publishType === "discount" || publishType === "volunteer") && (
            <div className="grid gap-3 md:grid-cols-2">
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-slate-600 dark:text-slate-300">Location</label>
                <input
                  className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm outline-none ring-primary/20 focus:ring-2 dark:border-slate-700 dark:bg-slate-900"
                  value={location}
                  onChange={(event) => setLocation(event.target.value)}
                  required
                />
              </div>
              {publishType === "volunteer" ? (
                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-slate-600 dark:text-slate-300">Hours per week</label>
                  <input
                    className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm outline-none ring-primary/20 focus:ring-2 dark:border-slate-700 dark:bg-slate-900"
                    value={hoursPerWeek}
                    onChange={(event) => setHoursPerWeek(event.target.value)}
                    required
                  />
                </div>
              ) : null}
            </div>
          )}

          {(publishType === "club" || publishType === "discount") && (
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-slate-600 dark:text-slate-300">Category</label>
              <input
                className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm outline-none ring-primary/20 focus:ring-2 dark:border-slate-700 dark:bg-slate-900"
                value={category}
                onChange={(event) => setCategory(event.target.value)}
                required
              />
            </div>
          )}

          {publishType === "volunteer" && (
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-slate-600 dark:text-slate-300">Organization</label>
              <input
                className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm outline-none ring-primary/20 focus:ring-2 dark:border-slate-700 dark:bg-slate-900"
                value={org}
                onChange={(event) => setOrg(event.target.value)}
                required
              />
            </div>
          )}

          <div className="space-y-1.5">
            <label className="text-xs font-medium text-slate-600 dark:text-slate-300">
              {publishType === "announcement" ? "Message" : "Description"}
            </label>
            <textarea
              className="min-h-[96px] w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm outline-none ring-primary/20 focus:ring-2 dark:border-slate-700 dark:bg-slate-900"
              value={publishType === "announcement" ? body : description}
              onChange={(event) =>
                publishType === "announcement"
                  ? setBody(event.target.value)
                  : setDescription(event.target.value)
              }
              required
            />
          </div>

          {error ? <p className="text-sm text-rose-600 dark:text-rose-400">{error}</p> : null}
          {message ? <p className="text-sm text-emerald-600 dark:text-emerald-300">{message}</p> : null}

          <div className="flex justify-end">
            <button
              type="submit"
              disabled={saving}
              className="rounded-full bg-primary px-4 py-2 text-sm font-medium text-white hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-70"
            >
              {saving ? "Publishing..." : "Publish update"}
            </button>
          </div>
        </form>
      </Card>

      <div className="grid gap-4 md:grid-cols-3">
        <StatCard
          label="Published content"
          value={loading ? "..." : String(activeContentCount)}
          description="Active in student feed"
        />
        <StatCard
          label="Archived content"
          value={loading ? "..." : String(archivedContentCount)}
          description="Hidden from student feed"
        />
        <StatCard
          label="Total managed items"
          value={loading ? "..." : String(managedItems.length)}
          description="Announcements, events, clubs, discounts, volunteer"
        />
      </div>

      <Card className={`space-y-3 p-4 ${adminNavyCardClass}`}>
        <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
          <h3 className="text-sm font-semibold">Content manager (archive / restore)</h3>
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => setContentFilter("all")}
              className={`rounded-full px-3 py-1 text-xs font-medium ${
                contentFilter === "all"
                  ? "bg-primary text-white"
                  : "bg-slate-100 text-slate-700 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-200"
              }`}
            >
              All ({managedItems.length})
            </button>
            <button
              type="button"
              onClick={() => setContentFilter("active")}
              className={`rounded-full px-3 py-1 text-xs font-medium ${
                contentFilter === "active"
                  ? "bg-primary text-white"
                  : "bg-slate-100 text-slate-700 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-200"
              }`}
            >
              Active ({activeContentCount})
            </button>
            <button
              type="button"
              onClick={() => setContentFilter("archived")}
              className={`rounded-full px-3 py-1 text-xs font-medium ${
                contentFilter === "archived"
                  ? "bg-primary text-white"
                  : "bg-slate-100 text-slate-700 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-200"
              }`}
            >
              Archived ({archivedContentCount})
            </button>
          </div>
        </div>
        {loading ? (
          <p className="text-sm text-slate-500">Loading content manager...</p>
        ) : !managedItems.length ? (
          <p className="text-sm text-slate-500">No campus content available.</p>
        ) : !filteredManagedItems.length ? (
          <p className="text-sm text-slate-500">No items in this filter.</p>
        ) : (
          <div className="space-y-2">
            {filteredManagedItems.map((item) => (
              <div
                key={item.key}
                className="flex flex-col gap-2 rounded-xl border border-slate-200 px-3 py-2 text-sm md:flex-row md:items-center md:justify-between dark:border-slate-800"
              >
                <div>
                  <p className="font-medium">{item.title}</p>
                  <p className="text-xs text-slate-500">{item.meta}</p>
                  <p className="text-[11px] uppercase tracking-wide text-slate-400">{item.type}</p>
                </div>
                <div className="flex items-center gap-2">
                  <span
                    className={`rounded-full px-2 py-1 text-[11px] font-medium ${
                      item.isActive
                        ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300"
                        : "bg-slate-200 text-slate-700 dark:bg-slate-800 dark:text-slate-200"
                    }`}
                  >
                    {item.isActive ? "Active" : "Archived"}
                  </span>
                  {(item.type === "announcement" || item.type === "event") ? (
                    <button
                      type="button"
                      onClick={() => startEditCampusContent(item)}
                      disabled={updatingItemKey === item.key || editSaving}
                      className="rounded-full border border-slate-200 px-3 py-1 text-xs font-medium text-slate-700 hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-60 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800"
                    >
                      {editDraft?.id === item.id && editDraft.type === item.type ? "Editing" : "Edit"}
                    </button>
                  ) : null}
                  <button
                    type="button"
                    onClick={() => toggleCampusContent(item)}
                    disabled={updatingItemKey === item.key || deletingItemKey === item.key}
                    className={`rounded-full px-3 py-1 text-xs font-medium disabled:cursor-not-allowed disabled:opacity-60 ${
                      item.isActive
                        ? "bg-rose-50 text-rose-700 hover:bg-rose-100 dark:bg-rose-900/30 dark:text-rose-300"
                        : "bg-emerald-50 text-emerald-700 hover:bg-emerald-100 dark:bg-emerald-900/40 dark:text-emerald-300"
                    }`}
                  >
                    {updatingItemKey === item.key
                      ? "Updating..."
                      : item.isActive
                        ? "Archive"
                        : "Restore"}
                  </button>
                  {!item.isActive ? (
                    <button
                      type="button"
                      onClick={() => deleteCampusContent(item)}
                      disabled={deletingItemKey === item.key || updatingItemKey === item.key}
                      className="rounded-full bg-rose-600 px-3 py-1 text-xs font-medium text-white hover:bg-rose-700 disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      {deletingItemKey === item.key ? "Deleting..." : "Delete permanently"}
                    </button>
                  ) : null}
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>

      {editDraft ? (
        <Card className={`space-y-3 p-4 ${adminNavyCardClass}`}>
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold">
              Edit {editDraft.type === "announcement" ? "announcement" : "event"}
            </h3>
            <button
              type="button"
              onClick={() => setEditDraft(null)}
              className="rounded-full border border-slate-200 px-3 py-1 text-xs font-medium text-slate-700 hover:bg-slate-100 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800"
            >
              Cancel
            </button>
          </div>
          <form className="space-y-3" onSubmit={submitCampusEdit}>
            <div className="grid gap-3 md:grid-cols-2">
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-slate-600 dark:text-slate-300">Title</label>
                <input
                  className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm outline-none ring-primary/20 focus:ring-2 dark:border-slate-700 dark:bg-slate-900"
                  value={editDraft.title}
                  onChange={(event) =>
                    setEditDraft((current) => (current ? { ...current, title: event.target.value } : current))
                  }
                  required
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-slate-600 dark:text-slate-300">Date</label>
                <input
                  type="date"
                  className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm outline-none ring-primary/20 focus:ring-2 dark:border-slate-700 dark:bg-slate-900"
                  value={editDraft.date}
                  onChange={(event) =>
                    setEditDraft((current) => (current ? { ...current, date: event.target.value } : current))
                  }
                  required
                />
              </div>
            </div>

            {editDraft.type === "event" ? (
              <>
                <div className="grid gap-3 md:grid-cols-3">
                  <div className="space-y-1.5">
                    <label className="text-xs font-medium text-slate-600 dark:text-slate-300">Time</label>
                    <input
                      className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm outline-none ring-primary/20 focus:ring-2 dark:border-slate-700 dark:bg-slate-900"
                      value={editDraft.time}
                      onChange={(event) =>
                        setEditDraft((current) =>
                          current && current.type === "event" ? { ...current, time: event.target.value } : current
                        )
                      }
                      required
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-xs font-medium text-slate-600 dark:text-slate-300">Location</label>
                    <input
                      className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm outline-none ring-primary/20 focus:ring-2 dark:border-slate-700 dark:bg-slate-900"
                      value={editDraft.location}
                      onChange={(event) =>
                        setEditDraft((current) =>
                          current && current.type === "event"
                            ? { ...current, location: event.target.value }
                            : current
                        )
                      }
                      required
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-xs font-medium text-slate-600 dark:text-slate-300">Event category</label>
                    <select
                      className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm outline-none ring-primary/20 focus:ring-2 dark:border-slate-700 dark:bg-slate-900"
                      value={editDraft.eventType}
                      onChange={(event) =>
                        setEditDraft((current) =>
                          current && current.type === "event"
                            ? { ...current, eventType: event.target.value as "academic" | "social" | "career" }
                            : current
                        )
                      }
                    >
                      <option value="social">Social</option>
                      <option value="academic">Academic</option>
                      <option value="career">Career</option>
                    </select>
                  </div>
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-slate-600 dark:text-slate-300">Description</label>
                  <textarea
                    className="min-h-[96px] w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm outline-none ring-primary/20 focus:ring-2 dark:border-slate-700 dark:bg-slate-900"
                    value={editDraft.description}
                    onChange={(event) =>
                      setEditDraft((current) =>
                        current && current.type === "event"
                          ? { ...current, description: event.target.value }
                          : current
                      )
                    }
                    required
                  />
                </div>
              </>
            ) : (
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-slate-600 dark:text-slate-300">Message</label>
                <textarea
                  className="min-h-[96px] w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm outline-none ring-primary/20 focus:ring-2 dark:border-slate-700 dark:bg-slate-900"
                  value={editDraft.body}
                  onChange={(event) =>
                    setEditDraft((current) =>
                      current && current.type === "announcement"
                        ? { ...current, body: event.target.value }
                        : current
                    )
                  }
                  required
                />
              </div>
            )}

            <div className="flex justify-end">
              <button
                type="submit"
                disabled={editSaving}
                className="rounded-full bg-primary px-4 py-2 text-sm font-medium text-white hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-70"
              >
                {editSaving ? "Saving..." : "Save changes"}
              </button>
            </div>
          </form>
        </Card>
      ) : null}

      <Card className={`space-y-3 p-4 ${adminNavyCardClass}`}>
        <h3 className="text-sm font-semibold">Recent announcements</h3>
        {loading ? (
          <p className="text-sm text-slate-500">Loading announcements...</p>
        ) : !campusData.announcements?.length ? (
          <p className="text-sm text-slate-500">No announcements yet.</p>
        ) : (
          <div className="space-y-3 text-sm">
            {(campusData.announcements ?? []).slice(0, 6).map((item) => (
              <div
                key={item.id}
                className="rounded-xl border border-slate-200 bg-slate-50 p-3 dark:border-slate-800 dark:bg-slate-950"
              >
                <p className="text-xs font-medium uppercase tracking-wide text-slate-500">
                  {item.date}
                </p>
                <p className="mt-1 font-semibold">{item.title}</p>
                <p className="mt-1 text-xs text-slate-500">{item.body}</p>
              </div>
            ))}
          </div>
        )}
      </Card>

      <Card className={`space-y-3 p-4 ${adminNavyCardClass}`}>
        <h3 className="text-sm font-semibold">Clubs and student discounts</h3>
        {loading ? (
          <p className="text-sm text-slate-500">Loading clubs and discounts...</p>
        ) : (
          <div className="grid gap-3 md:grid-cols-2">
            <div className="space-y-2">
              <p className="text-xs font-medium uppercase tracking-wide text-slate-500">Clubs</p>
              {(campusData.clubs ?? []).slice(0, 5).map((item) => (
                <div key={item.id} className="rounded-xl border border-slate-200 p-3 text-sm dark:border-slate-800">
                  <p className="font-medium">{item.name}</p>
                  <p className="text-xs text-slate-500">{item.category}</p>
                </div>
              ))}
              {!campusData.clubs?.length ? <p className="text-sm text-slate-500">No clubs yet.</p> : null}
            </div>
            <div className="space-y-2">
              <p className="text-xs font-medium uppercase tracking-wide text-slate-500">Discounts</p>
              {(campusData.discounts ?? []).slice(0, 5).map((item) => (
                <div key={item.id} className="rounded-xl border border-slate-200 p-3 text-sm dark:border-slate-800">
                  <p className="font-medium">{item.name}</p>
                  <p className="text-xs text-slate-500">{item.category} - {item.location}</p>
                </div>
              ))}
              {!campusData.discounts?.length ? <p className="text-sm text-slate-500">No discounts yet.</p> : null}
            </div>
          </div>
        )}
      </Card>

      <Card className={`space-y-3 p-4 ${adminNavyCardClass}`}>
        <h3 className="text-sm font-semibold">Upcoming events and volunteer roles</h3>
        {loading ? (
          <p className="text-sm text-slate-500">Loading campus feed...</p>
        ) : (
          <div className="grid gap-3 md:grid-cols-2">
            <div className="space-y-2">
              <p className="text-xs font-medium uppercase tracking-wide text-slate-500">Events</p>
              {(campusData.events ?? []).slice(0, 5).map((item) => (
                <div key={item.id} className="rounded-xl border border-slate-200 p-3 text-sm dark:border-slate-800">
                  <p className="font-medium">{item.title}</p>
                  <p className="text-xs text-slate-500">{item.date}</p>
                </div>
              ))}
              {!campusData.events?.length ? <p className="text-sm text-slate-500">No events yet.</p> : null}
            </div>
            <div className="space-y-2">
              <p className="text-xs font-medium uppercase tracking-wide text-slate-500">Volunteer roles</p>
              {(campusData.volunteerRoles ?? []).slice(0, 5).map((item) => (
                <div key={item.id} className="rounded-xl border border-slate-200 p-3 text-sm dark:border-slate-800">
                  <p className="font-medium">{item.title}</p>
                  <p className="text-xs text-slate-500">{item.org} - {item.hoursPerWeek}</p>
                </div>
              ))}
              {!campusData.volunteerRoles?.length ? (
                <p className="text-sm text-slate-500">No volunteer roles yet.</p>
              ) : null}
            </div>
          </div>
        )}
      </Card>
    </div>
  );
}

function AdminProfileSection() {
  const { user, refreshUser, updateUserProfile, requestPasswordReset } = useAuth();
  const [message, setMessage] = useState<{ type: "ok" | "err"; text: string } | null>(null);
  const [securityMessage, setSecurityMessage] = useState<{ type: "ok" | "err"; text: string } | null>(null);
  const [activeTab, setActiveTab] = useState<ProfileTab>("profile");

  const [name, setName] = useState(user?.name ?? "");
  const [contact, setContact] = useState(user?.contact ?? "");
  const [university, setUniversity] = useState(user?.university ?? "");
  const [department, setDepartment] = useState(user?.roleDetails?.department ?? "");
  const [office, setOffice] = useState(user?.roleDetails?.office ?? "");
  const [notificationMode, setNotificationMode] = useState(user?.roleDetails?.notificationMode ?? "email_in_app");
  const [permissionLevel, setPermissionLevel] = useState(user?.roleDetails?.permissionLevel ?? "view_only");

  const [profilePicUploading, setProfilePicUploading] = useState(false);
  const [personalSaving, setPersonalSaving] = useState(false);
  const [adminSaving, setAdminSaving] = useState(false);
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
    setUniversity(user.university ?? "");
    setDepartment(user.roleDetails?.department ?? "");
    setOffice(user.roleDetails?.office ?? "");
    setNotificationMode(user.roleDetails?.notificationMode ?? "email_in_app");
    setPermissionLevel(user.roleDetails?.permissionLevel ?? "view_only");
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

  const saveAdminProfile = async () => {
    if (!user?.email) return;
    setMessage(null);
    setAdminSaving(true);

    const currentRoleDetails = { ...(user.roleDetails ?? {}) };
    const nextDepartment = department.trim();
    const nextOffice = office.trim();

    if (nextDepartment) {
      currentRoleDetails.department = nextDepartment;
    } else {
      delete currentRoleDetails.department;
    }
    if (nextOffice) {
      currentRoleDetails.office = nextOffice;
    } else {
      delete currentRoleDetails.office;
    }
    if (notificationMode) {
      currentRoleDetails.notificationMode = notificationMode;
    }
    if (permissionLevel) {
      currentRoleDetails.permissionLevel = permissionLevel;
    }

    try {
      const response = await fetch("/api/users", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          firebaseUid: (user as { firebaseUid?: string }).firebaseUid,
          email: user.email,
          name: user.name,
          university: university.trim() || undefined,
          roleDetails: currentRoleDetails
        })
      });
      const payload = (await response.json()) as {
        user?: { university?: string; roleDetails?: Record<string, string> };
        message?: string;
      };
      if (response.ok && payload.user) {
        updateUserProfile({ university: payload.user.university, roleDetails: payload.user.roleDetails });
        await refreshUser();
        setMessage({ type: "ok", text: "Admin profile updated." });
      } else {
        setMessage({ type: "err", text: payload.message ?? "Could not save." });
      }
    } catch {
      setMessage({ type: "err", text: "Could not save. Try again." });
    } finally {
      setAdminSaving(false);
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

      <Card className={`flex flex-wrap items-center justify-between gap-4 p-5 ${adminNavyCardClass}`}>
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
            <p className="text-sm font-medium uppercase tracking-wide text-primary">Admin / faculty profile</p>
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

      <Card className={`p-4 ${adminNavyCardClass}`}>
        <p className="text-sm font-medium text-slate-700 dark:text-slate-200">
          Manage your own admin account settings. You cannot change other users from here.
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
            <Card className={`space-y-4 p-5 ${adminNavyCardClass}`}>
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

            <Card className={`space-y-4 p-5 ${adminNavyCardClass}`}>
              <h3 className="text-lg font-semibold text-slate-900 dark:text-white">Admin details</h3>
              <p className="text-sm text-slate-600 dark:text-slate-300">
                Department and approval scope used for verification and finance reviews.
              </p>
              <div className="grid gap-3 sm:grid-cols-2">
                <div className="space-y-1">
                  <label className="text-sm font-medium text-slate-700 dark:text-slate-300">University</label>
                  <Input
                    value={university}
                    onChange={(event) => setUniversity(event.target.value)}
                    placeholder="University"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-sm font-medium text-slate-700 dark:text-slate-300">Department / office</label>
                  <Input
                    value={department}
                    onChange={(event) => setDepartment(event.target.value)}
                    placeholder="Student affairs"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-sm font-medium text-slate-700 dark:text-slate-300">Office / faculty unit</label>
                  <Input value={office} onChange={(event) => setOffice(event.target.value)} placeholder="Office" />
                </div>
                <div className="space-y-1">
                  <label className="text-sm font-medium text-slate-700 dark:text-slate-300">Notification mode</label>
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
                <div className="space-y-1">
                  <label className="text-sm font-medium text-slate-700 dark:text-slate-300">Permission level</label>
                  <select
                    className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 outline-none focus:border-primary dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100"
                    value={permissionLevel}
                    onChange={(event) => setPermissionLevel(event.target.value)}
                  >
                    <option value="view_only">View only</option>
                    <option value="approve_financial_aid">Approve financial aid</option>
                    <option value="full_admin">Full admin (faculty)</option>
                  </select>
                </div>
              </div>
              <Button variant="primary" onClick={saveAdminProfile} disabled={adminSaving}>
                {adminSaving ? "Saving..." : "Update admin profile"}
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
            <Card className={`space-y-4 p-5 ${adminNavyCardClass}`}>
              <h3 className="text-lg font-semibold text-slate-900 dark:text-white">Privacy preferences</h3>
              <p className="text-sm text-slate-600 dark:text-slate-300">
                Control what is shared with other university teams.
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
                  Share career services overview with mentors
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
                  Share financial oversight activity with super admins
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

            <Card className={`space-y-4 p-5 ${adminNavyCardClass}`}>
              <h3 className="text-lg font-semibold text-slate-900 dark:text-white">Notification settings</h3>
              <p className="text-sm text-slate-600 dark:text-slate-300">
                Choose how you receive verification and request updates.
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
                  Email for application status changes
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
                  Reminders for oversight approvals
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
                  Weekly admin digest reminder
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
            <Card className={`space-y-3 p-5 ${adminNavyCardClass}`}>
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

            <Card className={`space-y-3 p-5 ${adminNavyCardClass}`}>
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

function AdminPartnershipsSection() {
  const [partnerships, setPartnerships] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    import("@/lib/ngo-demo-store").then(({ getNgoPartnerships }) => {
      setPartnerships(getNgoPartnerships().filter(p => p.partnerType === "admin" || p.status === "active"));
      setLoading(false);
    });
  }, []);

  return (
    <div className="space-y-6">
      <Card className="border-primary/20 bg-primary/5 p-4 dark:border-primary/10 dark:bg-primary/10">
        <p className="text-sm font-medium text-slate-700 dark:text-slate-300">
          Partner organizations collaborate with University Admins to co-manage scholarships, verify eligibility, 
          and track resource distribution. View active joint initiatives below.
        </p>
      </Card>
      
      {loading ? (
        <p className="text-sm text-slate-500">Loading active partnerships...</p>
      ) : partnerships.length === 0 ? (
        <p className="text-sm text-slate-500">No active partnerships found.</p>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {partnerships.map((partner) => (
            <Card key={partner._id} className="p-5 flex flex-col items-start hover:shadow-md transition-shadow">
              <span className="mb-2 rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-medium text-slate-700 dark:bg-slate-800 dark:text-slate-300">
                {new Date(partner.since).getFullYear()} Partnership
              </span>
              <h3 className="text-lg font-bold text-slate-900 dark:text-white leading-tight mb-1">{partner.partnerName}</h3>
              <p className="text-sm text-primary font-medium mb-3">{partner.focusArea}</p>
              
              <div className="w-full mt-auto space-y-3 border-t border-slate-100 pt-3 dark:border-slate-800">
                <div>
                  <p className="text-xs font-semibold text-slate-500 uppercase tracking-widest mb-1">Your Role</p>
                  <p className="text-sm text-slate-700 dark:text-slate-300">{partner.role}</p>
                </div>
                {partner.jointInitiatives && partner.jointInitiatives.length > 0 && (
                  <div>
                    <p className="text-xs font-semibold text-slate-500 uppercase tracking-widest mb-1">Joint Initiatives</p>
                    <ul className="list-disc pl-4 text-sm text-slate-600 dark:text-slate-400">
                      {partner.jointInitiatives.map((ji: string, i: number) => (
                        <li key={i}>{ji}</li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}

function AdminNgoPartnershipSection() {
  return <NgoPartnershipSection viewerRole="admin" cardClassName={adminNavyCardClass} />;
}
