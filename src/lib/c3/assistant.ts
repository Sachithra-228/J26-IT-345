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
import type { Language } from "@/context/language-context";
import type { CareerAssessment } from "./assessment";
import { getAssistantText, type AssistantText } from "./assistant-text";
import { fuzzRatio, matchTokens, tokenize } from "./extract";
import { proposedGaps, type SkillGap } from "./gaps";
import { getAction, planForRole, type ActionNode, type GapToActionPlan, type StepReason } from "./graph";
import { fmt, getC3Text, label, type C3Text } from "./i18n";
import type { Criterion, SessionSummary } from "./interview";
import { careerModel, getRole, getSkill, knowledgeGraph, type ActionType, type RoleProfile } from "./model";
import { backgroundTips, backgroundTipText } from "./specialisation-roles";
import type { Background } from "./validation";
import { readinessBand, type Contribution, type RoleReadiness } from "./readiness";

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
  | "jobs"
  | "about"
  | "help";

/** Where an answer's facts come from; the UI shows these under every answer. */
export type SourceId = "readiness" | "gaps" | "plan" | "roleProfile" | "graph" | "interview" | "jobBoard" | "model";

/** Parts of C3 an answer can open with "Open this section". */
export type SectionId = "readiness" | "gaps" | "plan" | "jobs";

export type Intent = {
  id: IntentId;
  /**
   * Cue words and phrases (lower case). Single English words are also matched
   * fuzzily, so small typos still work; phrases and Sinhala / Tamil cues must
   * appear as written.
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
    cues: ["ready", "readiness", "score", "how ready", "my chances", "percentage", "match", "සූදානම", "தயார்"],
    needsAssessment: true,
    sources: ["readiness"],
    followUps: ["scoreReason", "gaps", "nextStep"]
  },
  {
    id: "scoreReason",
    cues: ["why", "why did i", "why is", "why am i", "explain", "reason", "low", "high", "breakdown", "calculated", "how is", "points", "ඇයි", "අඩු", "ஏன்", "குறைவு"],
    needsAssessment: true,
    sources: ["readiness", "roleProfile"],
    followUps: ["gaps", "nextStep"]
  },
  {
    id: "bestRole",
    cues: ["best", "suit", "suits", "suitable", "fit", "which role", "career for me", "recommend", "should i choose", "ගැළපෙන", "பொருத்தமான"],
    needsAssessment: true,
    sources: ["readiness"],
    followUps: ["readiness", "compareRoles", "roleRequirements"]
  },
  {
    id: "gaps",
    cues: ["gap", "gaps", "missing", "lack", "weak", "weakness", "improve", "skills do i need", "what am i missing", "හිඩැස", "இடைவெளி"],
    needsAssessment: true,
    sources: ["gaps", "roleProfile"],
    followUps: ["nextStep", "resources"]
  },
  {
    id: "nextStep",
    cues: ["next", "first", "start", "plan", "roadmap", "what should i do", "where do i begin", "step", "steps", "ඊළඟ", "මුලින්ම", "அடுத்து", "முதலில்"],
    needsAssessment: true,
    sources: ["plan", "graph"],
    followUps: ["resources", "certifications", "interview"]
  },
  {
    id: "compareRoles",
    cues: ["compare", "comparison", "versus", "vs", "difference", "better", "between", "සසඳ", "ஒப்பிடு"],
    needsAssessment: true,
    sources: ["readiness", "gaps"],
    followUps: ["roleRequirements", "nextStep"]
  },
  {
    id: "roleRequirements",
    cues: ["require", "requires", "requirement", "requirements", "need for", "needed", "employers want", "ask for", "what does", "skills for", "අවශ්‍ය", "தேவை"],
    needsAssessment: false,
    sources: ["roleProfile"],
    followUps: ["gaps", "certifications"]
  },
  {
    id: "resources",
    cues: ["learn", "how can i learn", "how do i learn", "course", "courses", "resource", "resources", "study", "tutorial", "practice", "project", "projects", "module", "how do i improve", "how can i improve", "get better at", "ඉගෙන", "கற்றுக்"],
    needsAssessment: false,
    sources: ["graph"],
    followUps: ["certifications", "nextStep"]
  },
  {
    id: "certifications",
    cues: ["certification", "certifications", "certificate", "certified", "cert", "exam", "සහතික", "சான்றிதழ்"],
    needsAssessment: false,
    sources: ["graph", "roleProfile"],
    followUps: ["resources", "nextStep"]
  },
  {
    id: "interview",
    cues: ["interview", "interviews", "mock", "answer better", "star", "සම්මුඛ", "நேர்காணல்"],
    needsAssessment: false,
    sources: ["interview"],
    followUps: ["gaps", "nextStep"]
  },
  {
    id: "jobs",
    cues: ["jobs", "vacancy", "vacancies", "openings", "hiring", "job board", "which job", "which jobs", "jobs fit", "jobs for me", "open jobs", "apply for", "රැකියා", "வேலைகள்"],
    needsAssessment: true,
    sources: ["readiness", "jobBoard"],
    followUps: ["gaps", "nextStep", "certifications"]
  },
  {
    id: "about",
    cues: ["privacy", "private", "my data", "accurate", "accuracy", "trust", "synthetic", "how does", "how do you work", "guarantee", "who are you", "පෞද්ගලික", "දත්ත", "தனிப்பட்ட", "தரவு"],
    needsAssessment: false,
    sources: ["model"],
    followUps: ["help"]
  },
  {
    id: "help",
    cues: ["help", "what can you", "what can i ask", "hello", "hi", "options", "උදව්", "உதவி"],
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
  /** Academic background - context only: it adds tips, never changes a number. */
  background?: Background;
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
  /** The part of C3 this answer is about; the UI shows an "Open this section" button. */
  section?: SectionId;
  /** The role the answer is about (used to open the matched job board). */
  roleId?: string;
};

