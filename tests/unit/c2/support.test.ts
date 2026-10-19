import {
  EMPTY_PREFERENCES,
  matchProviders,
  providerMetadataSchema,
  type Provider,
} from "@/lib/c2/support";
import { concerningDisclosure, guidedReply } from "@/lib/c2/assistant";
const providers: Provider[] = [
  {
    _id: "unknown",
    name: "Ms Unknown",
    specialization: "General support",
    availability: "Contact service",
    mode: "online",
  },
  {
    _id: "a",
    name: "A",
    specialization: "Anxiety and academic support",
    availability: "Mon",
    mode: "hybrid",
    gender: "female",
    languages: ["en", "si"],
    profession: "psychologist",
    supportAreas: ["worry"],
  },
  {
    _id: "b",
    name: "B",
    specialization: "Sleep",
    availability: "Tue",
    mode: "in-person",
    gender: "male",
    languages: ["ta"],
    profession: "counselor",
  },
];
it("filters by recorded metadata without guessing from names", () => {
  expect(
    matchProviders(providers, [], {
      ...EMPTY_PREFERENCES,
      gender: "female",
    }).map((x) => x.provider._id),
  ).toEqual(["a"]);
});
it("combines preferences and permits hybrid appointments", () => {
  expect(
    matchProviders(providers, [], {
      gender: "female",
      language: "si",
      profession: "psychologist",
      mode: "online",
    }).map((x) => x.provider._id),
  ).toEqual(["a"]);
  expect(
    matchProviders(providers, [], {
      ...EMPTY_PREFERENCES,
      language: "ta",
      mode: "online",
    }),
  ).toEqual([]);
});
it("ranks matching topics with explicit reasons while retaining other choices", () => {
  const matches = matchProviders(providers, ["worry"], EMPTY_PREFERENCES);
  expect(matches[0].provider._id).toBe("a");
  expect(matches[0].reasons).toContain("Listed support area: Worry & anxiety");
  expect(matches).toHaveLength(3);
});
it("accepts legacy profiles and validates explicit new details", () => {
  expect(providerMetadataSchema.safeParse({}).success).toBe(true);
  expect(
    providerMetadataSchema.safeParse({ gender: "guessed", languages: ["xx"] })
      .success,
  ).toBe(false);
  expect(
    providerMetadataSchema.safeParse({
      profession: "psychiatrist",
      languages: ["en"],
      supportAreas: ["worry"],
    }).success,
  ).toBe(true);
});
it.each([
  "I want to kill myself",
  "I cannot stay safe",
  "I want to die",
  "self-harm",
])('offers a separate support pathway for "%s"', (text) => {
  expect(concerningDisclosure(text)).toBe(true);
  expect(guidedReply(text).action).toBe("safety");
  expect(guidedReply(text).text).toContain("not monitored");
});
it("routes ordinary text to a bounded source-backed reply", () => {
  expect(guidedReply("I worry about my exams").topic).toBe("worry");
  expect(guidedReply("I worry about my exams").source?.url).toContain(
    "who.int",
  );
  expect(guidedReply("Who can see my answers?").topic).toBe("privacy");
});
it("does not diagnose, prescribe or pretend to understand an unknown message", () => {
  expect(guidedReply("Am I bipolar?").topic).toBe("diagnosis");
  expect(guidedReply("What medication should I take?").text).toContain(
    "cannot recommend",
  );
  expect(guidedReply("xyz abc").topic).toBe("unknown");
});
it("uses the prior conversation topic for short follow-ups", () => {
  expect(guidedReply("yes", "sleep").topic).toBe("sleep");
});
