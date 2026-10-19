"use client";

import { useCallback, useEffect, useState } from "react";
import { Card } from "@/components/shared/Card";
import { StatCard } from "@/components/shared/stat-card";
import { useLanguage } from "@/context/language-context";
import { getC1Text } from "@/lib/c1/i18n";
import {
  EVENT_LABELS,
  explorerTxUrl,
  formatEth,
  shortHash,
  type AwardSummary,
  type CampaignSummary,
  type LedgerEvent,
  type LedgerMeta,
  type LedgerSummary
} from "@/lib/c1/ledger";

type LedgerResponse = {
  meta: LedgerMeta;
  summary: LedgerSummary;
  events: LedgerEvent[];
  digest: string;
  generatedAt: string;
};

type LedgerExplorerProps = {
  variant?: "public" | "admin" | "donor";
};

function formatDate(unixSeconds: number, locale: string) {
  return new Date(unixSeconds * 1000).toLocaleDateString(locale, { year: "numeric", month: "short", day: "numeric" });
}

export function LedgerExplorer({ variant = "public" }: LedgerExplorerProps) {
  const { language } = useLanguage();
  const t = getC1Text(language);
  const locale = language === "si" ? "si-LK" : language === "ta" ? "ta-LK" : "en-LK";
  const [data, setData] = useState<LedgerResponse | null>(null);
  const [error, setError] = useState(false);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    setError(false);
    try {
      const response = await fetch("/api/c1/ledger?limit=40", { cache: "no-store" });
      if (!response.ok) throw new Error(String(response.status));
      setData((await response.json()) as LedgerResponse);
    } catch {
      setError(true);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  if (loading) {
    return (
      <Card>
        <p role="status" className="text-sm text-slate-500">
          {t.loading}
        </p>
      </Card>
    );
  }

  if (error || !data) {
    return (
      <Card>
        <p role="alert" className="text-sm text-red-600">
          {t.loadError}
        </p>
        <button
          type="button"
          onClick={() => void load()}
          className="mt-3 rounded-lg border border-slate-300 px-3 py-1.5 text-sm font-medium hover:bg-slate-50 dark:border-slate-700 dark:hover:bg-slate-800"
        >
          {t.retry}
        </button>
      </Card>
    );
  }

  const { meta, summary, events, digest } = data;
  const { totals } = summary;
  const isLive = meta.source === "live";

  return (
    <div className="space-y-6">
      <div
        className={`flex flex-wrap items-center gap-3 rounded-xl border px-4 py-3 text-sm ${
          isLive
            ? "border-emerald-300 bg-emerald-50 text-emerald-900 dark:border-emerald-800 dark:bg-emerald-950 dark:text-emerald-100"
            : "border-amber-300 bg-amber-50 text-amber-900 dark:border-amber-800 dark:bg-amber-950 dark:text-amber-100"
        }`}
      >
        <span className="font-semibold">{isLive ? t.sourceLive : t.sourceSimulation}</span>
        <span className="opacity-80">{isLive ? `${meta.network} · chain ${meta.chainId}` : t.simulationNote}</span>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label={t.funded} value={`${formatEth(totals.funded)} ETH`} />
        <StatCard label={t.released} value={`${formatEth(totals.disbursed)} ETH`} />
        <StatCard label={t.committed} value={`${formatEth(totals.committed)} ETH`} />
        <StatCard label={t.available} value={`${formatEth(totals.available)} ETH`} />
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label={t.studentsSupported} value={String(totals.uniqueStudents)} />
        <StatCard label={t.awardsActive} value={String(totals.activeAwards)} />
        <StatCard label={t.awardsCompleted} value={String(totals.completedAwards)} />
        <StatCard label={t.awardsRevoked} value={String(totals.revokedAwards)} />
      </div>
      <p className="-mt-3 text-xs text-slate-500">{t.unitNote}</p>

      <Card>
        <h3 className="text-lg font-semibold">{t.campaigns}</h3>
        <div className="mt-4 overflow-x-auto">
          <table className="w-full min-w-[560px] text-left text-sm">
            <thead className="text-xs uppercase text-slate-500">
              <tr>
                <th className="pb-2 pr-3">{t.campaign}</th>
                <th className="pb-2 pr-3">{t.donor}</th>
                <th className="pb-2 pr-3">{t.fundedCol}</th>
                <th className="pb-2 pr-3">{t.releasedCol}</th>
                <th className="pb-2">{t.status}</th>
              </tr>
            </thead>
            <tbody>
              {summary.campaigns.map((c: CampaignSummary) => {
                const pct = BigInt(c.funded) === 0n ? 0 : Number((BigInt(c.disbursed) * 100n) / BigInt(c.funded));
                return (
                  <tr key={c.id} className="border-t border-slate-100 dark:border-slate-800">
                    <td className="py-3 pr-3 font-medium">#{c.id}</td>
                    <td className="py-3 pr-3 font-mono text-xs">{shortHash(c.donor)}</td>
                    <td className="py-3 pr-3">{formatEth(c.funded)} ETH</td>
                    <td className="py-3 pr-3">
                      <div className="flex items-center gap-2">
                        <div
                          className="h-2 w-24 overflow-hidden rounded-full bg-slate-200 dark:bg-slate-700"
                          role="progressbar"
                          aria-valuenow={pct}
                          aria-valuemin={0}
                          aria-valuemax={100}
                          aria-label={`${t.releasedCol} ${pct}%`}
                        >
                          <div className="h-full bg-primary" style={{ width: `${pct}%` }} />
                        </div>
                        <span>
                          {formatEth(c.disbursed)} ETH ({pct}%)
                        </span>
                      </div>
                    </td>
                    <td className="py-3">{c.closed ? t.closed : t.open}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </Card>

      <Card>
        <h3 className="text-lg font-semibold">{t.awards}</h3>
        <div className="mt-4 overflow-x-auto">
          <table className="w-full min-w-[640px] text-left text-sm">
            <thead className="text-xs uppercase text-slate-500">
              <tr>
                <th className="pb-2 pr-3">{t.student}</th>
                <th className="pb-2 pr-3">{t.campaign}</th>
                <th className="pb-2 pr-3">{t.progress}</th>
                <th className="pb-2 pr-3">{t.amount}</th>
                <th className="pb-2">{t.status}</th>
              </tr>
            </thead>
            <tbody>
              {summary.awards.map((a: AwardSummary) => (
                <tr key={a.id} className="border-t border-slate-100 dark:border-slate-800">
                  <td className="py-3 pr-3 font-mono text-xs">{shortHash(a.studentRef)}</td>
                  <td className="py-3 pr-3">#{a.campaignId}</td>
                  <td className="py-3 pr-3">
                    <div className="flex items-center gap-1" aria-label={`${a.milestonesVerified}/${a.milestoneCount}`}>
                      {Array.from({ length: a.milestoneCount }, (_, i) => (
                        <span
                          key={i}
                          className={`h-2.5 w-4 rounded-sm ${
                            i < a.milestonesVerified ? "bg-primary" : "bg-slate-200 dark:bg-slate-700"
                          }`}
                        />
                      ))}
                      <span className="ml-2 text-xs text-slate-500">
                        {a.milestonesVerified}/{a.milestoneCount}
                      </span>
                    </div>
                  </td>
                  <td className="py-3 pr-3">
                    {formatEth(a.released)} / {formatEth(a.totalAmount)} ETH
                  </td>
                  <td className="py-3">
                    <span
                      className={`rounded-full px-2.5 py-1 text-xs font-semibold ${
                        a.status === "completed"
                          ? "bg-secondary/10 text-secondary"
                          : a.status === "revoked"
                            ? "bg-red-100 text-red-700 dark:bg-red-950 dark:text-red-300"
                            : "bg-primary/10 text-primary"
                      }`}
                    >
                      {a.status === "completed" ? t.statusCompleted : a.status === "revoked" ? t.statusRevoked : t.statusActive}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      <Card>
        <h3 className="text-lg font-semibold">{t.activity}</h3>
        {events.length === 0 ? (
          <p className="mt-3 text-sm text-slate-500">{t.noEvents}</p>
        ) : (
          <ul className="mt-4 divide-y divide-slate-100 dark:divide-slate-800">
            {events.slice(0, 12).map((e) => {
              const url = explorerTxUrl(meta.chainId, e.txHash);
              const detail = describeEvent(e);
              return (
                <li key={e.id} className="flex flex-wrap items-center justify-between gap-2 py-2.5 text-sm">
                  <div>
                    <span className="font-medium">{EVENT_LABELS[e.type] ?? e.type}</span>
                    {detail ? <span className="ml-2 text-slate-500">{detail}</span> : null}
                  </div>
                  <div className="flex items-center gap-3 text-xs text-slate-500">
                    <span>{formatDate(e.timestamp, locale)}</span>
                    {url ? (
                      <a href={url} target="_blank" rel="noreferrer" className="font-mono text-primary underline">
                        {shortHash(e.txHash)}
                      </a>
                    ) : (
                      <span className="font-mono" title={`${t.transaction}: ${e.txHash}`}>
                        {shortHash(e.txHash)}
                      </span>
                    )}
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </Card>

      <Card className="bg-slate-50 dark:bg-slate-900">
        <h3 className="text-base font-semibold">{t.integrityTitle}</h3>
        <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">{t.integrityBody}</p>
        <p className="mt-3 break-all rounded-lg bg-white px-3 py-2 font-mono text-xs dark:bg-slate-950" data-testid="ledger-digest">
          {digest}
        </p>
        <p className="mt-2 text-xs text-slate-500">
          {meta.eventCount ?? events.length} {t.eventsRecomputed}
        </p>
        <dl className="mt-3 grid gap-1 text-xs text-slate-500 sm:grid-cols-2">
          <div>
            <dt className="inline font-semibold">{t.contract}: </dt>
            <dd className="inline font-mono">{shortHash(meta.contractAddress, 8, 6)}</dd>
          </div>
          <div>
            <dt className="inline font-semibold">{t.network}: </dt>
            <dd className="inline">
              {meta.network} (chain {meta.chainId})
            </dd>
          </div>
        </dl>
        {variant !== "public" ? (
          <a href="/transparency" className="mt-4 inline-block text-sm font-medium text-primary underline">
            {t.viewPublic}
          </a>
        ) : null}
      </Card>

      <Card>
        <h3 className="text-base font-semibold">{t.reportTitle}</h3>
        <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">{t.reportBody}</p>
        <div className="mt-4 flex flex-wrap gap-3">
          <a
            href="/api/c1/ledger/report?format=csv"
            download
            className="rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-white hover:opacity-90 focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-1"
          >
            {t.reportCsv}
          </a>
          <a
            href="/api/c1/ledger/report?format=json"
            download
            className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-semibold hover:bg-slate-50 focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-1 dark:border-slate-700 dark:hover:bg-slate-800"
          >
            {t.reportJson}
          </a>
        </div>
      </Card>
    </div>
  );
}

function describeEvent(e: LedgerEvent): string {
  const a = e.args;
  switch (e.type) {
    case "CampaignCreated":
    case "CampaignToppedUp":
      return `#${a.campaignId} · ${formatEth(a.amount)} ETH`;
    case "CampaignClosed":
      return `#${a.campaignId} · ${formatEth(a.refunded)} ETH`;
    case "ScholarshipAwarded":
      return `#${a.awardId} · ${formatEth(a.totalAmount)} ETH / ${a.milestoneCount}`;
    case "MilestoneVerified":
      return `#${a.awardId} · ${Number(a.milestoneIndex) + 1}`;
    case "FundsDisbursed":
    case "DisbursementQueued":
      return `#${a.awardId} · ${formatEth(a.amount)} ETH`;
    case "AwardCompleted":
      return `#${a.awardId}`;
    case "AwardRevoked":
      return `#${a.awardId} · ${formatEth(a.returnedToCampaign)} ETH`;
    default:
      return "";
  }
}
