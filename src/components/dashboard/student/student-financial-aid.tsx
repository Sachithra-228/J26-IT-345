"use client";

import { useCallback, useEffect, useState, type ReactNode } from "react";
import Image from "next/image";
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from "recharts";
import {
  ChartPie,
  ChevronRight,
  GraduationCap,
  HeartHandshake,
  History,
  Laptop,
  LifeBuoy,
  UtensilsCrossed,
  Wallet,
  type LucideIcon
} from "lucide-react";
import { Card } from "@/components/shared/Card";
import { Badge } from "@/components/shared/Badge";
import { Button } from "@/components/shared/Button";
import { AidRequestForm } from "@/components/financial/aid-request-form";
import { Input } from "@/components/shared/Input";
import {
  getNgoPrograms,
  getNgoApplications,
  getNgoBeneficiaries,
  addNgoApplication,
  type NgoProgram
} from "@/lib/ngo-demo-store";
import { useAuth } from "@/context/auth-context";
import {
  studentBentoIconClass,
  studentBentoInsetClass,
  studentBentoPillClass,
  studentBentoTileClass
} from "./student-card-theme";

type AidRequest = {
  id?: string;
  _id?: string;
  category?: string;
  status?: string;
  submittedAt?: string;
  amount?: string;
  description?: string;
  createdAt?: string;
};

type FinancialSummary = {
  mealVoucherBalance?: number;
  tuitionSupportBalance?: number;
  currency?: string;
  lastUpdated?: string | null;
};

type AidCategoryKey = "emergency" | "equipment" | "boarding" | "tuition" | "other";

const TAB_IDS = ["emergency-aid", "equipment", "meal-voucher", "tuition", "ngo-programs"] as const;
type TabId = (typeof TAB_IDS)[number];

const STATUS_COLORS: Record<string, string> = {
  Approved: "#10b981",
  Rejected: "#ef4444",
  Pending: "#f59e0b"
};
const AUTO_REFRESH_MS = 30000;

function normalizeCategory(category?: string): AidCategoryKey {
  const value = String(category ?? "").trim().toLowerCase();
  if (!value) return "emergency";
  if (value.includes("equipment")) return "equipment";
  if (value.includes("meal") || value.includes("voucher") || value.includes("boarding")) return "boarding";
  if (value.includes("tuition") || value.includes("maintenance") || value.includes("fee")) return "tuition";
  if (value.includes("emergency")) return "emergency";
  return "other";
}

function formatCategory(category: string): string {
  const key = normalizeCategory(category);
  if (key === "emergency") return "Emergency academic aid";
  if (key === "equipment") return "Equipment & resources";
  if (key === "boarding") return "Meal vouchers & necessities";
  if (key === "tuition") return "Tuition & maintenance";
  return category || "Aid request";
}

function normalizeStatus(status?: string): "Approved" | "Rejected" | "Pending" {
  const value = String(status ?? "").trim().toLowerCase();
  if (value === "approved") return "Approved";
  if (value === "rejected") return "Rejected";
  return "Pending";
}

function formatStatus(status?: string): string {
  if (!status) return "Under review";
  return status
    .split(" ")
    .map((part) => (part ? `${part.charAt(0).toUpperCase()}${part.slice(1).toLowerCase()}` : part))
    .join(" ");
}

function getStatusBadgeVariant(status?: string): "success" | "warning" | "info" {
  const normalized = normalizeStatus(status);
  if (normalized === "Approved") return "success";
  if (normalized === "Rejected") return "warning";
  return "info";
}

function parseAmountValue(input?: string): number {
  if (!input) return 0;
  const cleaned = String(input).replace(/[^0-9.-]/g, "");
  const parsed = Number(cleaned);
  return Number.isFinite(parsed) ? parsed : 0;
}

