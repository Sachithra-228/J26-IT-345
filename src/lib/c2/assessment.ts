/** Standard scores are independent of the optional, unvalidated context questions. */
import type { SupportEstimate } from "./support-runtime";
import type { ConcernAnalysis } from "./concern-routing";
export const QUESTIONNAIRE_VERSION = "c2-phq9-gad7-en-v1";
export const QUESTIONNAIRE_SOURCE =
  "https://www.phqscreeners.com/images/sites/g/files/g10016261/f/201412/instructions.pdf";
export const RECALL_PROMPT =
  "Over the last 2 weeks, how often have you been bothered by the following problems?";
export const FREQUENCY = [
  "Not at all",
  "Several days",
  "More than half the days",
  "Nearly every day",
] as const;
export const PHQ9 = [
  "Little interest or pleasure in doing things",
  "Feeling down, depressed, or hopeless",
  "Trouble falling or staying asleep, or sleeping too much",
  "Feeling tired or having little energy",
  "Poor appetite or overeating",
  "Feeling bad about yourself — or that you are a failure or have let yourself or your family down",
  "Trouble concentrating on things, such as reading the newspaper or watching television",
  "Moving or speaking so slowly that other people could have noticed? Or the opposite — being so fidgety or restless that you have been moving around a lot more than usual",
  "Thoughts that you would be better off dead, or of hurting yourself in some way",
] as const;
export const GAD7 = [
  "Feeling nervous, anxious, or on edge",
  "Not being able to stop or control worrying",
  "Worrying too much about different things",
  "Trouble relaxing",
  "Being so restless that it is hard to sit still",
  "Becoming easily annoyed or irritable",
  "Feeling afraid, as if something awful might happen",
] as const;
export type Answer = 0 | 1 | 2 | 3 | null;
export type Concern = "low-mood" | "worry" | "sleep" | "study" | "connection";
export const CONCERNS: Record<
  Concern,
  { label: string; description: string; keywords: string[] }