/** Which part of C3 each answer refers to. */
const SECTION_OF: Partial<Record<IntentId, SectionId>> = {
  readiness: "readiness",
  scoreReason: "readiness",
  bestRole: "readiness",
  compareRoles: "readiness",
  gaps: "gaps",
  nextStep: "plan",
  jobs: "jobs"
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

// ---------------------------------------------------------------------------
// Grounded answers: every fact below is read from the C3 results in the context.
// ---------------------------------------------------------------------------

type Line = AssistantAnswer["lines"][number];

type Build = {
  language: Language;
  t: C3Text;
  a: AssistantText;
  ctx: AssistantContext;
  match: Pick<IntentMatch, "roleIds" | "skillIds">;
};

const text = (s: string): Line => ({ kind: "text", text: s });
const bullet = (s: string): Line => ({ kind: "bullet", text: s });

const round = (n: number) => Math.round(n);

function roleName(id: string, language: Language) {
  const r = getRole(id);
  return r ? label(r.label, language) : id;
}

function skillName(id: string, language: Language) {
  const s = getSkill(id);
  return s ? label(s.label, language) : id;
}

function levelName(level: number, language: Language) {
  const l = careerModel.taxonomy.levels.find((x) => x.level === level);
  return l ? label(l.label, language) : String(level);
}

function bandName(score: number, t: C3Text) {
  const band = readinessBand(score);
  return band === "strong" ? t.bandStrong : band === "developing" ? t.bandDeveloping : t.bandEarly;
}

/** The role a question is about: the one named, else the first target, else the best match. */
function focusRoleId(b: Build): string | null {
  const named = b.match.roleIds.find((id) => getRole(id));
  if (named) return named;
  const a = b.ctx.assessment;
  return a?.targets[0]?.roleId ?? a?.roles[0]?.roleId ?? null;
}

function readinessAnswer(b: Build): Line[] {
  const a = b.ctx.assessment as CareerAssessment;
  const roleId = focusRoleId(b) as string;
  const idx = a.roles.findIndex((r) => r.roleId === roleId);
  const r = a.roles[idx];
  const base = a.baselineRoles.find((x) => x.roleId === roleId);
  const lines = [
    text(fmt(b.a.readinessLine, { role: roleName(roleId, b.language), score: round(r.score), band: bandName(r.score, b.t) })),
    text(fmt(b.a.readinessRank, { rank: idx + 1, total: a.roles.length }))
  ];
  if (base) lines.push(text(fmt(b.a.readinessBaseline, { covered: base.covered, required: base.required })));
  const others = a.targets.filter((x) => x.roleId !== roleId);
  if (others.length > 0) {
    const list = others.map((x) => `${roleName(x.roleId, b.language)} ${round(x.readiness.score)}/100`).join(", ");
    lines.push(text(fmt(b.a.readinessOthers, { list })));
  }
  return lines;
}

function scoreReasonAnswer(b: Build): Line[] {
  const a = b.ctx.assessment as CareerAssessment;
  const roleId = focusRoleId(b) as string;
  const r = a.roles.find((x) => x.roleId === roleId) as RoleReadiness;
  const describe = (tpl: string, c: Contribution, points: number) =>
    fmt(tpl, {
      skill: skillName(c.skillId, b.language),
      points: points.toFixed(1),
      level: levelName(c.level, b.language),
      required: levelName(c.requiredLevel, b.language)
    });
  const plus = r.contributions
    .filter((c) => c.points > 0)
    .sort((x, y) => y.points - x.points)
    .slice(0, 3);
  // What holds the score back: the points still missing on each skill, largest first.
  const held = r.contributions
    .filter((c) => c.level < c.requiredLevel)
    .sort((x, y) => y.maxPoints - y.points - (x.maxPoints - x.points))
    .slice(0, 3);
  const lines = [text(fmt(b.a.reasonIntro, { role: roleName(roleId, b.language), score: round(r.score) }))];
  if (plus.length > 0) {
    lines.push(text(b.a.reasonPlusTitle));
    plus.forEach((c) => lines.push(bullet(describe(b.a.reasonPlus, c, c.points))));
  }
  if (held.length > 0) {
    lines.push(text(b.a.reasonMinusTitle));
    held.forEach((c) => lines.push(bullet(describe(b.a.reasonHeld, c, c.maxPoints - c.points))));
  } else {
    lines.push(text(fmt(b.a.reasonNoMinus, { role: roleName(roleId, b.language) })));
  }
  return lines;
}

function bestRoleAnswer(b: Build): Line[] {
  const a = b.ctx.assessment as CareerAssessment;
  const targets = new Set(a.targets.map((x) => x.roleId));
  const top = a.roles.slice(0, 3);
  const lines = [text(b.a.bestIntro)];
  top.forEach((r) =>
    lines.push(
      bullet(
        fmt(b.a.bestLine, {
          role: roleName(r.roleId, b.language),
          score: round(r.score),
          mark: targets.has(r.roleId) ? b.a.targetMark : ""
        })
      )
    )
  );
  const best = top[0];
  if (best) lines.push(text(fmt(targets.has(best.roleId) ? b.a.bestIsTarget : b.a.bestNotTarget, { role: roleName(best.roleId, b.language) })));
  return lines;
}

const one = (x: number) => (Math.round(x * 10) / 10).toFixed(1);
const pct = (x: number) => Math.round(x * 100);
const MAX_GAPS_TOLD = 5;
const MAX_STEPS_TOLD = 3;

function typeName(type: ActionType, t: C3Text) {
  return { Module: t.typeModule, Project: t.typeProject, Certification: t.typeCertification, Resource: t.typeResource }[type];
}

/** Gaps and plan for the focus role: the stored target analysis, or computed the same way. */
function analysisFor(b: Build): { role: RoleProfile; gaps: SkillGap[]; plan: GapToActionPlan } {
  const a = b.ctx.assessment as CareerAssessment;
  const role = getRole(focusRoleId(b) as string) as RoleProfile;
  const target = a.targets.find((x) => x.roleId === role.id);
  if (target) return { role, gaps: target.gaps, plan: target.plan };
  return { role, gaps: proposedGaps(a.levels, role), plan: planForRole(a.levels, role) };
}

function stepReason(r: StepReason, roleId: string, b: Build): string {
  const { t, language } = b;
  switch (r.code) {
    case "gap":
      return fmt(t.reasonGap, {
        role: roleName(roleId, language),
        required: levelName(r.requiredLevel, language),
        skill: skillName(r.skillId, language),
        level: levelName(r.level, language)
      });
    case "adEvidence":
      return fmt(t.reasonAdEvidence, { skill: skillName(r.skillId, language), pct: pct(r.adShare), n: r.adCount, role: roleName(roleId, language) });
    case "gain":
      return fmt(t.reasonGain, { points: one(r.points) });
    case "efficiency":
      return r.alternatives > 0
        ? fmt(t.reasonEfficiency, { k: r.alternatives + 1, hours: r.effortHours })
        : fmt(t.reasonOnlyOption, { hours: r.effortHours });
    case "prerequisite":
      return fmt(t.reasonPrerequisite, { skill: skillName(r.skillId, language), forSkill: skillName(r.forSkillId, language) });
    case "proof":
      return fmt(t.reasonProof, { type: typeName(r.actionType, t).toLowerCase() });
  }
}

function gapsAnswer(b: Build): Line[] {
  const { role, gaps } = analysisFor(b);
  const name = roleName(role.id, b.language);
  const adShare = (skillId: string) => pct(role.skills.find((s) => s.skillId === skillId)?.tf ?? 0);
  const lines: Line[] = [];
  // A skill named in the question gets a direct answer first.
  for (const skillId of b.match.skillIds) {
    const gap = gaps.find((g) => g.skillId === skillId);
    const item = role.skills.find((s) => s.skillId === skillId);
    const skill = skillName(skillId, b.language);
    if (gap) {
      lines.push(
        text(
          fmt(b.a.gapSkill, {
            skill,
            role: name,
            level: levelName(gap.level, b.language),
            required: levelName(gap.requiredLevel, b.language),
            points: one(gap.gainToRequired)
          })
        )
      );
    } else if (item) {
      lines.push(text(fmt(b.a.gapSkillMet, { skill, role: name })));
    } else {
      lines.push(text(fmt(b.a.gapSkillNotAsked, { skill, role: name })));
    }
  }
  if (gaps.length === 0) return [...lines, text(fmt(b.t.noGaps, { role: name }))];
  lines.push(text(fmt(b.a.gapsIntro, { role: name })));
  for (const g of gaps.slice(0, MAX_GAPS_TOLD)) {
    lines.push(
      bullet(
        fmt(b.a.gapLine, {
          skill: skillName(g.skillId, b.language),
          level: levelName(g.level, b.language),
          required: levelName(g.requiredLevel, b.language),
          points: one(g.gainToRequired),
          pct: adShare(g.skillId)
        })
      )
    );
  }
  if (gaps.length > MAX_GAPS_TOLD) lines.push(text(fmt(b.a.gapsMore, { n: gaps.length - MAX_GAPS_TOLD })));
  return lines;
}

/** Background tips (context only), appended to the "what next" answer. */
function backgroundLines(b: Build, roleId: string, topGap: string | null): Line[] {
  const tips = backgroundTips(b.ctx.background, roleId, topGap);
  if (tips.length === 0) return [];
  return [text(b.a.nextBackground), ...tips.map((tip) => bullet(backgroundTipText(tip, b.t, b.language)))];
}

function nextStepAnswer(b: Build): Line[] {
  const { role, plan, gaps } = analysisFor(b);
  const name = roleName(role.id, b.language);
  const extra = backgroundLines(b, role.id, gaps[0]?.skillId ?? null);
  if (plan.steps.length === 0) return [text(fmt(b.a.nextNone, { role: name })), ...extra];
  const [first, ...rest] = plan.steps;
  const lines: Line[] = [
    text(
      fmt(b.a.nextFirst, {
        title: first.action.title,
        type: typeName(first.actionType, b.t).toLowerCase(),
        hours: first.effortHours,
        skill: skillName(first.skillId, b.language),
        from: levelName(first.fromLevel, b.language),
        to: levelName(first.toLevel, b.language)
      })
    ),
    text(b.a.nextWhy),
    ...first.reasons.map((r) => bullet(stepReason(r, role.id, b)))
  ];
  if (rest.length > 0) {
    lines.push(text(b.a.nextThen));
    for (const s of rest.slice(0, MAX_STEPS_TOLD - 1)) {
      lines.push(bullet(fmt(b.a.nextStepLine, { title: s.action.title, type: typeName(s.actionType, b.t).toLowerCase(), hours: s.effortHours })));
    }
  }
  lines.push(
    text(
      fmt(b.t.planSummary, {
        n: plan.steps.length,
        hours: plan.totalEffortHours,
        from: round(plan.readiness),
        to: round(plan.projectedReadiness)
      })
    )
  );
  if (plan.unplannedGaps.length > 0) {
    lines.push(text(fmt(b.t.planUnplanned, { skills: plan.unplannedGaps.map((id) => skillName(id, b.language)).join(", ") })));
  }
  return [...lines, ...extra];
}

const MAX_REQUIREMENTS_TOLD = 6;

/** Two roles to compare: those named, topped up with the targets and then the best matches. */
function rolesToCompare(b: Build): string[] {
  const a = b.ctx.assessment as CareerAssessment;
  const ids = [...b.match.roleIds, ...a.targets.map((x) => x.roleId), ...a.roles.map((r) => r.roleId)];
  return [...new Set(ids)].filter((id) => getRole(id)).slice(0, 2);
}

function compareAnswer(b: Build): Line[] {
  const a = b.ctx.assessment as CareerAssessment;
  const [x, y] = rolesToCompare(b);
  const info = [x, y].map((id) => {
    const role = getRole(id) as RoleProfile;
    const score = (a.roles.find((r) => r.roleId === id) as RoleReadiness).score;
    return { id, name: roleName(id, b.language), score, gaps: proposedGaps(a.levels, role) };
  });
  const lines: Line[] = [text(b.a.compareIntro)];
  for (const r of info) {
    lines.push(bullet(fmt(b.a.compareLine, { role: r.name, score: round(r.score), band: bandName(r.score, b.t), n: r.gaps.length })));
  }
  const diff = round(info[0].score) - round(info[1].score);
  if (diff === 0) lines.push(text(b.a.compareEqual));
  else {
    const [closer, other] = diff > 0 ? info : [info[1], info[0]];
    lines.push(text(fmt(b.a.compareCloser, { role: closer.name, other: other.name, diff: Math.abs(diff) })));
  }
  const ids = (gaps: SkillGap[]) => new Set(gaps.map((g) => g.skillId));
  const [g0, g1] = [ids(info[0].gaps), ids(info[1].gaps)];
  const shared = info[0].gaps.filter((g) => g1.has(g.skillId)).slice(0, 4);
  if (shared.length > 0) {
    lines.push(text(fmt(b.a.compareShared, { skills: shared.map((g) => skillName(g.skillId, b.language)).join(", ") })));
  }
  for (const [r, otherIds] of [
    [info[0], g1],
    [info[1], g0]
  ] as const) {
    const only = r.gaps.filter((g) => !otherIds.has(g.skillId)).slice(0, 3);
    if (only.length > 0) {
      lines.push(text(fmt(b.a.compareOnly, { role: r.name, skills: only.map((g) => skillName(g.skillId, b.language)).join(", ") })));
    }
  }
  return lines;
}

function requirementsAnswer(b: Build): Line[] {
  const roleId = focusRoleId(b);
  const role = roleId ? getRole(roleId) : undefined;
  if (!role) {
    const examples = careerModel.roles.slice(0, 4).map((r) => label(r.label, b.language)).join(", ");
    return [text(fmt(b.a.reqWhichRole, { examples }))];
  }
  const levels = b.ctx.assessment?.levels;
  const lines: Line[] = [text(fmt(b.a.reqIntro, { role: roleName(role.id, b.language), n: role.adCount }))];
  const top = [...role.skills].sort((x, y) => y.weight - x.weight).slice(0, MAX_REQUIREMENTS_TOLD);
  for (const item of top) {
    const vars = {
      skill: skillName(item.skillId, b.language),
      required: levelName(item.requiredLevel, b.language),
      pct: pct(item.tf),
      you: levelName(levels?.[item.skillId] ?? 0, b.language)
    };
    lines.push(bullet(fmt(levels ? b.a.reqLineYou : b.a.reqLine, vars)));
  }
  if (role.skills.length > top.length) lines.push(text(fmt(b.a.reqMore, { n: role.skills.length - top.length })));
  return lines;
}

const MAX_SKILLS_TOLD = 2;
const MAX_ACTIONS_TOLD = 4;
const MAX_CERTS_TOLD = 4;

type SkillAction = { action: ActionNode; kind: "teaches" | "evidences"; level: number };

/** Every action in the knowledge graph that teaches or evidences each skill. */
const ACTIONS_BY_SKILL = (() => {
  const map = new Map<string, SkillAction[]>();
  for (const e of knowledgeGraph.edges) {
    if (e.type !== "teaches" && e.type !== "evidences") continue;
    const action = getAction(e.from.slice(7));
    if (!action) continue;
    const skillId = e.to.slice(6);
    map.set(skillId, [...(map.get(skillId) ?? []), { action, kind: e.type, level: e.level }]);
  }
  return map;
})();

/** Skills a learning question is about: those named, else the top gaps for the focus role. */
function skillsAskedAbout(b: Build): string[] {
  if (b.match.skillIds.length > 0) return b.match.skillIds.slice(0, MAX_SKILLS_TOLD);
  if (!b.ctx.assessment) return [];
  return analysisFor(b)
    .gaps.slice(0, MAX_SKILLS_TOLD)
    .map((g) => g.skillId);
}

function resourcesAnswer(b: Build): Line[] {
  const skills = skillsAskedAbout(b);
  if (skills.length === 0) return [text(b.a.resWhichSkill)];
  const levels = b.ctx.assessment?.levels ?? {};
  const lines: Line[] = [];
  if (b.match.skillIds.length === 0) lines.push(text(b.a.resFromGaps));
  for (const skillId of skills) {
    const current = levels[skillId] ?? 0;
    // Actions that take the student past their current level, lowest level then least effort first.
    const options = (ACTIONS_BY_SKILL.get(skillId) ?? [])
      .filter((o) => o.action.type !== "Certification" && o.level > current)
      .sort((x, y) => x.level - y.level || x.action.effortHours - y.action.effortHours || x.action.ref.localeCompare(y.action.ref))
      .slice(0, MAX_ACTIONS_TOLD);
    const skill = skillName(skillId, b.language);
    if (options.length === 0) {
      lines.push(text(fmt(current >= 3 ? b.a.resTop : b.a.resNone, { skill })));
      continue;
    }
    lines.push(text(fmt(b.a.resIntro, { skill, level: levelName(current, b.language) })));
    for (const o of options) {
      lines.push(
        bullet(
          fmt(b.a.resLine, {
            title: o.action.title,
            type: typeName(o.action.type, b.t).toLowerCase(),
            hours: o.action.effortHours,
            level: levelName(o.level, b.language)
          })
        )
      );
    }
  }
  lines.push(text(b.t.moduleNote));
  return lines;
}

function certificationsAnswer(b: Build): Line[] {
  const roleId = focusRoleId(b);
  const role = roleId ? getRole(roleId) : undefined;
  // Rank certifications by how much the role (if any) values the skill they prove.
  const weightOf = (skillId: string) => role?.skills.find((x) => x.skillId === skillId)?.weight ?? 0;
  const wanted = b.match.skillIds.length > 0 ? new Set(b.match.skillIds) : null;
  const certs = new Map<string, { action: ActionNode; skillIds: string[]; weight: number }>();
  for (const [skillId, options] of ACTIONS_BY_SKILL) {
    if (wanted && !wanted.has(skillId)) continue;
    if (!wanted && role && weightOf(skillId) === 0) continue;
    for (const o of options) {
      if (o.action.type !== "Certification") continue;
      const c = certs.get(o.action.ref) ?? { action: o.action, skillIds: [], weight: 0 };
      c.skillIds.push(skillId);
      c.weight = Math.max(c.weight, weightOf(skillId));
      certs.set(o.action.ref, c);
    }
  }
  const list = [...certs.values()]
    .sort((x, y) => y.weight - x.weight || x.action.effortHours - y.action.effortHours || x.action.ref.localeCompare(y.action.ref))
    .slice(0, MAX_CERTS_TOLD);
  const about = wanted ? [...wanted].map((id) => skillName(id, b.language)).join(", ") : role ? roleName(role.id, b.language) : null;
  if (list.length === 0) return [text(fmt(b.a.certNone, { about: about ?? "" })), text(b.a.certNote)];
  const lines: Line[] = [text(about ? fmt(b.a.certIntro, { about }) : b.a.certIntroAll)];
  for (const c of list) {
    lines.push(
      bullet(
        fmt(b.a.certLine, {
          title: c.action.title,
          provider: c.action.provider ?? "",
          hours: c.action.effortHours,
          skills: c.skillIds.map((id) => skillName(id, b.language)).join(", ")
        })
      )
    );
  }
  lines.push(text(b.a.certNote));
  return lines;
}

const CRITERION_TEXT: Record<Criterion, [keyof C3Text, keyof C3Text]> = {
  keyPoints: ["crKeyPoints", "tipKeyPoints"],
  structure: ["crStructure", "tipStructure"],
  depth: ["crDepth", "tipDepth"],
  evidence: ["crEvidence", "tipEvidence"],
  clarity: ["crClarity", "tipClarity"]
};

function interviewAnswer(b: Build): Line[] {
  const iv = b.ctx.interview;
  if (!iv || iv.answered === 0) {
    const lines = [text(b.a.ivNone), bullet(b.t.tipKeyPoints), bullet(b.t.tipStructure), bullet(b.t.tipEvidence)];
    const gap = b.ctx.assessment ? analysisFor(b).gaps[0] : undefined;
    if (gap) lines.push(text(fmt(b.a.ivFocus, { skill: skillName(gap.skillId, b.language) })));
    return lines;
  }
  const lines = [text(fmt(b.a.ivResult, { score: iv.average, n: iv.answered }))];
  if (iv.weakest) {
    const [name, tip] = CRITERION_TEXT[iv.weakest];
    lines.push(text(fmt(b.a.ivWeakest, { criterion: b.t[name], score: round(iv.criterionAverages[iv.weakest]) })));
    lines.push(bullet(b.t[tip]));
  }
  if (iv.practiseSkills.length > 0) {
    lines.push(text(fmt(b.t.ivPractise, { skills: iv.practiseSkills.map((id) => skillName(id, b.language)).join(", ") })));
  }
  return lines;
}

function jobsAnswer(b: Build): Line[] {
  const roleId = focusRoleId(b);
  const role = roleId ? roleName(roleId, b.language) : "";
  return [text(fmt(b.a.jobsIntro, { role })), bullet(b.a.jobsCard), bullet(b.a.jobsPrivacy)];
}

function helpAnswer(b: Build): Line[] {
  return [text(b.a.helpIntro), text(b.a.helpTopics)];
}

function aboutAnswer(b: Build): Line[] {
  return [text(b.a.aboutRules), bullet(b.a.aboutPrivacy), bullet(b.a.aboutSynthetic), bullet(b.a.aboutGuidance)];
}

const BUILDERS: Record<IntentId, (b: Build) => Line[]> = {
  readiness: readinessAnswer,
  scoreReason: scoreReasonAnswer,
  bestRole: bestRoleAnswer,
  gaps: gapsAnswer,
  nextStep: nextStepAnswer,
  compareRoles: compareAnswer,
  roleRequirements: requirementsAnswer,
  resources: resourcesAnswer,
  certifications: certificationsAnswer,
  interview: interviewAnswer,
  jobs: jobsAnswer,
  about: aboutAnswer,
  help: helpAnswer
};

/** The suggested-question text for each topic (the same buttons the UI shows). */
export const QUESTION_KEYS: Record<IntentId, keyof AssistantText> = {
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
  jobs: "qJobs",
  about: "qAbout",
  help: "qHelp"
};

const STOP_WORDS = new Set([
  "i", "me", "my", "the", "a", "an", "is", "am", "are", "do", "does", "did", "what", "which", "how", "to", "for", "of",
  "in", "on", "and", "or", "you", "your", "can", "could", "should", "with", "it", "this", "that", "be", "get", "about"
]);

/**
 * For a question that matched no topic: the (up to 3) suggested questions that share the
 * most words with it (exact, or a close spelling for words of 5+ letters), in topic order on
 * ties. Empty when nothing is shared.
 */
export function closestSuggestions(question: string, a: AssistantText): IntentId[] {
  const words = tokenize(question.toLowerCase()).filter((w) => !STOP_WORDS.has(w));
  if (!words.length) return [];
  return INTENTS.filter((i) => i.id !== "help")
    .map((intent, order) => {
      const qTokens = tokenize(String(a[QUESTION_KEYS[intent.id]]).toLowerCase()).filter((w) => !STOP_WORDS.has(w));
      const score = words.reduce((sum, w) => {
        if (qTokens.includes(w)) return sum + 1;
        const close = w.length >= FUZZY_CUE_MIN && qTokens.some((q) => q.length >= FUZZY_CUE_MIN && q[0] === w[0] && fuzzRatio(q, w) >= FUZZY_CUE_RATIO);
        return sum + (close ? 0.75 : 0);
      }, 0);
      return { id: intent.id, score, order };
    })
    .filter((x) => x.score > 0)
    .sort((x, y) => y.score - x.score || x.order - y.order)
    .slice(0, 3)
    .map((x) => x.id);
}

/** Unknown question: suggest the closest suggested questions, else the usual three. */
function notUnderstood(b: Build, question = ""): AssistantAnswer {
  const closest = closestSuggestions(question, b.a);
  return {
    intent: "help",
    lines: [text(b.a.unknown), ...helpAnswer(b)],
    sources: [],
    followUps: closest.length ? closest : getIntent("help").followUps,
    grounded: false
  };
}

/** Answers one intent from the context (also used directly by the suggested-question buttons). */
export function answerIntent(
  intentId: IntentId,
  ctx: AssistantContext,
  language: Language,
  match: Pick<IntentMatch, "roleIds" | "skillIds"> = { roleIds: [], skillIds: [] }
): AssistantAnswer {
  const intent = getIntent(intentId);
  const b: Build = { language, t: getC3Text(language), a: getAssistantText(language), ctx, match };
  if (intent.needsAssessment && !ctx.assessment) {
    return { intent: intentId, lines: [text(b.a.needAnalysis)], sources: [], followUps: ["roleRequirements", "about"], grounded: false, section: "readiness" };
  }
  const section = SECTION_OF[intentId];
  const roleId = section === "jobs" ? (focusRoleId(b) ?? undefined) : undefined;
  return {
    intent: intentId,
    lines: BUILDERS[intentId](b),
    sources: intent.sources,
    followUps: intent.followUps,
    grounded: true,
    ...(section ? { section } : {}),
    ...(roleId ? { roleId } : {})
  };
}

/** Matches a free-text question and answers it. */
export function answerQuestion(question: string, ctx: AssistantContext, language: Language): AssistantAnswer {
  const m = matchIntent(question);
  if (m.confidence < MIN_CONFIDENCE) {
    return notUnderstood({ language, t: getC3Text(language), a: getAssistantText(language), ctx, match: m }, question);
  }
  let intent = m.intent;
  // On a tie, prefer a topic that can be answered without the analysis if it has not been run.
  if (!ctx.assessment && getIntent(intent).needsAssessment) {
    const alt = m.ranked.find((r) => r.score === m.ranked[0].score && !getIntent(r.intent).needsAssessment);
    if (alt) intent = alt.intent;
  }
  return answerIntent(intent, ctx, language, m);
}
