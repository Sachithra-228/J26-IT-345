import type { TextAnalysis } from "./text-runtime";

export const MOODS = [
  { id: "bright", label: "Bright", symbol: "☀" },
  { id: "steady", label: "Steady", symbol: "◒" },
  { id: "mixed", label: "Mixed", symbol: "◐" },
  { id: "low", label: "Low", symbol: "☁" },
  { id: "stretched", label: "Stretched", symbol: "≈" },
] as const;
export type Mood = (typeof MOODS)[number]["id"];
export type ReflectionEntry = {
  id: number;
  createdAt: string;
  mood: Mood | null;
  text: string;
  analysis: TextAnalysis | null;
};
export const ANALYSIS_MESSAGES: Record<TextAnalysis["status"], string> = {
  ready: "Possible emotions expressed in this writing",
  too_short:
    "There is too little text for a useful model result. Try a sentence of at least three words, or continue without analysis.",
  too_long: "Use a reflection of 1,200 characters or fewer.",
  unsupported_language:
    "This model was evaluated on English text only. It will not analyze this script. You can still reflect and explore support.",
  unfamiliar_words:
    "Too few of these words occur in the model vocabulary. No emotion result is shown. You can still keep the reflection in this session.",
};
