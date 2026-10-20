"use client";

import { ModuleHero } from "@/components/shared/module-hero";
import { useLanguage } from "@/context/language-context";

export default function MentorshipPage() {
  const { language } = useLanguage();
  const text =
    language === "si"
      ? {
          eyebrow: "මාර්ගෝපදේශනය සහ කැම්පස් ඒකාබද්ධතාව",
          title: "මෙන්ටර්වරුන් සහ කැම්පස් ප්‍රජාවන් සමඟ සම්බන්ධ වන්න",
          subtitle: "පුරෝගාමී ගැළපීම්, කැම්පස් සිදුවීම්, හවුල්කාරීත්ව සහ ප්‍රජා ක්‍රියාකාරකම්.",
          highlights: ["Mentor matching", "Campus events", "Community outreach"],
          stats: [
            { label: "Available mentors", value: "18" },
            { label: "Upcoming events", value: "6" },
            { label: "Active partners", value: "9" }
          ],
          primaryAction: "Find a mentor",
          secondaryAction: "View events"
        }
      : language === "ta"
        ? {
            eyebrow: "வழிகாட்டல் மற்றும் வளாக ஒருங்கிணைப்பு",
            title: "வழிகாட்டிகளும் வளாகக் குழுக்களும் இணைந்திடுங்கள்",
            subtitle: "அலும்னி பொருத்தம், வளாக நிகழ்வுகள், கூட்டாண்மைகள், மற்றும் சமூக செயல்பாடுகள்.",
            highlights: ["Mentor matching", "Campus events", "Community outreach"],
            stats: [
              { label: "Available mentors", value: "18" },
              { label: "Upcoming events", value: "6" },
              { label: "Active partners", value: "9" }
            ],
            primaryAction: "Find a mentor",
            secondaryAction: "View events"
          }
        : {
            eyebrow: "Mentorship & campus integration",
            title: "Connect with mentors and campus communities",
            subtitle: "Alumni matching, campus events, partnerships, and outreach.",
            highlights: ["Mentor matching", "Campus events", "Community outreach"],
            stats: [
              { label: "Available mentors", value: "18" },
              { label: "Upcoming events", value: "6" },
              { label: "Active partners", value: "9" }
            ],
            primaryAction: "Find a mentor",
            secondaryAction: "View events"
          };

  return (
    <div className="min-h-screen w-full bg-black">
      <div className="mx-auto w-full max-w-6xl px-4 py-12">
        <ModuleHero
          eyebrow={text.eyebrow}
          title={text.title}
          subtitle={text.subtitle}
          accent="from-violet-400/45 via-violet-400/15 to-transparent"
          highlights={text.highlights}
          stats={text.stats}
          actions={[
            { label: text.primaryAction, href: "/mentorship" },
            { label: text.secondaryAction, href: "/mentorship", variant: "ghost" }
          ]}
        />
      </div>
    </div>
  );
}
