/**
 * C3 - rule-based mock interview (FR13): question selection and rubric feedback.
 *
 * Runs entirely in the browser; answers are never sent or stored. Deterministic and
 * explainable like the readiness model: every score comes with the reason that
 * produced it. It checks coverage and structure, not whether every statement is
 * technically correct, so it is a practice aid - not a hiring prediction.
 *
 * Selection (per session, default 6 questions):
 *   1-3. technical questions on the student's top readiness gaps for the role
 *        (proposedGaps order), at the depth closest to the next level they need;
 *   4.   one technical question on a strength (a role skill they already meet);
 *   5.   one behavioural (STAR) question;
 *   6.   the role's situational question.
 *   `round` rotates to different questions of the same kind for repeat practice.
 *
 * Rubric (each criterion scored 0-3, weighted to a 0-100 total):
 *   Key points 40% | Structure 20% | Depth 15% | Evidence 15% | Clarity 10%
 * The weights and cut-offs were fixed before any testing with students and must be
 * validated against lecturer ratings (agreement study) before results are reported.
 */
import { INTERVIEW_QUESTIONS, type InterviewQuestion, type KeyPoint } from "./interview-bank";
import { extractSkills, tokenize } from "./extract";
import { proposedGaps } from "./gaps";
import type { RoleProfile } from "./model";
import type { SkillLevels } from "./readiness";

export type SelectionReason =
  | { code: "gap"; skillId: string; gain: number }
  | { code: "strength"; skillId: string }
  | { code: "core"; skillId: string }
  | { code: "behavioural" }
  | { code: "situational" };

export type SelectedQuestion = { question: InterviewQuestion; reason: SelectionReason };

export const RUBRIC_WEIGHTS = { keyPoints: 0.4, structure: 0.2, depth: 0.15, evidence: 0.15, clarity: 0.1 } as const;
export type Criterion = keyof typeof RUBRIC_WEIGHTS;

export type CriterionResult = {
  criterion: Criterion;
  /** 0-3 */
  score: number;
  /** Structured detail for the explanation text. */
  detail: Record<string, number | string | string[]>;
};

export type AnswerFeedback = {
  questionId: string;
  /** 0-100 weighted total. */
  total: number;
  band: "strong" | "developing" | "practice";
  criteria: CriterionResult[];
  coveredPoints: string[];
  missedPoints: string[];
  wordCount: number;
};

// ---------------------------------------------------------------- selection
const byType = (type: InterviewQuestion["type"]) => INTERVIEW_QUESTIONS.filter((q) => q.type === type);

function technicalFor(skillId: string, targetLevel: number, round: number, used: Set<string>): InterviewQuestion | null {
  const pool = INTERVIEW_QUESTIONS.filter((q) => q.type === "technical" && q.skillId === skillId && !used.has(q.id));
  if (pool.length === 0) return null;
  // closest depth to the level the student is working towards, then id for stability
  const ordered = [...pool].sort((a, b) => Math.abs(a.level - targetLevel) - Math.abs(b.level - targetLevel) || a.id.localeCompare(b.id));
  return ordered[round % ordered.length];
}

export function selectQuestions(levels: SkillLevels, role: RoleProfile, count = 6, round = 0): SelectedQuestion[] {
  const used = new Set<string>();
  const out: SelectedQuestion[] = [];
  const add = (q: InterviewQuestion | null, reason: SelectionReason) => {
    if (q && !used.has(q.id) && out.length < count) {
      used.add(q.id);
      out.push({ question: q, reason });
    }
  };

  const technicalSlots = Math.max(1, count - 2); // the last two slots are behavioural + situational
  const gapSlots = Math.max(1, technicalSlots - 1);
  // 1. gaps, highest readiness gain first
  for (const g of proposedGaps(levels, role)) {
    if (out.length >= gapSlots) break;
    add(technicalFor(g.skillId, Math.min(3, g.level + 1), round, used), { code: "gap", skillId: g.skillId, gain: g.gainToRequired });
  }
  // 2. a strength (or, if none, the most important remaining role skill)
  const met = role.skills.filter((s) => (levels[s.skillId] ?? 0) >= s.requiredLevel);
  for (const s of met) {
    const before = out.length;
    add(technicalFor(s.skillId, Math.min(3, (levels[s.skillId] ?? 0) + 1), round, used), { code: "strength", skillId: s.skillId });
    if (out.length > before) break;
  }
  for (const s of role.skills) {
    if (out.filter((x) => x.question.type === "technical").length >= technicalSlots) break;
    add(technicalFor(s.skillId, Math.min(3, (levels[s.skillId] ?? 0) + 1), round, used), { code: "core", skillId: s.skillId });
  }
  // 3. behavioural and situational
  const behavioural = byType("behavioural");
  add(behavioural[round % behavioural.length], { code: "behavioural" });
  const situational = byType("situational").filter((q) => q.roleIds.includes(role.id));
  add(situational[round % Math.max(1, situational.length)] ?? null, { code: "situational" });
  // top up if the bank ran short for this role
  for (const q of behavioural) add(q, { code: "behavioural" });
  return out;
}

