"use client";

import { useEffect, useState } from "react";
import { Card } from "@/components/shared/Card";
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
    <Card>
      <h3 className="text-base font-semibold">{t.updatesTitle}</h3>
      <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">{t.updatesSubtitle}</p>
      {error ? (
        <p role="alert" className="mt-3 text-sm text-red-600">
          {t.updatesError}
        </p>
      ) : items && items.length === 0 ? (
        <p className="mt-3 text-sm text-slate-500">{t.updatesEmpty}</p>
      ) : (
        <ol className="mt-4 space-y-3" data-testid="scholarship-updates">
          {(items ?? []).slice(0, MAX_SHOWN).map((n) => {
            const [titleKey, bodyKey] = TEMPLATES[n.kind] ?? [];
            const title = titleKey ? fill(String(t[titleKey]), n.values) : n.title;
            const body = bodyKey ? fill(String(t[bodyKey]), n.values) : n.message;
            return (
              <li key={n.id} className="rounded-xl border border-slate-200 p-3 dark:border-slate-700">
                <div className="flex items-start justify-between gap-2">
                  <p className="text-sm font-semibold">{title}</p>
                  <span className="shrink-0 text-xs text-slate-500">
                    {new Date(n.createdAt).toLocaleDateString(locale, { year: "numeric", month: "short", day: "numeric" })}
                  </span>
                </div>
                <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">{body}</p>
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
    </Card>
  );
}
