import {
  CONCERNS,
  type Assessment,
  type Answer,
  type Concern,
  type FollowUp,
  scoreScale,
} from "./assessment";
import {
  BUNDLED_FOLLOWUP_BANK,
  type AdaptiveQuestion,
  type FollowupBank,
} from "./followup-bank";
import type { ConcernPrediction } from "./concern-runtime";

export type ConcernAnalysis = {
  prediction: ConcernPrediction | null;
  confirmed: Concern[];
  source: "distilbert-confirmed" | "student-selected";
  safetySupportRequested?: boolean;
};
const ENTRY_QUESTION: Record<Concern, string> = {
  "low-mood": "mood",
  worry: "worry",
  sleep: "sleep",
  study: "study",
  connection: "connection",
  stress: "stress",
  panic: "panic",
  relationships: "relationships",
  grief: "grief",
  "self-esteem": "self-esteem",
  anger: "anger",
  eating: "eating",
  "substance-use": "substance-use",
  trauma: "trauma",
  practical: "practical",
};

/** Answer choices can explicitly add a topic or say it is no longer relevant. */
export function resolvedConcernTopics(
  analysis: ConcernAnalysis,
  context: Record<string, string>,
  bank: FollowupBank = BUNDLED_FOLLOWUP_BANK,
): Concern[] {
  const topics = new Set(analysis.confirmed),
    dismissed = new Set<Concern>();
  for (const question of bank.questions) {
    const signal = question.signals?.find(
      (item) => item.answer === context[question.id],
    );
    signal?.topics?.forEach((topic) => topics.add(topic));
    signal?.dismissTopics?.forEach((topic) => dismissed.add(topic));
  }
  return [...topics].filter((topic) => !dismissed.has(topic));
}

export function followupTarget(
  analysis: ConcernAnalysis,
  context: Record<string, string>,
  bank: FollowupBank = BUNDLED_FOLLOWUP_BANK,
): number {
  const topicCount = resolvedConcernTopics(analysis, context, bank).length;
  const highImpact = ["Very difficult", "Extremely difficult"].includes(
    context.impact,
  )
    ? 1
    : 0;
  return Math.min(
    bank.maximumQuestions,
    Math.max(
      bank.minimumQuestions,
      5 + Math.max(0, topicCount - 1) + highImpact,
    ),
  );
}

function screeningWeight(
  question: AdaptiveQuestion,
  phq9: readonly Answer[],
  gad7: readonly Answer[],
): number {
  return (
    Math.max(
      0,
      ...(question.screening ?? []).map(
        ({ scale, index }) =>
          (scale === "phq9" ? phq9[index] : gad7[index]) ?? 0,
      ),
    ) * 5
  );
}

function candidateScore(
  question: AdaptiveQuestion,
  analysis: ConcernAnalysis,
  context: Record<string, string>,
  asked: readonly string[],
  phq9: readonly Answer[],
  gad7: readonly Answer[],
): number {
  const topic = question.topics[0];
  if (!topic)
    return 18 + question.priority + (question.id === "impact" ? 3 : 0);
  const modelScore = analysis.prediction?.scores.find(
    (item) => item.topic === topic,
  )?.score;
  const priority = Math.max(0.5, modelScore ?? 0.5);
  const hasEntry = asked.includes(ENTRY_QUESTION[topic]);
  const matchesPriorAnswer = question.when?.some((condition) =>
    condition.answers.includes(context[condition.questionId]),
  );
  return (
    55 * priority +
    screeningWeight(question, phq9, gad7) +
    question.priority +
    (question.id === ENTRY_QUESTION[topic] && !hasEntry ? 30 : 0) +
    (matchesPriorAnswer ? 50 : 0) -
    (hasEntry ? 20 : 0)
  );
}

