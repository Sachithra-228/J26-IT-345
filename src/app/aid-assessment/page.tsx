"use client";

import { AssessmentTool } from "@/components/c1/assessment-tool";
import { useLanguage } from "@/context/language-context";
import { getC1Text } from "@/lib/c1/i18n";

export default function AidAssessmentPage() {
  const { language } = useLanguage();
  const t = getC1Text(language);
  return (
    <div className="min-h-screen bg-black py-10 text-slate-100">
      <div className="mx-auto w-full max-w-6xl px-4">
        <header className="mb-8 max-w-3xl">
          <h1 className="text-3xl font-bold tracking-tight text-white">{t.toolTitle}</h1>
          <p className="mt-3 text-neutral-400">{t.toolSubtitle}</p>
        </header>
        <AssessmentTool />
      </div>
    </div>
  );
}
