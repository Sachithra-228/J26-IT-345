import {
  assessmentConcerns,
  CONCERNS,
  type Assessment,
  type Concern,
} from "./assessment";

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
export type PlanItem = { activityId: string; reason: string };
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
export function createWellnessPlan(assessment: Assessment | null): PlanItem[] {
  const topics = assessmentConcerns(assessment);
  const picks: PlanItem[] = [];
  for (const topic of topics) {
    const activityId =
      topic === "study" &&
      assessment?.context.study === "I would like help planning my workload"
        ? "workload"
        : ACTIVITIES.find((item) => item.topic === topic)!.id;
    const entryId = topic === "low-mood" ? "mood" : topic;
    const answer = assessment?.context[entryId];
    picks.push({
      activityId,
      reason: answer
        ? `You mentioned “${answer}” while exploring ${CONCERNS[topic].label.toLowerCase()}.`
        : assessment?.concernAnalysis
          ? `You chose ${CONCERNS[topic].label.toLowerCase()} as a support topic.`
          : `This idea relates to ${CONCERNS[topic].label.toLowerCase()} from your check-in. You can choose something different.`,
    });
    if (picks.length === 3) break;
  }
  for (const id of ["pause", "reach-out", "small-start"]) {
    if (picks.length === 3) break;
    if (!picks.some((item) => item.activityId === id))
      picks.push({
        activityId: id,
        reason: topics.length
          ? "Another option you can keep, replace or leave for later."
          : "A starting option you can choose without completing an assessment.",
      });
  }
  return picks;
}
