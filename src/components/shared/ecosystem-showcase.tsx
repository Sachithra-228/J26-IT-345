"use client";

import { useState } from "react";
import { FeatureOrbit, getOrbitFeatures, type OrbitFeature } from "@/components/shared/feature-orbit";
import { ScrollReveal } from "@/components/ui/scroll-reveal";
import { useLanguage } from "@/context/language-context";

type FeatureKey = OrbitFeature["key"];

export function EcosystemShowcase() {
  const { language } = useLanguage();
  const orbitFeatures = getOrbitFeatures(language);
  const [activeKey, setActiveKey] = useState<FeatureKey>(orbitFeatures[0].key);

  const sectionText =
    language === "si"
      ? {
          title: "එක් ශිෂ්‍ය අත්දැකීමක් වටා මූලික මොඩියුල",
          subtitle: "දකුණේ accordion එකෙන් ප්‍රධාන විශේෂාංග හතර සොයන්න."
        }
      : language === "ta"
        ? {
            title: "ஒரே மாணவர் அனுபவத்தைச் சுற்றிய மைய தொகுதிகள்",
            subtitle: "வலப்பக்க accordion-ல் நான்கு முக்கிய அம்சங்களை ஆராயுங்கள்."
          }
        : {
            title: "Core modules around one student experience",
            subtitle: "Explore the four key features from the accordion on the right."
          };

  return (
    <section>
      <ScrollReveal className="space-y-3 text-center lg:text-left">
        <h2 className="text-3xl font-bold tracking-tight text-white sm:text-4xl">
          {sectionText.title}
        </h2>
        <p className="text-sm text-neutral-400 sm:text-base">{sectionText.subtitle}</p>
      </ScrollReveal>

      <div className="mt-12 grid gap-8 lg:grid-cols-[1.05fr_0.95fr] lg:items-stretch">
        <ScrollReveal delay={0.1}>
          <FeatureOrbit
            features={orbitFeatures}
            activeKey={activeKey}
            onSelect={setActiveKey}
            className="mt-0"
          />
        </ScrollReveal>

        <ScrollReveal delay={0.2}>
          <div className="h-full min-h-0 rounded-2xl border border-white/15 bg-neutral-950/90 p-3 shadow-2xl lg:min-h-[500px]">
            {orbitFeatures.map((feature, index) => {
              const isActive = feature.key === activeKey;
              const isLast = index === orbitFeatures.length - 1;

              return (
                <div
                  key={feature.key}
                  className={`px-4 py-1 ${isLast ? "" : "border-b border-white/10"}`}
                >
                  <button
                    type="button"
                    aria-expanded={isActive}
                    onClick={() => setActiveKey(feature.key)}
                    className="flex w-full items-center justify-between gap-3 py-4 text-left"
                  >
                    <span
                      className={`text-base font-semibold transition-colors ${
                        isActive ? "text-white" : "text-neutral-400 hover:text-neutral-200"
                      }`}
                    >
                      {feature.title}
                    </span>
                    <svg
                      viewBox="0 0 24 24"
                      className={`h-4 w-4 text-neutral-500 transition-transform ${
                        isActive ? "rotate-180 text-white" : ""
                      }`}
                      fill="none"
                    >
                      <path
                        d="M6 9l6 6 6-6"
                        stroke="currentColor"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                    </svg>
                  </button>

                  {isActive ? (
                    <div className="space-y-3 pb-5">
                      <p className="text-sm leading-7 text-neutral-200">
                        {feature.subtitle}
                      </p>
                      <ul className="space-y-2 text-sm leading-6 text-neutral-400">
                        {feature.details.map((detail) => (
                          <li key={detail} className="flex items-start gap-2.5 pl-1">
                            <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-white/60" />
                            <span>{detail}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  ) : null}
                </div>
              );
            })}
          </div>
        </ScrollReveal>
      </div>
    </section>
  );
}
