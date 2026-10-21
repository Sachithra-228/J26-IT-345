"use client";

import { useMemo, useState } from "react";
import { Scale, Sparkles, Users } from "lucide-react";
import {
  studentBentoIconClass,
  studentBentoInsetClass,
  studentBentoPillClass,
  studentBentoTileClass
} from "@/components/dashboard/student/student-card-theme";
import { matchingModel, rankMentors, type CriterionId, type StudentNeeds } from "@/lib/c4/matching";

const MAX_SKILLS = 3;
const { skills, interests, languages, slots } = matchingModel.taxonomy;

const CRITERION_LABEL: Record<CriterionId, string> = {
  skill: "Skills",
  interest: "Interests",
  language: "Language",
  availability: "Time",
  capacity: "Free places"
};

const chip = (on: boolean) =>
  `rounded-full px-3 py-1.5 text-xs font-medium transition-colors ${
    on
      ? "bg-slate-900 text-white dark:bg-white dark:text-neutral-900"
      : "bg-slate-100 text-slate-600 hover:bg-slate-200 dark:bg-neutral-900 dark:text-neutral-300 dark:hover:bg-neutral-800"
  }`;

const toggle = (list: string[], id: string) => (list.includes(id) ? list.filter((x) => x !== id) : [...list, id]);
const pct = (x: number) => `${Math.round(x * 100)}%`;

function Group({ title, hint, children }: { title: string; hint?: string; children: React.ReactNode }) {
  return (
    <fieldset className="mt-5 first:mt-0">
      <legend className="mb-2 text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-neutral-400">
        {title}
        {hint ? <span className="ml-1.5 font-normal normal-case tracking-normal text-slate-400 dark:text-neutral-500">{hint}</span> : null}
      </legend>
      <div className="flex flex-wrap gap-1.5">{children}</div>
    </fieldset>
  );
}

