"use client";

import Link from "next/link";
import { useLanguage } from "@/context/language-context";
import { getUiTranslations } from "@/lib/ui-translations";
import { WireframeGlobe } from "@/components/shared/wireframe-globe";

export function HomeHero() {
  const { language } = useLanguage();
  const text = getUiTranslations(language).homeHero;

  return (
    <section
      id="overview"
      className="relative w-full overflow-hidden border-b border-white/10 bg-black px-6 py-14 md:px-10 md:py-20"
    >
      <div className="pointer-events-none absolute -right-16 -top-20 h-72 w-72 rounded-full bg-white/[0.04] blur-3xl" />
      <div className="pointer-events-none absolute -bottom-24 left-1/3 h-64 w-64 rounded-full bg-blue-500/[0.06] blur-3xl" />
      <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(to_right,rgba(255,255,255,0.04)_1px,transparent_1px),linear-gradient(to_bottom,rgba(255,255,255,0.04)_1px,transparent_1px)] bg-[size:38px_38px] opacity-40" />

      <div className="relative mx-auto grid max-w-6xl gap-8 lg:grid-cols-[1.1fr_0.9fr] lg:items-center">
        <div className="space-y-6">
          <h1 className="text-4xl font-semibold leading-tight text-white md:text-5xl">
            {text.title}
          </h1>
          <p className="max-w-2xl text-base text-neutral-300">{text.description}</p>

          <div className="flex flex-wrap gap-3">
            <Link
              href="/dashboard"
              className="rounded-full bg-white px-5 py-2.5 text-sm font-semibold text-black transition-all hover:-translate-y-0.5 hover:bg-neutral-200"
            >
              {text.dashboardCta}
            </Link>
            <Link
              href="/financial-aid"
              className="rounded-full border border-white/25 bg-white/5 px-5 py-2.5 text-sm font-semibold text-neutral-100 transition-colors hover:bg-white/15"
            >
              {text.aidCta}
            </Link>
          </div>
        </div>

        <WireframeGlobe />
      </div>
    </section>
  );
}
