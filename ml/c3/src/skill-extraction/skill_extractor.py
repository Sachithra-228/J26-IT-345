"""
Dictionary + fuzzy skill extractor for job advertisements and CV text (C3).

Algorithm (mirrored exactly by `src/lib/c3/extract.ts`; parity-tested):
  1. strip PII (pii.strip_pii) - always first;
  2. lower-case and tokenise with TOKEN_RE, dropping trailing dots, so "Node.js",
     "C#", "C++", ".NET" and "CI/CD" (-> "ci", "cd") survive as tokens;
  3. every taxonomy synonym is tokenised the same way;
  4. pass 1 (exact): candidate synonyms are tried longest first (then taxonomy
     order, then synonym order); a window of tokens that equals a synonym and does
     not overlap an already-accepted match is accepted. Longest-first means
     "react native" is read as mobile development, not as React;
  5. pass 2 (fuzzy): on the remaining tokens, a window whose text has at least
     FUZZY_MIN_CHARS characters, the same first character as the synonym and a
     rapidfuzz `fuzz.ratio` >= FUZZY_THRESHOLD is accepted (catches typos such as
     "Kubernets" or "Postgressql"). Short terms are exact-only to avoid false hits
     ("testing" must not match "testng").

The thresholds were fixed by inspection of the synonym list, not tuned on any
evaluation set.
"""
from __future__ import annotations

import re
from dataclasses import dataclass, field

from rapidfuzz import fuzz

from pii import strip_pii

TOKEN_RE = re.compile(r"\.?[a-z0-9][a-z0-9+#.]*")
FUZZY_THRESHOLD = 90.0
FUZZY_MIN_CHARS = 7


def tokenize(text: str) -> list[str]:
    return [t.rstrip(".") for t in TOKEN_RE.findall(text.lower())]


@dataclass
class Match:
    skill_id: str
    synonym: str
    text: str
    start: int  # token index
    length: int
    method: str  # "exact" | "fuzzy"
    score: float


@dataclass
class Extraction:
    skills: dict[str, list[Match]] = field(default_factory=dict)  # taxonomy order
    redactions: dict[str, int] = field(default_factory=dict)
    token_count: int = 0

    @property
    def skill_ids(self) -> list[str]:
        return list(self.skills.keys())


class SkillExtractor:
    def __init__(self, taxonomy: dict):
        self.skill_order = [s["id"] for s in taxonomy["skills"]]
        candidates = []
        for si, skill in enumerate(taxonomy["skills"]):
            for yi, syn in enumerate(skill["synonyms"]):
                toks = tokenize(syn)
                if toks:
                    candidates.append((len(toks), si, yi, skill["id"], syn, toks, " ".join(toks)))
        candidates.sort(key=lambda c: (-c[0], c[1], c[2]))
        self.candidates = candidates

    def extract_tokens(self, tokens: list[str]) -> list[Match]:
        used = [False] * len(tokens)
        matches: list[Match] = []
        # pass 1: exact
        for n, _si, _yi, sid, syn, toks, _joined in self.candidates:
            for i in range(0, len(tokens) - n + 1):
                if any(used[i : i + n]):
                    continue
                if tokens[i : i + n] == toks:
                    for k in range(i, i + n):
                        used[k] = True
                    matches.append(Match(sid, syn, " ".join(tokens[i : i + n]), i, n, "exact", 100.0))
        # pass 2: fuzzy
        for n, _si, _yi, sid, syn, _toks, joined in self.candidates:
            if len(joined) < FUZZY_MIN_CHARS:
                continue
            for i in range(0, len(tokens) - n + 1):
                if any(used[i : i + n]):
                    continue
                window = " ".join(tokens[i : i + n])
                if len(window) < FUZZY_MIN_CHARS or window[0] != joined[0]:
                    continue
                score = fuzz.ratio(window, joined)
                if score >= FUZZY_THRESHOLD:
                    for k in range(i, i + n):
                        used[k] = True
                    matches.append(Match(sid, syn, window, i, n, "fuzzy", float(score)))
        return matches

    def extract(self, text: str) -> Extraction:
        clean, redactions = strip_pii(text)
        tokens = tokenize(clean)
        found: dict[str, list[Match]] = {}
        for m in self.extract_tokens(tokens):
            found.setdefault(m.skill_id, []).append(m)
        ordered = {sid: sorted(found[sid], key=lambda m: m.start) for sid in self.skill_order if sid in found}
        return Extraction(skills=ordered, redactions=redactions, token_count=len(tokens))
