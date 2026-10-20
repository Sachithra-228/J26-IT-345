"use client";

import type { CSSProperties } from "react";
import { twMerge } from "tailwind-merge";
import type { Language } from "@/context/language-context";

export type OrbitFeature = {
  key: "financial" | "career" | "wellness" | "campus";
  title: string;
  subtitle: string;
  details: string[];
  icon: string;
  angle: number;
  radius: number;
  duration: number;
  clockwise: boolean;
};

export const orbitFeatures: OrbitFeature[] = [
  {
    key: "financial",
    title: "Financial Support",
    subtitle:
      "Access emergency grants, scholarship matching, and fee relief workflows through one guided flow.",
    details: [
      "Students can submit requests with documents and track each approval step in real time.",
      "Advisors can prioritize urgent cases and connect learners to university and external funding channels."
    ],
    icon: "Rs",
    angle: 24,
    radius: 84,
    duration: 14,
    clockwise: true
  },
  {
    key: "career",
    title: "Career Development",
    subtitle:
      "Find internships, campus jobs, and role-based learning opportunities matched to your current profile.",
    details: [
      "Skill-gap suggestions highlight what to improve before applying for competitive roles.",
      "Application progress and mentor feedback stay visible in one timeline for faster decisions."
    ],
    icon: "⚙",
    angle: 122,
    radius: 128,
    duration: 19,
    clockwise: false
  },
  {
    key: "wellness",
    title: "Health & Wellness",
    subtitle:
      "Monitor wellbeing patterns, request support early, and access trusted counselors without delays.",
    details: [
      "Private check-ins help identify stress trends before they impact attendance or grades.",
      "Students can quickly route to peer circles, counselor slots, and self-care resources."
    ],
    icon: "♥",
    angle: 228,
    radius: 172,
    duration: 22,
    clockwise: true
  },
  {
    key: "campus",
    title: "Campus Integration",
    subtitle:
      "Stay active in campus life with mentor programs, events, and communities aligned to your goals.",
    details: [
      "Event reminders and participation history make engagement measurable for students and staff.",
      "Community channels connect new students with seniors, clubs, and support groups."
    ],
    icon: "⌂",
    angle: 310,
    radius: 216,
    duration: 27,
    clockwise: false
  }
];

