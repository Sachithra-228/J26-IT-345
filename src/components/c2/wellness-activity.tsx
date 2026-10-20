"use client";
import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/shared/Button";
import { concerningDisclosure } from "@/lib/c2/assistant";
import {
  newLocalEntryId,
  type Activity,
  type ActivityCompletion,
} from "@/lib/c2/wellness-plan";
import { fieldClass, SafetySupport, secondaryText } from "./wellness-ui";

export function ActivityRating({
  label,
  value,
  onChange,
}: {
  label: string;
  value: number | null;
  onChange: (value: number | null) => void;
}) {
  return (
    <label className="block text-sm font-medium">
      {label}
      <select
        className={`${fieldClass} mt-2`}
        value={value ?? ""}
        onChange={(e) =>
          onChange(e.target.value ? Number(e.target.value) : null)
        }
      >
        <option value="">Prefer not to rate</option>
        <option value="1">1 · Very difficult</option>
        <option value="2">2 · Difficult</option>
        <option value="3">3 · In between</option>
        <option value="4">4 · Manageable</option>
        <option value="5">5 · Very manageable</option>
      </select>
    </label>
  );
}
export function WellnessActivity({
  activity,
  onComplete,
  onClose,
  onSupport,
}: {
  activity: Activity;
  onComplete: (value: ActivityCompletion) => void;
  onClose: () => void;
  onSupport: () => void;
}) {
  const [step, setStep] = useState(-1);
  const [notes, setNotes] = useState<string[]>(activity.steps.map(() => ""));
  const [before, setBefore] = useState<number | null>(null),
    [after, setAfter] = useState<number | null>(null);
  const finished = step === activity.steps.length;
  const current = activity.steps[step];
  const safety = notes.some(concerningDisclosure);
  const heading = useRef<HTMLHeadingElement>(null);
  useEffect(() => {
    heading.current?.focus({ preventScroll: true });
    heading.current?.scrollIntoView?.({ block: "start" });
  }, []);
  return (
    <section
      aria-label="Guided activity"
      className="rounded-3xl border border-blue-200 bg-blue-50/50 p-5 sm:p-7 dark:border-blue-800 dark:bg-blue-950/20"
    >
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-xs font-semibold uppercase tracking-widest text-blue-600 dark:text-blue-300">
          Your guided activity · about {activity.minutes} minutes
        </p>
        <Button variant="ghost" onClick={onClose}>
          Close activity
        </Button>
      </div>
      <h3
        ref={heading}
        className="mt-3 scroll-mt-28 text-2xl font-semibold"
        tabIndex={-1}
      >
        {activity.title}
      </h3>
      <p className={`mt-2 ${secondaryText}`}>
        These original planning prompts draw on the linked guidance and await
        professional review. You can leave any answer blank or stop. Your
        writing stays in this session.
      </p>
      <a
        href={activity.source.url}
        target="_blank"
        rel="noreferrer"
        className="mt-3 inline-block text-sm font-medium text-blue-700 underline dark:text-blue-300"
      >
        {activity.source.label}
      </a>
      {safety ? (
        <div className="mt-4">
          <SafetySupport />
          <Button className="mt-3" variant="secondary" onClick={onSupport}>
            Find human support
          </Button>
        </div>
      ) : null}
      <div className="mt-6" aria-live="polite">
        {step === -1 ? (
          <div className="space-y-4">
            <p className={secondaryText}>
              {activity.description} This is a planning aid, not treatment or a
              test.
            </p>
            <ActivityRating
              label="How manageable does this feel before you start? (optional)"
              value={before}
              onChange={setBefore}
            />
            <Button onClick={() => setStep(0)}>Start activity</Button>
          </div>
        ) : finished ? (
          <div className="space-y-4">
            <h4 className="text-lg font-semibold">Take a moment to review</h4>
            {notes.some(Boolean) ? (
              <dl className="space-y-3">
                {activity.steps.map((item, i) =>
                  notes[i] ? (
                    <div key={item.title}>
                      <dt className="text-sm text-slate-500 dark:text-slate-400">
                        {item.prompt}
                      </dt>
                      <dd className="mt-1 whitespace-pre-wrap break-words text-sm">
                        {notes[i]}
                      </dd>
                    </div>
                  ) : null,
                )}
              </dl>
            ) : (
              <p className={secondaryText}>
                You can finish without writing anything down.
              </p>
            )}
            <ActivityRating
              label="How manageable does this feel now? (optional)"
              value={after}
              onChange={setAfter}
            />
            <p className="text-xs text-slate-500 dark:text-slate-400">
              These optional ratings describe this moment. They do not measure
              treatment benefit or change your screening scores.
            </p>
            <div className="flex flex-wrap gap-3">
              <Button variant="secondary" onClick={() => setStep(step - 1)}>
                Back a step
              </Button>
              <Button
                onClick={() =>
                  onComplete({
                    id: newLocalEntryId(),
                    activityId: activity.id,
                    completedAt: new Date().toISOString(),
                    before,
                    after,
                  })
                }
              >
                Finish activity
              </Button>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            <p className="text-xs font-medium text-blue-700 dark:text-blue-300">
              Step {step + 1} of {activity.steps.length}
            </p>
            <h4 className="text-lg font-semibold">{current.title}</h4>
            <p className={secondaryText}>{current.body}</p>
            <label className="block text-sm font-medium">
              {current.prompt}
              <span className="font-normal text-slate-500"> · optional</span>
              <textarea
                className={`${fieldClass} mt-2`}
                rows={3}
                maxLength={500}
                value={notes[step]}
                onChange={(e) =>
                  setNotes((previous) =>
                    previous.map((value, index) =>
                      index === step ? e.target.value : value,
                    ),
                  )
                }
              />
            </label>
            <div className="flex flex-wrap gap-3">
              <Button variant="secondary" onClick={() => setStep(step - 1)}>
                Back a step
              </Button>
              <Button onClick={() => setStep(step + 1)}>Next step</Button>
            </div>
          </div>
        )}
      </div>
    </section>
  );
}
