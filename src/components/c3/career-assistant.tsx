"use client";

import { useId, useMemo, useRef, useState, type FormEvent } from "react";
import { Button } from "@/components/shared/Button";
import { Card } from "@/components/shared/Card";
import { useLanguage } from "@/context/language-context";
import { assessCareer } from "@/lib/c3/assessment";
import { answerIntent, answerQuestion, type AssistantContext, type IntentId, type SourceId } from "@/lib/c3/assistant";
import { getAssistantText, type AssistantText } from "@/lib/c3/assistant-text";
import { getC3Text } from "@/lib/c3/i18n";
import type { SessionSummary } from "@/lib/c3/interview";
import type { CareerProfile } from "@/lib/c3/validation";

/**
 * A turn keeps the question, not the answer text, so the whole conversation
 * re-renders in the new language when the student switches language. The context
 * is the one the question was asked against, so an old answer never changes.
 */
type Turn = { id: number; question: string; intent: IntentId | null; ctx: AssistantContext };

type Props = {
  /** The last analysed profile (null until the readiness analysis is run). */
  profile: CareerProfile | null;
  /** Summary of the last finished mock interview in this session, if any. */
  interview: SessionSummary | null;
};

const ring = "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary";

const SUGGESTION_KEYS: Record<IntentId, keyof AssistantText> = {
  readiness: "qReadiness",
  scoreReason: "qScoreReason",
  bestRole: "qBestRole",
  gaps: "qGaps",
  nextStep: "qNextStep",
  compareRoles: "qCompareRoles",
  roleRequirements: "qRoleRequirements",
  resources: "qResources",
  certifications: "qCertifications",
  interview: "qInterview",
  about: "qAbout",
  help: "qHelp"
};

const SOURCE_KEYS: Record<SourceId, keyof AssistantText> = {
  readiness: "srcReadiness",
  gaps: "srcGaps",
  plan: "srcPlan",
  roleProfile: "srcRoleProfile",
  graph: "srcGraph",
  interview: "srcInterview",
  model: "srcModel"
};

const START: IntentId[] = ["readiness", "gaps", "nextStep", "bestRole", "interview", "about"];

