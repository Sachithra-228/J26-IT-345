import { z } from "zod";
import { CONCERNS, CONCERN_TOPICS, type Concern } from "./assessment";

export const providerMetadataSchema = z
  .object({
    gender: z.enum(["male", "female", "other", "not-specified"]).optional(),
    profession: z
      .enum(["counselor", "psychologist", "psychiatrist", "not-specified"])
      .optional(),
    languages: z
      .array(z.enum(["en", "si", "ta"]))
      .max(3)
      .optional(),
    supportAreas: z
      .array(z.enum(CONCERN_TOPICS))
      .max(CONCERN_TOPICS.length)
      .optional(),
  })
  .strict();
export type ProviderMetadata = z.infer<typeof providerMetadataSchema>;
export type Provider = ProviderMetadata & {
  _id: string;
  name: string;
  specialization: string;
  availability: string;
  mode: "online" | "in-person" | "hybrid";
  contactEmail?: string;
  isResearchProfile?: boolean;
  profileSummary?: string;
  location?: string;
  sampleHours?: string;
};
export type SupportPreferences = {
  gender: string;
  language: string;
  profession: string;
  mode: string;
};
export const EMPTY_PREFERENCES: SupportPreferences = {
  gender: "any",
  language: "any",
  profession: "any",
  mode: "any",
};
export function matchProviders(
  providers: Provider[],
  topics: Concern[],
  preferences: SupportPreferences,
  topicWeights?: Partial<Record<Concern, number>>,
) {
  return providers
    .filter(
      (provider) =>
        (preferences.gender === "any" ||
          provider.gender === preferences.gender) &&
        (preferences.language === "any" ||
          provider.languages?.includes(
            preferences.language as "en" | "si" | "ta",
          )) &&
        (preferences.profession === "any" ||
          provider.profession === preferences.profession) &&
        (preferences.mode === "any" ||
          provider.mode === preferences.mode ||
          provider.mode === "hybrid"),
    )
    .map((provider) => {
      const matches = topics.filter((topic) =>
        provider.supportAreas?.includes(topic),
      );
      const listedMatches = Array.isArray(provider.supportAreas)
        ? []
        : topics.filter(
            (topic) =>
              !matches.includes(topic) &&
              CONCERNS[topic].keywords.some((word) =>
                provider.specialization.toLowerCase().includes(word),
              ),
          );
      const reasons = [
        ...matches.map(
          (topic) => `Listed support area: ${CONCERNS[topic].label}`,
        ),
        ...listedMatches.map(
          (topic) =>
            `Specialization mentions ${CONCERNS[topic].label.toLowerCase()}`,
        ),
      ];
      const weight = (topic: Concern) => {
        const value = topicWeights?.[topic];
        return typeof value === "number" && Number.isFinite(value)
          ? Math.max(0, Math.min(1, value))
          : 1;
      };
      // Ranking weights can include student-confirmation policy. Explain the
      // actual profile overlap, rather than label a policy weight as ML confidence.
      return {
        provider,
        reasons: reasons.length
          ? reasons
          : [
              provider.isResearchProfile
                ? "No listed support-area overlap with your current topics."
                : "Available in the university directory; no specific topic match is recorded.",
            ],
        rank:
          matches.reduce((sum, topic) => sum + 2 * weight(topic), 0) +
          listedMatches.reduce((sum, topic) => sum + weight(topic), 0),
      };
    })
    .sort(
      (a, b) =>
        b.rank - a.rank || a.provider.name.localeCompare(b.provider.name),
    );
}
