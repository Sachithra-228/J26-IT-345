"use client";

import { useEffect, useRef } from "react";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { useLanguage } from "@/context/language-context";
import { getUiTranslations } from "@/lib/ui-translations";

if (typeof window !== "undefined") {
  gsap.registerPlugin(ScrollTrigger);
}

export function CoreModulesJourney() {
  const { language } = useLanguage();
  const text = getUiTranslations(language).coreJourney;

  const modules =
    language === "si"
      ? [
          { num: "01", label: "මූල්‍ය සහාය" },
          { num: "02", label: "වෘත්තීය හා ශිෂ්‍යත්ව" },
          { num: "03", label: "මාර්ගෝපදේශනය හා කැම්පස්" },
          { num: "04", label: "සෞඛ්‍ය හා සුවතා" },
        ]
      : language === "ta"
        ? [
            { num: "01", label: "நிதி ஆதரவு" },
            { num: "02", label: "தொழில் & உதவித்தொகை" },
            { num: "03", label: "வழிகாட்டல் & வளாகம்" },
            { num: "04", label: "ஆரோக்கியம் & நலன்" },
          ]
        : [
            { num: "01", label: "Financial Support" },
            { num: "02", label: "Career & Scholarships" },
            { num: "03", label: "Mentorship & Campus" },
            { num: "04", label: "Health & Wellness" },
          ];

  const sectionRef = useRef<HTMLElement | null>(null);
  const pinWrapRef = useRef<HTMLDivElement | null>(null);
  const headerRef = useRef<HTMLDivElement | null>(null);
  const rowRef = useRef<HTMLDivElement | null>(null);
  const itemRefs = useRef<Array<HTMLDivElement | null>>([]);
  const unicareRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (typeof window === "undefined") return;
    if (!sectionRef.current || !pinWrapRef.current) return;

    const ctx = gsap.context(() => {
      const items = itemRefs.current.filter(Boolean);

      gsap.set(items, {
        y: 90,
        opacity: 0,
        scale: 0.86,
        filter: "blur(10px)",
      });

      gsap.set(rowRef.current, {
        x: "0vw",
        opacity: 1,
      });

      gsap.set(unicareRef.current, {
        x: "110vw",
        opacity: 0,
        scale: 0.92,
        filter: "blur(8px)",
      });

      const tl = gsap.timeline({
        scrollTrigger: {
          trigger: sectionRef.current,
          pin: pinWrapRef.current,
          start: "top top",
          end: "+=320%",
          scrub: 1,
          anticipatePin: 1,
          invalidateOnRefresh: true,
        },
      });

      // Step 1: Float in the 4 modules one-by-one into one horizontal line
      tl.to(items, {
        y: 0,
        opacity: 1,
        scale: 1,
        filter: "blur(0px)",
        duration: 1.2,
        stagger: 0.45,
        ease: "power3.out",
      });

      // Brief pause with all 4 aligned on one line
      tl.to({}, { duration: 0.5 });

      // Step 2: Swipe the 4-item line from right to left off-screen, while fading out header
      tl.to(
        rowRef.current,
        {
          x: "-125vw",
          opacity: 0,
          duration: 1.4,
          ease: "power2.inOut",
        },
        "swipe"
      );

      tl.to(
        headerRef.current,
        {
          y: -40,
          opacity: 0,
          duration: 0.9,
          ease: "power2.inOut",
        },
        "swipe"
      );

      // Step 3: Bring "UNICARE" in from right to left and stop in the exact center
      tl.to(
        unicareRef.current,
        {
          x: "0vw",
          opacity: 1,
          scale: 1,
          filter: "blur(0px)",
          duration: 1.4,
          ease: "power3.out",
        },
        "swipe+=0.35"
      );

      // Hold UNICARE at the center
      tl.to({}, { duration: 0.7 });

      // Step 4: Scroll down further -> UNICARE vanishes smoothly
      tl.to(unicareRef.current, {
        scale: 1.22,
        opacity: 0,
        filter: "blur(20px)",
        y: -30,
        duration: 1.1,
        ease: "power2.in",
      });
    }, sectionRef);

    const refreshTimer = window.setTimeout(() => {
      ScrollTrigger.refresh();
    }, 120);

    return () => {
      window.clearTimeout(refreshTimer);
      ctx.revert();
    };
  }, []);

  return (
    <section
      id="modules"
      ref={sectionRef}
      className="relative w-full overflow-hidden border-b border-white/10 bg-black text-white"
    >
      <div
        ref={pinWrapRef}
        className="relative flex h-screen w-full flex-col items-center justify-center overflow-hidden px-4"
      >
        {/* Subtle grid + radial glow on pure black */}
        <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(to_right,rgba(255,255,255,0.035)_1px,transparent_1px),linear-gradient(to_bottom,rgba(255,255,255,0.035)_1px,transparent_1px)] bg-[size:48px_48px]" />
        <div className="pointer-events-none absolute left-1/2 top-1/2 h-[420px] w-[720px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-white/[0.04] blur-[120px]" />

        {/* Section Heading */}
        <div
          ref={headerRef}
          className="relative z-10 mb-14 max-w-3xl text-center"
        >
          <h2 className="text-3xl font-extrabold tracking-tight text-white sm:text-5xl">
            {text.heading}
          </h2>
          <p className="mt-3 text-sm text-neutral-400 sm:text-base">
            {text.description}
          </p>
        </div>

        {/* One-line 4 Modules Row (floats in one by one, then swipes right-to-left) */}
        <div
          ref={rowRef}
          className="relative z-10 flex w-full max-w-7xl flex-wrap items-center justify-center gap-4 px-2 lg:flex-nowrap lg:justify-between lg:gap-6"
        >
          {modules.map((mod, idx) => (
            <div
              key={mod.num}
              ref={(el) => {
                itemRefs.current[idx] = el;
              }}
              className="group relative flex flex-1 items-center justify-center gap-3.5 whitespace-nowrap rounded-full border border-white/15 bg-neutral-950/90 px-6 py-5 shadow-[0_20px_50px_rgba(0,0,0,0.85)] backdrop-blur-xl"
            >
              <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-white/20 bg-white/5 font-mono text-xs font-bold text-neutral-300">
                {mod.num}
              </span>
              <span className="text-base font-bold tracking-tight text-white sm:text-lg xl:text-xl">
                {mod.label}
              </span>
            </div>
          ))}
        </div>

        {/* Giant Center "UNICARE" Reveal (slides right-to-left to center, then vanishes) */}
        <div
          ref={unicareRef}
          className="pointer-events-none absolute inset-0 z-20 flex items-center justify-center select-none px-4"
        >
          <span className="bg-gradient-to-b from-white via-neutral-200 to-neutral-600 bg-clip-text text-[15vw] font-black leading-none tracking-tighter text-transparent drop-shadow-[0_0_45px_rgba(255,255,255,0.16)]">
            UNICARE
          </span>
        </div>
      </div>
    </section>
  );
}