export function getOrbitFeatures(language: Language): OrbitFeature[] {
  if (language === "en") return orbitFeatures;

  const localized: Record<Language, Record<OrbitFeature["key"], Pick<OrbitFeature, "title" | "subtitle" | "details">>> = {
    en: {
      financial: { title: "", subtitle: "", details: [] },
      career: { title: "", subtitle: "", details: [] },
      wellness: { title: "", subtitle: "", details: [] },
      campus: { title: "", subtitle: "", details: [] }
    },
    si: {
      financial: {
        title: "මූල්‍ය සහාය",
        subtitle: "හදිසි ප්‍රදාන, ශිෂ්‍යත්ව ගැලපීම් සහ ගාස්තු සහන ක්‍රියාවලි එකම මාර්ගයකින්.",
        details: [
          "ලේඛන සමඟ ඉල්ලීම් යවා අනුමැතියේ සෑම පියවරක්ම තත්‍ය කාලීනව නිරීක්ෂණය කළ හැක.",
          "උපදේශකයන්ට හදිසි කේස් ප්‍රමුඛ කර විශ්වවිද්‍යාල සහ බාහිර අරමුදල් නාලිකා වෙත සම්බන්ධ කළ හැක."
        ]
      },
      career: {
        title: "වෘත්තීය සංවර්ධනය",
        subtitle: "ඔබගේ පැතිකඩට ගැළපෙන පුහුණු, කැම්පස් රැකියා සහ ඉගෙනුම් අවස්ථා සොයා ගන්න.",
        details: [
          "දක්ෂතා හිඩැස් යෝජනා තරඟකාරී භූමිකා සඳහා අයදුම් කිරීමට පෙර වැඩිදියුණු කළ යුතු දේ පෙන්වයි.",
          "අයදුම් ප්‍රගතිය සහ මෙන්ටර් අදහස් එකම කාලරේඛාවකින් වේගවත් තීරණ සඳහා උපකාරී වේ."
        ]
      },
      wellness: {
        title: "සෞඛ්‍ය සහ සුවතා",
        subtitle: "සුවතා රටා නිරීක්ෂණය කර ඉක්මනින් සහාය ඉල්ලන්න සහ විශ්වාසනීය උපදේශකයන්ට ප්‍රමාදයකින් තොරව ප්‍රවේශ වන්න.",
        details: [
          "පුද්ගලික පරීක්ෂණ මඟින් පැමිණීම හෝ ප්‍රතිඵල වලට බලපෑමට පෙර ආතති රටා හඳුනාගත හැක.",
          "සිසුන්ට සමපීඩන කණ්ඩායම්, උපදේශක කාල වෙන් කිරීම් සහ ස්වයං සත්කාර සම්පත් වෙත ඉක්මනින් යොමු විය හැක."
        ]
      },
      campus: {
        title: "කැම්පස් ඒකාබද්ධතාව",
        subtitle: "ඔබගේ ඉලක්ක සමඟ ගැළපෙන මෙන්ටර් වැඩසටහන්, සිදුවීම් සහ ප්‍රජාවන් සමඟ කැම්පස් ජීවිතයට එක්වන්න.",
        details: [
          "සිදුවීම් මතක් කිරීම් සහ සහභාගීත්ව ඉතිහාසය සිසුන්ට සහ කාර්ය මණ්ඩලයට සම්බන්ධතාවය මැනිය හැකි කරයි.",
          "ප්‍රජා නාලිකා නව සිසුන් seniors, සමාජ සහ සහාය කණ්ඩායම් සමඟ සම්බන්ධ කරයි."
        ]
      }
    },
    ta: {
      financial: {
        title: "நிதி ஆதரவு",
        subtitle: "அவசர நிதி, உதவித்தொகை பொருத்தம், மற்றும் கட்டண தளர்வு செயல்முறைகள் ஒரே ஓட்டத்தில்.",
        details: [
          "மாணவர்கள் ஆவணங்களுடன் கோரிக்கைகளை சமர்ப்பித்து ஒவ்வொரு அங்கீகார படியையும் நேரடியாக கண்காணிக்கலாம்.",
          "ஆலோசகர்கள் அவசர வழக்குகளுக்கு முன்னுரிமை அளித்து பல்கலைக்கழக மற்றும் வெளிப்புற நிதி வாயில்களுக்கு இணைக்கலாம்."
        ]
      },
      career: {
        title: "தொழில் மேம்பாடு",
        subtitle: "உங்கள் சுயவிவரத்துக்கு பொருந்தும் இன்டர்ன்ஷிப், வளாக வேலைகள், மற்றும் கற்றல் வாய்ப்புகளை கண்டறியுங்கள்.",
        details: [
          "திறன் இடைவெளி பரிந்துரைகள் போட்டித்தன்மை வாய்ந்த பணிகளுக்கு முன் மேம்படுத்த வேண்டியவற்றை காட்டும்.",
          "விண்ணப்ப முன்னேற்றம் மற்றும் வழிகாட்டி கருத்துக்கள் ஒரே காலவரிசையில் இருந்து வேகமான முடிவுகளை எளிதாக்கும்."
        ]
      },
      wellness: {
        title: "ஆரோக்கியம் மற்றும் நலன்",
        subtitle: "நலன் முறைகளை கண்காணித்து முன்கூட்டியே ஆதரவு கேட்டு நம்பகமான ஆலோசகர்களை தாமதமின்றி அணுகுங்கள்.",
        details: [
          "தனிப்பட்ட சரிபார்ப்புகள் வருகை அல்லது மதிப்பெண்களை பாதிக்கும் முன் மன அழுத்த போக்குகளை கண்டறிய உதவும்.",
          "மாணவர்கள் இணையாளர் குழுக்கள், ஆலோசகர் நேரங்கள் மற்றும் சுய பராமரிப்பு வளங்களுக்கு விரைவாக செல்லலாம்."
        ]
      },
      campus: {
        title: "வளாக ஒருங்கிணைப்பு",
        subtitle: "உங்கள் இலக்குகளுக்கு பொருந்தும் வழிகாட்டி திட்டங்கள், நிகழ்வுகள் மற்றும் சமூகங்களுடன் வளாக வாழ்க்கையில் ஈடுபடுங்கள்.",
        details: [
          "நிகழ்வு நினைவூட்டல்கள் மற்றும் பங்கேற்பு வரலாறு மாணவர்களுக்கும் பணியாளர்களுக்கும் ஈடுபாட்டை அளவிட உதவும்.",
          "சமூக சேனல்கள் புதிய மாணவர்களை மூத்தவர்கள், கிளப்புகள் மற்றும் ஆதரவு குழுக்களுடன் இணைக்கின்றன."
        ]
      }
    }
  };

  return orbitFeatures.map((feature) => ({
    ...feature,
    ...localized[language][feature.key]
  }));
}

