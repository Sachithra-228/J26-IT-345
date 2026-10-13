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
import { fuzzRatio, matchTokens, tokenize } from "./extract";
import type { SessionSummary } from "./interview";
import { careerModel } from "./model";

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
    cues: ["learn", "course", "courses", "resource", "resources", "study", "tutorial", "practice", "project", "projects", "module", "how do i improve", "how can i improve", "get better at"],
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
    cues: ["privacy", "private", "my data", "accurate", "accuracy", "trust", "synthetic", "how does", "how do you work", "guarantee", "who are you"],
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

// ---------------------------------------------------------------------------
// Intent matching: cue words (exact or fuzzy) plus the roles and skills named.
// ---------------------------------------------------------------------------

/** Everyday names students use for each role, besides the catalogue label. */
const ROLE_ALIASES: Record<string, string[]> = {
  software_engineer: ["software engineer", "software developer", "software engineering", "swe", "backend developer"],
  frontend_engineer: ["front-end engineer", "frontend engineer", "front-end developer", "frontend developer", "web developer", "frontend", "front-end"],
  mobile_developer: ["mobile app developer", "mobile developer", "android developer", "ios developer", "app developer"],
  qa_engineer: ["qa engineer", "quality assurance engineer", "test engineer", "software tester", "tester", "qa"],
  devops_engineer: ["devops engineer", "cloud engineer", "site reliability engineer", "sre", "devops"],
  data_analyst: ["data analyst", "bi analyst", "business intelligence analyst"],
  data_scientist: ["data scientist", "machine learning engineer", "ml engineer", "ai engineer", "data science"],
  business_analyst: ["business analyst", "ba"],
  ui_ux_designer: ["ui/ux designer", "ux designer", "ui designer", "product designer", "designer"],
  network_engineer: ["network engineer", "network administrator", "network admin"],
  cybersecurity_analyst: ["cybersecurity analyst", "cyber security analyst", "security analyst", "soc analyst", "security engineer"],
  project_coordinator: ["it project coordinator", "project coordinator", "associate project manager", "project manager", "associate pm", "pm"]
};

/** Role phrases, longest first, so "machine learning engineer" wins over "machine learning". */
const ROLE_PHRASES = careerModel.roles
  .flatMap((r) => [r.label.en, ...(ROLE_ALIASES[r.id] ?? [])].map((p) => ({ roleId: r.id, tokens: tokenize(p) })))
  .filter((p) => p.tokens.length > 0)
  .sort((a, b) => b.tokens.length - a.tokens.length);

/** Short words students use for a skill that are too general to be taxonomy synonyms. */
const SKILL_HINTS: Record<string, string> = {
  cloud: "cloud",
  testing: "testing_manual",
  design: "ui_ux",
  security: "security",
  network: "networking",
  database: "databases_sql",
  databases: "databases_sql",
  coding: "problem_solving"
};

const FUZZY_CUE_MIN = 5;
const FUZZY_CUE_RATIO = 85;

/** Finds roles named in the question and blanks them out so their words are not read as skills. */
function findRoles(tokens: string[]): { roleIds: string[]; rest: string[] } {
  const rest = [...tokens];
  const found: Array<{ roleId: string; at: number }> = [];
  for (const p of ROLE_PHRASES) {
    for (let i = 0; i + p.tokens.length <= rest.length; i++) {
      if (p.tokens.every((t, k) => rest[i + k] === t)) {
        found.push({ roleId: p.roleId, at: i });
        for (let k = i; k < i + p.tokens.length; k++) rest[k] = "\u0000";
      }
    }
  }
  const roleIds = [...new Set(found.sort((a, b) => a.at - b.at).map((f) => f.roleId))];
  return { roleIds, rest };
}

function cueScore(cue: string, raw: string, tokens: string[], joined: string): number {
  // Non-Latin cues (Sinhala, Tamil) and phrases are matched as written.
  if (/[^\x00-\x7f]/.test(cue)) return raw.includes(cue) ? 2 : 0;
  const cueTokens = tokenize(cue);
  if (cueTokens.length > 1) return joined.includes(` ${cueTokens.join(" ")} `) ? 2 : 0;
  const word = cueTokens[0];
  if (!word) return 0;
  if (tokens.includes(word)) return 1;
  if (word.length < FUZZY_CUE_MIN) return 0;
  return tokens.some((t) => t.length >= FUZZY_CUE_MIN && t[0] === word[0] && fuzzRatio(t, word) >= FUZZY_CUE_RATIO) ? 0.75 : 0;
}

export type RankedIntents = IntentMatch & { ranked: Array<{ intent: IntentId; score: number }> };

/** Matches a free-text question to an intent and pulls out the roles and skills it names. */
export function matchIntent(question: string): RankedIntents {
  const raw = question.toLowerCase().replace(/\s+/g, " ").trim();
  const tokens = tokenize(raw);
  const joined = ` ${tokens.join(" ")} `;
  const { roleIds, rest } = findRoles(tokens);
  const found = matchTokens(rest);
  const matches = found.map((m) => ({ skillId: m.skillId, at: m.start }));
  const covered = new Set(found.flatMap((m) => Array.from({ length: m.length }, (_, k) => m.start + k)));
  rest.forEach((t, i) => {
    if (SKILL_HINTS[t] && !covered.has(i)) matches.push({ skillId: SKILL_HINTS[t], at: i });
  });
  const skillIds = [...new Set(matches.sort((a, b) => a.at - b.at).map((m) => m.skillId))];

  const ranked = INTENTS.map((intent) => {
    let score = intent.cues.reduce((s, c) => s + cueScore(c, raw, tokens, joined), 0);
    if (intent.id === "compareRoles" && roleIds.length >= 2) score += 2;
    return { intent: intent.id, score };
  }).sort((a, b) => b.score - a.score);

  let best = ranked[0];
  if (best.score === 0) {
    // No cue words: fall back on what was named ("data scientist?" / "docker?").
    if (roleIds.length >= 2) best = { intent: "compareRoles", score: 1 };
    else if (roleIds.length === 1) best = { intent: "roleRequirements", score: 1 };
    else if (skillIds.length > 0) best = { intent: "resources", score: 1 };
  }
  const confidence = best.score / (best.score + 1);
  return { intent: confidence >= MIN_CONFIDENCE ? best.intent : "help", confidence, roleIds, skillIds, ranked };
}
