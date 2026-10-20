"use client";

import { Badge } from "@/components/shared/Badge";
import { Button } from "@/components/shared/Button";
import { CONCERNS } from "@/lib/c2/assessment";
import type { Provider } from "@/lib/c2/support";

export function SampleProfessionalCard({
  provider,
  reasons,
  topMatch,
  selected,
  onSelect,
}: {
  provider: Provider;
  reasons: string[];
  topMatch: boolean;
  selected: boolean;
  onSelect: () => void;
}) {
  const initials = provider.name
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0])
    .join("");
  const mode = {
    online: "Online",
    "in-person": "In person",
    hybrid: "Online & in person",
  }[provider.mode];
  return (
    <article
      aria-label={provider.name}
      className={`flex h-full flex-col rounded-2xl border bg-white p-5 transition-colors dark:bg-slate-900 ${selected ? "border-blue-500 ring-1 ring-blue-500" : "border-slate-200 dark:border-slate-700"}`}
    >
      <div className="flex items-start gap-3">
        <div
          aria-hidden="true"
          className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-blue-100 text-base font-semibold text-blue-800 dark:bg-blue-950 dark:text-blue-200"
        >
          {initials}
        </div>
        <div className="min-w-0 flex-1">
          <h4 className="font-semibold text-slate-900 dark:text-white">
            {provider.name}
          </h4>
          <p className="mt-0.5 text-sm capitalize text-slate-600 dark:text-slate-300">
            {provider.profession}
          </p>
          <div className="mt-2 flex flex-wrap gap-2">
            <Badge>Sample profile</Badge>
            {topMatch ? <Badge variant="success">Top topic match</Badge> : null}
          </div>
        </div>
      </div>
      <p className="mt-4 text-sm leading-6 text-slate-600 dark:text-slate-300">
        {provider.profileSummary ?? provider.specialization}
      </p>
      <dl className="mt-4 grid grid-cols-1 gap-2 text-xs leading-5 text-slate-600 sm:grid-cols-2 dark:text-slate-300">
        <div>
          <dt className="font-medium text-slate-900 dark:text-white">
            Languages
          </dt>
          <dd>
            {provider.languages
              ?.map(
                (value) =>
                  ({ en: "English", si: "Sinhala", ta: "Tamil" })[value],
              )
              .join(", ") || "Not listed"}
          </dd>
        </div>
        <div>
          <dt className="font-medium text-slate-900 dark:text-white">Gender</dt>
          <dd className="capitalize">
            {provider.gender === "other"
              ? "Another gender"
              : (provider.gender?.replace("not-specified", "Not listed") ??
                "Not listed")}
          </dd>
        </div>
        <div>
          <dt className="font-medium text-slate-900 dark:text-white">
            Example location
          </dt>
          <dd>{provider.location ?? "Not listed"}</dd>
        </div>
        <div>
          <dt className="font-medium text-slate-900 dark:text-white">
            Session mode
          </dt>
          <dd>{mode}</dd>
        </div>
        {provider.sampleHours ? (
          <div className="sm:col-span-2">
            <dt className="font-medium text-slate-900 dark:text-white">
              Example hours
            </dt>
            <dd>{provider.sampleHours}</dd>
          </div>
        ) : null}
        {provider.contactEmail ? (
          <div className="min-w-0 sm:col-span-2">
            <dt className="font-medium text-slate-900 dark:text-white">
              Example contact · not monitored
            </dt>
            <dd className="break-all">{provider.contactEmail}</dd>
          </div>
        ) : null}
      </dl>
      <div className="mt-4">
        <p className="text-xs font-semibold text-slate-900 dark:text-white">
          Support areas
        </p>
        <ul className="mt-2 flex flex-wrap gap-1.5">
          {provider.supportAreas?.map((topic) => (
            <li
              key={topic}
              className="rounded-full bg-slate-100 px-2.5 py-1 text-xs text-slate-700 dark:bg-slate-800 dark:text-slate-200"
            >
              {CONCERNS[topic].label}
            </li>
          ))}
        </ul>
      </div>
      <div className="mt-4 rounded-xl bg-blue-50 p-3 text-xs leading-5 text-blue-900 dark:bg-blue-950 dark:text-blue-100">
        <p className="font-semibold">How this profile fits</p>
        <ul className="mt-1 space-y-1">
          {reasons.map((reason) => (
            <li key={reason}>{reason}</li>
          ))}
        </ul>
      </div>
      <div className="mt-auto pt-4">
        <Button
          type="button"
          className="w-full"
          aria-pressed={selected}
          variant={selected ? "primary" : "secondary"}
          onClick={onSelect}
        >
          {selected ? "Selected" : "Select sample profile"}
        </Button>
        <p className="mt-2 text-center text-xs leading-5 text-slate-500 dark:text-slate-400">
          Fictional profile · appointments unavailable
        </p>
      </div>
    </article>
  );
}
