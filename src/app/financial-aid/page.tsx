"use client";

import Link from "next/link";
import { ModuleHero } from "@/components/shared/module-hero";
import { ScrollReveal } from "@/components/ui/scroll-reveal";
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
    <div className="min-h-screen bg-black py-10 text-slate-100">
      <div className="mx-auto w-full max-w-6xl px-4">
        <ModuleHero
          eyebrow={text.eyebrow}
          title={text.title}
          subtitle={text.subtitle}
          accent="from-white/15 via-white/5 to-transparent"
          highlights={text.highlights}
          stats={text.stats}
          actions={[
            { label: text.primaryAction, href: "/aid-assessment" },
            { label: text.secondaryAction, href: "/career", variant: "ghost" }
          ]}
        />

        <div className="mt-8 grid gap-4 sm:grid-cols-2">
          <ScrollReveal delay={0.1}>
            <Link
              href="/aid-assessment"
              className="block h-full rounded-2xl border border-white/15 bg-neutral-950 p-6 shadow-sm transition hover:-translate-y-0.5 hover:border-white/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white"
            >
              <h2 className="text-lg font-semibold text-white">{c1.toolTitle}</h2>
              <p className="mt-1 text-sm text-neutral-400">{c1.privacyNote}</p>
            </Link>
          </ScrollReveal>
          <ScrollReveal delay={0.2}>
            <Link
              href="/transparency"
              className="block h-full rounded-2xl border border-white/15 bg-neutral-950 p-6 shadow-sm transition hover:-translate-y-0.5 hover:border-white/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white"
            >
              <h2 className="text-lg font-semibold text-white">{c1.ledgerTitle}</h2>
              <p className="mt-1 text-sm text-neutral-400">{c1.ledgerSubtitle}</p>
            </Link>
          </ScrollReveal>
        </div>
      </div>
    </div>
  );
}
