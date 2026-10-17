"use client";

import { useCallback, useEffect, useState } from "react";
import { Card } from "@/components/shared/Card";
import { useLanguage } from "@/context/language-context";
import type { CareerAggregate } from "@/lib/c3/assessment-store";
import { fmt, getC3Text, label } from "@/lib/c3/i18n";
import { getRole, getSkill } from "@/lib/c3/model";
import { BANDS, BarChart, StackedBar, StatTile } from "./c3-charts";
import { CareerDataStatus } from "./career-data-status";

/** Admin / faculty section: anonymous cohort statistics only (groups below the minimum size are hidden). */
export function CareerInsightsAdmin() {
  const { language } = useLanguage();
  const t = getC3Text(language);
  const [data, setData] = useState<CareerAggregate | null>(null);
  const [error, setError] = useState(false);

  const load = useCallback(async () => {
    setError(false);
    try {
      const res = await fetch("/api/c3/assessment?scope=aggregate", { cache: "no-store" });
      if (!res.ok) throw new Error(String(res.status));
      setData((await res.json()) as CareerAggregate);
    } catch {
      setError(true);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const role = (id: string) => {
    const r = getRole(id);
    return r ? label(r.label, language) : id;
  };
  const skill = (id: string) => {
    const s = getSkill(id);
    return s ? label(s.label, language) : id;
  };
  const show = (n: number | null) => (n === null ? t.aggHidden : String(n));
  const bandNames = [t.bandStrong, t.bandDeveloping, t.bandEarly];

  return (
    <div className="space-y-4">
      <header>
        <h2 className="text-2xl font-semibold">{t.aggTitle}</h2>
        <p className="mt-1 max-w-3xl text-sm text-slate-600 dark:text-slate-300">{t.aggSubtitle}</p>
        {data ? <p className="mt-1 text-xs text-slate-500">{fmt(t.aggMinGroup, { k: data.minGroupSize })}</p> : null}
      </header>

      {error ? (
        <Card>
          <div role="alert" className="text-sm text-red-600">
            {t.aggError}{" "}
            <button type="button" onClick={() => void load()} className="font-medium underline">
              {t.retry}
            </button>
          </div>
        </Card>
      ) : data === null ? (
        <Card>
          <p role="status" className="text-sm text-slate-500">
            {t.loading}
          </p>
        </Card>
      ) : (
        <>
          {data.source === "synthetic-demo" ? (
            <p className="rounded-xl border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900 dark:border-amber-900 dark:bg-amber-950/40 dark:text-amber-100">
              {t.aggDemo}
            </p>
          ) : null}

          <div className="grid gap-3 sm:grid-cols-3">
            <StatTile icon="🎓" accent="blue" label={t.aggStudents} value={data.students} testId="c3-agg-students"
              sub={fmt(t.aggModel, { version: data.modelVersion })} />
            <StatTile icon="3" accent="violet" label={t.year3} value={data.suppressed ? t.aggHidden : show(data.byYear.year3)} />
            <StatTile icon="4" accent="orange" label={t.year4} value={data.suppressed ? t.aggHidden : show(data.byYear.year4)} />
          </div>

          {data.suppressed ? (
            <Card>
              <p data-testid="c3-agg-suppressed" className="text-sm">
                {fmt(t.aggSuppressed, { k: data.minGroupSize })}
              </p>
            </Card>
          ) : (
            <>
              <Card>
                <h3 className="text-base font-semibold">{t.aggChartReadiness}</h3>
                <div className="mt-4">
                  <BarChart
                    testId="c3-agg-chart"
                    max={100}
                    rows={[...data.roles]
                      .sort((a, b) => (b.meanReadiness ?? -1) - (a.meanReadiness ?? -1))
                      .map((r) => ({
                        id: r.roleId,
                        label: role(r.roleId),
                        value: r.meanReadiness,
                        valueText: r.meanReadiness === null ? t.aggHidden : String(Math.round(r.meanReadiness)),
                        tooltip:
                          r.meanReadiness === null
                            ? `${role(r.roleId)}: ${t.aggHidden}`
                            : fmt(t.aggTipRole, { role: role(r.roleId), n: Math.round(r.meanReadiness), k: show(r.targetedBy) })
                      }))}
                  />
                </div>

                <div className="mt-6 overflow-x-auto">
                  <table data-testid="c3-agg-roles" className="w-full min-w-[34rem] text-left text-sm">
                    <thead className="text-xs uppercase text-slate-500">
                      <tr>
                        <th className="py-2 pr-3">{t.aggRole}</th>
                        <th className="py-2 pr-3">{t.aggTargeted}</th>
                        <th className="py-2 pr-3">{t.aggMean}</th>
                        <th className="w-2/5 py-2">{t.aggBands}</th>
                      </tr>
                    </thead>
                    <tbody>
                      {data.roles.map((r) => (
                        <tr key={r.roleId} className="border-t border-slate-100 dark:border-slate-800">
                          <td className="py-2 pr-3">{role(r.roleId)}</td>
                          <td className="py-2 pr-3 tabular-nums">{show(r.targetedBy)}</td>
                          <td className="py-2 pr-3 tabular-nums">{r.meanReadiness === null ? t.aggHidden : Math.round(r.meanReadiness)}</td>
                          <td className="py-2">
                            {r.bands ? (
                              <div className="flex items-center gap-2">
                                <div className="flex-1">
                                  <StackedBar
                                    height="h-2.5"
                                    legend={false}
                                    ariaLabel={`${role(r.roleId)}: ${t.aggBands}`}
                                    segments={[r.bands.strong, r.bands.developing, r.bands.early].map((value, i) => ({
                                      id: String(i),
                                      label: bandNames[i],
                                      value,
                                      color: BANDS[i]
                                    }))}
                                  />
                                </div>
                                <span className="whitespace-nowrap text-xs tabular-nums text-slate-500">
                                  {`${r.bands.strong} / ${r.bands.developing} / ${r.bands.early}`}
                                </span>
                              </div>
                            ) : (
                              t.aggHidden
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                <ul className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-xs text-slate-600 dark:text-slate-300">
                  {bandNames.map((name, i) => (
                    <li key={name} className="flex items-center gap-1.5">
                      <span aria-hidden="true" className={`h-2.5 w-2.5 rounded-sm ${BANDS[i]}`} />
                      {name}
                    </li>
                  ))}
                </ul>
              </Card>

              <div className="space-y-4">
                <Card>
                  <h3 className="text-base font-semibold">{t.aggGaps}</h3>
                  <div className="mt-4">
                    <BarChart
                      testId="c3-agg-gaps"
                      max={Math.max(0.01, ...data.commonGaps.map((g) => g.share))}
                      rows={data.commonGaps.map((g) => ({
                        id: g.skillId,
                        label: skill(g.skillId),
                        value: g.share,
                        valueText: `${Math.round(g.share * 100)}%`,
                        tooltip: fmt(t.aggTipGap, { skill: skill(g.skillId), n: g.students, pct: Math.round(g.share * 100) })
                      }))}
                    />
                  </div>
                </Card>
                <Card>
                  <h3 className="text-base font-semibold">{t.aggCoverage}</h3>
                  <div className="mt-4">
                    <BarChart
                      testId="c3-agg-coverage"
                      max={1}
                      rows={[...data.skillCoverage]
                        .sort((a, b) => b.shareAtLeastBasic - a.shareAtLeastBasic)
                        .map((c) => ({
                          id: c.skillId,
                          label: skill(c.skillId),
                          value: c.shareAtLeastBasic,
                          valueText: `${Math.round(c.shareAtLeastBasic * 100)}%`,
                          tooltip: fmt(t.aggTipCoverage, { skill: skill(c.skillId), pct: Math.round(c.shareAtLeastBasic * 100) })
                        }))}
                    />
                  </div>
                </Card>
              </div>
            </>
          )}
        </>
      )}

      {/* Built into the app, so it shows even when the cohort figures cannot be loaded. */}
      <CareerDataStatus />
    </div>
  );
}
