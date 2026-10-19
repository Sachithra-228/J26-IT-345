"use client";

import { useId, useMemo, useRef, useState, type FormEvent } from "react";
import { Button } from "@/components/shared/Button";
import { Card } from "@/components/shared/Card";
import { useLanguage } from "@/context/language-context";
import { assessCareer } from "@/lib/c3/assessment";
import { answerIntent, answerQuestion, QUESTION_KEYS, type AssistantAnswer, type AssistantContext, type IntentId, type SectionId, type SourceId } from "@/lib/c3/assistant";
import { getAssistantText, type AssistantText } from "@/lib/c3/assistant-text";
import type { SessionSummary } from "@/lib/c3/interview";
import { saveJobMatchContext } from "@/lib/c3/job-match-context";
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
  /** Opens a part of the Readiness tab ("Open this section"); the button is hidden without it. */
  onOpenSection?: (section: Exclude<SectionId, "jobs">) => void;
};

const ring = "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary";

const SUGGESTION_KEYS = QUESTION_KEYS;

const SOURCE_KEYS: Record<SourceId, keyof AssistantText> = {
  readiness: "srcReadiness",
  gaps: "srcGaps",
  plan: "srcPlan",
  roleProfile: "srcRoleProfile",
  graph: "srcGraph",
  interview: "srcInterview",
  jobBoard: "srcJobBoard",
  model: "srcModel"
};

const START: IntentId[] = ["readiness", "gaps", "nextStep", "jobs", "certifications", "bestRole", "interview", "about"];

const OPEN_KEYS: Record<SectionId, keyof AssistantText> = {
  readiness: "openReadiness",
  gaps: "openGaps",
  plan: "openPlan",
  jobs: "openJobs"
};

/** The student dashboard section that holds the Career job board. */
const JOB_BOARD_HREF = "/dashboard/student#career";

/** Rule-based career assistant (FR12). Answers only from the student's C3 results; runs on-device. */
export function CareerAssistant({ profile, interview, onOpenSection }: Props) {
  const { language } = useLanguage();
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
        <details className="mt-2 max-w-3xl text-sm">
          <summary className={`cursor-pointer text-xs font-medium text-primary ${ring}`}>ⓘ {a.howItWorks}</summary>
          <p data-testid="c3-assistant-note" className="mt-1 text-xs text-slate-600 dark:text-slate-300">
            {a.note}
          </p>
          {!profile ? <p className="mt-1 text-xs text-slate-600 dark:text-slate-300">{a.noAnalysisYet}</p> : null}
        </details>
      </header>

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
                  <OpenSection answer={answer} ctx={turn.ctx} a={a} onOpenSection={onOpenSection} />
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

/** "Open this section" under answers about readiness, gaps, the plan or jobs. */
function OpenSection({
  answer,
  ctx,
  a,
  onOpenSection
}: {
  answer: AssistantAnswer;
  ctx: AssistantContext;
  a: AssistantText;
  onOpenSection?: Props["onOpenSection"];
}) {
  const section = answer.section;
  if (!section) return null;
  const cls = `mt-2 inline-flex items-center gap-1 rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-semibold text-primary hover:bg-slate-50 dark:border-slate-600 dark:bg-slate-900 ${ring}`;
  if (section === "jobs") {
    const levels = ctx.assessment?.levels;
    if (!answer.roleId || !levels) return null;
    // Saves {role, levels} in this tab's sessionStorage only - never in the URL - then opens Career.
    return (
      <a href={JOB_BOARD_HREF} data-testid="c3-assistant-open" onClick={() => saveJobMatchContext(answer.roleId as string, levels)} className={cls}>
        {a[OPEN_KEYS.jobs]} →
      </a>
    );
  }
  if (!onOpenSection) return null;
  return (
    <button type="button" data-testid="c3-assistant-open" onClick={() => onOpenSection(section)} className={cls}>
      {a[OPEN_KEYS[section]]} →
    </button>
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
