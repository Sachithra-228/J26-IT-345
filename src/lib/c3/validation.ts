import { z } from "zod";
import { ROLE_IDS, SKILL_IDS } from "./model";

/** Hard cap on CV text so a request cannot make the extractor do unbounded work. */
export const MAX_CV_CHARS = 20_000;

const roleId = z.string().refine((v) => ROLE_IDS.includes(v), { message: "unknown role" });

/** Questionnaire answers: a level 0-3 per taxonomy skill (omitted skills count as 0). */
export const skillLevelsSchema = z
  .record(z.string(), z.number().int().min(0).max(3))
  .refine((rec) => Object.keys(rec).every((k) => SKILL_IDS.includes(k)), { message: "unknown skill id" });

export const SPECIALISATIONS = ["IT", "SE", "DS", "CSNE", "CS", "ISE", "IM", "Other"] as const;
export const INTERNSHIP_STATUSES = ["completed", "doing", "notStarted"] as const;
export const PROJECT_COUNTS = ["0", "1-2", "3-5", "6+"] as const;

/**
 * Academic background (Objective 1). CONTEXT ONLY: it is shown back to the student
 * and used for tips, never in readiness, gaps or plans. Every field is optional;
 * unknown keys or values are rejected.
 */
export const backgroundSchema = z
  .object({
    specialisation: z.enum(SPECIALISATIONS).optional(),
    internship: z.enum(INTERNSHIP_STATUSES).optional(),
    projects: z.enum(PROJECT_COUNTS).optional()
  })
  .strict();

export type Background = z.infer<typeof backgroundSchema>;
export type Specialisation = (typeof SPECIALISATIONS)[number];

export const careerProfileSchema = z.object({
  yearOfStudy: z.union([z.literal(3), z.literal(4)]),
  targetRoleIds: z
    .array(roleId)
    .min(1)
    .max(3)
    .refine((ids) => new Set(ids).size === ids.length, { message: "duplicate target role" }),
  skills: skillLevelsSchema,
  background: backgroundSchema.optional()
});

export type CareerProfile = z.infer<typeof careerProfileSchema>;

/**
 * Saving an assessment needs explicit consent. CV text is optional, needs its own
 * consent, is only accepted when the CV feature flag is on, and is never stored:
 * only the skill ids extracted from it are kept.
 */
export const assessmentRequestSchema = z
  .object({
    profile: careerProfileSchema,
    consent: z.literal(true),
    cvText: z.string().max(MAX_CV_CHARS).optional(),
    cvConsent: z.literal(true).optional()
  })
  .strict()
  .refine((r) => r.cvText === undefined || r.cvConsent === true, { message: "cvConsent is required with cvText", path: ["cvConsent"] });

export type AssessmentRequest = z.infer<typeof assessmentRequestSchema>;

export const planRequestSchema = z
  .object({
    profile: careerProfileSchema,
    roleId
  })
  .strict();

export type PlanRequest = z.infer<typeof planRequestSchema>;

/**
 * Reads a stored profile. Profiles saved before `background` existed load as they are;
 * a stored background that is no longer valid is dropped rather than losing the profile.
 */
export function parseCareerProfile(input: unknown): CareerProfile | null {
  const parsed = careerProfileSchema.safeParse(input);
  if (parsed.success) return parsed.data;
  if (input && typeof input === "object" && "background" in input) {
    const { background: _dropped, ...rest } = input as Record<string, unknown>;
    void _dropped;
    const retry = careerProfileSchema.safeParse(rest);
    return retry.success ? retry.data : null;
  }
  return null;
}
