"use client";
import { CONCERNS } from "@/lib/c2/assessment";
import { SUPPORT_LABELS, type SupportEstimate } from "@/lib/c2/support-runtime";
import { panel, secondaryText } from "./wellness-ui";

export function SupportEstimateCard({ estimate }: { estimate: SupportEstimate }) {
  return <section className={panel} aria-label="Trained support model result">
    <p className="text-xs font-semibold uppercase tracking-widest text-blue-600 dark:text-blue-300">Trained questionnaire & context model</p>
    <h3 className="mt-3 text-xl font-semibold">{estimate.status === "safety" ? "Use the direct support pathway" : estimate.status === "incomplete" ? "Complete questionnaires needed for a model estimate" : estimate.uncertain ? "The model is uncertain" : SUPPORT_LABELS[estimate.category!]}</h3>
    <p className={`mt-3 ${secondaryText}`}>Research estimate trained on synthetic cases and simulated labels. It is not a diagnosis, medical advice or a verified assessment of urgency. You can choose professional support regardless of this estimate.</p>
    {estimate.status === "safety" ? <p className={`mt-3 ${secondaryText}`}>A reported safety concern takes precedence. No model category or scores are shown; the model does not assess whether you are safe.</p> : null}
    {estimate.status === "incomplete" ? <p className={`mt-3 ${secondaryText}`}>An unanswered item is not treated as a healthy response. Review the missing answers or access support now.</p> : null}
    {estimate.status === "ready" ? <>
      <div className="mt-5 grid gap-3 sm:grid-cols-3">{estimate.scores.map((item) => <div key={item.category} className="rounded-2xl bg-slate-50 p-4 dark:bg-slate-950"><p className="text-xs leading-5">{SUPPORT_LABELS[item.category]}</p><p className="mt-2 text-xl font-semibold tabular-nums">{item.score.toFixed(3)}</p></div>)}</div>
      <p className="mt-3 text-xs leading-5 text-slate-500 dark:text-slate-400">Model class scores, not calibrated clinical probabilities. An uncertain result offers human review rather than a forced category.</p>
      <h4 className="mt-5 text-sm font-semibold">Context supplied to the model</h4>
      {estimate.observations?.length ? <ul className="mt-2 list-inside list-disc text-xs leading-6 text-slate-500 dark:text-slate-400">{estimate.observations.map((line) => <li key={line}>{line}</li>)}</ul> : <p className={`mt-2 ${secondaryText}`}>No optional context answers were supplied. Missing inputs remain explicitly marked.</p>}
      <h4 className="mt-5 text-sm font-semibold">Topics to explore</h4>
      <div className="mt-3 flex flex-wrap gap-2">{estimate.topics.slice(0, 3).map((item) => <span key={item.topic} className="rounded-full bg-blue-50 px-3 py-2 text-xs text-blue-700 dark:bg-blue-950 dark:text-blue-200">{CONCERNS[item.topic].label} · {item.score.toFixed(2)}</span>)}</div>
    </> : null}
    <p className="mt-4 break-all font-mono text-xs text-slate-500 dark:text-slate-400">{estimate.version}</p>
  </section>;
}
