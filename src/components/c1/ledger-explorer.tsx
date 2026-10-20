"use client";

import { FormEvent, useCallback, useEffect, useId, useMemo, useState } from "react";
import { Button } from "@/components/shared/Button";
import { Card } from "@/components/shared/Card";
import { Input } from "@/components/shared/Input";
import { Select } from "@/components/shared/Select";
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
import {
  hasInjectedWallet,
  prepareAwardScholarship,
  prepareCreateCampaign,
  prepareTopUpCampaign,
  prepareVerifyMilestone,
  submitEscrowAction
} from "@/lib/c1/wallet-actions";

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
  const uid = useId();
  const locale = language === "si" ? "si-LK" : language === "ta" ? "ta-LK" : "en-LK";
  const [data, setData] = useState<LedgerResponse | null>(null);
  const [error, setError] = useState(false);
  const [loading, setLoading] = useState(true);
  const [donorFilter, setDonorFilter] = useState<string>("all");

  // Donor form state (FR02)
  const [campaignTitle, setCampaignTitle] = useState("SLIIT Need-Based IT Bursary");
  const [campaignEth, setCampaignEth] = useState("2.0");
  const [topUpCampaignId, setTopUpCampaignId] = useState("1");
  const [topUpEth, setTopUpEth] = useState("1.0");

  // Admin form state (FR06, FR09)
  const [verifyAwardId, setVerifyAwardId] = useState("1");
  const [evidenceNote, setEvidenceNote] = useState("Semester GPA 3.25 and 15 credits verified");
  const [awardCampaignId, setAwardCampaignId] = useState("1");
  const [beneficiaryWallet, setBeneficiaryWallet] = useState("0x70997970C51812dc3A010C7d01b50e0d17dc79C8");
  const [studentRefInput, setStudentRefInput] = useState(
    "0x8a597c65f32d18e3b9b574898014fd69b752874931214957e50825fd16fa8fb4"
  );
  const [assessmentHashInput, setAssessmentHashInput] = useState(
    "0x5f3d28479102f8b04d31f92a8e110c46b9a841d75c0e9231f8045210ab89c123"
  );
  const [awardTotalEth, setAwardTotalEth] = useState("2.0");
  const [awardMilestones, setAwardMilestones] = useState("4");

  const [actionError, setActionError] = useState<string | null>(null);
  const [preparedPreview, setPreparedPreview] = useState<Record<string, unknown> | null>(null);
  const [txNotice, setTxNotice] = useState<string | null>(null);

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

  const donorWallets = useMemo(() => {
    if (!data) return [];
    const seen = new Set<string>();
    for (const c of data.summary.campaigns) {
      if (c.donor) seen.add(c.donor);
    }
    return [...seen];
  }, [data]);

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

  const filteredCampaigns =
    variant === "donor" && donorFilter !== "all"
      ? summary.campaigns.filter((c) => c.donor.toLowerCase() === donorFilter.toLowerCase())
      : summary.campaigns;
  const allowedCampaignIds = new Set(filteredCampaigns.map((c) => c.id));
  const filteredAwards =
    variant === "donor" && donorFilter !== "all"
      ? summary.awards.filter((a) => allowedCampaignIds.has(a.campaignId))
      : summary.awards;
  const allowedAwardIds = new Set(filteredAwards.map((a) => a.id));
  const filteredEvents =
    variant === "donor" && donorFilter !== "all"
      ? events.filter((e) => {
          const cid = e.args.campaignId;
          const aid = e.args.awardId;
          if (cid && allowedCampaignIds.has(cid)) return true;
          if (aid && allowedAwardIds.has(aid)) return true;
          return false;
        })
      : events;

  const openCampaigns = summary.campaigns.filter((c) => !c.closed);
  const activeAwards = summary.awards.filter((a) => a.status === "active");

  async function runAction(
    result:
      | ReturnType<typeof prepareCreateCampaign>
      | ReturnType<typeof prepareTopUpCampaign>
      | ReturnType<typeof prepareVerifyMilestone>
      | ReturnType<typeof prepareAwardScholarship>
  ) {
    setActionError(null);
    setTxNotice(null);
    if (!result.ok) {
      setPreparedPreview(null);
      setActionError(result.error);
      return;
    }
    setPreparedPreview({
      contract: meta.contractAddress,
      network: meta.network,
      ...result.data
    });
    if (isLive && hasInjectedWallet()) {
      try {
        const submitted = await submitEscrowAction(meta.contractAddress, result.data);
        setTxNotice(`Transaction confirmed: ${submitted.txHash}`);
        await load();
      } catch (err) {
        setActionError(err instanceof Error ? err.message : "Wallet transaction failed.");
      }
    }
  }

  function handleCreateCampaign(e: FormEvent) {
    e.preventDefault();
    void runAction(prepareCreateCampaign({ title: campaignTitle, amountEth: campaignEth }));
  }

  function handleTopUpCampaign(e: FormEvent) {
    e.preventDefault();
    void runAction(prepareTopUpCampaign({ campaignId: topUpCampaignId, amountEth: topUpEth }));
  }

  function handleVerifyMilestone(e: FormEvent) {
    e.preventDefault();
    void runAction(prepareVerifyMilestone({ awardId: verifyAwardId, evidenceNote }));
  }

  function handleAwardScholarship(e: FormEvent) {
    e.preventDefault();
    void runAction(
      prepareAwardScholarship({
        campaignId: awardCampaignId,
        beneficiary: beneficiaryWallet,
        studentRef: studentRefInput,
        assessmentHash: assessmentHashInput,
        totalAmountEth: awardTotalEth,
        milestoneCount: awardMilestones
      })
    );
  }

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

      {variant === "donor" ? (
        <Card className="space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h3 className="text-base font-semibold">{t.donorActionsTitle}</h3>
              <p className="mt-0.5 text-sm text-slate-600 dark:text-slate-300">{t.donorActionsSubtitle}</p>
            </div>
            <div className="flex items-center gap-2">
              <label htmlFor={`${uid}-donor-filter`} className="text-xs font-medium text-slate-600 dark:text-slate-300">
                {t.donorFilterLabel}
              </label>
              <Select
                id={`${uid}-donor-filter`}
                value={donorFilter}
                onChange={(e) => setDonorFilter(e.target.value)}
                className="w-48"
              >
                <option value="all">{t.donorFilterAll}</option>
                {donorWallets.map((w) => (
                  <option key={w} value={w}>
                    {shortHash(w)}
                  </option>
                ))}
              </Select>
            </div>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <form onSubmit={handleCreateCampaign} className="space-y-3 rounded-xl border border-slate-200 p-4 dark:border-slate-800">
              <h4 className="text-sm font-semibold">{t.createCampaignTitle}</h4>
              <div>
                <label htmlFor={`${uid}-camp-title`} className="mb-1 block text-xs font-medium">
                  {t.campaignSummaryLabel}
                </label>
                <Input
                  id={`${uid}-camp-title`}
                  value={campaignTitle}
                  onChange={(e) => setCampaignTitle(e.target.value)}
                />
              </div>
              <div>
                <label htmlFor={`${uid}-camp-eth`} className="mb-1 block text-xs font-medium">
                  {t.campaignAmountLabel}
                </label>
                <Input
                  id={`${uid}-camp-eth`}
                  type="number"
                  step="0.1"
                  value={campaignEth}
                  onChange={(e) => setCampaignEth(e.target.value)}
                />
              </div>
              <Button type="submit">{t.createCampaignBtn}</Button>
            </form>

            <form onSubmit={handleTopUpCampaign} className="space-y-3 rounded-xl border border-slate-200 p-4 dark:border-slate-800">
              <h4 className="text-sm font-semibold">{t.topUpCampaignTitle}</h4>
              <div>
                <label htmlFor={`${uid}-topup-id`} className="mb-1 block text-xs font-medium">
                  {t.campaign}
                </label>
                <Select
                  id={`${uid}-topup-id`}
                  value={topUpCampaignId}
                  onChange={(e) => setTopUpCampaignId(e.target.value)}
                >
                  {openCampaigns.map((c) => (
                    <option key={c.id} value={c.id}>
                      #{c.id} ({formatEth(c.funded)} ETH)
                    </option>
                  ))}
                </Select>
              </div>
              <div>
                <label htmlFor={`${uid}-topup-eth`} className="mb-1 block text-xs font-medium">
                  {t.topUpAmountLabel}
                </label>
                <Input
                  id={`${uid}-topup-eth`}
                  type="number"
                  step="0.1"
                  value={topUpEth}
                  onChange={(e) => setTopUpEth(e.target.value)}
                />
              </div>
              <Button type="submit">{t.topUpCampaignBtn}</Button>
            </form>
          </div>

          {actionError ? (
            <p role="alert" className="text-xs font-medium text-red-600">
              {actionError}
            </p>
          ) : null}
          {txNotice ? <p className="text-xs font-medium text-emerald-700 dark:text-emerald-300">{txNotice}</p> : null}
          {preparedPreview ? (
            <div className="rounded-lg bg-slate-50 p-3 text-xs dark:bg-slate-900" data-testid="wallet-prepared-preview">
              <p className="font-medium text-slate-700 dark:text-slate-200">{t.walletPreparedNote}</p>
              <pre className="mt-1 overflow-x-auto font-mono text-[11px]">{JSON.stringify(preparedPreview, null, 2)}</pre>
            </div>
          ) : null}
        </Card>
      ) : null}

      {variant === "admin" ? (
        <Card className="space-y-4">
          <div>
            <h3 className="text-base font-semibold">{t.adminActionsTitle}</h3>
            <p className="mt-0.5 text-sm text-slate-600 dark:text-slate-300">{t.adminActionsSubtitle}</p>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <form onSubmit={handleVerifyMilestone} className="space-y-3 rounded-xl border border-slate-200 p-4 dark:border-slate-800">
              <h4 className="text-sm font-semibold">{t.verifyMilestoneTitle}</h4>
              <div>
                <label htmlFor={`${uid}-verify-award`} className="mb-1 block text-xs font-medium">
                  {t.selectAwardLabel}
                </label>
                <Select
                  id={`${uid}-verify-award`}
                  value={verifyAwardId}
                  onChange={(e) => setVerifyAwardId(e.target.value)}
                >
                  {activeAwards.map((a) => (
                    <option key={a.id} value={a.id}>
                      #{a.id} · {a.milestonesVerified}/{a.milestoneCount} ({formatEth(a.released)}/{formatEth(a.totalAmount)} ETH)
                    </option>
                  ))}
                </Select>
              </div>
              <div>
                <label htmlFor={`${uid}-evidence-note`} className="mb-1 block text-xs font-medium">
                  {t.evidenceNoteLabel}
                </label>
                <Input
                  id={`${uid}-evidence-note`}
                  value={evidenceNote}
                  onChange={(e) => setEvidenceNote(e.target.value)}
                />
              </div>
              <Button type="submit">{t.verifyMilestoneBtn}</Button>
            </form>

            <form onSubmit={handleAwardScholarship} className="space-y-3 rounded-xl border border-slate-200 p-4 dark:border-slate-800">
              <h4 className="text-sm font-semibold">{t.awardOnChainTitle}</h4>
              <div className="grid gap-2 sm:grid-cols-2">
                <div>
                  <label htmlFor={`${uid}-award-camp`} className="mb-1 block text-xs font-medium">
                    {t.campaign}
                  </label>
                  <Select
                    id={`${uid}-award-camp`}
                    value={awardCampaignId}
                    onChange={(e) => setAwardCampaignId(e.target.value)}
                  >
                    {openCampaigns.map((c) => (
                      <option key={c.id} value={c.id}>
                        #{c.id} ({formatEth(c.funded)} ETH)
                      </option>
                    ))}
                  </Select>
                </div>
                <div>
                  <label htmlFor={`${uid}-award-eth`} className="mb-1 block text-xs font-medium">
                    {t.amount} (ETH)
                  </label>
                  <Input
                    id={`${uid}-award-eth`}
                    type="number"
                    step="0.1"
                    value={awardTotalEth}
                    onChange={(e) => setAwardTotalEth(e.target.value)}
                  />
                </div>
              </div>
              <div className="grid gap-2 sm:grid-cols-2">
                <div>
                  <label htmlFor={`${uid}-award-ben`} className="mb-1 block text-xs font-medium">
                    {t.beneficiaryWalletLabel}
                  </label>
                  <Input
                    id={`${uid}-award-ben`}
                    value={beneficiaryWallet}
                    onChange={(e) => setBeneficiaryWallet(e.target.value)}
                  />
                </div>
                <div>
                  <label htmlFor={`${uid}-award-ms`} className="mb-1 block text-xs font-medium">
                    {t.milestonesCountLabel}
                  </label>
                  <Input
                    id={`${uid}-award-ms`}
                    type="number"
                    min={1}
                    max={12}
                    value={awardMilestones}
                    onChange={(e) => setAwardMilestones(e.target.value)}
                  />
                </div>
              </div>
              <div>
                <label htmlFor={`${uid}-award-sref`} className="mb-1 block text-xs font-medium">
                  {t.studentRefLabel}
                </label>
                <Input
                  id={`${uid}-award-sref`}
                  value={studentRefInput}
                  onChange={(e) => setStudentRefInput(e.target.value)}
                />
              </div>
              <div>
                <label htmlFor={`${uid}-award-ahash`} className="mb-1 block text-xs font-medium">
                  {t.assessmentHashLabel}
                </label>
                <Input
                  id={`${uid}-award-ahash`}
                  value={assessmentHashInput}
                  onChange={(e) => setAssessmentHashInput(e.target.value)}
                />
              </div>
              <Button type="submit">{t.awardOnChainBtn}</Button>
            </form>
          </div>

          {actionError ? (
            <p role="alert" className="text-xs font-medium text-red-600">
              {actionError}
            </p>
          ) : null}
          {txNotice ? <p className="text-xs font-medium text-emerald-700 dark:text-emerald-300">{txNotice}</p> : null}
          {preparedPreview ? (
            <div className="rounded-lg bg-slate-50 p-3 text-xs dark:bg-slate-900" data-testid="wallet-prepared-preview">
              <p className="font-medium text-slate-700 dark:text-slate-200">{t.walletPreparedNote}</p>
              <pre className="mt-1 overflow-x-auto font-mono text-[11px]">{JSON.stringify(preparedPreview, null, 2)}</pre>
            </div>
          ) : null}
        </Card>
      ) : null}

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
              {filteredCampaigns.map((c: CampaignSummary) => {
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
              {filteredAwards.map((a: AwardSummary) => (
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
        {filteredEvents.length === 0 ? (
          <p className="mt-3 text-sm text-slate-500">{t.noEvents}</p>
        ) : (
          <ul className="mt-4 divide-y divide-slate-100 dark:divide-slate-800">
            {filteredEvents.slice(0, 12).map((e) => {
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
