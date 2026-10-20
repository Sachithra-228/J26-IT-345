"use client";

import Link from "next/link";
import { ModuleHero } from "@/components/shared/module-hero";
import { useLanguage } from "@/context/language-context";
import { getC1Text } from "@/lib/c1/i18n";

export default function FinancialAidPage() {
  const { language } = useLanguage();
  const c1 = getC1Text(language);

  const text =
    language === "si"
      ? {
          eyebrow: "මූල්‍ය සහාය සහ රැකියා ද්වාරය",
          title: "අධ්‍යයන ආධාර සහ දෛනික අවශ්‍යතා සඳහා අයදුම් කරන්න",
          subtitle: "හදිසි අධ්‍යයන සහාය, උපාංග ණය, නවාතැන් සහාය සහ පාඨමාලා ආධාර.",
          highlights: ["Emergency aid", "Device loans", "Tuition support"],
          stats: [
            { label: "Avg approval time", value: "3 days" },
            { label: "Partner donors", value: "12" },
            { label: "Active requests", value: "28" }
          ],
          primaryAction: "Start aid request",
          secondaryAction: "See job portal"
        }
      : language === "ta"
        ? {
            eyebrow: "நிதி ஆதரவு மற்றும் வேலை தளம்",
            title: "கல்வி உதவி மற்றும் அன்றாட தேவைகளுக்கு விண்ணப்பிக்கவும்",
            subtitle: "அவசர கல்வி ஆதரவு, சாதனக் கடன், தங்குமிடம் உதவி, மற்றும் கட்டண உதவி.",
            highlights: ["Emergency aid", "Device loans", "Tuition support"],
            stats: [
              { label: "Avg approval time", value: "3 days" },
              { label: "Partner donors", value: "12" },
              { label: "Active requests", value: "28" }
            ],
            primaryAction: "Start aid request",
            secondaryAction: "See job portal"
          }
        : {
            eyebrow: "Financial support & job portal",
            title: "Apply for academic aid and daily necessities",
            subtitle: "Emergency academic support, device loans, boarding help, and tuition assistance.",
            highlights: ["Emergency aid", "Device loans", "Tuition support"],
            stats: [
              { label: "Avg approval time", value: "3 days" },
              { label: "Partner donors", value: "12" },
              { label: "Active requests", value: "28" }
            ],
            primaryAction: "Start aid request",
            secondaryAction: "See job portal"
          };

  return (
    <div className="mx-auto w-full max-w-6xl px-4 py-10">
      <ModuleHero
        eyebrow={text.eyebrow}
        title={text.title}
        subtitle={text.subtitle}
        accent="from-emerald-400/45 via-emerald-400/15 to-transparent"
        highlights={text.highlights}
        stats={text.stats}
        actions={[
          { label: text.primaryAction, href: "/aid-assessment" },
          { label: text.secondaryAction, href: "/career", variant: "ghost" }
        ]}
      />

      <div className="mt-8 grid gap-4 sm:grid-cols-2">
        <Link
          href="/aid-assessment"
          className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm transition hover:border-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary dark:border-slate-800 dark:bg-slate-900"
        >
          <h2 className="text-lg font-semibold">{c1.toolTitle}</h2>
          <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">{c1.privacyNote}</p>
        </Link>
        <Link
          href="/transparency"
          className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm transition hover:border-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary dark:border-slate-800 dark:bg-slate-900"
        >
          <h2 className="text-lg font-semibold">{c1.ledgerTitle}</h2>
          <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">{c1.ledgerSubtitle}</p>
        </Link>
      </div>
    </div>
  );
}
