import { z } from "zod";
import catalog from "./research-communities.json";
import { CONCERNS, CONCERN_TOPICS, type Assessment } from "./assessment";
import { recommendWellnessActivities } from "./wellness-plan";

export const COMMUNITY_VERSION = "c2-community-circles-v1";
const focusRules = [
  {
    key: "workload",
    question: "study",
    answer: "I would like help planning my workload",
  },
  {
    key: "task-start",
    question: "study",
    answer: "Starting tasks is difficult",
  },
  { key: "exam-worry", question: "worry", answer: "Study or exams" },
  { key: "grief-company", question: "grief", answer: "Missing someone" },
  {
    key: "self-criticism",
    question: "self-esteem",
    answer: "Harsh self-criticism",
  },
  {
    key: "money",
    question: "practical",
    answer: "Money or essential expenses",
  },
  { key: "housing", question: "practical", answer: "Housing or accommodation" },
  { key: "sleep-routine", question: "sleep", answer: "Building a routine" },
  {
    key: "boundaries",
    question: "relationships",
    answer: "Setting boundaries",
  },
  {
    key: "confidential-advice",
    question: "substance-use",
    answer: "Finding confidential advice",
  },
] as const;
const communitySchema = z.object({
  _id: z.string().regex(/^c2-community-[a-z-]+$/),
  name: z.string().min(3).max(80),
  tagline: z.string().min(5).max(130),
  description: z.string().min(20).max(500),
  topics: z.array(z.enum(CONCERN_TOPICS)).min(1).max(3),
  languages: z
    .array(z.enum(["en", "si", "ta"]))
    .min(1)
    .max(3),
  focusKeys: z.array(z.string()).max(5),
  sourceType: z.literal("synthetic"),
  isSample: z.literal(true),
  conversationStarters: z
    .array(
      z.object({
        title: z.string().min(5).max(130),
        prompt: z.string().min(10).max(350),
      }),
    )
    .min(1)
    .max(3),
});
const catalogSchema = z.object({
  version: z.literal(COMMUNITY_VERSION),
  sourceType: z.literal("synthetic"),
  communities: z.array(communitySchema).min(1).max(30),
});
export type SampleCommunity = z.infer<typeof communitySchema>;
export function validateCommunityCatalog(value: unknown) {
  const parsed = catalogSchema.parse(value);
  if (
    new Set(parsed.communities.map((item) => item._id)).size !==
      parsed.communities.length ||
    parsed.communities.some((item) =>
      item.focusKeys.some(
        (key) => !focusRules.some((rule) => rule.key === key),
      ),
    )
  )
    throw new Error("Invalid community catalog");
  return parsed;
}
export const SAMPLE_COMMUNITIES = validateCommunityCatalog(catalog).communities;

/** Read-only local matching. No answers, membership changes or notifications sent. */
export function matchCommunities(
  communities: SampleCommunity[],
  assessment: Assessment | null,
) {
  const priorities = recommendWellnessActivities(assessment);
  return communities
    .map((community) => {
      const matches = priorities.filter((item) =>
        community.topics.includes(item.topic),
      );
      const focus = matches.length
        ? focusRules.filter(
            (rule) =>
              community.focusKeys.includes(rule.key) &&
              assessment?.context[rule.question] === rule.answer,
          )
        : [];
      return {
        community,
        score:
          matches.reduce((sum, item) => sum + item.priority, 0) +
          focus.length * 0.5,
        modelInformed: matches.some((item) => item.basis === "model-topics"),
        reasons: [
          ...matches.map(
            (item) => `Your support topic: ${CONCERNS[item.topic].label}.`,
          ),
          ...focus.map((rule) => `Your answer: “${rule.answer}”.`),
        ],
      };
    })
    .sort(
      (a, b) =>
        b.score - a.score || a.community.name.localeCompare(b.community.name),
    );
}
