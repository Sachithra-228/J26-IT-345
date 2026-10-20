"use client";

import Link from "next/link";
import { ScrollReveal } from "@/components/ui/scroll-reveal";

export type ModuleHeroStat = {
  label: string;
  value: string;
};

export type ModuleHeroAction = {
  label: string;
  href: string;
  variant?: "primary" | "ghost";
};

type ModuleHeroProps = {
  eyebrow?: string;
  title: string;
  subtitle: string;
  accent: string;
  highlights: string[];
  stats: ModuleHeroStat[];
  actions?: ModuleHeroAction[];
};

export function ModuleHero({
  title,
  subtitle,
  accent,
  highlights,
  stats,
  actions = []
}: ModuleHeroProps) {
  return (
    <ScrollReveal>
      <section className="relative overflow-hidden rounded-3xl border border-white/15 bg-neutral-950 p-8 text-white shadow-2xl md:p-10">
        <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.08)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.08)_1px,transparent_1px)] bg-[size:30px_30px] opacity-35" />
        <div className={`pointer-events-none absolute -right-16 -top-16 h-56 w-56 rounded-full bg-gradient-to-br ${accent} blur-3xl opacity-70`} />
        <div className="pointer-events-none absolute -bottom-20 left-8 h-52 w-52 rounded-full bg-cyan-300/10 blur-3xl" />

        <div className="relative grid gap-8 lg:grid-cols-[1.15fr_0.85fr] lg:items-center">
          <div className="space-y-5">
            <div className="space-y-3">
              <h1 className="text-3xl font-semibold leading-tight text-white md:text-4xl">
                {title}
              </h1>
              <p className="text-sm leading-6 text-slate-200 md:text-base">
                {subtitle}
              </p>
            </div>

            <div className="flex flex-wrap gap-2">
              {highlights.map((item) => (
                <span
                  key={`${title}-${item}`}
                  className="rounded-full border border-white/20 bg-white/10 px-3 py-1 text-xs font-semibold text-slate-100 shadow-sm"
                >
                  {item}
                </span>
              ))}
            </div>

            {actions.length ? (
              <div className="flex flex-wrap gap-3 pt-1">
                {actions.map((action) => (
                  <Link
                    key={`${title}-${action.href}`}
                    href={action.href}
                    className={`rounded-full px-4 py-2 text-sm font-semibold transition-all ${
                      action.variant === "ghost"
                        ? "border border-white/25 bg-white/10 text-white/85 hover:border-white/50 hover:text-white"
                        : "bg-white text-slate-900 shadow-sm hover:-translate-y-0.5 hover:bg-slate-100"
                    }`}
                  >
                    {action.label}
                  </Link>
                ))}
              </div>
            ) : null}
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            {stats.map((stat, index) => (
              <ScrollReveal key={`${title}-${stat.label}`} delay={index * 0.1} yOffset={20}>
                <div className="rounded-2xl border border-white/15 bg-white/10 p-4 shadow-sm">
                  <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-300">
                    {stat.label}
                  </p>
                  <p className="mt-2 text-2xl font-semibold text-white">
                    {stat.value}
                  </p>
                </div>
              </ScrollReveal>
            ))}
          </div>
        </div>
      </section>
    </ScrollReveal>
  );
}