/** Rule-based career assistant (FR12). Answers only from the student's C3 results; runs on-device. */
export function CareerAssistant({ profile, interview }: Props) {
  const { language } = useLanguage();
  const t = getC3Text(language);
  const a = getAssistantText(language);
  const uid = useId();
  const [turns, setTurns] = useState<Turn[]>([]);
  const [draft, setDraft] = useState("");
  const [empty, setEmpty] = useState(false);
  const nextId = useRef(1);
  const endRef = useRef<HTMLDivElement>(null);

  const assessment = useMemo(() => (profile ? assessCareer(profile) : null), [profile]);
  const background = profile?.background;
  const ctx = useMemo<AssistantContext>(() => ({ assessment, interview, background }), [assessment, interview, background]);

  function ask(question: string, intent: IntentId | null) {
    setTurns((all) => [...all, { id: nextId.current++, question, intent, ctx }]);
    setDraft("");
    setEmpty(false);
    // jsdom has no scrollIntoView; browsers do
    requestAnimationFrame(() => endRef.current?.scrollIntoView?.({ behavior: "smooth", block: "end" }));
  }

  function submit(e: FormEvent) {
    e.preventDefault();
    if (!draft.trim()) {
      setEmpty(true);
      return;
    }
    ask(draft.trim(), null);
  }

  const answers = turns.map((turn) =>
    turn.intent
      ? answerIntent(turn.intent, turn.ctx, language)
      : answerQuestion(turn.question, turn.ctx, language)
  );
  const lastAnswer = answers[answers.length - 1];
  const suggestions = (lastAnswer ? lastAnswer.followUps : START).filter((id) => id !== lastAnswer?.intent);

  return (
    <div className="space-y-6" data-testid="c3-assistant">
      <header>
        <h3 className="text-xl font-semibold">{a.title}</h3>
        <p className="mt-1 max-w-3xl text-sm text-slate-600 dark:text-slate-300">{a.subtitle}</p>
      </header>
      <p className="rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900 dark:border-amber-900 dark:bg-amber-950/40 dark:text-amber-100">
        {a.note} {t.syntheticNote}
      </p>
      {!profile ? <p className="text-sm text-slate-600 dark:text-slate-300">{a.noAnalysisYet}</p> : null}

      <Card>
        <div role="log" aria-live="polite" aria-label={a.title} className="max-h-[32rem] space-y-4 overflow-y-auto pr-1">
          {turns.length === 0 ? <p className="text-sm text-slate-500 dark:text-slate-400">{a.welcome}</p> : null}
          {turns.map((turn, i) => {
            const answer = answers[i];
            return (
              <div key={turn.id} className="space-y-2">
                <div className="flex justify-end">
                  <p className="max-w-[85%] rounded-2xl rounded-br-sm bg-primary px-4 py-2 text-sm text-white">
                    <span className="sr-only">{a.you}: </span>
                    {turn.intent ? a[SUGGESTION_KEYS[turn.intent]] : turn.question}
                  </p>
                </div>
                <div className="max-w-[90%] rounded-2xl rounded-bl-sm bg-slate-100 px-4 py-3 text-sm text-slate-800 dark:bg-slate-800 dark:text-slate-100" data-testid="c3-assistant-answer">
                  <span className="sr-only">{a.assistantName}: </span>
                  <AnswerLines lines={answer.lines} />
                  {answer.sources.length > 0 ? (
                    <p className="mt-2 text-xs text-slate-500 dark:text-slate-400">
                      {a.basedOn} {answer.sources.map((s) => a[SOURCE_KEYS[s]]).join(" · ")}
                    </p>
                  ) : null}
                </div>
              </div>
            );
          })}
          <div ref={endRef} />
        </div>

        {suggestions.length > 0 ? (
          <div className="mt-4">
            <p className="mb-2 text-xs font-medium uppercase tracking-wide text-slate-500 dark:text-slate-400">{a.suggestions}</p>
            <div className="flex flex-wrap gap-2">
              {suggestions.map((id) => (
                <button
                  key={id}
                  type="button"
                  onClick={() => ask(a[SUGGESTION_KEYS[id]], id)}
                  className={`rounded-full border border-slate-300 px-3 py-1.5 text-sm text-slate-700 hover:bg-slate-100 dark:border-slate-600 dark:text-slate-200 dark:hover:bg-slate-800 ${ring}`}
                >
                  {a[SUGGESTION_KEYS[id]]}
                </button>
              ))}
            </div>
          </div>
        ) : null}

        <form onSubmit={submit} className="mt-4 flex flex-col gap-2 sm:flex-row">
          <label htmlFor={`${uid}-q`} className="sr-only">
            {a.inputLabel}
          </label>
          <input
            id={`${uid}-q`}
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            placeholder={a.placeholder}
            maxLength={300}
            autoComplete="off"
            aria-invalid={empty}
            aria-describedby={empty ? `${uid}-err` : undefined}
            className={`w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-900 ${ring}`}
          />
          <div className="flex gap-2">
            <Button type="submit">{a.send}</Button>
            {turns.length > 0 ? (
              <Button type="button" variant="secondary" onClick={() => setTurns([])}>
                {a.clearChat}
              </Button>
            ) : null}
          </div>
        </form>
        {empty ? (
          <p id={`${uid}-err`} role="alert" className="mt-2 text-sm text-red-600 dark:text-red-400">
            {a.emptyQuestion}
          </p>
        ) : null}
        <p className="mt-3 text-xs text-slate-500 dark:text-slate-400">{a.privacyLine}</p>
      </Card>
    </div>
  );
}

function AnswerLines({ lines }: { lines: Array<{ kind: "text" | "bullet"; text: string }> }) {
  // Group consecutive bullet lines into one list.
  const blocks: Array<{ kind: "text"; text: string } | { kind: "list"; items: string[] }> = [];
  for (const line of lines) {
    const prev = blocks[blocks.length - 1];
    if (line.kind === "bullet") {
      if (prev?.kind === "list") prev.items.push(line.text);
      else blocks.push({ kind: "list", items: [line.text] });
    } else {
      blocks.push({ kind: "text", text: line.text });
    }
  }
  return (
    <div className="space-y-2">
      {blocks.map((block, i) =>
        block.kind === "text" ? (
          <p key={i}>{block.text}</p>
        ) : (
          <ul key={i} className="list-disc space-y-1 pl-5">
            {block.items.map((item, k) => (
              <li key={k}>{item}</li>
            ))}
          </ul>
        )
      )}
    </div>
  );
}
