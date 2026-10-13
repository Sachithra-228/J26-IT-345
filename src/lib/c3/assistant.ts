/**
 * C3 - rule-based career assistant (FR12).
 *
 * Answers a student's career questions in plain language, grounded ONLY on what the
 * C3 engine already computed: readiness and its per-skill points, ranked gaps, the
 * Gap-to-Action plan, role profiles from the job-ad corpus, the knowledge graph and
 * the mock-interview summary. There is no language model: a question is matched to
 * an intent from the fixed catalogue below, and every number in an answer is read
 * from those results, so the assistant cannot invent facts. It runs on-device and
 * sends nothing.
 */
import type { CareerAssessment } from "./assessment";
import type { SessionSummary } from "./interview";

export type IntentId =
  | "readiness"
  | "scoreReason"
  | "bestRole"
  | "gaps"
  | "nextStep"
  | "compareRoles"
  | "roleRequirements"
  | "resources"
  | "certifications"
  | "interview"
  | "about"
  | "help";

/** Where an answer's facts come from; the UI shows these under every answer. */
export type SourceId = "readiness" | "gaps" | "plan" | "roleProfile" | "graph" | "interview" | "model";

export type Intent = {
  id: IntentId;
  /**
   * Cue words and phrases (lower case). Single words are also matched fuzzily, so
   * small typos still work; phrases must appear as written.
   */
  cues: string[];
  /** True if the answer needs the student's readiness analysis. */
  needsAssessment: boolean;
  sources: SourceId[];
  /** Questions worth suggesting after this answer. */
  followUps: IntentId[];
};

export const INTENTS: Intent[] = [
  {
    id: "readiness",
    cues: ["ready", "readiness", "score", "how ready", "my chances", "percentage", "match"],
    needsAssessment: true,
    sources: ["readiness"],
    followUps: ["scoreReason", "gaps", "nextStep"]
  },
  {
    id: "scoreReason",
    cues: ["why", "explain", "reason", "low", "high", "breakdown", "calculated", "how is", "points"],
    needsAssessment: true,
    sources: ["readiness", "roleProfile"],
    followUps: ["gaps", "nextStep"]
  },
  {
    id: "bestRole",
    cues: ["best", "suit", "suits", "suitable", "fit", "which role", "which job", "career for me", "recommend", "should i choose"],
    needsAssessment: true,
    sources: ["readiness"],
    followUps: ["readiness", "compareRoles", "roleRequirements"]
  },
  {
    id: "gaps",
    cues: ["gap", "gaps", "missing", "lack", "weak", "weakness", "improve", "skills do i need", "what am i missing"],
    needsAssessment: true,
    sources: ["gaps", "roleProfile"],
    followUps: ["nextStep", "resources"]
  },
  {
    id: "nextStep",
    cues: ["next", "first", "start", "plan", "roadmap", "what should i do", "where do i begin", "step", "steps"],
    needsAssessment: true,
    sources: ["plan", "graph"],
    followUps: ["resources", "certifications", "interview"]
  },
  {
    id: "compareRoles",
    cues: ["compare", "comparison", "versus", "vs", "difference", "better", "between"],
    needsAssessment: true,
    sources: ["readiness", "gaps"],
    followUps: ["roleRequirements", "nextStep"]
  },
  {
    id: "roleRequirements",
    cues: ["require", "requires", "requirement", "requirements", "need for", "needed", "employers want", "ask for", "what does", "skills for"],
    needsAssessment: false,
    sources: ["roleProfile"],
    followUps: ["gaps", "certifications"]
  },
  {
    id: "resources",
    cues: ["learn", "course", "courses", "resource", "resources", "study", "tutorial", "practice", "project", "projects", "module"],
    needsAssessment: false,
    sources: ["graph"],
    followUps: ["certifications", "nextStep"]
  },
  {
    id: "certifications",
    cues: ["certification", "certifications", "certificate", "certified", "cert", "exam"],
    needsAssessment: false,
    sources: ["graph", "roleProfile"],
    followUps: ["resources", "nextStep"]
  },
  {
    id: "interview",
    cues: ["interview", "interviews", "mock", "answer better", "star"],
    needsAssessment: false,
    sources: ["interview"],
    followUps: ["gaps", "nextStep"]
  },
  {
    id: "about",
    cues: ["privacy", "private", "data", "accurate", "accuracy", "trust", "synthetic", "how does", "how do you work", "guarantee", "who are you"],
    needsAssessment: false,
    sources: ["model"],
    followUps: ["help"]
  },
  {
    id: "help",
    cues: ["help", "what can you", "what can i ask", "hello", "hi", "options"],
    needsAssessment: false,
    sources: [],
    followUps: ["readiness", "gaps", "nextStep"]
  }
];

const intentsById = new Map(INTENTS.map((i) => [i.id, i]));

export function getIntent(id: IntentId): Intent {
  return intentsById.get(id) as Intent;
}

/** The facts the assistant may use. Everything is optional: it says what is missing. */
export type AssistantContext = {
  assessment: CareerAssessment | null;
  interview: SessionSummary | null;
};

export type IntentMatch = {
  intent: IntentId;
  /** 0-1; below MIN_CONFIDENCE the assistant asks the student to rephrase. */
  confidence: number;
  /** Roles and skills named in the question, in the order they appear. */
  roleIds: string[];
  skillIds: string[];
};

export type AssistantAnswer = {
  intent: IntentId;
  /** Paragraphs and bullet lines, already in the student's language. */
  lines: Array<{ kind: "text" | "bullet"; text: string }>;
  sources: SourceId[];
  followUps: IntentId[];
  /** False when the assistant could not answer (no analysis yet, unknown question). */
  grounded: boolean;
};

export const MIN_CONFIDENCE = 0.34;
