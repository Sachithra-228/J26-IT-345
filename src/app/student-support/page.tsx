"use client";

import Link from "next/link";
import { ArrowRight, Briefcase, HeartPulse, HandCoins, Users } from "lucide-react";
import { ScrollReveal } from "@/components/ui/scroll-reveal";
import { useLanguage } from "@/context/language-context";
import { getUiTranslations } from "@/lib/ui-translations";

export default function StudentSupportPage() {
  const { language } = useLanguage();
  const navText = getUiTranslations(language).topNav;

  const heading =
    language === "si"
      ? {
          title: "එකම තැනකින් සම්පූර්ණ විශ්වවිද්‍යාල සහාය",
          subtitle:
            "ඔබට අවශ්‍ය සහාය අංශය තෝරාගෙන ඉදිරියට යන්න — මූල්‍ය ආධාර, වෘත්තීය මාර්ගෝපදේශනය, මෙන්ටර් සම්බන්ධතා සහ මානසික සුවතාව.",
          explore: "පිවිසෙන්න",
        }
      : language === "ta"
        ? {
            title: "ஒரே இடத்தில் முழுமையான பல்கலைக்கழக ஆதரவு",
            subtitle:
              "நிதி உதவி, தொழில் வழிகாட்டல், வழிகாட்டிகள் மற்றும் மனநல ஆதரவு ஆகிய நான்கு பிரிவுகளில் ஒன்றைத் தேர்ந்தெடுக்கவும்.",
            explore: "திறக்கவும்",
          }
        : {
            title: "Four core support pillars built around your university journey",
            subtitle:
              "Select any module card below to access financial aid, career readiness, alumni mentorship, or confidential wellness care.",
            explore: "Open module",
          };

  const cards = [
    {
      num: "01",
      title: navText.financialAid,
      href: "/financial-aid",
      icon: HandCoins,
      summary:
        language === "si"
          ? "AI අවදානම් තක්සේරුව, ස්වයංක්‍රීය ශිෂ්‍යත්ව ගැළපීම සහ Blockchain විනිවිදභාවය සහිත අරමුදල්."
          : language === "ta"
            ? "AI நிதி மதிப்பீடு, உதவித்தொகை பொருத்தம் மற்றும் வெளிப்படையான பிளாக்செயின் நிதி."
            : "AI financial need assessment, smart scholarship matching, emergency grants, and transparent blockchain ledger tracking.",
      tags:
        language === "si"
          ? ["AI අවශ්‍යතා පරීක්ෂාව", "ශිෂ්‍යත්ව", "විනිවිදභාව ලෙජරය"]
          : language === "ta"
            ? ["AI நிதி மதிப்பீடு", "உதவித்தொகை", "வெளிப்படையான லெட்ஜர்"]
            : ["AI Need Check", "Scholarships", "Transparency Ledger"],
    },
    {
      num: "02",
      title: navText.career,
      href: "/career",
      icon: Briefcase,
      summary:
        language === "si"
          ? "CV විශ්ලේෂණය, දක්ෂතා හිඩැස් හඳුනාගැනීම, පුහුණු අවස්ථා සහ AI සම්මුඛ පරීක්ෂණ පුහුණුව."
          : language === "ta"
            ? "CV பகுப்பாய்வு, திறன் இடைவெளி பரிந்துரைகள், இன்டர்ன்ஷிப் மற்றும் மாதிரி நேர்காணல்."
            : "CV skill extraction, explainable career readiness scoring, skill-gap pathways, and interactive mock interview preparation.",
      tags:
        language === "si"
          ? ["CV සූදානම", "දක්ෂතා හිඩැස්", "පෙරහුරු සම්මුඛ පරීක්ෂණ"]
          : language === "ta"
            ? ["CV தயார்நிலை", "திறன் இடைவெளி", "மாதிரி நேர்காணல்"]
            : ["CV Readiness", "Skill Gaps", "Mock Interview"],
    },
    {
      num: "03",
      title: navText.mentorship,
      href: "/mentorship",
      icon: Users,
      summary:
        language === "si"
          ? "ආදි ශිෂ්‍ය සහ ආචාර්ය මෙන්ටර්වරුන් සමඟ සම්බන්ධ වීම සහ කැම්පස් ක්‍රියාකාරකම් නිර්දේශ."
          : language === "ta"
            ? "முன்னாள் மாணவர் வழிகாட்டிகள் மற்றும் வளாக நிகழ்வுகளுடன் இணைந்திடுங்கள்."
            : "Connect with alumni and faculty mentors, join campus societies, and collaborate with university stakeholders.",
      tags:
        language === "si"
          ? ["මෙන්ටර් ගැළපීම", "කැම්පස් සිදුවීම්", "ශිෂ්‍ය ජාලය"]
          : language === "ta"
            ? ["வழிகாட்டி பொருத்தம்", "வளாக நிகழ்வுகள்", "மாணவர் வலையமைப்பு"]
            : ["Mentor Matching", "Campus Events", "Peer Network"],
    },
    {
      num: "04",
      title: navText.wellness,
      href: "/wellness",
      icon: HeartPulse,
      summary:
        language === "si"
          ? "පුද්ගලික මානසික සුවතා පරීක්ෂාව, AI සහායක සංවාද සහ විශ්වාසනීය උපදේශක වෙන්කිරීම්."
          : language === "ta"
            ? "தனிப்பட்ட மனநல பரிசோதனை, AI உரையாடல் மற்றும் ஆலோசகர் சந்திப்புகள்."
            : "Confidential mood check-ins, PHQ-9 / GAD-7 self-assessments, guided support chat, and counselor referral.",
      tags:
        language === "si"
          ? ["මනෝභාව පරීක්ෂාව", "ස්වයං සත්කාර", "උපදේශක වෙන්කිරීම්"]
          : language === "ta"
            ? ["மனநிலை சரிபார்ப்பு", "சுய பராமரிப்பு", "ஆலோசகர் முன்பதிவு"]
            : ["Mood Check-in", "Self-Care", "Counselor Booking"],
    },
  ];

  return (
    <div className="min-h-screen bg-black py-16 text-white">
      <div className="mx-auto w-full max-w-6xl px-4">
        <ScrollReveal className="mx-auto max-w-3xl text-center">
          <h1 className="text-3xl font-extrabold tracking-tight text-white sm:text-5xl">
            {heading.title}
          </h1>
          <p className="mt-4 text-sm leading-relaxed text-neutral-400 sm:text-base">
            {heading.subtitle}
          </p>
        </ScrollReveal>

        <div className="mt-12 grid gap-6 sm:grid-cols-2">
          {cards.map((card, index) => {
            const Icon = card.icon;
            return (
              <ScrollReveal key={card.href} delay={index * 0.12}>
                <Link
                  href={card.href}
                  className="group relative flex h-full flex-col justify-between overflow-hidden rounded-3xl border border-white/15 bg-neutral-950 p-7 transition-all duration-300 hover:-translate-y-1 hover:border-white/35 hover:bg-neutral-900/70"
                >
                  <div>
                    <div className="flex items-center justify-between">
                      <span className="flex h-12 w-12 items-center justify-center rounded-2xl border border-white/15 bg-white/5 text-white transition-colors group-hover:border-white/30 group-hover:bg-white group-hover:text-black">
                        <Icon className="h-5 w-5" />
                      </span>
                      <span className="font-mono text-xs font-bold tracking-widest text-neutral-500">
                        {card.num}
                      </span>
                    </div>

                    <h2 className="mt-6 text-2xl font-bold tracking-tight text-white">
                      {card.title}
                    </h2>
                    <p className="mt-2.5 text-sm leading-relaxed text-neutral-400">
                      {card.summary}
                    </p>

                    <div className="mt-5 flex flex-wrap gap-2">
                      {card.tags.map((tag) => (
                        <span
                          key={tag}
                          className="rounded-full border border-white/10 bg-black px-3 py-1 text-xs font-medium text-neutral-300"
                        >
                          {tag}
                        </span>
                      ))}
                    </div>
                  </div>

                  <div className="mt-7 flex items-center gap-2 text-sm font-semibold text-white">
                    <span>{heading.explore}</span>
                    <ArrowRight className="h-4 w-4 transition-transform duration-300 group-hover:translate-x-1.5" />
                  </div>
                </Link>
              </ScrollReveal>
            );
          })}
        </div>
      </div>
    </div>
  );
}
