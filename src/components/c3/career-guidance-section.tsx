"use client";

import { useCallback, useEffect, useState } from "react";
import { Button } from "@/components/shared/Button";
import { Card } from "@/components/shared/Card";
import { useLanguage } from "@/context/language-context";
import { isCvFeatureEnabled } from "@/lib/c3/config";
import { getAssistantText } from "@/lib/c3/assistant-text";
import { getC3Text } from "@/lib/c3/i18n";
import { clearJobMatchContext } from "@/lib/c3/job-match-context";
import type { SessionSummary } from "@/lib/c3/interview";
import type { CareerProfile } from "@/lib/c3/validation";
import { CareerAssistant } from "./career-assistant";
import { CareerGuidanceTool } from "./career-guidance-tool";
import { MockInterview } from "./mock-interview";

type SaveState = "idle" | "saving" | "saved" | "deleted" | "error" | "limited";
type Tab = "readiness" | "interview" | "assistant";

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
  const [interviewSummary, setInterviewSummary] = useState<SessionSummary | null>(null);

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
    clearJobMatchContext(); // the result handed to the Career job board is erased too
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
      <header className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-indigo-600 via-blue-600 to-sky-500 px-5 py-6 text-white shadow-md sm:px-7">
        <div aria-hidden="true" className="pointer-events-none absolute -right-10 -top-10 h-40 w-40 rounded-full bg-white/10" />
        <div aria-hidden="true" className="pointer-events-none absolute -bottom-12 right-16 h-32 w-32 rounded-full bg-white/10" />
        <p className="text-sm font-medium text-white/80" aria-hidden="true">
          🧭 UniCare Connect
        </p>
        <h2 className="mt-1 text-2xl font-semibold sm:text-3xl">{t.toolTitle}</h2>
        <p className="mt-2 max-w-3xl text-sm text-white/90">{t.toolSubtitle}</p>
      </header>

      <div role="tablist" aria-label={t.toolTitle} className="flex gap-1 overflow-x-auto rounded-2xl bg-slate-100 p-1 dark:bg-slate-800">
        {(
          [
            ["readiness", t.tabReadiness],
            ["interview", t.tabInterview],
            ["assistant", getAssistantText(language).tab]
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
            className={`whitespace-nowrap rounded-xl px-4 py-2.5 text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary ${
              tab === id
                ? "bg-white text-indigo-700 shadow-sm dark:bg-slate-900 dark:text-indigo-300"
                : "text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-200"
            }`}
          >
            {name}
          </button>
        ))}
      </div>

      {/* All panels stay mounted so work in one tab survives switching to another. */}
      <div role="tabpanel" id="c3-panel-interview" aria-labelledby="c3-tab-interview" hidden={tab !== "interview"}>
        <MockInterview levels={last?.skills ?? null} targetRoleIds={last?.targetRoleIds ?? []} onSummary={setInterviewSummary} />
      </div>

      <div role="tabpanel" id="c3-panel-assistant" aria-labelledby="c3-tab-assistant" hidden={tab !== "assistant"}>
        <CareerAssistant profile={last} interview={interviewSummary} />
      </div>

      <div role="tabpanel" id="c3-panel-readiness" aria-labelledby="c3-tab-readiness" hidden={tab !== "readiness"} className="space-y-6">
        {/* Saved answers can always be erased, even before a new analysis is run this session. */}
        {savedAt && !last ? (
          <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-900 dark:border-emerald-900 dark:bg-emerald-950/40 dark:text-emerald-100">
            <p role="status">
              ✅ {saveState === "saved" ? `${t.savedAt} ${new Date(savedAt).toLocaleString()}` : null}
              {saveState === "error" ? t.saveError : null}
            </p>
            <Button type="button" variant="secondary" onClick={() => void remove()} disabled={saveState === "saving"}>
              {t.deleteSaved}
            </Button>
          </div>
        ) : null}
        {saveState === "deleted" && !last ? (
          <p role="status" className="rounded-2xl border border-slate-200 px-4 py-3 text-sm text-slate-600 dark:border-slate-700 dark:text-slate-300">
            {t.deletedNote}
          </p>
        ) : null}

        <CareerGuidanceTool
          initialProfile={initialProfile}
          cvEnabled={isCvFeatureEnabled()}
          onResult={onResult}
          resultsFooter={
            <Card>
              <h3 className="flex items-center gap-2 text-base font-semibold">
                <span aria-hidden="true">💾</span>
                {t.shareTitle}
              </h3>
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
          }
        />
      </div>
    </div>
  );
}
