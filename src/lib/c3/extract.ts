/**
 * C3 - PII stripping and skill extraction for CV text.
 *
 * Mirrors `ml/c3/src/skill-extraction/pii.py` and `skill_extractor.py` exactly (same
 * patterns, order, tokeniser and rapidfuzz `fuzz.ratio`); the parity test proves it.
 * Runs in the browser, so a CV never has to leave the student's device. CV text is
 * never stored or logged: only the extracted skill ids are used.
 */
import { careerModel } from "./model";

const WS = "[ \\t\\n\\r\\f\\v]";

/** Same order and patterns as PII_PATTERNS in pii.py (ASCII-only on both sides). */
const PII_PATTERNS: Array<[string, RegExp]> = [
  ["email", /[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}/g],
  ["url", /(?:https?:\/\/|www\.)[^ \t\n\r\f\v]+/gi],
  ["nic", /\b(?:[0-9]{9}[VvXx]|[0-9]{12})\b/g],
  ["phone", new RegExp(`(?<![0-9+])(?:\\+94|0094|0)(?:${WS}|-)?(?:[0-9](?:${WS}|-)?){8}[0-9](?![0-9])`, "g")],
  [
    "labelled",
    new RegExp(
      `\\b(?:full name|name|address|date of birth|dob|nic(?: no| number)?|national id|gender|marital status|religion|nationality)${WS}*[:\\-][^\\n]*`,
      "gi"
    )
  ],
  [
    "address",
    new RegExp(
      `\\b(?:no\\.?${WS}*)?[0-9]+[a-z]?(?:/[0-9]+)?,?${WS}+(?:[a-z]+${WS}+){0,4}(?:road|rd|mawatha|lane|street|avenue|place|gardens|watta)\\b[^\\n]*`,
      "gi"
    )
  ]
];

export type PiiCounts = Record<string, number>;

export function stripPii(text: string): { text: string; redactions: PiiCounts } {
  const redactions: PiiCounts = {};
  let out = text;
  for (const [name, rx] of PII_PATTERNS) {
    let n = 0;
    out = out.replace(rx, () => {
      n += 1;
      return `[${name.toUpperCase()}]`;
    });
    redactions[name] = n;
  }
  return { text: out, redactions };
}

const TOKEN_RE = /\.?[a-z0-9][a-z0-9+#.]*/g;

export function tokenize(text: string): string[] {
  return (text.toLowerCase().match(TOKEN_RE) ?? []).map((t) => t.replace(/\.+$/, ""));
}

function lcsLength(a: string, b: string): number {
  let prev = new Array<number>(b.length + 1).fill(0);
  for (let i = 1; i <= a.length; i++) {
    const cur = new Array<number>(b.length + 1).fill(0);
    for (let j = 1; j <= b.length; j++) {
      cur[j] = a[i - 1] === b[j - 1] ? prev[j - 1] + 1 : Math.max(prev[j], cur[j - 1]);
    }
    prev = cur;
  }
  return prev[b.length];
}

/** rapidfuzz `fuzz.ratio`: 100 x (1 - Indel distance / total length). */
export function fuzzRatio(a: string, b: string): number {
  const total = a.length + b.length;
  if (total === 0) return 100;
  const distance = total - 2 * lcsLength(a, b);
  return 100 * (1 - distance / total);
}

export type SkillMatch = {
  skillId: string;
  synonym: string;
  text: string;
  start: number;
  length: number;
  method: "exact" | "fuzzy";
  score: number;
};

type Candidate = { n: number; si: number; yi: number; skillId: string; synonym: string; tokens: string[]; joined: string };

const SKILL_ORDER = careerModel.taxonomy.skills.map((s) => s.id);
const FUZZY_THRESHOLD = careerModel.params.fuzzyThreshold;
const FUZZY_MIN_CHARS = careerModel.params.fuzzyMinChars;

const CANDIDATES: Candidate[] = careerModel.taxonomy.skills
  .flatMap((skill, si) =>
    skill.synonyms.map((synonym, yi) => {
      const tokens = tokenize(synonym);
      return { n: tokens.length, si, yi, skillId: skill.id, synonym, tokens, joined: tokens.join(" ") };
    })
  )
  .filter((c) => c.n > 0)
  .sort((a, b) => b.n - a.n || a.si - b.si || a.yi - b.yi);

function windowFree(used: boolean[], i: number, n: number): boolean {
  for (let k = i; k < i + n; k++) if (used[k]) return false;
  return true;
}

export function matchTokens(tokens: string[]): SkillMatch[] {
  const used = new Array<boolean>(tokens.length).fill(false);
  const matches: SkillMatch[] = [];
  // pass 1: exact
  for (const c of CANDIDATES) {
    for (let i = 0; i + c.n <= tokens.length; i++) {
      if (!windowFree(used, i, c.n)) continue;
      let equal = true;
      for (let k = 0; k < c.n; k++) {
        if (tokens[i + k] !== c.tokens[k]) {
          equal = false;
          break;
        }
      }
      if (!equal) continue;
      for (let k = i; k < i + c.n; k++) used[k] = true;
      matches.push({ skillId: c.skillId, synonym: c.synonym, text: tokens.slice(i, i + c.n).join(" "), start: i, length: c.n, method: "exact", score: 100 });
    }
  }
  // pass 2: fuzzy
  for (const c of CANDIDATES) {
    if (c.joined.length < FUZZY_MIN_CHARS) continue;
    for (let i = 0; i + c.n <= tokens.length; i++) {
      if (!windowFree(used, i, c.n)) continue;
      const window = tokens.slice(i, i + c.n).join(" ");
      if (window.length < FUZZY_MIN_CHARS || window[0] !== c.joined[0]) continue;
      const score = fuzzRatio(window, c.joined);
      if (score >= FUZZY_THRESHOLD) {
        for (let k = i; k < i + c.n; k++) used[k] = true;
        matches.push({ skillId: c.skillId, synonym: c.synonym, text: window, start: i, length: c.n, method: "fuzzy", score });
      }
    }
  }
  return matches;
}

export type Extraction = {
  /** Skill ids in taxonomy order, each with the phrases that matched (positions in the redacted text). */
  skills: Array<{ skillId: string; matches: SkillMatch[] }>;
  redactions: PiiCounts;
  tokenCount: number;
};

/** Strips PII, then finds taxonomy skills. The input text is not retained. */
export function extractSkills(text: string): Extraction {
  const { text: clean, redactions } = stripPii(text);
  const tokens = tokenize(clean);
  const bySkill = new Map<string, SkillMatch[]>();
  for (const m of matchTokens(tokens)) {
    const list = bySkill.get(m.skillId) ?? [];
    list.push(m);
    bySkill.set(m.skillId, list);
  }
  const skills = SKILL_ORDER.filter((id) => bySkill.has(id)).map((skillId) => ({
    skillId,
    matches: (bySkill.get(skillId) ?? []).sort((a, b) => a.start - b.start)
  }));
  return { skills, redactions, tokenCount: tokens.length };
}
