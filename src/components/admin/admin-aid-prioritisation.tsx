"use client";

import { useCallback, useEffect, useState } from "react";
import { Card } from "@/components/shared/Card";
import { useLanguage } from "@/context/language-context";
import type { AdminQueueItem } from "@/lib/c1/assessment-store";
import { getC1Text } from "@/lib/c1/i18n";
import { shortHash } from "@/lib/c1/ledger";

const bandStyle: Record<AdminQueueItem["band"], string> = {
  high: "bg-red-100 text-red-700 dark:bg-red-950 dark:text-red-300",
  moderate: "bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-200",
  low: "bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-200"
};

export function AdminAidPrioritisation() {
  const { language } = useLanguage();
  const t = getC1Text(language);
  const [items, setItems] = useState<AdminQueueItem[] | null>(null);
  const [error, setError] = useState(false);
  const [selectedItem, setSelectedItem] = useState<AdminQueueItem | null>(null);

  const load = useCallback(async () => {
    setError(false);
    try {
      const response = await fetch("/api/c1/assessments?scope=queue", { cache: "no-store" });
      if (!response.ok) throw new Error(String(response.status));
      const data = (await response.json()) as { items: AdminQueueItem[] };
      setItems(data.items);
    } catch {
      setError(true);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const bandLabel = (band: AdminQueueItem["band"]) =>
    band === "high" ? t.bandHigh : band === "moderate" ? t.bandModerate : t.bandLow;

  return (
    <div className="space-y-4">
      <header>
        <h2 className="text-2xl font-semibold">{t.queueTitle}</h2>
        <p className="mt-1 max-w-3xl text-sm text-slate-600 dark:text-slate-300">{t.queueSubtitle}</p>
        <p className="mt-1 text-xs text-slate-500">{t.minimisationNote}</p>
      </header>

      <Card>
        {error ? (
          <div role="alert" className="text-sm text-red-600">
            {t.queueError}{" "}
            <button type="button" onClick={() => void load()} className="font-medium underline">
              {t.retry}
            </button>
          </div>
        ) : items === null ? (
          <p role="status" className="text-sm text-slate-500">
            {t.loading}
          </p>
        ) : items.length === 0 ? (
          <p className="text-sm text-slate-500">{t.queueEmpty}</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[640px] text-left text-sm">
              <thead className="text-xs uppercase text-slate-500">
                <tr>
                  <th className="pb-2 pr-3">{t.rank}</th>
                  <th className="pb-2 pr-3">{t.studentName}</th>
                  <th className="pb-2 pr-3">{t.indexCol}</th>
                  <th className="pb-2 pr-3">{t.factorsCol}</th>
                  <th className="pb-2">{t.assessedCol}</th>
                </tr>
              </thead>
              <tbody>
                {items.map((item, index) => (
                  <tr key={item.id} className="border-t border-slate-100 align-top dark:border-slate-800">
                    <td className="py-3 pr-3 font-medium tabular-nums">{index + 1}</td>
                    <td className="py-3 pr-3">
                      <div className="font-medium">{item.studentName}</div>
                      {item.university ? <div className="text-xs text-slate-500">{item.university}</div> : null}
                      {item.assessmentHash ? (
                        <div className="mt-1 font-mono text-[11px] text-slate-400" title={item.assessmentHash}>
                          {shortHash(item.assessmentHash)}
                        </div>
                      ) : null}
                    </td>
                    <td className="py-3 pr-3">
                      <div className="flex items-center gap-2">
                        <span className="text-lg font-semibold tabular-nums">{item.vulnerabilityIndex}</span>
                        <span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${bandStyle[item.band]}`}>
                          {bandLabel(item.band)}
                        </span>
                      </div>
                      {item.syntheticTraining ? (
                        <div className="mt-1 text-[11px] text-amber-700 dark:text-amber-300">{t.syntheticBadge}</div>
                      ) : null}
                    </td>
                    <td className="py-3 pr-3">
                      <ul className="space-y-0.5 text-xs text-slate-600 dark:text-slate-300">
                        {item.topFactors.map((f) => (
                          <li key={f.feature}>
                            {f.label} <span className="text-slate-400">({f.sharePercent}%)</span>
                          </li>
                        ))}
                      </ul>
                    </td>
                    <td className="py-3 text-xs text-slate-500">
                      <div>{new Date(item.assessedAt).toLocaleDateString()}</div>
                      {item.assessmentHash || item.studentRef ? (
                        <button
                          type="button"
                          onClick={() => setSelectedItem(item)}
                          className="mt-1 text-xs font-medium text-primary underline"
                        >
                          {t.prepareAwardBtn}
                        </button>
                      ) : null}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      {selectedItem ? (
        <Card className="bg-slate-50 dark:bg-slate-900">
          <div data-testid="queue-award-commitments">
            <h3 className="text-sm font-semibold">
              {t.awardOnChainTitle} — {selectedItem.studentName}
            </h3>
            <dl className="mt-2 space-y-1 text-xs">
              {selectedItem.studentRef ? (
                <div>
                  <dt className="font-semibold text-slate-600 dark:text-slate-300">{t.studentRefLabel}:</dt>
                  <dd className="break-all font-mono">{selectedItem.studentRef}</dd>
                </div>
              ) : null}
              {selectedItem.assessmentHash ? (
                <div>
                  <dt className="font-semibold text-slate-600 dark:text-slate-300">{t.assessmentHashLabel}:</dt>
                  <dd className="break-all font-mono">{selectedItem.assessmentHash}</dd>
                </div>
              ) : null}
            </dl>
          </div>
        </Card>
      ) : null}
    </div>
  );
}
