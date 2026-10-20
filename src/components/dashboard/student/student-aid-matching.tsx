"use client";

import { useCallback, useEffect, useState } from "react";
import { AssessmentTool } from "@/components/c1/assessment-tool";
import { ScholarshipUpdates } from "@/components/c1/scholarship-updates";
import { Share2 } from "lucide-react";
import { Button } from "@/components/shared/Button";
import { studentBentoIconClass, studentBentoInsetClass, studentBentoTileClass } from "./student-card-theme";
import { useLanguage } from "@/context/language-context";
import { getC1Text } from "@/lib/c1/i18n";
import type { ScholarshipCriteria } from "@/lib/c1/matching";
import type { StudentFinancialProfile, VulnerabilityAssessment } from "@/lib/c1/vulnerability";

type SaveState = "idle" | "saving" | "saved" | "deleted" | "error";

export function StudentAidMatching() {
  const { language } = useLanguage();
  const t = getC1Text(language);
  const [catalogue, setCatalogue] = useState<ScholarshipCriteria[] | undefined>(undefined);
  const [last, setLast] = useState<{ profile: StudentFinancialProfile; assessment: VulnerabilityAssessment } | null>(null);
  const [consent, setConsent] = useState(false);
  const [saveState, setSaveState] = useState<SaveState>("idle");
  const [savedAt, setSavedAt] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const [cat, mine] = await Promise.all([
          fetch("/api/c1/assessments?scope=catalogue").then((r) => (r.ok ? r.json() : null)),
          fetch("/api/c1/assessments").then((r) => (r.ok ? r.json() : null))
        ]);
        if (cancelled) return;
        if (cat?.scholarships?.length) setCatalogue(cat.scholarships as ScholarshipCriteria[]);
        if (mine?.savedAt) {
          setSavedAt(mine.savedAt as string);
          setSaveState("saved");
        }
      } catch {
        // The tool still works with the illustrative catalogue if the API is unreachable.
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const onResult = useCallback((profile: StudentFinancialProfile, assessment: VulnerabilityAssessment) => {
    setLast({ profile, assessment });
    setSaveState((s) => (s === "saved" ? "idle" : s));
  }, []);

  async function save() {
    if (!last || !consent) return;
    setSaveState("saving");
    try {
      const response = await fetch("/api/c1/assessments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ profile: last.profile, consent: true })
      });
      if (!response.ok) throw new Error(String(response.status));
      const data = await response.json();
      setSavedAt(data.savedAt as string);
      setSaveState("saved");
    } catch {
      setSaveState("error");
    }
  }

  async function remove() {
    setSaveState("saving");
    try {
      const response = await fetch("/api/c1/assessments", { method: "DELETE" });
      if (!response.ok) throw new Error(String(response.status));
      setSavedAt(null);
      setConsent(false);
      setSaveState("deleted");
    } catch {
      setSaveState("error");
    }
  }

  const shareTile = (
    <div className={studentBentoTileClass}>
      <div className="mb-4 flex items-center gap-3">
        <span className={studentBentoIconClass}>
          <Share2 className="size-5" />
        </span>
        <div>
          <h3 className="text-base font-bold tracking-tight text-slate-900 dark:text-white">{t.shareTitle}</h3>
          <p className="text-xs text-slate-500 dark:text-neutral-400">{t.shareBody}</p>
        </div>
      </div>
      <label
        className={`${studentBentoInsetClass} flex cursor-pointer items-start gap-2.5 px-3.5 py-3 text-sm text-slate-700 dark:text-neutral-200`}
      >
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
            {t.saveShare}
          </Button>
          {savedAt ? (
            <Button type="button" variant="secondary" onClick={() => void remove()} disabled={saveState === "saving"}>
              {t.deleteSaved}
            </Button>
          ) : null}
          <p role="status" className="text-xs text-slate-500 dark:text-neutral-400">
            {saveState === "saved" && savedAt ? `${t.savedAt} ${new Date(savedAt).toLocaleString()}` : null}
            {saveState === "deleted" ? t.deletedNote : null}
            {saveState === "error" ? t.saveError : null}
            {!last && saveState === "idle" ? t.calculateFirst : null}
          </p>
        </div>
    </div>
  );

  return (
    <div className="space-y-4">
      <ScholarshipUpdates />
      <AssessmentTool scholarships={catalogue} onResult={onResult} aside={shareTile} />
    </div>
  );
}