// ---------------------------------------------------------------- scoring helpers
function tokenMatches(answerToken: string, termToken: string): boolean {
  if (answerToken === termToken) return true;
  if (answerToken === `${termToken}s` || answerToken === `${termToken}es`) return true;
  return termToken.length >= 5 && answerToken.startsWith(termToken);
}

/** True when any term of the key point occurs as a token sequence in the answer. */
export function coversKeyPoint(tokens: string[], point: KeyPoint): boolean {
  return point.terms.some((term) => {
    const tt = tokenize(term);
    if (tt.length === 0) return false;
    for (let i = 0; i + tt.length <= tokens.length; i++) {
      let ok = true;
      for (let k = 0; k < tt.length; k++) {
        if (!tokenMatches(tokens[i + k], tt[k])) {
          ok = false;
          break;
        }
      }
      if (ok) return true;
    }
    return false;
  });
}

const STAR: Record<"situation" | "task" | "action" | "result", string[]> = {
  situation: ["when i", "during", "in my", "at my", "project", "internship", "semester", "once", "last year", "team"],
  task: ["my task", "i was responsible", "responsible for", "i needed to", "i had to", "we had to", "goal", "the aim", "assigned"],
  action: ["i decided", "i created", "i built", "i implemented", "i organised", "i organized", "i talked", "i used", "i spoke", "i suggested", "i wrote", "i designed", "i learned", "i learnt", "i asked", "i proposed", "i fixed"],
  result: ["as a result", "result", "finally", "in the end", "improved", "reduced", "increased", "achieved", "delivered", "successfully", "learned", "learnt", "%"]
};
const EXAMPLE_CUES = ["for example", "for instance", "e.g", "such as", "in my project", "in our project", "like when", "example"];

function containsPhrase(text: string, phrase: string): boolean {
  return text.includes(phrase);
}

const band = (ratio: number) => (ratio >= 0.75 ? 3 : ratio >= 0.5 ? 2 : ratio >= 0.25 ? 1 : 0);

