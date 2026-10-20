"use client";

import { useEffect, useState } from "react";
import { Bell } from "lucide-react";
import {
  studentBentoIconClass,
  studentBentoInsetClass,
  studentBentoPillClass,
  studentBentoTileClass
} from "@/components/dashboard/student/student-card-theme";
import { useLanguage } from "@/context/language-context";
// type-only import: keeps the hashing library out of the browser bundle
import type { ChainNotification, ChainNotificationKind, ChainNotificationValues } from "@/lib/c1/chain-notifications";
import { getC1Text, type C1Text } from "@/lib/c1/i18n";

const MAX_SHOWN = 10;

const TEMPLATES: Record<ChainNotificationKind, [keyof C1Text, keyof C1Text]> = {
  awarded: ["nAwardedTitle", "nAwardedBody"],
  verified: ["nVerifiedTitle", "nVerifiedBody"],
  released: ["nReleasedTitle", "nReleasedBody"],
  queued: ["nQueuedTitle", "nQueuedBody"],
  completed: ["nCompletedTitle", "nCompletedBody"],
  revoked: ["nRevokedTitle", "nRevokedBody"],
  withdrawn: ["nWithdrawnTitle", "nWithdrawnBody"],
  deadline: ["nDeadlineTitle", "nDeadlineBody"]
};

function fill(template: string, v: ChainNotificationValues) {
  return template
    .replace("{amount}", v.amount ?? "")
    .replace(/\{m\}/g, String(v.milestone ?? ""))
    .replace(/\{n\}/g, String(v.milestones ?? ""))
    .replace("{award}", v.awardId ?? "")
    .replace("{campaign}", v.campaignId ?? "")
    .replace("{scholarship}", v.scholarshipTitle ?? "")
    .replace("{provider}", v.provider ?? "")
    .replace(/\{days\}/g, String(v.days ?? ""))
    .replace("{amountLkr}", v.amountLkr ?? "");
}

/** Student's scholarship events from the blockchain ledger and upcoming deadlines (C1, FR11), from /api/notifications. */
export function ScholarshipUpdates() {
  const { language } = useLanguage();
  const t = getC1Text(language);
  const locale = language === "si" ? "si-LK" : language === "ta" ? "ta-LK" : "en-LK";
  const [items, setItems] = useState<ChainNotification[] | null>(null);
  const [error, setError] = useState(false);

  useEffect(() => {
    let cancelled = false;
    fetch("/api/notifications", { cache: "no-store" })
      .then((response) => {
        if (!response.ok) throw new Error(String(response.status));
        return response.json();
      })
      .then((data: { notifications?: Array<{ type?: string }> }) => {
        if (cancelled) return;
        const list = Array.isArray(data.notifications) ? data.notifications : [];
        setItems(
          list.filter((n): n is ChainNotification => n.type === "c1-chain" || n.type === "c1-deadline")
        );
      })
      .catch(() => {
        if (!cancelled) setError(true);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  if (items === null && !error) return null;

  return (
    <div className={studentBentoTileClass}>
      <div className="mb-5 flex items-start justify-between gap-3">
        <div className="flex items-center gap-3">
          <span className={studentBentoIconClass}>
            <Bell className="size-5" />
          </span>
          <div>
            <h3 className="text-base font-bold tracking-tight text-slate-900 dark:text-white">{t.updatesTitle}</h3>
            <p className="text-xs text-slate-500 dark:text-neutral-400">{t.updatesSubtitle}</p>
          </div>
        </div>
        {items && items.length > 0 ? <span className={studentBentoPillClass}>{items.length}</span> : null}
      </div>
      {error ? (
        <p role="alert" className={`${studentBentoInsetClass} px-4 py-3 text-sm text-red-600 dark:text-red-400`}>
          {t.updatesError}
        </p>
      ) : items && items.length === 0 ? (
        <div className={`${studentBentoInsetClass} py-8 text-center text-sm text-slate-500 dark:text-neutral-500`}>
          {t.updatesEmpty}
        </div>
      ) : (
        <ol className="grid gap-3 md:grid-cols-2" data-testid="scholarship-updates">
          {(items ?? []).slice(0, MAX_SHOWN).map((n) => {
            const [titleKey, bodyKey] = TEMPLATES[n.kind] ?? [];
            const title = titleKey ? fill(String(t[titleKey]), n.values) : n.title;
            const body = bodyKey ? fill(String(t[bodyKey]), n.values) : n.message;
            return (
              <li key={n.id} className={`${studentBentoInsetClass} p-4`}>
                <div className="flex items-start justify-between gap-2">
                  <p className="text-sm font-semibold text-slate-900 dark:text-white">{title}</p>
                  <span className="shrink-0 text-[11px] text-slate-400 dark:text-neutral-500">
                    {new Date(n.createdAt).toLocaleDateString(locale, { year: "numeric", month: "short", day: "numeric" })}
                  </span>
                </div>
                <p className="mt-1 text-xs leading-relaxed text-slate-600 dark:text-neutral-300">{body}</p>
                <div className="mt-2 flex flex-wrap items-center gap-3 text-xs">
                  {!n.read ? (
                    <span className="rounded-full bg-primary/10 px-2 py-0.5 font-semibold text-primary">{t.newBadge}</span>
                  ) : null}
                  {n.explorerUrl ? (
                    <a href={n.explorerUrl} target="_blank" rel="noreferrer" className="font-medium text-primary underline">
                      {t.viewTransaction}
                    </a>
                  ) : null}
                </div>
              </li>
            );
          })}
        </ol>
      )}
    </div>
  );
}
