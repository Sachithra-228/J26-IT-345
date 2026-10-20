"use client";
import { useState } from "react";
import { CheckCircle2, Clock3, ArrowRight } from "lucide-react";
import { Button } from "@/components/shared/Button";
import { selfHarmResponse, type Assessment } from "@/lib/c2/assessment";
import {
  ACTIVITIES,
  activityById,
  createWellnessPlan,
  type ActivityCompletion,
} from "@/lib/c2/wellness-plan";
import { WellnessActivity } from "./wellness-activity";
import { panel, SafetySupport, secondaryText } from "./wellness-ui";

export function WellnessPlan({
  assessment,
  completions,
  onComplete,
  onSupport,
  onCommunity,
  onProgress,
  onSummary,
}: {
  assessment: Assessment | null;
  completions: ActivityCompletion[];
  onComplete: (value: ActivityCompletion) => void;
  onSupport: () => void;
  onCommunity: () => void;
  onProgress: () => void;
  onSummary: () => void;
}) {
  const [plan, setPlan] = useState(() => createWellnessPlan(assessment));
  const [active, setActive] = useState<string | null>(null),
    [notice, setNotice] = useState("");
  const activity = active ? activityById(active) : undefined;
  return (
    <div className="space-y-5">
      <section
        className={`${panel} bg-gradient-to-br from-white to-blue-50/60 dark:from-slate-900 dark:to-blue-950/20`}
      >
        <p className="text-xs font-semibold uppercase tracking-widest text-blue-600 dark:text-blue-300">
          Small steps, chosen by you
        </p>
        <h3 className="mt-3 text-2xl font-semibold">Your wellness plan</h3>
        <p className={`mt-3 ${secondaryText}`}>
          {assessment
            ? "Your confirmed topics and follow-up answers suggest a starting point. Keep the ideas that feel useful, or choose something different."
            : "You can start here without an assessment. Choose a practical activity that fits today."}
        </p>
        {assessment?.context.goal ? (
          <p className="mt-3 text-sm font-medium">
            Your preferred next step: {assessment.context.goal}.
          </p>
        ) : null}
        <p className="mt-2 text-xs text-slate-500 dark:text-slate-400">
          General wellbeing ideas you can change. You can skip an activity or
          choose professional support at any time.
        </p>
        <div className="mt-5 flex flex-wrap gap-3">
          <Button
            variant={
              assessment?.context.goal === "Talk to a professional"
                ? "primary"
                : "secondary"
            }
            onClick={onSupport}
          >
            Find a professional
          </Button>
          <Button variant="secondary" onClick={onSummary}>
            Prepare my appointment
          </Button>
          <Button variant="secondary" onClick={onCommunity}>
            Explore community
          </Button>
        </div>
      </section>
      {assessment && selfHarmResponse(assessment.phq9) === "reported" ? (
        <SafetySupport reported />
      ) : null}
      {notice ? (
        <p
          role="status"
          className="text-sm font-medium text-blue-700 dark:text-blue-300"
        >
          {notice}
        </p>
      ) : null}
      <div className="grid gap-4 lg:grid-cols-3">
        {plan.map((item, index) => {
          const option = activityById(item.activityId)!;
          const completed = completions.some(
            (entry) => entry.activityId === option.id,
          );
          return (
            <article
              key={index}
              className={`${panel} flex flex-col`}
              aria-label={`Plan action ${index + 1}`}
            >
              <div className="flex items-center justify-between gap-2">
                <span className="text-xs font-semibold text-blue-600 dark:text-blue-300">
                  STEP {index + 1}
                </span>
                <span className="flex items-center gap-1 text-xs text-slate-500 dark:text-slate-400">
                  <Clock3 className="h-3.5 w-3.5" aria-hidden="true" />
                  {option.minutes} min
                </span>
              </div>
              <h4 className="mt-4 text-lg font-semibold">{option.title}</h4>
              <p className={`mt-2 ${secondaryText}`}>{option.description}</p>
              <p className="mt-3 text-xs leading-5 text-slate-500 dark:text-slate-400">
                Why this idea: {item.reason}
              </p>
              {completed ? (
                <p className="mt-3 flex items-center gap-2 text-sm font-medium text-emerald-700 dark:text-emerald-300">
                  <CheckCircle2 className="h-4 w-4" aria-hidden="true" />
                  Completed in this session
                </p>
              ) : null}
              <div className="mt-auto pt-5">
                <Button
                  className="w-full"
                  onClick={() => {
                    setActive(option.id);
                    setNotice("");
                  }}
                >
                  {completed ? "Try again" : "Explore activity"}
                  <ArrowRight
                    className="ml-2 inline h-4 w-4"
                    aria-hidden="true"
                  />
                </Button>
                <label className="mt-4 block text-xs font-medium">
                  Choose an activity for step {index + 1}
                  <select
                    className="mt-2 w-full rounded-xl border border-slate-300 bg-white px-2 py-2 text-sm dark:border-slate-600 dark:bg-slate-950"
                    value={option.id}
                    onChange={(event) => {
                      setPlan((previous) =>
                        previous.map((entry, i) =>
                          i === index
                            ? {
                                activityId: event.target.value,
                                reason:
                                  "You chose this activity for your plan.",
                              }
                            : entry,
                        ),
                      );
                      setNotice("Your plan has been updated.");
                    }}
                  >
                    {ACTIVITIES.map((candidate) => (
                      <option
                        key={candidate.id}
                        value={candidate.id}
                        disabled={
                          candidate.id !== option.id &&
                          plan.some(
                            (entry) => entry.activityId === candidate.id,
                          )
                        }
                      >
                        {candidate.title}
                      </option>
                    ))}
                  </select>
                </label>
              </div>
            </article>
          );
        })}
      </div>
      {activity ? (
        <WellnessActivity
          key={activity.id}
          activity={activity}
          onSupport={onSupport}
          onClose={() => setActive(null)}
          onComplete={(value) => {
            onComplete(value);
            setActive(null);
            setNotice(
              "Activity completed. Your writing remains private to this session; save only a completion record in Progress if you choose.",
            );
          }}
        />
      ) : null}
      <section
        className={`${panel} flex flex-wrap items-center justify-between gap-4`}
      >
        <div>
          <h4 className="font-semibold">Notice what works for you</h4>
          <p className={`mt-1 ${secondaryText}`}>
            Choose whether to keep a mood entry, screening summary or activity
            completion on this browser.
          </p>
        </div>
        <Button variant="secondary" onClick={onProgress}>
          Open my progress
        </Button>
      </section>
    </div>
  );
}
