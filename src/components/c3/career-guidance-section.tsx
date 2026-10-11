"use client";

import { useCallback, useEffect, useState } from "react";
import { Button } from "@/components/shared/Button";
import { Card } from "@/components/shared/Card";
import { useLanguage } from "@/context/language-context";
import { isCvFeatureEnabled } from "@/lib/c3/config";
import { getC3Text } from "@/lib/c3/i18n";
import type { CareerProfile } from "@/lib/c3/validation";
import { CareerGuidanceTool } from "./career-guidance-tool";
import { MockInterview } from "./mock-interview";

type SaveState = "idle" | "saving" | "saved" | "deleted" | "error" | "limited";
type Tab = "readiness" | "interview";

/** Student dashboard section: on-device analysis, optional consent-based save and erase. */
export function CareerGuidanceSection() {
  const { language } = useLanguage();
  const t = getC3Text(language);
  const [initialProfile, setInitialProfile] = useState<CareerProfile | null>(null);
  const [last, setLast] = useState<CareerProfile | null>(null);
  const [consent, setConsent] = useState(false);
  const [saveState, setSaveState] = useState<SaveState>("idle");
  const [savedAt, setSavedAt] = useState<string | null>(null);
  const [tab, setTab] = useState<Tab>("readiness");

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch("/api/c3/assessment", { cache: "no-store" });
        if (!res.ok) return;
        const data = await res.json();
        if (cancelled || !data?.savedAt) return;
        setInitialProfile(data.profile as CareerProfile);
        setSavedAt(data.savedAt as string);
        setSaveState("saved");
      } catch {
        // the tool works fully on-device without the API
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const onResult = useCallback((profile: CareerProfile) => {
    setLast(profile);
    setSaveState((s) => (s === "saved" ? "idle" : s));
  }, []);

  async function save() {
    if (!last || !consent) return;
    setSaveState("saving");
    try {
      // Only the answers are sent (CV-found skills are already folded in); never CV text.
      const res = await fetch("/api/c3/assessment", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ profile: last, consent: true })
      });
      if (res.status === 429) return setSaveState("limited");
      if (!res.ok) throw new Error(String(res.status));
      const data = await res.json();
      setSavedAt(data.savedAt as string);
      setSaveState("saved");
    } catch {
      setSaveState("error");
    }
  }

  async function remove() {
    setSaveState("saving");
    try {
      const res = await fetch("/api/c3/assessment", { method: "DELETE" });
      if (!res.ok) throw new Error(String(res.status));
      setSavedAt(null);
      setConsent(false);
      setSaveState("deleted");
    } catch {
      setSaveState("error");
    }
  }

  return (
    <div className="space-y-6">
      <header>
        <h2 className="text-2xl font-semibold">{t.toolTitle}</h2>
        <p className="mt-1 max-w-3xl text-sm text-slate-600 dark:text-slate-300">{t.toolSubtitle}</p>
      </header>

      <div role="tablist" aria-label={t.toolTitle} className="flex gap-1 border-b border-slate-200 dark:border-slate-700">
        {(
          [
            ["readiness", t.tabReadiness],
            ["interview", t.tabInterview]
          ] as const
        ).map(([id, name]) => (
          <button
            key={id}
            type="button"
            role="tab"
            id={`c3-tab-${id}`}
            aria-selected={tab === id}
            aria-controls={`c3-panel-${id}`}
            onClick={() => setTab(id)}
            className={`border-b-2 px-4 py-3 text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary ${
              tab === id
                ? "border-primary text-primary"
                : "border-transparent text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-300"
            }`}
          >
            {name}
          </button>
        ))}
      </div>

      {/* Both panels stay mounted so answers in one tab survive switching to the other. */}
      <div role="tabpanel" id="c3-panel-interview" aria-labelledby="c3-tab-interview" hidden={tab !== "interview"}>
        <MockInterview levels={last?.skills ?? null} targetRoleIds={last?.targetRoleIds ?? []} />
      </div>

      <div role="tabpanel" id="c3-panel-readiness" aria-labelledby="c3-tab-readiness" hidden={tab !== "readiness"} className="space-y-6">
      <CareerGuidanceTool initialProfile={initialProfile} cvEnabled={isCvFeatureEnabled()} onResult={onResult} />

      <Card>
        <h3 className="text-base font-semibold">{t.shareTitle}</h3>
        <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">{t.shareBody}</p>
        <label className="mt-3 flex items-start gap-2 text-sm">
          <input
            type="checkbox"
            checked={consent}
            onChange={(e) => setConsent(e.target.checked)}
            className="mt-0.5 h-4 w-4 rounded border-slate-300 text-primary focus-visible:ring-2 focus-visible:ring-primary"
          />
          <span>{t.consentLabel}</span>
        </label>
        <div className="mt-4 flex flex-wrap items-center gap-3">
          <Button
            type="button"
            onClick={() => void save()}
            disabled={!last || !consent || saveState === "saving"}
            className="disabled:cursor-not-allowed disabled:opacity-50"
          >
            {t.save}
          </Button>
          {savedAt ? (
            <Button type="button" variant="secondary" onClick={() => void remove()} disabled={saveState === "saving"}>
              {t.deleteSaved}
            </Button>
          ) : null}
          <p role="status" className="text-sm text-slate-600 dark:text-slate-300">
            {saveState === "saved" && savedAt ? `${t.savedAt} ${new Date(savedAt).toLocaleString()}` : null}
            {saveState === "deleted" ? t.deletedNote : null}
            {saveState === "error" ? t.saveError : null}
            {saveState === "limited" ? t.rateLimited : null}
            {!last && saveState === "idle" ? t.analyseFirst : null}
          </p>
        </div>
      </Card>
      </div>
    </div>
  );
}
