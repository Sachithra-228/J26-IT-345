"use client";

/**
 * C3 - small, dependency-free chart pieces for the admin insights page.
 *
 * Colours follow a validated data-viz palette (checked for colour-blind separation in
 * light and dark mode): one blue hue for magnitude, a fixed categorical order for
 * identities, a blue ordinal ramp for readiness bands and the reserved "good" green
 * (always with a check mark and a label) for "target reached". Every mark has a hover /
 * focus tooltip and an accessible label; values are always printed as text too, so no
 * meaning depends on colour alone.
 */

import type { LucideIcon } from "lucide-react";
import type { ReactNode } from "react";

export const SEQ = "bg-[#2a78d6] dark:bg-[#3987e5]";
export const GOOD = "bg-[#0ca30c]";
export const MUTED = "bg-[#b9b8b2] dark:bg-[#5e5d59]";
/** Categorical slots 1-4 in fixed order (never cycled). */
export const CATEGORICAL = [
  "bg-[#2a78d6] dark:bg-[#3987e5]",
  "bg-[#eb6834] dark:bg-[#d95926]",
  "bg-[#1baf7a] dark:bg-[#199e70]",
  "bg-[#eda100] dark:bg-[#c98500]"
];
/** Ordinal blue ramp for readiness bands: strong, developing, early. */
export const BANDS = [
  "bg-[#104281] dark:bg-[#9ec5f4]",
  "bg-[#2a78d6] dark:bg-[#3987e5]",
  "bg-[#86b6ef] dark:bg-[#184f95]"
];
const TRACK = "bg-slate-100 dark:bg-slate-800";

function Tooltip({ children }: { children: ReactNode }) {
  return (
    <span
      role="presentation"
      className="pointer-events-none absolute bottom-full left-1/2 z-10 mb-2 hidden -translate-x-1/2 whitespace-nowrap rounded-lg bg-slate-900 px-2.5 py-1.5 text-xs text-white shadow-lg group-hover:block group-focus-visible:block dark:bg-slate-100 dark:text-slate-900"
    >
      {children}
    </span>
  );
}

const focusRing = "rounded focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary";

export type Accent = "blue" | "green" | "orange" | "violet";
const ACCENTS: Record<Accent, { ring: string; chip: string }> = {
  blue: { ring: "border-t-[#2a78d6] dark:border-t-[#3987e5]", chip: "bg-[#cde2fb] text-[#184f95] dark:bg-[#184f95] dark:text-[#cde2fb]" },
  green: { ring: "border-t-[#0ca30c]", chip: "bg-[#d9f2d9] text-[#0a6b0a] dark:bg-[#0a4d0a] dark:text-[#d9f2d9]" },
  orange: { ring: "border-t-[#eb6834] dark:border-t-[#d95926]", chip: "bg-[#fde3d7] text-[#9a3a12] dark:bg-[#6b2a10] dark:text-[#fde3d7]" },
  violet: { ring: "border-t-[#4a3aa7] dark:border-t-[#9085e9]", chip: "bg-[#e4e0f7] text-[#35287d] dark:bg-[#35287d] dark:text-[#e4e0f7]" }
};

