import {
  assessmentConcerns,
  CONCERNS,
  type Assessment,
  type Concern,
} from "./assessment";
import { EXPANDED_ACTIVITIES } from "./expanded-activities";
import identity from "./model/concern-identity.json";
import { BUNDLED_FOLLOWUP_BANK } from "./followup-bank";

export type Activity = {
  id: string;
  topic: Concern | "general";
  title: string;
  description: string;
  minutes: number;
  source: { label: string; url: string };
  steps: { title: string; body: string; prompt: string }[];
};
const tasks = {
  label: "NHS · practical activity ideas",
  url: "https://www.nhs.uk/every-mind-matters/mental-wellbeing-tips/self-help-cbt-techniques/tackling-your-to-do-list/",
};
const worries = {
  label: "NHS · understanding worries",
  url: "https://www.nhs.uk/every-mind-matters/mental-wellbeing-tips/self-help-cbt-techniques/tackling-your-worries/",
};
const sleep = {
  label: "NHS · sleep and routines",
  url: "https://www.nhs.uk/every-mind-matters/mental-wellbeing-tips/how-to-fall-asleep-faster-and-sleep-better/",
};
const stress = {
  label: "WHO · stress-management guide",
  url: "https://www.who.int/publications/i/item/9789240003927",
};

// Original planning prompts informed by linked guidance. Professional review is pending.
export const ACTIVITIES: Activity[] = [
  ...EXPANDED_ACTIVITIES,
  {
    id: "small-start",
    topic: "study",
    title: "Make one task easier to start",
    description: "Turn a large study task into a manageable first move.",
    minutes: 4,
    source: tasks,
    steps: [
      {
        title: "Choose one task",
        body: "Pick something you want to approach, even if you cannot finish it today.",
        prompt: "What task would you like to begin?",
      },
      {
        title: "Shrink the first move",
        body: "Think of one small action, such as opening a document or finding a reading.",
        prompt: "What is your first small action?",
      },
      {
        title: "Give it a place",
        body: "Choose a realistic time and somewhere you can get started. You can pause afterwards.",
        prompt: "When and where could you try it?",
      },
    ],
  },
  {
    id: "workload",
    topic: "study",
    title: "Make room in your workload",
    description: "Decide what needs attention and what can wait.",
    minutes: 4,
    source: tasks,
    steps: [
      {
        title: "Name the priorities",
        body: "Choose a few commitments rather than trying to solve the whole week.",
        prompt: "Which commitments need your attention?",
      },
      {
        title: "Choose what can wait",
        body: "A realistic plan includes rest and room for changes.",
        prompt: "What could you postpone or ask for help with?",
      },
      {
        title: "Choose one next step",
        body: "Make the next action small enough for the time and energy available.",
        prompt: "What will you focus on first?",
      },
    ],
  },
  {
    id: "worry-step",
    topic: "worry",
    title: "Find a next step for a worry",
    description:
      "Separate a possible action from things you cannot settle right now.",
    minutes: 4,
    source: worries,
    steps: [
      {
        title: "Name one worry",
        body: "A brief description is enough. You can leave the writing blank.",
        prompt: "What would you like to make space for?",
      },
      {
        title: "Notice what is possible",
        body: "Consider whether there is something practical you can influence today.",
        prompt: "Is there an action within your control?",
      },
      {
        title: "Choose how to continue",
        body: "You might take that action, return to another activity or speak with someone you trust.",
        prompt: "What feels like a useful next step?",
      },
    ],
  },
  {
    id: "wind-down",
    topic: "sleep",
    title: "Plan a gentler evening",
    description:
      "Choose a small routine that could help you settle for the night.",
    minutes: 3,
    source: sleep,
    steps: [
      {
        title: "Notice your evening",
        body: "Consider what usually makes it difficult to slow down.",
        prompt: "What tends to keep your evening busy?",
      },
      {
        title: "Pick a quiet transition",
        body: "Choose something comfortable, such as reading or listening to quiet music.",
        prompt: "What would help mark a calmer part of the evening?",
      },
      {
        title: "Make it realistic",
        body: "Try a routine that fits your circumstances; you do not need to force sleep.",
        prompt: "When could you try this?",
      },
    ],
  },
  {
    id: "reach-out",
    topic: "connection",
    title: "Prepare a small connection",
    description:
      "Think about a person or place where contact might feel comfortable.",
    minutes: 3,
    source: stress,
    steps: [
      {
        title: "Choose a connection",
        body: "This might be a trusted person, a student group or professional support.",
        prompt: "Who or what would feel comfortable to approach?",
      },
      {
        title: "Choose your words",
        body: "You decide how much to share. A simple greeting is enough.",
        prompt: "What might you want to say?",
      },
      {
        title: "Keep your choice",
        body: "You can send it later, change it or choose another way to connect. Nothing is sent here.",
        prompt: "What next step feels right for you?",
      },
    ],
  },
  {
    id: "meaningful-moment",
    topic: "low-mood",
    title: "Choose a manageable moment",
    description: "Make space for one small activity that matters to you.",
    minutes: 3,
    source: tasks,
    steps: [
      {
        title: "Think of something meaningful",
        body: "Choose a familiar activity you value, without expecting it to change how you feel immediately.",
        prompt: "What small activity comes to mind?",
      },
      {
        title: "Adapt it to today",
        body: "A shorter or easier version can still count.",
        prompt: "What version would fit your energy today?",
      },
      {
        title: "Make space for it",
        body: "Consider a time, place or person that could make trying it easier.",
        prompt: "What would help you give it a little space?",
      },
    ],
  },
  {
    id: "pause",
    topic: "general",
    title: "Pause and notice",
    description:
      "Take a brief pause and choose what deserves your attention next.",
    minutes: 2,
    source: stress,
    steps: [
      {
        title: "Settle where you are",
        body: "If comfortable, notice the chair or floor supporting you. Keep your eyes open if you prefer.",
        prompt: "What do you notice around you?",
      },
      {
        title: "Notice the present",
        body: "Look for one ordinary detail in your surroundings. Skip this if it feels uncomfortable.",
        prompt: "What detail would you like to notice?",
      },
      {
        title: "Choose your direction",
        body: "Consider one thing you want to do next, including taking a break or asking for support.",
        prompt: "Where would you like to put your attention?",
      },
    ],
  },
];
export type PlanItem = {
  activityId: string;
  reason: string;
  basis?: "model-topics" | "answers" | "topics" | "general" | "chosen";
};
export type PlanRecommendation = PlanItem & {
  topic: Concern;
  priority: number;
};
export const PLAN_RECOMMENDATION_VERSION = "c2-topic-plan-v2";
export type ActivityCompletion = {
  id: string;
  activityId: string;
  completedAt: string;
  before: number | null;
  after: number | null;
};
/** Local record identifier only; never used as an authentication token. */
export function newLocalEntryId(): string {
  return (
    globalThis.crypto?.randomUUID?.() ??
    `${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}`
  );
}
export const activityById = (id: string) =>
  ACTIVITIES.find((item) => item.id === id);
