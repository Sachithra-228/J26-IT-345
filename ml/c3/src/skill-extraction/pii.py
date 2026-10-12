"""
PII stripping for C3 text inputs (job advertisements and CV text).

Runs BEFORE any other processing so identifiers never reach the extractor, logs or
storage. Mirrored exactly by `src/lib/c3/extract.ts::stripPii` (same patterns, same
order); the parity fixture checks both produce the same redactions.

What is removed: e-mail addresses, URLs, Sri Lankan NIC numbers (old 9 digits + V/X
and new 12 digits), Sri Lankan phone numbers, labelled personal lines (Name, Address,
Date of birth, NIC, National ID, Gender, Marital status, Religion, Nationality) and
street addresses (a number followed by a road / mawatha / lane / street ...).
"Phone:" / "Mobile:" labels are deliberately NOT treated as personal lines because a
CV may say "Mobile: Flutter, Kotlin"; the phone-number pattern removes the numbers.

Known limit: a person's name written without a "Name:" label cannot be detected
reliably by rules. CV text is therefore never stored or logged anywhere - only the
extracted skill ids are kept.

All patterns are ASCII-only (re.ASCII; explicit whitespace class) so that Python and
JavaScript regular expressions behave identically.
"""
from __future__ import annotations

import re

WS = r"[ \t\n\r\f\v]"

# Order matters and is part of the TS parity contract. (name, pattern, case-insensitive)
PII_PATTERNS: list[tuple[str, str, bool]] = [
    ("email", r"[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}", False),
    ("url", rf"(?:https?://|www\.)[^ \t\n\r\f\v]+", True),
    ("nic", r"\b(?:[0-9]{9}[VvXx]|[0-9]{12})\b", False),
    ("phone", rf"(?<![0-9+])(?:\+94|0094|0)(?:{WS}|-)?(?:[0-9](?:{WS}|-)?){{8}}[0-9](?![0-9])", False),
    (
        "labelled",
        rf"\b(?:full name|name|address|date of birth|dob|nic(?: no| number)?|national id|gender|marital status|religion|nationality){WS}*[:\-][^\n]*",
        True,
    ),
    (
        "address",
        rf"\b(?:no\.?{WS}*)?[0-9]+[a-z]?(?:/[0-9]+)?,?{WS}+(?:[a-z]+{WS}+){{0,4}}(?:road|rd|mawatha|lane|street|avenue|place|gardens|watta)\b[^\n]*",
        True,
    ),
]

_COMPILED = [
    (name, re.compile(pattern, re.ASCII | (re.IGNORECASE if ci else 0))) for name, pattern, ci in PII_PATTERNS
]


def strip_pii(text: str) -> tuple[str, dict[str, int]]:
    """Returns (redacted text, number of redactions per PII type)."""
    counts: dict[str, int] = {}
    for name, rx in _COMPILED:
        text, n = rx.subn(f"[{name.upper()}]", text)
        counts[name] = n
    return text, counts
