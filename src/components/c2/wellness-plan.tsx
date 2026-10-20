"use client";
import { useState } from "react";
import { CheckCircle2, Clock3, ArrowRight } from "lucide-react";
import { Button } from "@/components/shared/Button";
import {
  selfHarmResponse,
  assessmentSafetySupport,
  type Assessment,
} from "@/lib/c2/assessment";
import {
  ACTIVITIES,
  activityById,
  createWellnessPlan,
  recommendWellnessActivities,
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
  const suggested = createWellnessPlan(assessment);
  const recommendations = recommendWellnessActivities(assessment);
  const signature = JSON.stringify([
    assessment?.completedAt,
    suggested,
    recommendations.map((item) => [item.activityId, item.priority]),
  ]);
  const [selection, setSelection] = useState<{
    signature: string;
    choices: Record<number, string>;
  }>({ signature, choices: {} });
  const choices = selection.signature === signature ? selection.choices : {};
  const plan = suggested.map((item, index) =>
    choices[index]
      ? {
          activityId: choices[index],
          reason: "You chose this activity for your plan.",
          basis: "chosen" as const,
        }
      : item,
  );
  const [active, setActive] = useState<{
    signature: string;
    id: string;
  } | null>(null);
  const [feedback, setFeedback] = useState({ signature, text: "" });
  const setNotice = (text: string) => setFeedback({ signature, text });
  const notice = feedback.signature === signature ? feedback.text : "";
  const activity =
    active?.signature === signature ? activityById(active.id) : undefined;
  const usesModel = recommendations.some(
    (item) => item.basis === "model-topics",
  );
  const preferred = assessment?.context.goal;
  const first = activityById(plan[0].activityId)!;
  const startFirst = () => {
    setActive({ signature, id: first.id });
    setNotice("");
  };
  const incomplete =
    assessment &&
    (assessment.phq9.length !== 9 ||
      assessment.gad7.length !== 7 ||
      assessment.phq9.includes(null) ||
      assessment.gad7.includes(null));
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
            ? usesModel
              ? "Your confirmed DistilBERT topics and follow-up answers help prioritise these suggestions. Keep the ideas that feel useful, or choose something different."
              : "Your chosen topics and follow-up answers suggest a starting point. You can use this plan without text analysis."
            : "You can start here without an assessment. Choose a practical activity that fits today."}
        </p>
        {incomplete ? (
          <p className="mt-3 text-sm text-slate-600 dark:text-slate-300">
            Some screening answers are still open. Your plan can use the topics
            and context you provided, but a complete screening result is
            unavailable.
          </p>
        ) : null}
        {assessment?.context.goal ? (
          <p className="mt-3 text-sm font-medium">
            Your preferred next step: {assessment.context.goal}.
          </p>
        ) : null}
        <p className="mt-2 text-xs text-slate-500 dark:text-slate-400">
          General wellbeing ideas you can change. You can skip an activity or
          choose professional support at any time.
        </p>
        <div
          className="mt-5 border-t border-blue-100 pt-4 dark:border-slate-700"
          role="region"
          aria-label="Suggested next step"
        >
          <p className="text-xs font-semibold uppercase tracking-widest text-blue-600 dark:text-blue-300">
            Suggested next step
          </p>
          <p className="mt-2 font-semibold">
            {preferred === "Talk to a professional"
              ? "Make room for a professional conversation"
              : preferred === "Connect with other students"
                ? "Explore a student discussion"
                : first.title}
          </p>
          <p className={`mt-2 ${secondaryText}`}>
            {preferred === "Talk to a professional" ||
            preferred === "Connect with other students"
              ? "This follows the next step you asked for. Activities remain optional below."
              : plan[0].reason}
          </p>
          <Button
            className="mt-3"
            onClick={
              preferred === "Talk to a professional"
                ? onSupport
                : preferred === "Connect with other students"
                  ? onCommunity
                  : startFirst
            }
          >
            {preferred === "Talk to a professional"
              ? "Explore professional support"
              : preferred === "Connect with other students"
                ? "Browse student discussions"
                : plan[0].basis === "chosen"
                  ? "Start chosen activity"
                  : "Start suggested activity"}
            <ArrowRight className="ml-2 inline h-4 w-4" aria-hidden="true" />
          </Button>
        </div>
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
        <details className="mt-4 text-xs leading-5 text-slate-600 dark:text-slate-300">
          <summary className="cursor-pointer font-medium">
            How your plan was suggested
          </summary>
          <p className="mt-2">
            {usesModel
              ? "DistilBERT helps order only topics you confirmed. "
              : "These suggestions use your choices, without relying on a text-model prediction. "}
            Your follow-up answers refine the selection from a prepared activity
            library. This is not a trained treatment recommender, and topic
            scores are not illness probabilities. Your questionnaire scores stay
            separate.
          </p>
        </details>
        {Object.keys(choices).length ? (
          <Button
            className="mt-3"
            variant="secondary"
            onClick={() => {
              setSelection({ signature, choices: {} });
              setActive(null);
              setNotice("Your suggested plan has been restored.");
            }}
          >
            Restore suggested plan
          </Button>
        ) : null}
      </section>
      {assessment && assessmentSafetySupport(assessment) ? (
        <SafetySupport
          reported={selfHarmResponse(assessment.phq9) === "reported"}
        />
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
                  {index === 0 ? "FIRST OPTION" : `OPTION ${index + 1}`}
                </span>
                <span className="flex items-center gap-1 text-xs text-slate-500 dark:text-slate-400">
                  <Clock3 className="h-3.5 w-3.5" aria-hidden="true" />
                  {option.minutes} min
                </span>
              </div>
              <h4 className="mt-4 text-lg font-semibold">{option.title}</h4>
              <p className="mt-2 text-xs font-medium text-blue-700 dark:text-blue-300">
                {item.basis === "model-topics"
                  ? "DistilBERT-informed suggestion"
                  : item.basis === "answers"
                    ? "From your follow-up answers"
                    : item.basis === "chosen"
                      ? "Chosen by you"
                      : item.basis === "topics"
                        ? "From your support topics"
                        : "Another option you can choose"}
              </p>
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
                    setActive({ signature, id: option.id });
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
                      const id = event.target.value;
                      if (
                        !activityById(id) ||
                        plan.some(
                          (entry, i) => i !== index && entry.activityId === id,
                        )
                      )
                        return;
                      setSelection({
                        signature,
                        choices: { ...choices, [index]: id },
                      });
                      setActive(null);
                      setNotice("Your plan has been updated.");
                    }}
                  >
                    {[
                      {
                        label: "Suggested for your topics",
                        activities: recommendations.map(
                          (item) => activityById(item.activityId)!,
                        ),
                      },
                      {
                        label: "More activities",
                        activities: ACTIVITIES.filter(
                          (item) =>
                            !recommendations.some(
                              (candidate) => candidate.activityId === item.id,
                            ),
                        ),
                      },
                    ]
                      .filter((group) => group.activities.length)
                      .map((group) => (
                        <optgroup key={group.label} label={group.label}>
                          {group.activities.map((candidate) => (
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
                        </optgroup>
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
