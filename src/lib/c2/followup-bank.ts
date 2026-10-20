import source from "./followup-bank.json";
import type { Concern, FollowUp } from "./assessment";

export type AdaptiveQuestion = FollowUp & {
  topics: Concern[];
  facet: string;
  priority: number;
  when?: { questionId: string; answers: string[] }[];
  signals?: { answer: string; topics?: Concern[]; dismissTopics?: Concern[] }[];
  screening?: { scale: "phq9" | "gad7"; index: number }[];
};
export type FollowupBank = {
  version: string;
  reviewStatus: string;
  minimumQuestions: number;
  maximumQuestions: number;
  sources: string[];
  questions: AdaptiveQuestion[];
};
const TOPICS = new Set<Concern>(["low-mood", "worry", "sleep", "study", "connection"]);
const isTopic = (value: unknown): value is Concern => typeof value === "string" && TOPICS.has(value as Concern);

export function validateFollowupBank(value: unknown): FollowupBank {
  const bank = value as FollowupBank;
  if (!bank || bank.version !== "c2-adaptive-followups-v1" || bank.minimumQuestions !== 5 || bank.maximumQuestions !== 9 || !Array.isArray(bank.questions) || bank.questions.length !== 100) throw new Error("Invalid follow-up bank");
  const ids = new Set<string>(), texts = new Set<string>(), facets = new Set<string>();
  for (const q of bank.questions) {
    if (!q || typeof q.id !== "string" || !/^[a-z][a-z0-9-]*$/.test(q.id) || ids.has(q.id) || typeof q.text !== "string" || q.text.length < 25 || texts.has(q.text.toLowerCase()) || !Array.isArray(q.options) || q.options.length < 3 || q.options.length > 6 || q.options.some((x) => typeof x !== "string" || x.length < 2) || new Set(q.options).size !== q.options.length || !Array.isArray(q.topics) || q.topics.length > 1 || q.topics.some((x) => !isTopic(x)) || typeof q.facet !== "string" || !q.facet || facets.has(q.facet) || !Number.isFinite(q.priority)) throw new Error("Invalid follow-up question");
    ids.add(q.id); texts.add(q.text.toLowerCase()); facets.add(q.facet);
  }
  if (bank.questions.filter((q) => !q.topics.length).length !== 15 || [...TOPICS].some((topic) => bank.questions.filter((q) => q.topics.includes(topic)).length !== 17)) throw new Error("Invalid follow-up topic coverage");
  for (const q of bank.questions) {
    if (q.when?.some((c) => !ids.has(c.questionId) || !Array.isArray(c.answers) || !c.answers.length || c.answers.some((a) => !bank.questions.find((x) => x.id === c.questionId)?.options.includes(a)))) throw new Error("Invalid follow-up condition");
    if (q.signals?.some((s) => !q.options.includes(s.answer) || s.topics?.some((t) => !isTopic(t)) || s.dismissTopics?.some((t) => !isTopic(t)))) throw new Error("Invalid follow-up response signal");
    if (q.screening?.some((s) => !["phq9", "gad7"].includes(s.scale) || !Number.isInteger(s.index) || s.index < 0 || s.index >= (s.scale === "phq9" ? 9 : 7))) throw new Error("Invalid follow-up screening reference");
  }
  return bank;
}

export const BUNDLED_FOLLOWUP_BANK = validateFollowupBank(source);

/** Fetches only public question text. Check-in answers never enter this request. */
export async function loadFollowupBank(): Promise<{ bank: FollowupBank; source: "database" | "bundled" }> {
  try {
    const response = await fetch("/api/c2/follow-up-questions", { cache: "no-store" });
    if (!response.ok) throw new Error("Question bank unavailable");
    const bank = validateFollowupBank(await response.json());
    // A training/demo session stays reproducible against the reviewed local revision.
    if (JSON.stringify(bank) !== JSON.stringify(BUNDLED_FOLLOWUP_BANK)) throw new Error("Question bank revision mismatch");
    return { bank, source: "database" };
  } catch {
    return { bank: BUNDLED_FOLLOWUP_BANK, source: "bundled" };
  }
}