export function StudentFinancialAid() {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState<TabId>("emergency-aid");
  const [aidRequests, setAidRequests] = useState<AidRequest[]>([]);
  const [financialSummary, setFinancialSummary] = useState<FinancialSummary | null>(null);
  const [loadingAid, setLoadingAid] = useState(true);
  const [loadingFin, setLoadingFin] = useState(true);
  const [showSuccessPopup, setShowSuccessPopup] = useState(false);
  const [selectedRequest, setSelectedRequest] = useState<AidRequest | null>(null);
  const [showBalanceCardPopup, setShowBalanceCardPopup] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  
  // NGO states
  const [ngoPrograms, setNgoPrograms] = useState<NgoProgram[]>([]);
  const [ngoApplications, setNgoApplications] = useState(getNgoApplications());
  const [ngoBeneficiaries, setNgoBeneficiaries] = useState(getNgoBeneficiaries());
  const [applyingNgoId, setApplyingNgoId] = useState<string | null>(null);
  const [ngoApplyReason, setNgoApplyReason] = useState("");
  const [ngoApplyAmount, setNgoApplyAmount] = useState("");

  const fetchAidRequests = useCallback((showLoader = true) => {
    if (showLoader) setLoadingAid(true);
    fetch("/api/aid-requests")
      .then((r) => r.json())
      .then((data) => setAidRequests(Array.isArray(data) ? data : []))
      .catch(() => setAidRequests([]))
      .finally(() => {
        if (showLoader) setLoadingAid(false);
      });
  }, []);

  const fetchFinancialSummary = useCallback((showLoader = true) => {
    if (showLoader) setLoadingFin(true);
    fetch("/api/students/financial-summary")
      .then((r) => r.json())
      .then((data) => setFinancialSummary(data || null))
      .catch(() => setFinancialSummary(null))
      .finally(() => {
        if (showLoader) setLoadingFin(false);
      });
  }, []);

  const refreshAidAndSummary = useCallback(
    (showLoader = false) => {
      fetchAidRequests(showLoader);
      fetchFinancialSummary(showLoader);
      setNgoPrograms(getNgoPrograms().filter((p) => p.status === "active"));
      setNgoApplications([...getNgoApplications()]);
      setNgoBeneficiaries([...getNgoBeneficiaries()]);
    },
    [fetchAidRequests, fetchFinancialSummary]
  );

  useEffect(() => {
    refreshAidAndSummary(true);
  }, [refreshAidAndSummary]);

  useEffect(() => {
    const intervalId = setInterval(() => {
      refreshAidAndSummary(false);
    }, AUTO_REFRESH_MS);

    return () => clearInterval(intervalId);
  }, [refreshAidAndSummary]);

  useEffect(() => {
    if (!toastMessage) return;
    const timer = setTimeout(() => setToastMessage(null), 3000);
    return () => clearTimeout(timer);
  }, [toastMessage]);

  const emergencyRequests = aidRequests.filter((request) => normalizeCategory(request.category) === "emergency");
  const equipmentRequests = aidRequests.filter((request) => normalizeCategory(request.category) === "equipment");
  const mealVoucherRequests = aidRequests.filter((request) => normalizeCategory(request.category) === "boarding");
  const tuitionRequests = aidRequests.filter((request) => normalizeCategory(request.category) === "tuition");

  const emergencyStatusCounts = emergencyRequests.reduce(
    (acc, request) => {
      const key = normalizeStatus(request.status);
      acc[key] = (acc[key] || 0) + 1;
      return acc;
    },
    {} as Record<"Approved" | "Rejected" | "Pending", number>
  );

  const pieData = [
    { name: "Pending", value: emergencyStatusCounts.Pending || 0, color: STATUS_COLORS.Pending },
    { name: "Approved", value: emergencyStatusCounts.Approved || 0, color: STATUS_COLORS.Approved },
    { name: "Rejected", value: emergencyStatusCounts.Rejected || 0, color: STATUS_COLORS.Rejected }
  ].filter((entry) => entry.value > 0);

  const mealBalance = financialSummary?.mealVoucherBalance ?? 0;
  const tuitionBalance = financialSummary?.tuitionSupportBalance ?? 0;
  const currency = financialSummary?.currency ?? "LKR";
  const displayName = (user?.name || "Student").trim();
  const displayEmail = (user?.email || "student@university.edu").trim();
  const initials = displayName
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part.charAt(0).toUpperCase())
    .join("") || "ST";
  const currentStudentId = user?.firebaseUid || user?._id || "student-demo";
  const studentNgoApplications = ngoApplications.filter((app) => app.studentId === currentStudentId);
  const studentNgoApplicationIds = new Set(studentNgoApplications.map((app) => app._id));
  const ngoTotalReceived = ngoBeneficiaries.reduce((sum, beneficiary) => {
    if (!beneficiary.applicationId || !studentNgoApplicationIds.has(beneficiary.applicationId)) return sum;
    return sum + (beneficiary.supportReceived || 0);
  }, 0);
  const emergencyAidReceived = aidRequests.reduce((sum, request) => {
    const isEmergency = normalizeCategory(request.category) === "emergency";
    const isApproved = normalizeStatus(request.status) === "Approved";
    if (!isEmergency || !isApproved) return sum;
    return sum + parseAmountValue(request.amount);
  }, 0);
  const totalBalance = mealBalance + tuitionBalance + ngoTotalReceived + emergencyAidReceived;

  const renderBalanceCardContent = (isPopup = false) => {
    const profileSize = isPopup ? 72 : 64;
    const profileClass = isPopup ? "h-[72px] w-[72px]" : "h-16 w-16";
    const nameClass = isPopup ? "text-base" : "text-sm";
    const balanceClass = isPopup ? "text-3xl md:text-4xl" : "text-2xl md:text-3xl";

    return (
      <>
        <div className="pointer-events-none absolute inset-0 opacity-20">
          <div className="absolute -left-8 -top-8 h-28 w-28 rounded-full bg-white/20 blur-2xl" />
          <div className="absolute -bottom-10 right-8 h-32 w-32 rounded-full bg-primary/50 blur-3xl" />
        </div>
        <div className={isPopup ? "relative px-6 py-6" : "relative px-5 py-5"}>
          <div className="flex items-start justify-between gap-5">
            <div className="min-w-0">
              <div className="flex items-center gap-3">
                {user?.profilePic ? (
                  <Image
                    src={user.profilePic}
                    alt={displayName}
                    width={profileSize}
                    height={profileSize}
                    className={`${profileClass} rounded-full border border-white/30 object-cover`}
                  />
                ) : (
                  <div
                    className={`flex ${profileClass} items-center justify-center rounded-full border border-white/30 bg-white/10 text-base font-semibold text-white`}
                  >
                    {initials}
                  </div>
                )}
                <div className="min-w-0">
                  <p className={`truncate font-semibold text-white ${nameClass}`}>{displayName}</p>
                  <p className="truncate text-xs text-slate-300">{displayEmail}</p>
                </div>
              </div>
            </div>

            <div className="text-right">
              <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-slate-400">Total balance</p>
              {loadingFin ? (
                <p className="mt-2 text-2xl font-bold text-slate-300">Loading...</p>
              ) : (
                <p className={`mt-2 font-bold ${balanceClass}`}>
                  {currency} {totalBalance.toLocaleString()}
                </p>
              )}
            </div>
          </div>

          <div className="mt-5 border-t border-white/10 pt-3 text-xs text-slate-300">
            {loadingFin ? (
              <span>Fetching latest balances...</span>
            ) : (
              <span>
                Meal vouchers {currency} {mealBalance.toLocaleString()} + Tuition support {currency}{" "}
                {tuitionBalance.toLocaleString()} + NGO {currency} {ngoTotalReceived.toLocaleString()} + Emergency aid{" "}
                {currency} {emergencyAidReceived.toLocaleString()}
              </span>
            )}
            {financialSummary?.lastUpdated && (
              <p className="mt-1 text-[11px] text-slate-400">Updated: {financialSummary.lastUpdated}</p>
            )}
          </div>
        </div>
      </>
    );
  };

  const renderRequestList = (requests: AidRequest[], emptyMessage: string) => {
    if (requests.length === 0) {
      return (
        <div className={`${studentBentoInsetClass} py-8 text-center text-xs text-slate-500 dark:text-neutral-500`}>
          {emptyMessage}
        </div>
      );
    }

    return (
      <ul className="space-y-2">
        {requests.map((request, index) => (
          <li key={request._id || request.id || index}>
            <button
              type="button"
              onClick={() => setSelectedRequest(request)}
              className={`${studentBentoInsetClass} group flex w-full items-center justify-between gap-3 px-3.5 py-3 text-left transition-colors hover:bg-slate-100/90 dark:hover:bg-neutral-900`}
            >
              <div className="min-w-0">
                <p className="truncate text-sm font-semibold text-slate-800 dark:text-neutral-200">
                  {formatCategory(request.category || "")}
                </p>
                {request.amount && (
                  <p className="text-[11px] text-slate-500 dark:text-neutral-500">
                    {currency} {request.amount}
                  </p>
                )}
              </div>
              <div className="flex shrink-0 items-center gap-2">
                <Badge variant={getStatusBadgeVariant(request.status)}>{formatStatus(request.status)}</Badge>
                <ChevronRight className="size-4 text-slate-400 transition-transform group-hover:translate-x-0.5 dark:text-neutral-500" />
              </div>
            </button>
          </li>
        ))}
      </ul>
    );
  };

  const tabs = [
    { id: "emergency-aid" as const, label: "Emergency aid", icon: LifeBuoy },
    { id: "equipment" as const, label: "Equipment", icon: Laptop },
    { id: "meal-voucher" as const, label: "Meal vouchers", icon: UtensilsCrossed },
    { id: "tuition" as const, label: "Tuition", icon: GraduationCap },
    { id: "ngo-programs" as const, label: "NGO programs", icon: HeartHandshake }
  ];

  const balanceTiles = [
    { label: "Meal vouchers", value: mealBalance, icon: UtensilsCrossed, dot: "bg-amber-500" },
    { label: "Tuition support", value: tuitionBalance, icon: GraduationCap, dot: "bg-blue-500" },
    { label: "NGO support", value: ngoTotalReceived, icon: HeartHandshake, dot: "bg-emerald-500" },
    { label: "Emergency aid", value: emergencyAidReceived, icon: LifeBuoy, dot: "bg-rose-500" }
  ];

  const renderTileHeader = (
    Icon: LucideIcon,
    title: string,
    subtitle?: string,
    meta?: ReactNode
  ) => (
    <div className="mb-5 flex items-start justify-between gap-3">
      <div className="flex items-center gap-3">
        <span className={studentBentoIconClass}>
          <Icon className="size-5" />
        </span>
        <div>
          <h3 className="text-base font-bold tracking-tight text-slate-900 dark:text-white">{title}</h3>
          {subtitle ? <p className="text-xs text-slate-500 dark:text-neutral-400">{subtitle}</p> : null}
        </div>
      </div>
      {meta}
    </div>
  );

  const renderFormTile = (
    Icon: LucideIcon,
    title: string,
    subtitle: string,
    category: "emergency" | "equipment" | "boarding" | "tuition",
    submitLabel: string
  ) => (
    <div className={`${studentBentoTileClass} lg:col-span-7`}>
      {renderTileHeader(Icon, title, subtitle)}
      <AidRequestForm
        defaultCategory={category}
        lockCategory
        submitLabel={submitLabel}
        onSuccess={() => refreshAidAndSummary(false)}
        onShowSuccessPopup={() => setShowSuccessPopup(true)}
      />
    </div>
  );

  const renderHistoryTile = (requests: AidRequest[], emptyMessage: string, className = "") => (
    <div className={`${studentBentoTileClass} ${className}`}>
      {renderTileHeader(
        History,
        "Request history",
        "Select a request to view details",
        <span className={studentBentoPillClass}>{requests.length} total</span>
      )}
      {loadingAid ? <p className="text-sm text-slate-500 dark:text-neutral-500">Loading...</p> : renderRequestList(requests, emptyMessage)}
    </div>
  );

  const renderBalanceTile = (title: string, value: number) => (
    <div className={studentBentoTileClass}>
      {renderTileHeader(Wallet, title, financialSummary?.lastUpdated ? `Updated ${financialSummary.lastUpdated}` : undefined)}
      {loadingFin ? (
        <p className="text-sm text-slate-500 dark:text-neutral-500">Loading...</p>
      ) : (
        <p className="text-3xl font-bold tracking-tight text-slate-900 dark:text-white">
          <span className="mr-1.5 text-base font-semibold text-slate-400 dark:text-neutral-500">{currency}</span>
          {value.toLocaleString()}
        </p>
      )}
    </div>
  );

  return (
    <div className="space-y-4">
      {/* Top bento row: balance card + balance breakdown */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-12">
        <div
          role="button"
          tabIndex={0}
          onClick={() => setShowBalanceCardPopup(true)}
          onKeyDown={(event) => {
            if (event.key === "Enter" || event.key === " ") {
              event.preventDefault();
              setShowBalanceCardPopup(true);
            }
          }}
          className="relative cursor-pointer overflow-hidden rounded-3xl bg-gradient-to-br from-slate-950 via-black to-slate-900 text-white shadow-[0_2px_12px_-4px_rgba(15,23,42,0.25)] transition-transform duration-200 hover:scale-[1.005] focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/60 focus-visible:ring-offset-2 lg:col-span-7 dark:ring-1 dark:ring-white/10 dark:focus-visible:ring-offset-black"
          aria-label="Open balance card"
        >
          {renderBalanceCardContent()}
        </div>

        <div className="grid grid-cols-2 gap-4 lg:col-span-5">
          {balanceTiles.map(({ label, value, icon: Icon, dot }) => (
            <div key={label} className={`${studentBentoTileClass} flex flex-col justify-between !p-5`}>
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-1.5">
                  <span className={`h-2 w-2 rounded-full ${dot}`} />
                  <span className="text-[11px] font-medium text-slate-500 dark:text-neutral-400">{label}</span>
                </div>
                <Icon className="size-4 text-slate-400 dark:text-neutral-500" />
              </div>
              <p className="mt-3 text-lg font-bold text-slate-900 dark:text-white">
                {loadingFin ? "..." : `${currency} ${value.toLocaleString()}`}
              </p>
            </div>
          ))}
        </div>
      </div>

      {/* Section switcher */}
      <nav
        className="flex gap-1 overflow-x-auto rounded-2xl bg-slate-100/80 p-1 dark:bg-neutral-900/80"
        aria-label="Financial aid sections"
      >
        {tabs.map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            type="button"
            onClick={() => setActiveTab(id)}
            aria-pressed={activeTab === id}
            className={`flex shrink-0 items-center gap-2 rounded-xl px-4 py-2 text-sm font-medium transition-colors ${
              activeTab === id
                ? "bg-white text-slate-900 shadow-sm dark:bg-neutral-950 dark:text-white"
                : "text-slate-500 hover:text-slate-900 dark:text-neutral-400 dark:hover:text-white"
            }`}
          >
            <Icon className="size-4" />
            {label}
          </button>
        ))}
      </nav>

      {activeTab === "emergency-aid" && (
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-12">
          {renderFormTile(
            LifeBuoy,
            "Apply for emergency academic aid",
            "Requests are verified by your university before release",
            "emergency",
            "Submit emergency aid request"
          )}

          <div className="space-y-4 lg:col-span-5">
            <div className={studentBentoTileClass}>
              {renderTileHeader(
                ChartPie,
                "Emergency aid status",
                "Your emergency requests at a glance",
                <span className={studentBentoPillClass}>{emergencyRequests.length} total</span>
              )}
              {loadingAid ? (
                <p className="text-sm text-slate-500 dark:text-neutral-500">Loading...</p>
              ) : (
                <>
                  <div className="h-[170px]">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={pieData.length > 0 ? pieData : [{ name: "No requests", value: 1, color: "#52525b" }]}
                          cx="50%"
                          cy="50%"
                          innerRadius={50}
                          outerRadius={72}
                          paddingAngle={pieData.length > 1 ? 4 : 0}
                          dataKey="value"
                          nameKey="name"
                          stroke="none"
                        >
                          {(pieData.length > 0 ? pieData : [{ color: "#52525b" }]).map((entry, index) => (
                            <Cell key={index} fill={entry.color} />
                          ))}
                        </Pie>
                        {pieData.length > 0 && <Tooltip formatter={(value: number) => [value, "Count"]} />}
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                  <div className="mt-2 grid grid-cols-3 gap-2.5">
                    {(["Pending", "Approved", "Rejected"] as const).map((status) => (
                      <div key={status} className={`${studentBentoInsetClass} px-3 py-2.5`}>
                        <div className="flex items-center gap-1.5">
                          <span className="h-2 w-2 rounded-full" style={{ backgroundColor: STATUS_COLORS[status] }} />
                          <span className="text-[11px] font-medium text-slate-500 dark:text-neutral-400">{status}</span>
                        </div>
                        <p className="mt-1 text-lg font-bold text-slate-900 dark:text-white">
                          {emergencyStatusCounts[status] || 0}
                        </p>
                      </div>
                    ))}
                  </div>
                </>
              )}
            </div>
            {renderHistoryTile(emergencyRequests, "No emergency requests yet.")}
          </div>
        </div>
      )}

      {activeTab === "equipment" && (
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-12">
          {renderFormTile(
            Laptop,
            "Request equipment & resources",
            "Laptops, books and lab equipment, tracked with live status",
            "equipment",
            "Submit equipment request"
          )}
          {renderHistoryTile(equipmentRequests, "No equipment requests yet.", "lg:col-span-5")}
        </div>
      )}

      {activeTab === "meal-voucher" && (
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-12">
          {renderFormTile(
            UtensilsCrossed,
            "Request a meal voucher top-up",
            "Top up your balance when you need more support",
            "boarding",
            "Submit meal voucher request"
          )}
          <div className="space-y-4 lg:col-span-5">
            {renderBalanceTile("Meal voucher balance", mealBalance)}
            {renderHistoryTile(mealVoucherRequests, "No meal voucher requests yet.")}
          </div>
        </div>
      )}

      {activeTab === "tuition" && (
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-12">
          {renderFormTile(
            GraduationCap,
            "Apply for tuition & maintenance aid",
            "Request support towards fees and living costs",
            "tuition",
            "Submit tuition request"
          )}
          <div className="space-y-4 lg:col-span-5">
            {renderBalanceTile("Allocated tuition support", tuitionBalance)}
            {renderHistoryTile(tuitionRequests, "No tuition support requests yet.")}
          </div>
        </div>
      )}

      {activeTab === "ngo-programs" && (
        <div className={studentBentoTileClass}>
          {renderTileHeader(
            HeartHandshake,
            "NGO support programs",
            "Partner programs verified by your university admin",
            <span className={studentBentoPillClass}>{ngoPrograms.length} active</span>
          )}

          {ngoPrograms.length === 0 ? (
            <div className={`${studentBentoInsetClass} py-10 text-center text-sm text-slate-500 dark:text-neutral-500`}>
              No active NGO programs at this time.
            </div>
          ) : (
            <div className="grid gap-3.5 md:grid-cols-2">
              {ngoPrograms.map((prog) => {
                const hasApplied = studentNgoApplications.some((application) => application.programId === prog._id);
                return (
                  <div key={prog._id} className={`${studentBentoInsetClass} flex flex-col justify-between p-4`}>
                    <div>
                      <div className="flex items-start justify-between gap-2">
                        <h4 className="font-semibold text-slate-900 dark:text-white">{prog.title}</h4>
                        {hasApplied ? <Badge variant="success">Applied</Badge> : null}
                      </div>
                      <p className="mt-1 text-xs leading-relaxed text-slate-600 dark:text-neutral-400">{prog.description}</p>
                      <p className="mt-2 text-[11px] font-medium text-slate-500 dark:text-neutral-500">
                        Eligibility: {prog.eligibility}
                      </p>
                    </div>

                    {applyingNgoId === prog._id ? (
                      <div className="mt-4 space-y-2">
                        <Input
                          placeholder="Amount requested (LKR)"
                          type="number"
                          value={ngoApplyAmount}
                          onChange={(e) => setNgoApplyAmount(e.target.value)}
                          className="border-transparent bg-white dark:border-transparent dark:bg-neutral-950"
                        />
                        <textarea
                          placeholder="Brief reason for application..."
                          value={ngoApplyReason}
                          onChange={(e) => setNgoApplyReason(e.target.value)}
                          className="w-full rounded-xl bg-white px-3 py-2 text-sm focus-visible:outline-none dark:bg-neutral-950"
                          rows={2}
                        />
                        <div className="flex gap-2">
                          <Button variant="primary" className="flex-1 py-1.5 text-xs" onClick={() => {
                            if (!ngoApplyReason.trim()) return;
                            const studentId = currentStudentId;
                            const studentInitials = initials || "ST";
                            const studentUniversity = user?.university?.trim() || "University";
                            const hasExistingApplication = getNgoApplications().some(
                              (app) =>
                                app.programId === prog._id &&
                                app.studentId === studentId
                            );
                            if (hasExistingApplication) {
                              setToastMessage("You already applied for this program.");
                              return;
                            }
                            addNgoApplication({
                              studentId,
                              studentInitials,
                              university: studentUniversity,
                              programId: prog._id,
                              programTitle: prog.title,
                              amountRequested: Number(ngoApplyAmount) || 0,
                              reason: ngoApplyReason
                            });
                            setApplyingNgoId(null);
                            setNgoApplyReason("");
                            setNgoApplyAmount("");
                            refreshAidAndSummary(false);
                            setToastMessage("Application submitted to Administrative review.");
                          }}>
                            Submit
                          </Button>
                          <Button variant="secondary" className="py-1.5 text-xs" onClick={() => setApplyingNgoId(null)}>Cancel</Button>
                        </div>
                      </div>
                    ) : (
                      <div className="mt-4">
                        <Button
                          disabled={hasApplied}
                          className={hasApplied ? "cursor-not-allowed opacity-60" : ""}
                          onClick={() => {
                            if (hasApplied) return;
                            setApplyingNgoId(prog._id);
                            setNgoApplyReason("");
                            setNgoApplyAmount("");
                          }}
                        >
                          {hasApplied ? "Applied" : "Apply"}
                        </Button>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {showSuccessPopup && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
          role="dialog"
          aria-modal="true"
          aria-labelledby="success-title"
          onClick={() => setShowSuccessPopup(false)}
        >
          <div onClick={(event) => event.stopPropagation()}>
            <Card className="w-full max-w-sm rounded-3xl border-slate-200/80 bg-white p-6 shadow-xl dark:border-white/10 dark:bg-neutral-950">
              <p id="success-title" className="text-center text-lg font-semibold text-slate-900 dark:text-white">
                Request submitted
              </p>
              <p className="mt-2 text-center text-sm text-slate-600 dark:text-slate-400">
                Your request has been submitted for university verification. You can track it in the relevant tab history.
              </p>
              <div className="mt-6 flex justify-center">
                <Button type="button" onClick={() => setShowSuccessPopup(false)}>
                  OK
                </Button>
              </div>
            </Card>
          </div>
        </div>
      )}

      {showBalanceCardPopup && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4"
          role="dialog"
          aria-modal="true"
          aria-label="Balance card preview"
          onClick={() => setShowBalanceCardPopup(false)}
        >
          <div onClick={(event) => event.stopPropagation()} className="w-full max-w-2xl">
            <Card className="relative overflow-hidden rounded-3xl border-white/10 bg-gradient-to-br from-slate-950 via-black to-slate-900 p-0 text-white shadow-2xl">
              {renderBalanceCardContent(true)}
            </Card>
          </div>
        </div>
      )}

      {selectedRequest && (() => {
        const submittedRaw = selectedRequest.submittedAt || selectedRequest.createdAt;
        const submittedFormatted =
          submittedRaw &&
          (() => {
            try {
              const date = new Date(submittedRaw);
              return Number.isNaN(date.getTime())
                ? submittedRaw
                : date.toLocaleString(undefined, { dateStyle: "medium", timeStyle: "short" });
            } catch {
              return submittedRaw;
            }
          })();

        return (
          <div
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
            role="dialog"
            aria-modal="true"
            aria-labelledby="detail-title"
            onClick={() => setSelectedRequest(null)}
          >
            <div onClick={(event) => event.stopPropagation()}>
              <Card className="w-full max-w-md rounded-3xl border-slate-200/80 bg-white p-0 shadow-xl dark:border-white/10 dark:bg-neutral-950">
                <div className="flex items-center justify-between border-b border-slate-200 px-6 py-4 dark:border-slate-700">
                  <h3 id="detail-title" className="text-lg font-semibold text-slate-900 dark:text-white">
                    Request details
                  </h3>
                  <button
                    type="button"
                    onClick={() => setSelectedRequest(null)}
                    className="rounded-full p-1.5 text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-600 dark:hover:bg-slate-800 dark:hover:text-slate-300"
                    aria-label="Close"
                  >
                    <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>

                <div className="space-y-3 px-6 py-4">
                  <div className={`${studentBentoInsetClass} flex flex-col gap-1 px-4 py-3`}>
                    <span className="text-xs font-medium uppercase tracking-wide text-slate-500 dark:text-slate-400">Category</span>
                    <span className="text-slate-900 dark:text-white">{formatCategory(selectedRequest.category || "")}</span>
                  </div>

                  {selectedRequest.amount && (
                    <div className={`${studentBentoInsetClass} flex flex-col gap-1 px-4 py-3`}>
                      <span className="text-xs font-medium uppercase tracking-wide text-slate-500 dark:text-slate-400">Amount</span>
                      <span className="font-medium text-slate-900 dark:text-white">{selectedRequest.amount} {currency}</span>
                    </div>
                  )}

                  {selectedRequest.description && (
                    <div className={`${studentBentoInsetClass} flex flex-col gap-1 px-4 py-3`}>
                      <span className="text-xs font-medium uppercase tracking-wide text-slate-500 dark:text-slate-400">Summary</span>
                      <p className="text-slate-900 dark:text-white">{selectedRequest.description}</p>
                    </div>
                  )}

                  <div className={`${studentBentoInsetClass} flex flex-col gap-1 px-4 py-3`}>
                    <span className="text-xs font-medium uppercase tracking-wide text-slate-500 dark:text-slate-400">Status</span>
                    <Badge variant={getStatusBadgeVariant(selectedRequest.status)}>{formatStatus(selectedRequest.status)}</Badge>
                  </div>

                  {submittedFormatted && (
                    <div className={`${studentBentoInsetClass} flex flex-col gap-1 px-4 py-3`}>
                      <span className="text-xs font-medium uppercase tracking-wide text-slate-500 dark:text-slate-400">Submitted</span>
                      <span className="text-slate-900 dark:text-white">{submittedFormatted}</span>
                    </div>
                  )}
                </div>

                <div className="flex flex-wrap justify-end gap-3 border-t border-slate-200 px-6 py-4 dark:border-slate-700">
                  <Button
                    type="button"
                    className="bg-red-600 text-white hover:bg-red-700 dark:bg-red-600 dark:hover:bg-red-700"
                    disabled={!!deletingId}
                    onClick={async () => {
                      const id = selectedRequest._id || selectedRequest.id;
                      if (!id) return;
                      setDeletingId(id);
                      try {
                        const response = await fetch(`/api/aid-requests/${id}`, { method: "DELETE" });
                        if (response.ok) {
                          setSelectedRequest(null);
                          refreshAidAndSummary(false);
                          setToastMessage("Request deleted successfully.");
                        }
                      } finally {
                        setDeletingId(null);
                      }
                    }}
                  >
                    {deletingId ? "Deleting..." : "Delete request"}
                  </Button>
                </div>
              </Card>
            </div>
          </div>
        );
      })()}

      {toastMessage && (
        <div
          className="fixed bottom-6 left-1/2 z-[100] -translate-x-1/2 rounded-lg border border-emerald-200 bg-emerald-600 px-4 py-3 text-sm font-medium text-white shadow-lg dark:border-emerald-800 dark:bg-emerald-700"
          role="status"
          aria-live="polite"
        >
          {toastMessage}
        </div>
      )}
    </div>
  );
}