> = {
  "low-mood": {
    label: "Low mood & motivation",
    description: "Finding a manageable next step when things feel heavy.",
    keywords: ["depression", "low mood", "motivation"],
  },
  worry: {
    label: "Worry & anxiety",
    description: "Talking through worry and finding space to pause.",
    keywords: ["anxiety", "worry", "stress"],
  },
  sleep: {
    label: "Sleep & routines",
    description: "Sharing experiences around rest and daily routines.",
    keywords: ["sleep", "insomnia", "routine"],
  },
  study: {
    label: "Study & exam pressure",
    description: "Taking university demands one step at a time.",
    keywords: ["academic", "study", "exam", "stress"],
  },
  connection: {
    label: "Connection & belonging",
    description: "Finding people to talk to and feeling less alone.",
    keywords: ["lonely", "loneliness", "relationship", "belonging", "friend"],
  },
};
export type ScaleResult = {
  answered: number;
  total: number | null;
  maximum: number;
  band: string | null;
  missing: number[];
};
export type Assessment = {
  phq9: Answer[];
  gad7: Answer[];
  context: Record<string, string>;
  completedAt: string;
  version: string;
  supportModel?: SupportEstimate;
  concernAnalysis?: ConcernAnalysis;
  questionPath?: { id: string; text?: string; reason: string }[];
  questionBankVersion?: string;
  questionBankSource?: "database" | "bundled";
  supportTopics?: Concern[];
  contextRouting?: "model" | "rules" | "distilbert" | "student-topics";
};
export function scoreScale(
  kind: "phq9" | "gad7",
  answers: readonly Answer[],
): ScaleResult {
  const length = kind === "phq9" ? 9 : 7;
  if (
    answers.length !== length ||
    Array.from(answers).some(
      (value) =>
        value !== null && (!Number.isInteger(value) || value < 0 || value > 3),
    )
  )
    throw new Error("Invalid questionnaire responses");
  const missing = answers.flatMap((value, index) =>
    value === null ? [index + 1] : [],
  );
  const maximum = length * 3;
  if (missing.length)
    return {
      answered: length - missing.length,
      total: null,
      maximum,
      band: null,
      missing,
    };
  const total = answers.reduce<number>((sum, value) => sum + (value ?? 0), 0);
  const band =
    kind === "phq9"
      ? total >= 20
        ? "Severe"
        : total >= 15
          ? "Moderately severe"
          : total >= 10
            ? "Moderate"
            : total >= 5
              ? "Mild"
              : "Minimal"
      : total >= 15
        ? "Severe"
        : total >= 10
          ? "Moderate"
          : total >= 5
            ? "Mild"
            : "Minimal";
  return { answered: length, total, maximum, band, missing };
}
export function selfHarmResponse(
  answers: readonly Answer[],
): "reported" | "not-reported" | "unanswered" {
  return answers[8] == null
    ? "unanswered"
    : answers[8]! > 0
      ? "reported"
      : "not-reported";
}
export type FollowUp = {
  id: string;
  text: string;
  reason: string;
  options: readonly string[];
};
const CONTEXT_BANK: FollowUp[] = [
  {
    id: "impact",
    text: "If you checked off any problems, how difficult have these problems made it for you to do your work, take care of things at home, or get along with other people?",
    reason:
      "This adds context about daily life; it is not included in either score.",
    options: [
      "Not difficult at all",
      "Somewhat difficult",
      "Very difficult",
      "Extremely difficult",
    ],
  },
  {
    id: "sleep",
    text: "What would you most like help with around sleep?",
    reason: "You reported some difficulty with sleep.",
    options: [
      "Getting to sleep",
      "Staying asleep",
      "Sleeping too much",
      "Building a routine",
    ],
  },
  {
    id: "worry",
    text: "Which area is most connected to your worry right now?",
    reason: "You reported worry or difficulty relaxing.",
    options: [
      "Study or exams",
      "Money or practical problems",
      "Relationships",
      "Several things",
      "I am not sure",
    ],
  },
  {
    id: "mood",
    text: "What feels hardest when your mood is low?",
    reason: "You reported low mood or reduced interest.",
    options: [
      "Getting started",
      "Enjoying things",
      "Feeling connected",
      "Getting through daily tasks",
      "I am not sure",
    ],
  },
  {
    id: "duration",
    text: "How long have the concerns you want to discuss been affecting you?",
    reason: "Optional context helps you describe your experience.",
    options: [
      "Less than two weeks",
      "Two weeks to a month",
      "More than a month",
      "On and off",
      "No current concern",
    ],
  },
  {
    id: "goal",
    text: "What would feel most useful to you today?",
    reason: "You choose the kind of support you want.",
    options: [
      "Practical coping ideas",
      "Talk to a professional",
      "Connect with other students",
      "Understand my answers",
    ],
  },
];
/** Fixed bank, deterministic selection. No generated clinical questions or extra score. */
export function followUps(
  phq9: readonly Answer[],
  gad7: readonly Answer[],
): FollowUp[] {
  const ids = new Set(["duration", "goal"]);
  if ([...phq9, ...gad7].some((v) => v !== null && v > 0)) ids.add("impact");
  if ((phq9[2] ?? 0) > 0) ids.add("sleep");
  if (gad7.slice(0, 4).some((v) => (v ?? 0) > 0)) ids.add("worry");
  if (phq9.slice(0, 2).some((v) => (v ?? 0) > 0)) ids.add("mood");
  return CONTEXT_BANK.filter((item) => ids.has(item.id));
}
export function assessmentConcerns(assessment: Assessment | null): Concern[] {
  if (!assessment) return [];
  // New main flow uses student-confirmed concerns and explicit context answers.
  // Do not reintroduce a topic the student rejected from a symptom score alone.
  if (assessment.concernAnalysis) {
    if (assessment.supportTopics) return assessment.supportTopics;
    const confirmed = [...assessment.concernAnalysis.confirmed];
    if (assessment.context.worry === "Study or exams") confirmed.push("study");
    if (assessment.context.worry === "Relationships" || assessment.context.mood === "Feeling connected") confirmed.push("connection");
    return Array.from(new Set(confirmed));
  }
  const topics: Concern[] = [];
  if (assessment.phq9.slice(0, 2).some((v) => (v ?? 0) > 0))
    topics.push("low-mood");
  if (assessment.gad7.slice(0, 4).some((v) => (v ?? 0) > 0))
    topics.push("worry");
  if ((assessment.phq9[2] ?? 0) > 0) topics.push("sleep");
  if (assessment.context.worry === "Study or exams") topics.push("study");
  if (
    assessment.context.mood === "Feeling connected" ||
    assessment.context.worry === "Relationships"
  )
    topics.push("connection");
  if (assessment.supportModel?.status === "ready") {
    topics.push(...assessment.supportModel.topics.filter((item) => item.score >= 0.5).slice(0, 3).map((item) => item.topic));
  }
  return Array.from(new Set(topics));
}
export function supportSuggestion(assessment: Assessment): {
  title: string;
  body: string;
} {
  const p = scoreScale("phq9", assessment.phq9),
    g = scoreScale("gad7", assessment.gad7);
  if (selfHarmResponse(assessment.phq9) === "reported")
    return {
      title: "Make room for a human conversation",
      body: "You reported thoughts about death or self-harm. Please speak with a qualified professional about this, regardless of your totals. If you feel unable to stay safe, use the immediate-help options now.",
    };
  if (p.total === null || g.total === null)
    return {
      title: "Some answers are still open",
      body: "A complete screening result is unavailable for any unfinished questionnaire. You can review the missing answers or explore support now.",
    };
  if (
    p.total >= 10 ||
    g.total >= 10 ||
    ["Very difficult", "Extremely difficult"].includes(
      assessment.context.impact,
    ) ||
    assessment.context.goal === "Talk to a professional"
  )
    return {
      title: "Consider talking with a professional",
      body: "Your answers or support preference make a professional conversation a useful next step. A counselor can explore the context with you. This suggestion does not determine a diagnosis or emergency urgency.",
    };
  return {
    title: "Choose the support that feels useful",
    body: "You can explore coping resources, connect with other students or request counseling. A lower score does not rule out a concern or limit your access to support.",
  };
}