// ---------------------------------------------------------------- the rubric
export function scoreAnswer(question: InterviewQuestion, answer: string): AnswerFeedback {
  const text = answer.toLowerCase().replace(/\s+/g, " ").trim();
  const tokens = tokenize(text);
  const words = text ? text.split(" ").filter(Boolean) : [];
  const wordCount = words.length;

  // 1. key points
  const covered = question.keyPoints.filter((p) => coversKeyPoint(tokens, p));
  const coveredLabels = covered.map((p) => p.label);
  const missed = question.keyPoints.filter((p) => !covered.includes(p)).map((p) => p.label);
  const keyScore = band(question.keyPoints.length ? covered.length / question.keyPoints.length : 0);

  // 2. structure
  let structureScore: number;
  let structureDetail: Record<string, number | string | string[]>;
  if (question.type === "behavioural") {
    const present = (Object.keys(STAR) as Array<keyof typeof STAR>).filter((k) => STAR[k].some((p) => containsPhrase(text, p)));
    structureScore = Math.max(0, present.length - 1); // 4 parts -> 3, 1 part -> 0
    structureDetail = { starFound: present, starMissing: (Object.keys(STAR) as string[]).filter((k) => !present.includes(k as keyof typeof STAR)) };
  } else {
    const sentences = text.split(/[.!?]+\s/).filter((s) => s.trim().length > 0).length;
    const hasExample = EXAMPLE_CUES.some((c) => containsPhrase(text, c));
    const hasSteps = /\b(first|then|next|finally|after that|step)\b/.test(text);
    structureScore = Math.min(3, (sentences >= 2 ? 1 : 0) + (hasExample ? 1 : 0) + (hasSteps ? 1 : 0));
    structureDetail = { sentences, hasExample: hasExample ? "yes" : "no", hasSteps: hasSteps ? "yes" : "no" };
  }

  // 3. depth (length relative to the question's expected range)
  let depthScore: number;
  if (wordCount < question.minWords / 2) depthScore = 0;
  else if (wordCount < question.minWords) depthScore = 1;
  else if (wordCount < question.idealWords) depthScore = 2;
  else if (wordCount <= question.idealWords * 2.5) depthScore = 3;
  else depthScore = 2; // very long answers lose focus

  // 4. evidence: numbers, named tools/technologies, personal ownership
  const numbers = (text.match(/\b\d+(?:\.\d+)?%?/g) ?? []).length;
  const tools = extractSkills(answer).skills.length;
  // "I" + a past-tense action: regular verbs ending in -ed or common irregular ones
  const ownership = (text.match(/\bi (?:\w+ed|built|wrote|led|made|ran|set up|taught|took|chose|found|learnt|drove)\b/g) ?? []).length;
  const evidenceScore = Math.min(3, (numbers > 0 ? 1 : 0) + (tools > 0 ? 1 : 0) + (ownership > 0 ? 1 : 0));

  // 5. clarity: sentence length and repetition
  const sentenceList = answer.split(/[.!?]+/).map((s) => s.trim()).filter(Boolean);
  const avgSentence = sentenceList.length ? wordCount / sentenceList.length : wordCount;
  const unique = new Set(words.map((w) => w.replace(/[^a-z0-9]/g, ""))).size;
  const uniqueRatio = wordCount ? unique / wordCount : 0;
  let clarityScore = 3;
  if (avgSentence > 30) clarityScore -= 1;
  if (avgSentence > 45) clarityScore -= 1;
  if (wordCount >= 20 && uniqueRatio < 0.4) clarityScore -= 1;
  if (wordCount < 5) clarityScore = 0;
  clarityScore = Math.max(0, clarityScore);

  const criteria: CriterionResult[] = [
    { criterion: "keyPoints", score: keyScore, detail: { covered: covered.length, total: question.keyPoints.length } },
    { criterion: "structure", score: structureScore, detail: structureDetail },
    { criterion: "depth", score: depthScore, detail: { words: wordCount, min: question.minWords, ideal: question.idealWords } },
    { criterion: "evidence", score: evidenceScore, detail: { numbers, tools, ownership } },
    { criterion: "clarity", score: clarityScore, detail: { avgSentence: Math.round(avgSentence), uniqueRatio: Math.round(uniqueRatio * 100) } }
  ];
  const total = Math.round(criteria.reduce((sum, c) => sum + RUBRIC_WEIGHTS[c.criterion] * (c.score / 3) * 100, 0));
  return {
    questionId: question.id,
    total,
    band: total >= 75 ? "strong" : total >= 50 ? "developing" : "practice",
    criteria,
    coveredPoints: coveredLabels,
    missedPoints: missed,
    wordCount
  };
}

export type SessionSummary = {
  answered: number;
  average: number;
  criterionAverages: Record<Criterion, number>;
  weakest: Criterion | null;
  /** Skills whose questions scored below 50, to practise next. */
  practiseSkills: string[];
};

export function summariseSession(results: Array<{ question: InterviewQuestion; feedback: AnswerFeedback }>): SessionSummary {
  const crit = Object.keys(RUBRIC_WEIGHTS) as Criterion[];
  const criterionAverages = Object.fromEntries(crit.map((c) => [c, 0])) as Record<Criterion, number>;
  if (results.length === 0) return { answered: 0, average: 0, criterionAverages, weakest: null, practiseSkills: [] };
  for (const c of crit) {
    criterionAverages[c] = results.reduce((s, r) => s + (r.feedback.criteria.find((x) => x.criterion === c)?.score ?? 0), 0) / results.length;
  }
  const weakest = crit.reduce((w, c) => (criterionAverages[c] < criterionAverages[w] ? c : w), crit[0]);
  const practiseSkills = [...new Set(results.filter((r) => r.feedback.total < 50 && r.question.skillId).map((r) => r.question.skillId as string))];
  return {
    answered: results.length,
    average: Math.round(results.reduce((s, r) => s + r.feedback.total, 0) / results.length),
    criterionAverages,
    weakest,
    practiseSkills
  };
}
