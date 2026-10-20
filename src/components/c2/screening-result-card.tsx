import { AlertTriangle, Activity } from "lucide-react";
import { Button } from "@/components/shared/Button";
import { scoreScale, type Answer } from "@/lib/c2/assessment";
import { secondaryText } from "./wellness-ui";

const STYLES: Record<string, { badge: string; bar: string }> = {
  Minimal: {
    badge: "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-200",
    bar: "bg-slate-500 dark:bg-slate-400",
  },
  Mild: {
    badge: "bg-teal-50 text-teal-800 dark:bg-teal-950 dark:text-teal-200",
    bar: "bg-teal-600 dark:bg-teal-400",
  },
  Moderate: {
    badge: "bg-amber-50 text-amber-900 dark:bg-amber-950 dark:text-amber-200",
    bar: "bg-amber-500 dark:bg-amber-400",
  },
  "Moderately severe": {
    badge:
      "bg-orange-50 text-orange-900 dark:bg-orange-950 dark:text-orange-200",
    bar: "bg-orange-600 dark:bg-orange-400",
  },
  Severe: {
    badge: "bg-rose-50 text-rose-900 dark:bg-rose-950 dark:text-rose-200",
    bar: "bg-rose-600 dark:bg-rose-400",
  },
};

export function ScreeningResultCard({
  kind,
  answers,
  onReview,
}: {
  kind: "phq9" | "gad7";
  answers: readonly Answer[];
  onReview: () => void;
}) {
  const score = scoreScale(kind, answers);
  const mood = kind === "phq9";
  const name = mood ? "PHQ-9" : "GAD-7";
  const label = mood ? "Depressive symptoms" : "Anxiety symptoms";
  const elevated = score.total !== null && score.total >= 10;
  const high = score.total !== null && score.total >= 15;
  const style = STYLES[score.band ?? "Minimal"];
  const ranges = mood
    ? [
        "0–4 Minimal",
        "5–9 Mild",
        "10–14 Moderate",
        "15–19 Moderately severe",
        "20–27 Severe",
      ]
    : ["0–4 Minimal", "5–9 Mild", "10–14 Moderate", "15–21 Severe"];
  const Icon = elevated ? AlertTriangle : Activity;

  return (
    <article
      aria-label={`${label} result`}
      className="flex flex-col rounded-2xl border border-slate-200 p-5 sm:p-6 dark:border-slate-700"
    >
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
            {name} · last 2 weeks
          </p>
          <h4 className="mt-2 text-lg font-semibold">{label}</h4>
        </div>
        <span className={`rounded-xl p-2.5 ${style.badge}`}>
          <Icon aria-hidden="true" className="h-5 w-5" />
        </span>
      </div>
      <div className="mt-5 flex flex-wrap items-end justify-between gap-3">
        <p className="text-4xl font-semibold tabular-nums">
          {score.total ?? "—"}
          <span className="ml-1 text-base font-normal text-slate-500 dark:text-slate-400">
            / {score.maximum}
          </span>
        </p>
        <p
          className={`rounded-full px-3 py-1.5 text-xs font-semibold ${style.badge}`}
        >
          {score.band
            ? `${score.band} symptom range`
            : "Incomplete questionnaire"}
        </p>
      </div>
      {score.total !== null ? (
        <>
          <div
            role="meter"
            aria-label={`${name} symptom score`}
            aria-valuemin={0}
            aria-valuemax={score.maximum}
            aria-valuenow={score.total}
            aria-valuetext={`${score.total} out of ${score.maximum}; ${score.band} symptom range`}
            className="mt-5 h-2.5 overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800"
          >
            <div
              className={`h-full rounded-full ${style.bar}`}
              style={{ width: `${(score.total / score.maximum) * 100}%` }}
            />
          </div>
          <div
            aria-hidden="true"
            className="mt-1.5 flex justify-between text-xs text-slate-500 dark:text-slate-400"
          >
            <span>0</span>
            <span>{score.maximum}</span>
          </div>
          <p className={`mt-4 ${secondaryText}`}>
            Your answers fall in the{" "}
            <strong>{score.band!.toLowerCase()}</strong> range for{" "}
            {mood ? "depressive" : "anxiety"} symptoms over the last two weeks.
            This is a screening result, not a diagnosis.
          </p>
          <div className={`mt-4 rounded-xl p-4 ${style.badge}`}>
            <h5 className="text-sm font-semibold">
              {high
                ? "Professional support is recommended"
                : elevated
                  ? "Consider a professional assessment"
                  : "Choose a manageable next step"}
            </h5>
            <p className="mt-2 text-sm leading-6">
              {high
                ? "Arrange a conversation with a qualified mental health professional to discuss these symptoms and how they affect daily life. Coping activities can support you while you seek help."
                : elevated
                  ? "A counselor or psychologist can help you understand these symptoms and discuss suitable support. You can also choose a coping activity that feels useful today."
                  : "Explore a practical activity if it feels helpful. You can speak with a professional at any score, especially if symptoms persist or affect daily life. A lower score does not rule out a concern."}
            </p>
          </div>
          <p className={`mt-4 ${secondaryText}`}>
            <strong>Something to try:</strong>{" "}
            {mood
              ? "Choose one small, meaningful activity or reach out to someone you trust. Your wellness plan offers guided steps you can adapt."
              : "Write down one worry, separate what you can act on, and choose one small next step. Your wellness plan offers a guided worry activity."}
          </p>
          <details className="mt-4 text-xs text-slate-500 dark:text-slate-400">
            <summary className="cursor-pointer font-medium focus-visible:outline-blue-500">
              How to read this scale
            </summary>
            <ul className="mt-2 space-y-1">
              {ranges.map((range) => (
                <li key={range}>{range}</li>
              ))}
            </ul>
            <p className="mt-2 leading-5">
              The bar shows points on this questionnaire, not the probability of
              an illness. These scores do not measure other mental health
              conditions or determine emergency urgency.
            </p>
            <a
              href={
                mood
                  ? "https://pmc.ncbi.nlm.nih.gov/articles/PMC1495268/"
                  : "https://doi.org/10.1001/archinte.166.10.1092"
              }
              target="_blank"
              rel="noreferrer"
              className="mt-2 inline-block font-medium text-blue-700 underline dark:text-blue-300"
            >
              Read the original {name} research
            </a>
          </details>
        </>
      ) : (
        <p className={`mt-4 ${secondaryText}`}>
          Answered {score.answered} of {mood ? 9 : 7}. Missing:{" "}
          {score.missing.join(", ")}. No total or band is calculated. You can
          review your answers or explore support now.
        </p>
      )}
      <div className="mt-auto pt-4">
        <Button variant="ghost" className="px-0" onClick={onReview}>
          Review {name} answers
        </Button>
      </div>
    </article>
  );
}