/** C4 - explainable, capacity-aware mentor matching. Runs on the device; nothing is sent or stored. */
export function MentorMatch() {
  const [needs, setNeeds] = useState<Record<string, number>>({ web_backend: 2, interview_prep: 1 });
  const [picked, setPicked] = useState<string[]>(["industry_internships"]);
  const [spoken, setSpoken] = useState<string[]>(["si", "en"]);
  const [preferred, setPreferred] = useState("si");
  const [free, setFree] = useState<string[]>(["weekday_evening", "saturday"]);

  const ready = Object.keys(needs).length > 0 && spoken.length > 0 && free.length > 0;
  const matches = useMemo(() => {
    if (!ready) return [];
    const student: StudentNeeds = { needs, interests: picked, preferredLanguage: preferred, languages: spoken, slots: free };
    return rankMentors(student).slice(0, 3);
  }, [ready, needs, picked, preferred, spoken, free]);

  const toggleSkill = (id: string) =>
    setNeeds((prev) => {
      if (prev[id]) {
        const next = { ...prev };
        delete next[id];
        return next;
      }
      if (Object.keys(prev).length >= MAX_SKILLS) return prev;
      return { ...prev, [id]: 2 };
    });

  const toggleSpoken = (id: string) => {
    const next = toggle(spoken, id);
    if (next.length === 0) return;
    setSpoken(next);
    if (!next.includes(preferred)) setPreferred(next[0]);
  };

  const r = matchingModel.results;

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-12">
        <section className={`${studentBentoTileClass} lg:col-span-5`} aria-label="Your mentoring needs">
          <div className="mb-5 flex items-center gap-3">
            <span className={studentBentoIconClass}>
              <Users className="size-5" />
            </span>
            <div>
              <h3 className="text-base font-bold tracking-tight text-slate-900 dark:text-white">Find your mentor</h3>
              <p className="text-xs text-slate-500 dark:text-neutral-400">Calculated on your device - nothing is sent or stored</p>
            </div>
          </div>

          <Group title="I want help with" hint={`up to ${MAX_SKILLS}`}>
            {skills.map((s) => (
              <button key={s.id} type="button" aria-pressed={Boolean(needs[s.id])} className={chip(Boolean(needs[s.id]))} onClick={() => toggleSkill(s.id)}>
                {s.label}
              </button>
            ))}
          </Group>

          {Object.keys(needs).length > 0 ? (
            <div className="mt-3 space-y-1.5">
              {Object.entries(needs).map(([id, level]) => (
                <div key={id} className={`${studentBentoInsetClass} flex items-center justify-between gap-2 px-3 py-2`}>
                  <span className="truncate text-xs font-medium text-slate-700 dark:text-neutral-200">{skills.find((s) => s.id === id)?.label}</span>
                  <div className="flex gap-1" role="group" aria-label={`How much help with ${id}`}>
                    {[1, 2, 3].map((n) => (
                      <button
                        key={n}
                        type="button"
                        aria-pressed={level === n}
                        onClick={() => setNeeds((prev) => ({ ...prev, [id]: n }))}
                        className={`rounded-lg px-2 py-0.5 text-[11px] font-semibold ${
                          level === n ? "bg-white text-slate-900 shadow-sm dark:bg-neutral-950 dark:text-white" : "text-slate-400 dark:text-neutral-500"
                        }`}
                      >
                        {n === 1 ? "A little" : n === 2 ? "Some" : "A lot"}
                      </button>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          ) : null}

          <Group title="Interests">
            {interests.map((i) => (
              <button key={i.id} type="button" aria-pressed={picked.includes(i.id)} className={chip(picked.includes(i.id))} onClick={() => setPicked(toggle(picked, i.id))}>
                {i.label}
              </button>
            ))}
          </Group>

          <Group title="Languages I speak" hint="tap again to set as preferred">
            {languages.map((l) => {
              const on = spoken.includes(l.id);
              return (
                <button
                  key={l.id}
                  type="button"
                  aria-pressed={on}
                  className={chip(on)}
                  onClick={() => (on && preferred !== l.id ? setPreferred(l.id) : toggleSpoken(l.id))}
                >
                  {l.label}
                  {preferred === l.id ? " (preferred)" : ""}
                </button>
              );
            })}
          </Group>

          <Group title="When I am free">
            {slots.map((s) => (
              <button key={s.id} type="button" aria-pressed={free.includes(s.id)} className={chip(free.includes(s.id))} onClick={() => setFree(toggle(free, s.id))}>
                {s.label}
              </button>
            ))}
          </Group>
        </section>

        <section className={`${studentBentoTileClass} lg:col-span-7`} aria-label="Recommended mentors" aria-live="polite">
          <div className="mb-5 flex items-start justify-between gap-3">
            <div className="flex items-center gap-3">
              <span className={studentBentoIconClass}>
                <Sparkles className="size-5" />
              </span>
              <div>
                <h3 className="text-base font-bold tracking-tight text-slate-900 dark:text-white">Recommended mentors</h3>
                <p className="text-xs text-slate-500 dark:text-neutral-400">Ranked on five criteria; full mentors are never suggested</p>
              </div>
            </div>
            <span className={studentBentoPillClass}>Top {matches.length}</span>
          </div>

          {!ready ? (
            <div className={`${studentBentoInsetClass} py-10 text-center text-sm text-slate-500 dark:text-neutral-500`}>
              Pick at least one skill, one language and one free time.
            </div>
          ) : (
            <ol className="space-y-3" data-testid="c4-matches">
              {matches.map((m, index) => (
                <li key={m.mentor.id} className={`${studentBentoInsetClass} p-4`}>
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-slate-900 dark:text-white">
                        {index + 1}. {m.mentor.name}
                      </p>
                      <p className="text-[11px] text-slate-500 dark:text-neutral-500">{m.mentor.headline}</p>
                    </div>
                    <span className="shrink-0 rounded-full bg-white px-2.5 py-1 text-xs font-semibold text-slate-800 shadow-sm ring-1 ring-slate-200/70 dark:bg-neutral-950 dark:text-neutral-200 dark:ring-white/10">
                      {pct(m.score)} fit
                    </span>
                  </div>
                  <div className="mt-3 grid grid-cols-5 gap-2">
                    {matchingModel.criteria.map((c) => (
                      <div key={c}>
                        <div className="h-1.5 overflow-hidden rounded-full bg-slate-200/80 dark:bg-neutral-800">
                          <div className="h-full rounded-full bg-primary" style={{ width: pct(m.criteria[c]) }} />
                        </div>
                        <p className="mt-1 truncate text-[10px] text-slate-500 dark:text-neutral-500">{CRITERION_LABEL[c]}</p>
                      </div>
                    ))}
                  </div>
                  <ul className="mt-3 space-y-1 text-xs text-slate-600 dark:text-neutral-400">
                    {m.reasons.map((reason) => (
                      <li key={reason} className="flex gap-2">
                        <span className="mt-1.5 h-1 w-1 shrink-0 rounded-full bg-slate-400 dark:bg-neutral-500" />
                        <span>{reason}</span>
                      </li>
                    ))}
                  </ul>
                </li>
              ))}
            </ol>
          )}
          <p className="mt-4 text-[11px] text-slate-400 dark:text-neutral-500">
            Demo mentors are fictional. {matchingModel.warning}
          </p>
        </section>
      </div>

      <section className={studentBentoTileClass} aria-label="How the matching was evaluated">
        <div className="mb-5 flex items-start justify-between gap-3">
          <div className="flex items-center gap-3">
            <span className={studentBentoIconClass}>
              <Scale className="size-5" />
            </span>
            <div>
              <h3 className="text-base font-bold tracking-tight text-slate-900 dark:text-white">Why multi-criteria matching</h3>
              <p className="text-xs text-slate-500 dark:text-neutral-400">
                Capacity-filtered ranking comparison on the synthetic cohort; assignment metrics below use {r.intake} students
              </p>
            </div>
          </div>
          <span className={studentBentoPillClass}>Synthetic</span>
        </div>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
          {[
            { label: "Capacity-filtered ranking quality (NDCG@5)", base: r.ndcgBaselineCapacityFiltered.toFixed(2), prop: r.ndcgProposed.toFixed(2) },
            { label: "Students beyond mentor capacity", base: String(r.overloadBaseline), prop: String(r.overloadProposed) },
            { label: "Workload imbalance (Gini)", base: r.giniBaseline.toFixed(2), prop: r.giniProposed.toFixed(2) }
          ].map((s) => (
            <div key={s.label} className={`${studentBentoInsetClass} px-4 py-3`}>
              <p className="text-[11px] font-medium text-slate-500 dark:text-neutral-400">{s.label}</p>
              <p className="mt-1 text-lg font-bold text-slate-900 dark:text-white">
                <span className="text-sm font-semibold text-slate-400 line-through decoration-1 dark:text-neutral-500">{s.base}</span>
                <span className="mx-1.5 text-sm text-slate-400">to</span>
                {s.prop}
              </p>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