type FeatureOrbitProps = {
  features?: OrbitFeature[];
  activeKey?: OrbitFeature["key"];
  onSelect?: (key: OrbitFeature["key"]) => void;
  className?: string;
};

export function FeatureOrbit({ features = orbitFeatures, activeKey, onSelect, className }: FeatureOrbitProps) {
  return (
    <div
      className={twMerge(
        "relative mx-auto mt-8 flex h-[360px] w-full max-w-[360px] items-center justify-center sm:h-[430px] sm:max-w-[430px] lg:h-[500px] lg:max-w-[520px]",
        className
      )}
    >
      {features.map((feature) => (
        <div
          key={`${feature.key}-ring`}
          className="absolute rounded-full border border-white/15"
          style={{ width: feature.radius * 2, height: feature.radius * 2 }}
        />
      ))}
      <div className="absolute grid h-24 w-24 place-items-center rounded-full border border-white/25 bg-white text-sm font-bold tracking-wider text-black shadow-[0_0_40px_rgba(255,255,255,0.2)]">
        UNICARE
      </div>
      <div className="orbit absolute inset-0">
        {features.map((feature) => {
          const isActive = activeKey === feature.key;

          return (
            <div
              key={feature.key}
              className={`orbit-item ${feature.clockwise ? "orbit-cw" : "orbit-ccw"}`}
              style={
                {
                  "--angle": `${feature.angle}deg`,
                  "--radius": `${feature.radius}px`,
                  "--duration": `${feature.duration}s`
                } as CSSProperties
              }
            >
              <button
                type="button"
                aria-label={feature.title}
                onClick={() => onSelect?.(feature.key)}
                className={`grid h-11 w-11 place-items-center rounded-full border bg-neutral-950 text-base font-semibold text-white shadow-lg transition-transform duration-300 hover:-translate-y-1 ${
                  isActive ? "border-white ring-2 ring-white/40 bg-white text-black" : "border-white/25"
                }`}
              >
                {feature.icon}
              </button>
            </div>
          );
        })}
      </div>
      <style jsx>{`
        .orbit:hover .orbit-item {
          animation-play-state: paused;
        }

        .orbit-item {
          position: absolute;
          left: 50%;
          top: 50%;
          transform: translate(-50%, -50%) rotate(var(--angle)) translateX(var(--radius))
            rotate(calc(-1 * var(--angle)));
          animation-duration: var(--duration);
          animation-timing-function: linear;
          animation-iteration-count: infinite;
          transform-origin: center;
        }

        .orbit-item:hover {
          animation-play-state: paused;
        }

        .orbit-cw {
          animation-name: orbit-cw;
        }

        .orbit-ccw {
          animation-name: orbit-ccw;
        }

        @keyframes orbit-cw {
          from {
            transform: translate(-50%, -50%) rotate(var(--angle)) translateX(var(--radius))
              rotate(calc(-1 * var(--angle)));
          }
          to {
            transform: translate(-50%, -50%) rotate(calc(360deg + var(--angle)))
              translateX(var(--radius))
              rotate(calc(-360deg - var(--angle)));
          }
        }

        @keyframes orbit-ccw {
          from {
            transform: translate(-50%, -50%) rotate(var(--angle)) translateX(var(--radius))
              rotate(calc(-1 * var(--angle)));
          }
          to {
            transform: translate(-50%, -50%) rotate(calc(-360deg + var(--angle)))
              translateX(var(--radius)) rotate(calc(360deg - var(--angle)));
          }
        }
      `}</style>
    </div>
  );
}
