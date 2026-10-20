"use client";
import { useState } from "react";
import { Button } from "@/components/shared/Button";
import {
  assessmentConcerns,
  CONCERNS,
  scoreScale,
  type Assessment,
} from "@/lib/c2/assessment";
import { concerningDisclosure } from "@/lib/c2/assistant";
import { fieldClass, panel, SafetySupport, secondaryText } from "./wellness-ui";

export function AppointmentSummary({
  assessment,
  onSupport,
}: {
  assessment: Assessment | null;
  onSupport: () => void;
}) {
  const [includeScores, setIncludeScores] = useState(false),
    [includeTopics, setIncludeTopics] = useState(false);
  const [selected, setSelected] = useState<string[]>([]),
    [goal, setGoal] = useState(""),
    [questions, setQuestions] = useState(""),
    [message, setMessage] = useState("");
  const topics = assessmentConcerns(assessment);
  const lines: string[] = [];
  if (goal.trim()) lines.push("What I would like help with:", goal.trim(), "");
  if (questions.trim())
    lines.push("Questions I would like to ask:", questions.trim(), "");
  if (assessment && includeScores) {
    lines.push(
      `Check-in date: ${new Date(assessment.completedAt).toLocaleDateString("en-GB")}`,
    );
    for (const kind of ["phq9", "gad7"] as const) {
      const score = scoreScale(kind, assessment[kind]);
      lines.push(
        `${kind === "phq9" ? "PHQ-9" : "GAD-7"}: ${score.total === null ? "incomplete; no total or range calculated" : `${score.total}/${score.maximum}, ${score.band!.toLowerCase()} symptom range`}.`,
      );
    }
    lines.push(
      "Questionnaires describe the last two weeks; these are screening results, not diagnoses.",
      "",
    );
  }
  if (includeTopics && topics.length)
    lines.push(
      "Topics I chose:",
      topics.map((topic) => CONCERNS[topic].label).join(", "),
      "",
    );
  for (const question of assessment?.questionPath ?? [])
    if (selected.includes(question.id) && assessment?.context[question.id])
      lines.push(
        question.text ?? question.id,
        assessment.context[question.id],
        "",
      );
  const content = lines.join("\n").trim();
  const preview = content
    ? `MY APPOINTMENT NOTES\n\n${content}\n\nPrepared by the student using UniCare Connect. This document has not been sent to anyone and is not a professional assessment.`
    : "Choose what to include or write a note. Nothing is selected automatically.";
  function download() {
    try {
      const url = URL.createObjectURL(
        new Blob([preview], { type: "text/plain;charset=utf-8" }),
      );
      const link = document.createElement("a");
      link.href = url;
      link.download = "my-unicare-appointment-notes.txt";
      document.body.appendChild(link);
      link.click();
      link.remove();
      setTimeout(() => URL.revokeObjectURL(url), 1000);
      setMessage(
        "Your download was requested. Keep the file somewhere private; it may remain in this device’s Downloads folder. Nothing was sent to a professional.",
      );
    } catch {
      setMessage(
        "The file could not be downloaded. You can select and copy the preview instead.",
      );
    }
  }
  return (
    <section className={panel} aria-label="Appointment preparation">
      <p className="text-xs font-semibold uppercase tracking-widest text-blue-600 dark:text-blue-300">
        Prepare for a human conversation
      </p>
      <h3 className="mt-3 text-2xl font-semibold">
        Your appointment, your words
      </h3>
      <p className={`mt-3 ${secondaryText}`}>
        Choose what you would like to take to an appointment. Review the exact
        preview before downloading. These notes are separate from booking and
        are never attached or sent automatically.
      </p>
      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        <div className="space-y-5">
          <label className="block text-sm font-medium">
            What would you like help with?
            <textarea
              className={`${fieldClass} mt-2`}
              rows={3}
              maxLength={1200}
              value={goal}
              onChange={(e) => setGoal(e.target.value)}
            />
          </label>
          <label className="block text-sm font-medium">
            What would you like to ask the professional?
            <textarea
              className={`${fieldClass} mt-2`}
              rows={3}
              maxLength={1200}
              placeholder="For example: What can I expect from a first session?"
              value={questions}
              onChange={(e) => setQuestions(e.target.value)}
            />
          </label>
          {assessment ? (
            <fieldset className="space-y-3">
              <legend className="mb-3 text-sm font-semibold">
                Include from this check-in
              </legend>
              <label className="flex items-start gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={includeScores}
                  onChange={(e) => setIncludeScores(e.target.checked)}
                />
                Screening date, PHQ-9/GAD-7 totals and symptom ranges
              </label>
              {topics.length ? (
                <label className="flex items-start gap-2 text-sm">
                  <input
                    type="checkbox"
                    checked={includeTopics}
                    onChange={(e) => setIncludeTopics(e.target.checked)}
                  />
                  My confirmed support topics
                </label>
              ) : null}
              {(assessment.questionPath ?? [])
                .filter((item) => assessment.context[item.id])
                .map((item) => (
                  <label
                    key={item.id}
                    className="flex items-start gap-2 text-sm"
                  >
                    <input
                      type="checkbox"
                      checked={selected.includes(item.id)}
                      onChange={(e) =>
                        setSelected((previous) =>
                          e.target.checked
                            ? [...previous, item.id]
                            : previous.filter((id) => id !== item.id),
                        )
                      }
                    />
                    <span>
                      {item.text ?? item.id}
                      <span className="mt-1 block text-xs text-slate-500 dark:text-slate-400">
                        {assessment.context[item.id]}
                      </span>
                    </span>
                  </label>
                ))}
            </fieldset>
          ) : (
            <p className={secondaryText}>
              You can prepare notes without an assessment. A completed check-in
              would let you choose whether to include its summary.
            </p>
          )}
        </div>
        <div className="rounded-2xl bg-slate-50 p-5 dark:bg-slate-950">
          <h4 className="font-semibold">Exact download preview</h4>
          <pre
            aria-label="Appointment notes preview"
            className="mt-4 whitespace-pre-wrap break-words font-sans text-sm leading-6"
          >
            {preview}
          </pre>
          <Button className="mt-5" disabled={!content} onClick={download}>
            Download my appointment notes
          </Button>
          <p className="mt-3 text-xs leading-5 text-slate-500 dark:text-slate-400">
            Downloading creates a file on this device. Clearing your website
            session will not delete downloaded files.
          </p>
        </div>
      </div>
      {concerningDisclosure(`${goal} ${questions}`) ? (
        <div className="mt-5">
          <SafetySupport />
        </div>
      ) : null}
      {message ? (
        <p
          role="status"
          className="mt-4 text-sm text-blue-700 dark:text-blue-300"
        >
          {message}
        </p>
      ) : null}
      <Button className="mt-5" variant="secondary" onClick={onSupport}>
        Choose a professional
      </Button>
    </section>
  );
}