/** A headline number. Colour is decoration only; the label says what it is. */
export function StatTile({ icon: Icon, label, value, sub, accent = "blue", testId }: {
  /** A lucide icon, or a short text such as a year number. */
  icon: LucideIcon | string;
  label: string;
  value: ReactNode;
  sub?: ReactNode;
  accent?: Accent;
  testId?: string;
}) {
  const a = ACCENTS[accent];
  return (
    <div className={`rounded-2xl border border-t-4 border-slate-200 bg-white p-4 shadow-sm dark:border-slate-700 dark:bg-slate-900 ${a.ring}`}>
      <div className="flex items-center gap-2">
        <span aria-hidden="true" className={`flex h-8 w-8 items-center justify-center rounded-full text-base ${a.chip}`}>
          {typeof Icon === "string" ? Icon : <Icon className="h-4 w-4" />}
        </span>
        <p className="text-sm text-slate-600 dark:text-slate-300">{label}</p>
      </div>
      <p data-testid={testId} className="mt-2 text-3xl font-semibold tabular-nums text-slate-900 dark:text-white">
        {value}
      </p>
      {sub ? <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">{sub}</p> : null}
    </div>
  );
}

export type BarRow = {
  id: string;
  label: string;
  value: number | null;
  /** Printed at the end of the bar. */
  valueText: string;
  tooltip: string;
  done?: boolean;
};

/**
 * Horizontal bars on one shared scale (0..max), optional target marker. A row whose
 * value is null (hidden for privacy) shows its text with an empty track.
 */
export function BarChart({ rows, max, target, targetLabel, doneLabel, testId }: {
  rows: BarRow[];
  max: number;
  target?: number;
  targetLabel?: string;
  doneLabel?: string;
  testId?: string;
}) {
  const scale = (v: number) => `${Math.max(0, Math.min(v / max, 1)) * 100}%`;
  return (
    <ul data-testid={testId} className="space-y-2.5">
      {rows.map((r) => (
        <li key={r.id} className="grid grid-cols-[minmax(7rem,42%)_1fr_auto] items-center gap-3 text-sm">
          <span className="truncate text-slate-700 dark:text-slate-200" title={r.label}>
            {r.label}
          </span>
          <span tabIndex={0} aria-label={r.tooltip} className={`group relative block py-1 ${focusRing}`}>
            <span className={`relative block h-3 w-full rounded-full ${TRACK}`}>
              {r.value !== null ? (
                <span
                  className={`absolute inset-y-0 left-0 rounded-r rounded-l-sm ${r.done ? GOOD : SEQ}`}
                  style={{ width: scale(r.value) }}
                />
              ) : null}
              {target !== undefined ? (
                <span
                  aria-hidden="true"
                  className="absolute -inset-y-1 w-0.5 rounded bg-slate-700 dark:bg-slate-200"
                  style={{ left: `calc(${scale(target)} - 1px)` }}
                />
              ) : null}
            </span>
            <Tooltip>{r.tooltip}</Tooltip>
          </span>
          <span className="w-16 text-right tabular-nums text-slate-700 dark:text-slate-200">
            {r.done && doneLabel ? (
              <span className="mr-1 text-[#0a7d0a] dark:text-[#5fd35f]" title={doneLabel}>
                ✓
              </span>
            ) : null}
            {r.valueText}
          </span>
        </li>
      ))}
      {target !== undefined && targetLabel ? (
        <li aria-hidden="true" className="grid grid-cols-[minmax(7rem,42%)_1fr_auto] gap-3 text-xs text-slate-500 dark:text-slate-400">
          <span />
          <span className="relative block h-4">
            <span className="absolute -translate-x-1/2 whitespace-nowrap" style={{ left: scale(target) }}>
              ▲ {targetLabel}
            </span>
          </span>
          <span className="w-16" />
        </li>
      ) : null}
    </ul>
  );
}

export type Segment = { id: string; label: string; value: number; color: string };

/** One 100% bar split into parts, with a legend that repeats every label and value. */
export function StackedBar({ segments, ariaLabel, formatValue = (v) => String(v), testId, height = "h-4", legend = true }: {
  segments: Segment[];
  ariaLabel: string;
  formatValue?: (v: number, share: number) => string;
  testId?: string;
  height?: string;
  /** False only where one shared legend sits next to several bars. */
  legend?: boolean;
}) {
  const total = segments.reduce((s, x) => s + x.value, 0);
  const shown = segments.filter((s) => s.value > 0);
  return (
    <div data-testid={testId}>
      <div role="img" aria-label={ariaLabel} className={`flex w-full gap-0.5 ${height}`}>
        {total === 0 ? <span className={`h-full w-full rounded ${TRACK}`} /> : null}
        {shown.map((s, i) => (
          <span
            key={s.id}
            tabIndex={0}
            aria-label={`${s.label}: ${formatValue(s.value, s.value / total)}`}
            className={`group relative h-full ${s.color} ${i === 0 ? "rounded-l" : ""} ${i === shown.length - 1 ? "rounded-r" : ""} ${focusRing}`}
            style={{ width: `${(s.value / total) * 100}%` }}
          >
            <Tooltip>
              {s.label}: {formatValue(s.value, s.value / total)}
            </Tooltip>
          </span>
        ))}
      </div>
      {legend ? (
        <ul className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs text-slate-600 dark:text-slate-300">
          {segments.map((s) => (
            <li key={s.id} className="flex items-center gap-1.5">
              <span aria-hidden="true" className={`h-2.5 w-2.5 rounded-sm ${s.color}`} />
              <span>
                {s.label} <span className="tabular-nums text-slate-500 dark:text-slate-400">{formatValue(s.value, total ? s.value / total : 0)}</span>
              </span>
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}

/** A 0-1 metric as a bar with its value, an optional 95% interval whisker and a reference tick. */
export function MetricBar({ label, value, ci, reference, referenceLabel, tooltip }: {
  label: string;
  value: number;
  ci?: [number, number];
  reference?: number;
  referenceLabel?: string;
  tooltip: string;
}) {
  const pct = (v: number) => `${Math.max(0, Math.min(v, 1)) * 100}%`;
  return (
    <div className="grid grid-cols-[5.5rem_1fr_3rem] items-center gap-3 text-sm">
      <span className="text-slate-700 dark:text-slate-200">{label}</span>
      <span tabIndex={0} aria-label={tooltip} className={`group relative block py-1.5 ${focusRing}`}>
        <span className={`relative block h-3 w-full rounded-full ${TRACK}`}>
          <span className={`absolute inset-y-0 left-0 rounded-r rounded-l-sm ${SEQ}`} style={{ width: pct(value) }} />
          {ci ? (
            <span
              aria-hidden="true"
              className="absolute top-1/2 h-0.5 -translate-y-1/2 bg-slate-900 dark:bg-white"
              style={{ left: pct(ci[0]), width: `calc(${pct(ci[1])} - ${pct(ci[0])})` }}
            />
          ) : null}
          {reference !== undefined ? (
            <span
              aria-hidden="true"
              title={referenceLabel}
              className="absolute -inset-y-1.5 w-0.5 rounded bg-[#eb6834] dark:bg-[#d95926]"
              style={{ left: `calc(${pct(reference)} - 1px)` }}
            />
          ) : null}
        </span>
        <Tooltip>{tooltip}</Tooltip>
      </span>
      <span className="text-right font-medium tabular-nums text-slate-900 dark:text-white">{value.toFixed(2)}</span>
    </div>
  );
}
