"use client";
import { useState } from "react";
import { LockKeyhole, Trash2 } from "lucide-react";
import { Button } from "@/components/shared/Button";
import { type Assessment } from "@/lib/c2/assessment";
import {
  activityEntry,
  appendProgress,
  loadProgress,
  PROGRESS_KEY,
  removeProgress,
  screeningEntry,
  type ProgressEntry,
} from "@/lib/c2/progress";
import {
  newLocalEntryId,
  activityById,
  type ActivityCompletion,
} from "@/lib/c2/wellness-plan";
import { fieldClass, panel, secondaryText } from "./wellness-ui";

const MOOD_LABELS = ["Very low", "Low", "Mixed", "Okay", "Good"];
function timestamp(value: string) {
  return new Date(value).toLocaleString("en-GB", {
    dateStyle: "medium",
    timeStyle: "short",
  });
}
function entryDescription(entry: ProgressEntry) {
  if (entry.kind === "mood")
    return `Mood: ${MOOD_LABELS[entry.value - 1]} (${entry.value}/5)`;
  if (entry.kind === "screening")
    return `Screening · PHQ-9 ${entry.phq9 === null ? "incomplete" : `${entry.phq9}/27`} · GAD-7 ${entry.gad7 === null ? "incomplete" : `${entry.gad7}/21`}`;
  return `Activity: ${activityById(entry.activityId)!.title}`;
}
export function WellnessProgress({
  assessment,
  completions,
}: {
  assessment: Assessment | null;
  completions: ActivityCompletion[];
}) {
  const [acknowledged, setAcknowledged] = useState(false),
    [opened, setOpened] = useState(false);
  const [entries, setEntries] = useState<ProgressEntry[]>([]),
    [mood, setMood] = useState("");
  const [message, setMessage] = useState(""),
    [error, setError] = useState("");
  function open() {
    try {
      const saved = loadProgress(window.localStorage);
      setEntries(saved.entries);
      setOpened(true);
      setError("");
      setMessage(
        "Device history is open. Nothing is saved until you choose a Save button.",
      );
    } catch {
      setError(
        "Saved progress could not be opened. Storage may be blocked or the saved format may be invalid. You can continue without saving, or delete this browser’s wellness history below.",
      );
    }
  }
  function save(entry: ProgressEntry) {
    if (!opened) return;
    try {
      const next = appendProgress(window.localStorage, entry);
      setEntries(next.entries);
      setError("");
      setMessage(
        "Saved on this browser. Nothing was sent to your account or staff.",
      );
    } catch {
      setMessage("");
      setError(
        "Could not save on this browser. Your session is still available; no saved copy was confirmed.",
      );
    }
  }
  function remove(id?: string) {
    try {
      if (id) setEntries(removeProgress(window.localStorage, id).entries);
      else {
        window.localStorage.removeItem(PROGRESS_KEY);
        setEntries([]);
      }
      setError("");
      setMessage(
        id
          ? "Saved entry deleted."
          : "All saved wellness history on this browser has been deleted.",
      );
    } catch {
      setMessage("");
      setError(
        "The saved history could not be deleted. Check your browser’s storage settings.",
      );
    }
  }
  const moods = entries
    .filter(
      (entry): entry is ProgressEntry & { kind: "mood" } =>
        entry.kind === "mood",
    )
    .sort((a, b) => Date.parse(a.at) - Date.parse(b.at))
    .slice(-14);
  const points = moods
    .map(
      (entry, i) =>
        `${moods.length === 1 ? 180 : 30 + (i * 300) / (moods.length - 1)},${145 - (entry.value - 1) * 30}`,
    )
    .join(" ");
  return (
    <div className="space-y-5">
      <section className={panel}>
        <p className="flex items-center gap-2 text-xs font-semibold uppercase tracking-widest text-blue-600 dark:text-blue-300">
          <LockKeyhole className="h-4 w-4" aria-hidden="true" />
          Your choice to keep
        </p>
        <h3 className="mt-3 text-2xl font-semibold">
          Your progress, at your pace
        </h3>
        <p className={`mt-3 ${secondaryText}`}>
          Keep selected mood ratings, screening summaries and completed
          activities on this browser. Activity writing, journal text, chat
          messages and individual questionnaire answers are never included.
        </p>
        <p className="mt-3 rounded-2xl bg-amber-50 p-4 text-sm leading-6 text-amber-900 dark:bg-amber-950 dark:text-amber-100">
          This is device storage, not a private account vault. Anyone using this
          browser profile could open these entries. They remain after refresh or
          sign-out until you delete them. Use session-only mode on a shared
          device.
        </p>
        {!opened ? (
          <div className="mt-5 space-y-4">
            <label className="flex items-start gap-3 text-sm">
              <input
                type="checkbox"
                className="mt-1"
                checked={acknowledged}
                onChange={(e) => setAcknowledged(e.target.checked)}
              />
              <span>
                I understand who can see saved device history and want to open
                it.
              </span>
            </label>
            <Button disabled={!acknowledged} onClick={open}>
              Open my device history
            </Button>
          </div>
        ) : (
          <Button
            className="mt-4"
            variant="secondary"
            onClick={() => {
              setOpened(false);
              setEntries([]);
              setAcknowledged(false);
              setMessage(
                "Device history is closed. Saved entries remain until you delete them.",
              );
            }}
          >
            Close device history
          </Button>
        )}
        {message ? (
          <p
            role="status"
            className="mt-4 text-sm text-blue-700 dark:text-blue-300"
          >
            {message}
          </p>
        ) : null}
        {error ? (
          <p
            role="alert"
            className="mt-4 text-sm text-rose-700 dark:text-rose-300"
          >
            {error}
          </p>
        ) : null}
        {error && !opened && acknowledged ? (
          <Button className="mt-3" variant="secondary" onClick={() => remove()}>
            Delete unreadable wellness history
          </Button>
        ) : null}
      </section>
      {opened ? (
        <>
          <div className="grid gap-5 lg:grid-cols-2">
            <section className={panel}>
              <h4 className="font-semibold">A brief mood check-in</h4>
              <p className={`mt-2 ${secondaryText}`}>
                A personal rating of today, separate from your screening scores.
              </p>
              <label className="mt-4 block text-sm font-medium">
                How does your mood feel right now?
                <select
                  className={`${fieldClass} mt-2`}
                  value={mood}
                  onChange={(e) => setMood(e.target.value)}
                >
                  <option value="">Choose a rating</option>
                  {MOOD_LABELS.map((label, i) => (
                    <option key={label} value={i + 1}>
                      {i + 1} · {label}
                    </option>
                  ))}
                </select>
              </label>
              <Button
                className="mt-4"
                disabled={!mood}
                onClick={() => {
                  save({
                    id: newLocalEntryId(),
                    kind: "mood",
                    at: new Date().toISOString(),
                    value: Number(mood),
                  });
                }}
              >
                Save this mood rating
              </Button>
            </section>
            <section className={panel}>
              <h4 className="font-semibold">
                Save your current screening summary
              </h4>
              <p className={`mt-2 ${secondaryText}`}>
                Keeps only the date, totals, confirmed topics and version
                identifiers. No description or individual answers.
              </p>
              {assessment ? (
                <Button
                  className="mt-4"
                  disabled={entries.some(
                    (entry) =>
                      entry.id === `screening-${assessment.completedAt}`,
                  )}
                  onClick={() => save(screeningEntry(assessment))}
                >
                  {entries.some(
                    (entry) =>
                      entry.id === `screening-${assessment.completedAt}`,
                  )
                    ? "Screening summary saved"
                    : "Save current screening summary"}
                </Button>
              ) : (
                <p className="mt-4 text-sm text-slate-500 dark:text-slate-400">
                  Complete a check-in when you choose. There is no screening
                  summary to save yet.
                </p>
              )}
              <p className="mt-4 text-xs leading-5 text-slate-500 dark:text-slate-400">
                PHQ-9 and GAD-7 refer to the last two weeks. Close-together
                assessments overlap; changes alone do not establish recovery or
                treatment benefit.
              </p>
            </section>
          </div>
          {completions.length ? (
            <section className={panel}>
              <h4 className="font-semibold">
                Activities completed in this session
              </h4>
              <p className={`mt-2 ${secondaryText}`}>
                Save the activity name, date and optional before/after ratings.
                Your activity writing stays out of history.
              </p>
              <ul className="mt-4 space-y-3">
                {completions.map((entry) => (
                  <li
                    key={entry.id}
                    className="flex flex-wrap items-center justify-between gap-3 rounded-2xl bg-slate-50 p-4 dark:bg-slate-950"
                  >
                    <span className="text-sm">
                      {activityById(entry.activityId)!.title}
                      <span className="mt-1 block text-xs text-slate-500 dark:text-slate-400">
                        {timestamp(entry.completedAt)}
                      </span>
                    </span>
                    <Button
                      variant="secondary"
                      disabled={entries.some((saved) => saved.id === entry.id)}
                      onClick={() => save(activityEntry(entry))}
                    >
                      {entries.some((saved) => saved.id === entry.id)
                        ? "Activity saved"
                        : "Save activity completion"}
                    </Button>
                  </li>
                ))}
              </ul>
            </section>
          ) : null}
          <section className={panel}>
            <h4 className="font-semibold">Your mood entries</h4>
            <p className={`mt-2 ${secondaryText}`}>
              Up to 14 recent entries, ordered by time. Each point is a personal
              rating, not a clinical scale.
            </p>
            {moods.length ? (
              <figure className="mt-4">
                <svg
                  viewBox="0 0 360 180"
                  role="img"
                  aria-label="Mood ratings over time, from 1 very low to 5 good"
                  className="h-52 w-full"
                >
                  <title>Recent personal mood ratings</title>
                  {[1, 2, 3, 4, 5].map((value) => (
                    <g key={value}>
                      <line
                        x1="30"
                        x2="330"
                        y1={145 - (value - 1) * 30}
                        y2={145 - (value - 1) * 30}
                        className="stroke-slate-200 dark:stroke-slate-700"
                      />
                      <text
                        x="8"
                        y={149 - (value - 1) * 30}
                        className="fill-slate-500 text-[10px]"
                      >
                        {value}
                      </text>
                    </g>
                  ))}
                  <polyline
                    points={points}
                    fill="none"
                    stroke="#2563eb"
                    strokeWidth="2"
                  />
                  {moods.map((entry, index) => (
                    <circle
                      key={entry.id}
                      cx={
                        moods.length === 1
                          ? 180
                          : 30 + (index * 300) / (moods.length - 1)
                      }
                      cy={145 - (entry.value - 1) * 30}
                      r="4"
                      fill="#2563eb"
                    >
                      <title>
                        {timestamp(entry.at)}: {MOOD_LABELS[entry.value - 1]}
                      </title>
                    </circle>
                  ))}
                  <text x="30" y="173" className="fill-slate-500 text-[10px]">
                    Earlier
                  </text>
                  <text x="295" y="173" className="fill-slate-500 text-[10px]">
                    Latest
                  </text>
                </svg>
                <figcaption className="text-xs text-slate-500 dark:text-slate-400">
                  Full dates and values are available in the saved-entry list
                  below.
                </figcaption>
              </figure>
            ) : (
              <p className="mt-5 text-sm text-slate-500 dark:text-slate-400">
                No saved mood ratings yet. Your history starts with what you
                choose to save.
              </p>
            )}
          </section>
          <section className={panel}>
            <div className="flex flex-wrap items-center justify-between gap-3">
              <h4 className="font-semibold">
                Saved on this browser · {entries.length} entries
              </h4>
              {entries.length ? (
                <Button variant="secondary" onClick={() => remove()}>
                  Delete all saved wellness history
                </Button>
              ) : null}
            </div>
            <p className="mt-2 text-xs text-slate-500 dark:text-slate-400">
              Up to 100 entries are kept. Saving a newer entry beyond that
              replaces the oldest stored entry.
            </p>
            <ul className="mt-4 divide-y divide-slate-100 dark:divide-slate-800">
              {[...entries].reverse().map((entry) => (
                <li
                  key={entry.id}
                  className="flex items-start justify-between gap-4 py-4"
                >
                  <div>
                    <p className="text-sm font-medium">
                      {entryDescription(entry)}
                    </p>
                    <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                      {timestamp(entry.at)}
                    </p>
                    {entry.kind === "activity" ? (
                      <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                        Manageability before: {entry.before ?? "not rated"} ·
                        after: {entry.after ?? "not rated"}
                      </p>
                    ) : null}
                  </div>
                  <Button
                    variant="ghost"
                    aria-label={`Delete saved entry ${entry.id}`}
                    onClick={() => remove(entry.id)}
                  >
                    <Trash2 className="h-4 w-4" aria-hidden="true" />
                  </Button>
                </li>
              ))}
            </ul>
          </section>
        </>
      ) : null}
    </div>
  );
}
