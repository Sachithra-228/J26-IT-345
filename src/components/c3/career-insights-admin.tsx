"use client";

import { useCallback, useEffect, useState } from "react";
import { Card } from "@/components/shared/Card";
import { useLanguage } from "@/context/language-context";
import type { CareerAggregate } from "@/lib/c3/assessment-store";
import { fmt, getC3Text, label } from "@/lib/c3/i18n";
import { getRole, getSkill } from "@/lib/c3/model";

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
          <Card>
            <p className="text-sm text-slate-600 dark:text-slate-300">{t.aggStudents}</p>
            <p data-testid="c3-agg-students" className="text-3xl font-semibold">
              {data.students}
            </p>
            {!data.suppressed ? (
              <p className="text-xs text-slate-500">{fmt(t.aggYears, { y3: show(data.byYear.year3), y4: show(data.byYear.year4) })}</p>
            ) : null}
            <p className="mt-2 text-xs text-slate-500">{fmt(t.aggModel, { version: data.modelVersion })}</p>
          </Card>

          {data.suppressed ? (
            <Card>
              <p data-testid="c3-agg-suppressed" className="text-sm">
                {fmt(t.aggSuppressed, { k: data.minGroupSize })}
              </p>
            </Card>
          ) : (
            <>
              <Card>
                <div className="overflow-x-auto">
                  <table data-testid="c3-agg-roles" className="w-full min-w-[32rem] text-left text-sm">
                    <thead className="text-xs uppercase text-slate-500">
                      <tr>
                        <th className="py-2 pr-3">{t.aggRole}</th>
                        <th className="py-2 pr-3">{t.aggTargeted}</th>
                        <th className="py-2 pr-3">{t.aggMean}</th>
                        <th className="py-2">{t.aggBands}</th>
                      </tr>
                    </thead>
                    <tbody>
                      {data.roles.map((r) => (
                        <tr key={r.roleId} className="border-t border-slate-100 dark:border-slate-800">
                          <td className="py-2 pr-3">{role(r.roleId)}</td>
                          <td className="py-2 pr-3">{show(r.targetedBy)}</td>
                          <td className="py-2 pr-3">{r.meanReadiness === null ? t.aggHidden : Math.round(r.meanReadiness)}</td>
                          <td className="py-2">{r.bands ? `${r.bands.strong} / ${r.bands.developing} / ${r.bands.early}` : t.aggHidden}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </Card>

              <Card>
                <h3 className="text-base font-semibold">{t.aggGaps}</h3>
                <ol className="mt-2 space-y-1 text-sm">
                  {data.commonGaps.map((g) => (
                    <li key={g.skillId} className="flex justify-between gap-3">
                      <span>{skill(g.skillId)}</span>
                      <span className="text-slate-500">{fmt(t.aggGapStudents, { n: g.students, pct: Math.round(g.share * 100) })}</span>
                    </li>
                  ))}
                </ol>
              </Card>

              <Card>
                <h3 className="text-base font-semibold">{t.aggCoverage}</h3>
                <ul className="mt-3 grid gap-2 sm:grid-cols-2">
                  {data.skillCoverage.map((s) => (
                    <li key={s.skillId} className="text-sm">
                      <div className="flex justify-between">
                        <span>{skill(s.skillId)}</span>
                        <span className="text-slate-500">{Math.round(s.shareAtLeastBasic * 100)}%</span>
                      </div>
                      <div className="mt-1 h-1.5 w-full overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800" aria-hidden="true">
                        <div className="h-full bg-primary" style={{ width: `${s.shareAtLeastBasic * 100}%` }} />
                      </div>
                    </li>
                  ))}
                </ul>
              </Card>
            </>
          )}
        </>
      )}
    </div>
  );
}
