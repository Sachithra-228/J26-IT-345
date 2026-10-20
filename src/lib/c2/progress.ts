import {
  assessmentConcerns,
  CONCERNS,
  scoreScale,
  type Assessment,
  type Concern,
} from "./assessment";
import { activityById, type ActivityCompletion } from "./wellness-plan";

export const PROGRESS_KEY = "unicare.c2.device-progress.v1";
export type ProgressEntry = { id: string; at: string } & (
  | { kind: "mood"; value: number }
  | {
      kind: "screening";
      phq9: number | null;
      gad7: number | null;
      topics: Concern[];
      questionnaireVersion: string;
      modelVersion: string;
    }
  | {
      kind: "activity";
      activityId: string;
      before: number | null;
      after: number | null;
    }
);
export type ProgressStore = { schemaVersion: 1; entries: ProgressEntry[] };
const rating = (value: unknown): value is number =>
  Number.isInteger(value) && Number(value) >= 1 && Number(value) <= 5;
const nullableRating = (value: unknown) => value === null || rating(value);
const score = (value: unknown, max: number) =>
  value === null ||
  (Number.isInteger(value) && Number(value) >= 0 && Number(value) <= max);

/** Rebuild an allowlisted record: notes, raw answers and arbitrary extra fields never persist. */
export function parseProgress(value: unknown): ProgressStore {
  if (
    !value ||
    typeof value !== "object" ||
    (value as ProgressStore).schemaVersion !== 1 ||
    !Array.isArray((value as ProgressStore).entries) ||
    (value as ProgressStore).entries.length > 100
  )
    throw new Error("Saved progress has an unsupported format.");
  const ids = new Set<string>();
  const entries = (value as ProgressStore).entries.map(
    (entry): ProgressEntry => {
      if (
        !entry ||
        typeof entry.id !== "string" ||
        !entry.id ||
        entry.id.length > 120 ||
        ids.has(entry.id) ||
        typeof entry.at !== "string" ||
        entry.at.length > 40 ||
        !Number.isFinite(Date.parse(entry.at))
      )
        throw new Error("Saved progress contains an invalid entry.");
      ids.add(entry.id);
      const base = { id: entry.id, at: entry.at };
      if (entry.kind === "mood" && rating(entry.value))
        return { ...base, kind: "mood", value: entry.value };
      if (
        entry.kind === "activity" &&
        typeof entry.activityId === "string" &&
        activityById(entry.activityId) &&
        nullableRating(entry.before) &&
        nullableRating(entry.after)
      )
        return {
          ...base,
          kind: "activity",
          activityId: entry.activityId,
          before: entry.before,
          after: entry.after,
        };
      if (
        entry.kind === "screening" &&
        score(entry.phq9, 27) &&
        score(entry.gad7, 21) &&
        Array.isArray(entry.topics) &&
        entry.topics.length <= Object.keys(CONCERNS).length &&
        new Set(entry.topics).size === entry.topics.length &&
        entry.topics.every((topic) =>
          Object.prototype.hasOwnProperty.call(CONCERNS, topic),
        ) &&
        typeof entry.questionnaireVersion === "string" &&
        entry.questionnaireVersion.length <= 100 &&
        typeof entry.modelVersion === "string" &&
        entry.modelVersion.length <= 100
      )
        return {
          ...base,
          kind: "screening",
          phq9: entry.phq9,
          gad7: entry.gad7,
          topics: entry.topics,
          questionnaireVersion: entry.questionnaireVersion,
          modelVersion: entry.modelVersion,
        };
      throw new Error("Saved progress contains an invalid entry.");
    },
  );
  return { schemaVersion: 1, entries };
}
export function loadProgress(storage: Pick<Storage, "getItem">): ProgressStore {
  const raw = storage.getItem(PROGRESS_KEY);
  if (!raw) return { schemaVersion: 1, entries: [] };
  return parseProgress(JSON.parse(raw));
}
export function appendProgress(
  storage: Pick<Storage, "getItem" | "setItem">,
  entry: ProgressEntry,
): ProgressStore {
  const current = loadProgress(storage);
  const next = parseProgress({
    schemaVersion: 1,
    entries: [
      ...current.entries.filter((item) => item.id !== entry.id),
      entry,
    ].slice(-100),
  });
  storage.setItem(PROGRESS_KEY, JSON.stringify(next));
  return next;
}
export function removeProgress(
  storage: Pick<Storage, "getItem" | "setItem">,
  id: string,
): ProgressStore {
  const current = loadProgress(storage);
  const next = {
    ...current,
    entries: current.entries.filter((item) => item.id !== id),
  };
  storage.setItem(PROGRESS_KEY, JSON.stringify(next));
  return next;
}
export function screeningEntry(assessment: Assessment): ProgressEntry {
  return {
    kind: "screening",
    id: `screening-${assessment.completedAt}`,
    at: assessment.completedAt,
    phq9: scoreScale("phq9", assessment.phq9).total,
    gad7: scoreScale("gad7", assessment.gad7).total,
    topics: assessmentConcerns(assessment),
    questionnaireVersion: assessment.version,
    modelVersion:
      assessment.concernAnalysis?.prediction?.runId ?? "manual-topics",
  };
}
export function activityEntry(value: ActivityCompletion): ProgressEntry {
  return {
    kind: "activity",
    id: value.id,
    at: value.completedAt,
    activityId: value.activityId,
    before: value.before,
    after: value.after,
  };
}