/** Reuse an already completed main-model prediction; planning never starts ML. */
export function hasUsablePlanPrediction(
  assessment: Assessment | null,
): boolean {
  const analysis = assessment?.concernAnalysis;
  const prediction = analysis?.prediction;
  return !!(
    analysis?.source === "distilbert-confirmed" &&
    prediction?.runId === identity.runId &&
    prediction.checkpointSha256 === identity.checkpointSha256 &&
    prediction.threshold > 0 &&
    prediction.threshold < 1 &&
    prediction.scores.length === identity.labels.length &&
    new Set(prediction.scores.map((item) => item.topic)).size ===
      identity.labels.length &&
    prediction.scores.every(
      (item) =>
        identity.labels.includes(item.topic) &&
        Number.isFinite(item.score) &&
        item.score >= 0 &&
        item.score <= 1,
    )
  );
}

/** Policy ranking of authored activities, not a trained treatment recommender. */
export function recommendWellnessActivities(
  assessment: Assessment | null,
): PlanRecommendation[] {
  const topics = [...new Set(assessmentConcerns(assessment))];
  const useModel = hasUsablePlanPrediction(assessment);
  const dismissed = new Set(
    BUNDLED_FOLLOWUP_BANK.questions.flatMap(
      (question) =>
        question.signals?.find(
          (signal) => signal.answer === assessment?.context[question.id],
        )?.dismissTopics ?? [],
    ),
  );
  return topics
    .filter((topic) => !dismissed.has(topic))
    .map((topic) => {
      const activityId =
        topic === "study" &&
        assessment?.context.study === "I would like help planning my workload"
          ? "workload"
          : (ACTIVITIES.find((item) => item.topic === topic)?.id ?? "pause");
      const entryId = topic === "low-mood" ? "mood" : topic;
      const entry = BUNDLED_FOLLOWUP_BANK.questions.find(
        (question) => question.id === entryId,
      );
      const reported = assessment?.context[entryId];
      const answer =
        reported && entry?.options.includes(reported) ? reported : undefined;
      const detail = BUNDLED_FOLLOWUP_BANK.questions.find(
        (question) =>
          question.id !== entryId &&
          question.topics.includes(topic) &&
          assessment?.questionPath?.some((item) => item.id === question.id) &&
          question.options.includes(assessment.context[question.id]) &&
          question.when?.every((condition) =>
            condition.answers.includes(
              assessment.context[condition.questionId],
            ),
          ),
      );
      // Only a reviewed/confirmed topic may use its score. A high unconfirmed
      // prediction cannot add an activity. Student-added topics retain a floor.
      const score =
        useModel && assessment?.concernAnalysis?.confirmed.includes(topic)
          ? assessment.concernAnalysis.prediction?.scores.find(
              (item) => item.topic === topic,
            )?.score
          : undefined;
      const modelSuggested =
        score !== undefined &&
        score >= assessment!.concernAnalysis!.prediction!.threshold;
      const reasons = [
        assessment?.concernAnalysis
          ? `You chose ${CONCERNS[topic].label.toLowerCase()} as a support topic.`
          : `This idea relates to ${CONCERNS[topic].label.toLowerCase()} from your check-in.`,
      ];
      if (modelSuggested)
        reasons.push("DistilBERT helped prioritise this confirmed topic.");
      if (answer) reasons.push(`You mentioned “${answer}”.`);
      if (detail)
        reasons.push(`You also chose “${assessment!.context[detail.id]}”.`);
      return {
        activityId,
        topic,
        basis: modelSuggested ? "model-topics" : answer ? "answers" : "topics",
        reason: reasons.join(" "),
        priority:
          1 +
          (modelSuggested ? Math.max(0.5, score!) : 0.5) +
          (answer ? 0.25 : 0) +
          (detail ? 0.1 : 0),
      } satisfies PlanRecommendation;
    })
    .sort((a, b) => b.priority - a.priority);
}

export function createWellnessPlan(assessment: Assessment | null): PlanItem[] {
  const recommendations = recommendWellnessActivities(assessment);
  const picks: PlanItem[] = recommendations
    .slice(0, 3)
    .map(({ activityId, reason, basis }) => ({ activityId, reason, basis }));
  for (const id of ["pause", "reach-out", "small-start"]) {
    if (picks.length === 3) break;
    if (!picks.some((item) => item.activityId === id))
      picks.push({
        activityId: id,
        basis: "general",
        reason: recommendations.length
          ? "Another option you can keep, replace or leave for later."
          : "A starting option you can choose without completing an assessment.",
      });
  }
  return picks;
}
