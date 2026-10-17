"use client";

import { Card } from "@/components/shared/Card";
import { useLanguage } from "@/context/language-context";
import { collectionProgress, dataStatus, type DataStatus } from "@/lib/c3/data-status";
import { fmt, getC3Text, label } from "@/lib/c3/i18n";
import { careerModel, careerModelInfo, getRole } from "@/lib/c3/model";
import { BarChart, CATEGORICAL, MetricBar, MUTED, StackedBar, StatTile } from "./c3-charts";

const pct = (x: number | null) => (x === null ? "-" : String(Math.round(x * 100)));
const two = (x: number) => x.toFixed(2);
/** Synthetic-ad extraction F1 (docs/c3/evidence/extraction-eval.json), shown as a reference tick. */
const SYNTHETIC_F1 = 0.965;

/**
 * Admin / faculty: where the career model's numbers come from and how far the
 * collection of real job advertisements has got. Aggregate numbers only.
 */
export function CareerDataStatus({ status = dataStatus }: { status?: DataStatus }) {
  const { language } = useLanguage();
  const t = getC3Text(language);
  const progress = collectionProgress(status);
  const ads = status.realAds;
  const ev = status.realEvaluation;
  const perRole = ads.perRole[0]?.target ?? 0;
  const role = (id: string) => {
    const r = getRole(id);
    return r ? label(r.label, language) : id;
  };
  const sources = Object.entries(ads.sources);
  // Four categorical slots; anything after the third source folds into "Other".
  const segments =
    sources.length <= 4
      ? sources.map(([name, n], i) => ({ id: name, label: name, value: n, color: CATEGORICAL[i] }))
      : [
          ...sources.slice(0, 3).map(([name, n], i) => ({ id: name, label: name, value: n, color: CATEGORICAL[i] })),
          { id: "other", label: t.dsOther, value: sources.slice(3).reduce((s, [, n]) => s + n, 0), color: MUTED }
        ];
  const rows = [...ads.perRole]
    .sort((a, b) => b.ads - a.ads)
    .map((r) => ({
      id: r.roleId,
      label: role(r.roleId),
      value: r.ads,
      valueText: String(r.ads),
      done: r.ads >= r.target,
      tooltip: fmt(t.dsTipRole, { role: role(r.roleId), n: r.ads, target: r.target })
    }));
  const maxAds = Math.max(perRole, ...ads.perRole.map((r) => r.ads));
  const metricTip = (name: string, v: number) => fmt(t.dsTipMetric, { metric: name, v: two(v), n: ev.ads });

  return (
    <Card>
      <section aria-labelledby="c3-ds-title" data-testid="c3-data-status" className="space-y-6">
        <header>
          <h3 id="c3-ds-title" className="text-lg font-semibold">
            {t.dsTitle}
          </h3>
          <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">{t.dsSubtitle}</p>
          <p className="mt-1 text-xs text-slate-500">{fmt(t.dsUpdated, { date: status.generatedAt })}</p>
        </header>

        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <StatTile icon="📄" accent="blue" label={t.dsTileAds} value={ads.adsUsed} testId="c3-ds-tile-ads"
            sub={fmt(t.dsTileAdsSub, { skipped: ads.rowsSkipped, issues: ads.issuesToFix })} />
          <StatTile icon="📈" accent="violet" label={t.dsTileProgress} value={`${Math.round(progress.share * 100)}%`}
            sub={fmt(t.dsTileProgressSub, { target: progress.target, per: perRole })} />
          <StatTile icon="🎯" accent="green" label={t.dsTileRoles} value={`${ads.rolesAtTarget} / ${progress.roles}`}
            sub={fmt(t.dsTileRolesSub, { per: perRole })} />
          <StatTile icon="🔎" accent="orange" label={t.dsTileF1} value={two(ev.f1)} testId="c3-ds-tile-f1"
            sub={fmt(t.dsTileF1Sub, { n: ev.ads })} />
        </div>

        <p className="text-sm" data-testid="c3-ds-ads">
          {fmt(t.dsAdsLine, { used: ads.adsUsed, skipped: ads.rowsSkipped, issues: ads.issuesToFix })}
        </p>
        <div
          className="h-2 w-full overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800"
          role="progressbar"
          aria-label={t.dsTileProgress}
          aria-valuemin={0}
          aria-valuemax={100}
          aria-valuenow={Math.round(progress.share * 100)}
        >
          <div className="h-full rounded-r bg-[#4a3aa7] dark:bg-[#9085e9]" style={{ width: `${progress.share * 100}%` }} />
        </div>

        <div className="grid gap-6 lg:grid-cols-5">
          <div className="lg:col-span-3">
            <h4 className="mb-3 text-sm font-semibold">{t.dsChartRoles}</h4>
            <BarChart rows={rows} max={maxAds} target={perRole} targetLabel={fmt(t.dsTargetMark, { n: perRole })}
              doneLabel={t.dsAtTarget} testId="c3-ds-chart" />
          </div>
          <div className="space-y-6 lg:col-span-2">
            <div>
              <h4 className="mb-3 text-sm font-semibold">{t.dsSources}</h4>
              <StackedBar segments={segments} ariaLabel={t.dsSources} testId="c3-ds-sources"
                formatValue={(v, share) => `${v} (${Math.round(share * 100)}%)`} />
            </div>
            <div className={`rounded-xl border p-3 text-sm ${
              progress.profilesFrom === "synthetic"
                ? "border-amber-200 bg-amber-50 text-amber-900 dark:border-amber-900 dark:bg-amber-950/40 dark:text-amber-100"
                : "border-slate-200 text-slate-700 dark:border-slate-700 dark:text-slate-200"
            }`}>
              <p className="font-medium">{t.dsModelHead}</p>
              <p className="mt-1">
                {fmt(t.dsModelLine, {
                  version: careerModelInfo.version,
                  taxonomy: careerModelInfo.taxonomyVersion,
                  roles: careerModelInfo.roleCount,
                  skills: careerModelInfo.skillCount
                })}
              </p>
              <p className="mt-1">
                {fmt(progress.profilesFrom === "synthetic" ? t.dsProfilesSynthetic : t.dsProfilesReal, { n: careerModel.adCorpus.usedForProfiles })}
              </p>
            </div>
          </div>
        </div>

        <div>
          <h4 className="text-sm font-semibold">{t.dsEvalHead}</h4>
          <p className="mt-1 text-sm" data-testid="c3-ds-eval">
            {fmt(t.dsEvalLine, { n: ev.ads, p: two(ev.precision), r: two(ev.recall), f1: two(ev.f1), lo: two(ev.f1Ci95[0]), hi: two(ev.f1Ci95[1]) })}
          </p>
          <div className="mt-3 max-w-2xl space-y-1">
            <MetricBar label={t.dsMetricPrecision} value={ev.precision} tooltip={metricTip(t.dsMetricPrecision, ev.precision)} />
            <MetricBar label={t.dsMetricRecall} value={ev.recall} tooltip={metricTip(t.dsMetricRecall, ev.recall)} />
            <MetricBar label="F1" value={ev.f1} ci={ev.f1Ci95} reference={SYNTHETIC_F1}
              referenceLabel={fmt(t.dsSyntheticRef, { f1: two(SYNTHETIC_F1) })} tooltip={metricTip("F1", ev.f1)} />
          </div>
          <p className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs text-slate-500 dark:text-slate-400">
            <span className="flex items-center gap-1.5">
              <span aria-hidden="true" className="inline-block h-3 w-0.5 bg-[#eb6834] dark:bg-[#d95926]" />
              {fmt(t.dsSyntheticRef, { f1: two(SYNTHETIC_F1) })}
            </span>
            <span className="flex items-center gap-1.5">
              <span aria-hidden="true" className="inline-block h-0.5 w-4 bg-slate-900 dark:bg-white" />
              {t.dsCiNote}
            </span>
          </p>
          {ev.heldOut ? (
            <p data-testid="c3-ds-heldout" className="mt-3 rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-900 dark:border-emerald-900 dark:bg-emerald-950/40 dark:text-emerald-100">
              ✅ {fmt(t.dsHeldOut, { n: ev.heldOut.ads, f1: two(ev.heldOut.f1), lo: two(ev.heldOut.f1Ci95[0]), hi: two(ev.heldOut.f1Ci95[1]) })}
            </p>
          ) : null}
          <p className="mt-3 text-sm">{fmt(t.dsEvalExtra, { role: pct(ev.roleFromTitleAccuracy), sen: pct(ev.seniorityAccuracy) })}</p>
          <p className="mt-2 text-xs text-slate-500">{t.dsEvalNote}</p>
        </div>

        <details className="text-sm">
          <summary className="cursor-pointer font-medium text-primary">{t.dsTableView}</summary>
          <div className="mt-2 overflow-x-auto">
            <table data-testid="c3-ds-roles" className="w-full min-w-[20rem] text-left text-sm">
              <thead className="text-xs uppercase text-slate-500">
                <tr>
                  <th className="py-2 pr-3">{t.dsColRole}</th>
                  <th className="py-2 pr-3">{t.dsColAds}</th>
                  <th className="py-2">{t.dsColTarget}</th>
                </tr>
              </thead>
              <tbody>
                {ads.perRole.map((r) => (
                  <tr key={r.roleId} className="border-t border-slate-100 dark:border-slate-800">
                    <td className="py-1.5 pr-3">{role(r.roleId)}</td>
                    <td className="py-1.5 pr-3">{r.ads}</td>
                    <td className="py-1.5">{r.target}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </details>
      </section>
    </Card>
  );
}