/** DistilBERT ranks topic scope; answer branches and stopping use explicit rules. */
export function nextConcernQuestion(
  analysis: ConcernAnalysis,
  context: Record<string, string>,
  asked: readonly string[],
  bank: FollowupBank = BUNDLED_FOLLOWUP_BANK,
  phq9: readonly Answer[] = [],
  gad7: readonly Answer[] = [],
): FollowUp | null {
  const target = followupTarget(analysis, context, bank);
  if (asked.length >= target || asked.length >= bank.maximumQuestions)
    return null;
  const topics = resolvedConcernTopics(analysis, context, bank);
  const byId = new Map(
    bank.questions.map((question) => [question.id, question]),
  );
  const eligible = bank.questions.filter((question) => {
    if (
      asked.includes(question.id) ||
      (question.topics.length && !topics.includes(question.topics[0]))
    )
      return false;
    if (
      question.when?.some(
        (condition) =>
          !condition.answers.includes(context[condition.questionId]),
      )
    )
      return false;
    if (
      question.topics.length &&
      question.id !== ENTRY_QUESTION[question.topics[0]] &&
      !asked.includes(ENTRY_QUESTION[question.topics[0]])
    )
      return false;
    return !asked.some((id) => byId.get(id)?.facet === question.facet);
  });
  const remaining = target - asked.length;
  const selected =
    (remaining <= 2 && !asked.includes("impact")
      ? eligible.find((q) => q.id === "impact")
      : undefined) ??
    (remaining <= 1 && !asked.includes("goal")
      ? eligible.find((q) => q.id === "goal")
      : undefined) ??
    eligible
      .map((question, order) => ({
        question,
        order,
        score: candidateScore(question, analysis, context, asked, phq9, gad7),
      }))
      .sort((a, b) => b.score - a.score || a.order - b.order)[0]?.question;
  if (!selected) return null;
  const topic = selected.topics[0];
  const branch = selected.when?.find((condition) =>
    condition.answers.includes(context[condition.questionId]),
  );
  const reason = branch
    ? `Your earlier answer “${context[branch.questionId]}” led to this more specific question.`
    : topic
      ? `${CONCERNS[topic].label} ${analysis.confirmed.includes(topic) ? "was a topic you chose" : "came up in an earlier answer"}. ${analysis.prediction && analysis.confirmed.includes(topic) ? "The text model helped rank this topic." : "Your answers help choose the next question."}`
      : selected.id === "impact"
        ? "This asks how your concerns affect day-to-day life; it does not change your screening scores."
        : selected.id === "goal"
          ? "Your preferred next step helps shape support suggestions."
          : "This adds context to help you choose useful support.";
  return {
    id: selected.id,
    text: selected.text,
    options: selected.options,
    reason,
  };
}

export function concernExplanation(assessment: Assessment): string[] {
  const lines: string[] = [];
  for (const kind of ["phq9", "gad7"] as const) {
    const result = scoreScale(kind, assessment[kind]);
    lines.push(
      result.total === null
        ? `${kind === "phq9" ? "PHQ-9" : "GAD-7"} is incomplete; no symptom range was calculated.`
        : `${kind === "phq9" ? "PHQ-9" : "GAD-7"}: ${result.total}/${result.maximum}, in the ${result.band!.toLowerCase()} symptom range. This comes from your questionnaire answers.`,
    );
  }
  const analysis = assessment.concernAnalysis;
  if (analysis) {
    const topics =
      assessment.supportTopics ??
      resolvedConcernTopics(analysis, assessment.context);
    if (topics.length)
      lines.push(
        `Your support topics: ${topics.map((topic) => CONCERNS[topic].label.toLowerCase()).join(", ")}. These topics help personalise your support options.`,
      );
    else
      lines.push(
        "You did not confirm a specific support topic. You can still explore all professionals and community resources.",
      );
  }
  if (assessment.context.impact)
    lines.push(
      `Daily-life impact you reported: ${assessment.context.impact.toLowerCase()}.`,
    );
  if (assessment.context.duration)
    lines.push(
      `Duration you reported: ${assessment.context.duration.toLowerCase()}.`,
    );
  if (assessment.context.goal)
    lines.push(
      `Your preferred next step: ${assessment.context.goal.toLowerCase()}.`,
    );
  for (const item of assessment.questionPath ?? []) {
    const answer = assessment.context[item.id];
    if (answer && !["impact", "duration", "goal"].includes(item.id))
      lines.push(
        `For “${item.text ?? item.id}” you chose: ${answer.toLowerCase()}.`,
      );
  }
  return lines;
}

/** Only student-confirmed topics influence professional priority scores. */
export function confirmedTopicWeights(
  analysis: ConcernAnalysis,
): Partial<Record<Concern, number>> {
  return Object.fromEntries(
    analysis.confirmed.map((topic) => [
      topic,
      Math.max(
        0.5,
        analysis.prediction?.scores.find((item) => item.topic === topic)
          ?.score ?? 1,
      ),
    ]),
  );
}
