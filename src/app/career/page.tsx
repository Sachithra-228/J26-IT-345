"use client";

import { ModuleHero } from "@/components/shared/module-hero";
import { useLanguage } from "@/context/language-context";

export default function CareerPage() {
  const { language } = useLanguage();
  const text =
    language === "si"
      ? {
          eyebrow: "වෘත්තීය සහ ශිෂ්‍යත්ව මොඩියුලය",
          title: "ඔබගේ වෘත්තීය ගමන ඉදිරියට ගෙන යන්න",
          subtitle: "ශිෂ්‍යත්ව ගැළපීම්, පුහුණු අවස්ථා සහ දක්ෂතා නිර්දේශ.",
          highlights: ["Scholarships", "Internships", "Skill gaps"],
          stats: [
            { label: "Matches this week", value: "38" },
            { label: "Active roles", value: "120" },
            { label: "Profile strength", value: "72%" }
          ],
          primaryAction: "Get matches",
          secondaryAction: "Browse jobs"
        }
      : language === "ta"
        ? {
            eyebrow: "தொழில் மற்றும் உதவித்தொகை தொகுதி",
            title: "உங்கள் தொழில் பயணத்தை முன்னேற்றுங்கள்",
            subtitle: "உதவித்தொகை பொருத்தம், இன்டர்ன்ஷிப், மற்றும் திறன் பரிந்துரைகள்.",
            highlights: ["Scholarships", "Internships", "Skill gaps"],
            stats: [
              { label: "Matches this week", value: "38" },
              { label: "Active roles", value: "120" },
              { label: "Profile strength", value: "72%" }
            ],
            primaryAction: "Get matches",
            secondaryAction: "Browse jobs"
          }
        : {
            eyebrow: "Career & scholarship module",
            title: "Advance your career journey",
            subtitle: "Scholarship matching, internships, and skill recommendations.",
            highlights: ["Scholarships", "Internships", "Skill gaps"],
            stats: [
              { label: "Matches this week", value: "38" },
              { label: "Active roles", value: "120" },
              { label: "Profile strength", value: "72%" }
            ],
            primaryAction: "Get matches",
            secondaryAction: "Browse jobs"
          };

  return (
    <div className="min-h-screen w-full bg-black">
      <div className="mx-auto w-full max-w-6xl px-4 py-12">
        <ModuleHero
          eyebrow={text.eyebrow}
          title={text.title}
          subtitle={text.subtitle}
          accent="from-sky-400/45 via-sky-400/15 to-transparent"
          highlights={text.highlights}
          stats={text.stats}
          actions={[
            { label: text.primaryAction, href: "/career" },
            { label: text.secondaryAction, href: "/career", variant: "ghost" }
          ]}
        />
      </div>
    </div>
  );
}
