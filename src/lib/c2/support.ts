import { z } from "zod";
import { CONCERNS, type Concern } from "./assessment";

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
      .array(z.enum(["low-mood", "worry", "sleep", "study", "connection"]))
      .max(5)
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
      const listedMatches = topics.filter(
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
      return {
        provider,
        reasons: reasons.length
          ? reasons
          : [
              "Available in the university directory; no specific topic match is recorded.",
            ],
        rank: matches.length * 2 + listedMatches.length,
      };
    })
    .sort(
      (a, b) =>
        b.rank - a.rank || a.provider.name.localeCompare(b.provider.name),
    );
}
