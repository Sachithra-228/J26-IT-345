"""
Shared paths, constants and loaders for Component C3 (explainable career guidance).

The source folders use hyphenated names (job-ad-nlp, skill-extraction, ...), which
Python cannot import as packages, so importing this module puts each of them on
sys.path. Every C3 entry script starts with `import c3_common`.

SYNTHETIC DATA: until the SLIIT ethics application is approved, C3 uses only
synthetic student profiles and synthetic / hand-written job advertisements. Every
number produced from them validates the pipeline, NOT real-world accuracy.
"""
from __future__ import annotations

import json
import sys
from pathlib import Path

SEED = 42

C3_DIR = Path(__file__).resolve().parent
ROOT = C3_DIR.parent.parent
SRC_DIRS = [C3_DIR / "src" / d for d in ("job-ad-nlp", "skill-extraction", "knowledge-graph", "recommender")]
for _d in [C3_DIR / "evaluation", *SRC_DIRS]:
    if str(_d) not in sys.path:
        sys.path.insert(0, str(_d))

DATA_DIR = C3_DIR / "data"
REFERENCE_DIR = DATA_DIR / "reference"
SYNTHETIC_DIR = DATA_DIR / "synthetic"
PROCESSED_DIR = DATA_DIR / "processed"
RAW_DIR = DATA_DIR / "raw"  # git-ignored: real collected advertisements
PRIVATE_DIR = DATA_DIR / "private"  # git-ignored: anything that could identify a person or company

TAXONOMY_PATH = REFERENCE_DIR / "competency-taxonomy.json"
ROLES_PATH = REFERENCE_DIR / "roles.json"
KG_SOURCE_PATH = REFERENCE_DIR / "gap-to-action-source.json"

# Exported artefacts consumed by the TypeScript runtime (src/lib/c3).
MODEL_OUT = ROOT / "src" / "lib" / "c3" / "model" / "career-model.json"
KG_OUT = ROOT / "src" / "lib" / "c3" / "model" / "knowledge-graph.json"
PARITY_OUT = ROOT / "tests" / "fixtures" / "c3-readiness-parity.json"
EVIDENCE_DIR = ROOT / "docs" / "c3" / "evidence"

SYNTHETIC_WARNING = "SYNTHETIC DATA: validates the pipeline, not real-world accuracy."


def load_json(path: Path):
    return json.loads(path.read_text(encoding="utf-8"))


def write_json(path: Path, data, compact: bool = False) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    text = json.dumps(data, ensure_ascii=False, separators=(",", ":")) if compact else json.dumps(data, ensure_ascii=False, indent=1)
    path.write_text(text + "\n", encoding="utf-8")


def read_jsonl(path: Path) -> list[dict]:
    return [json.loads(line) for line in path.read_text(encoding="utf-8").splitlines() if line.strip()]


def write_jsonl(path: Path, rows: list[dict]) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text("".join(json.dumps(r, ensure_ascii=False) + "\n" for r in rows), encoding="utf-8")


def load_taxonomy() -> dict:
    tax = load_json(TAXONOMY_PATH)
    validate_taxonomy(tax)
    return tax


def load_roles() -> list[dict]:
    return load_json(ROLES_PATH)["roles"]


def skill_ids() -> list[str]:
    return [s["id"] for s in load_taxonomy()["skills"]]


def role_ids() -> list[str]:
    return [r["id"] for r in load_roles()]


def validate_taxonomy(tax: dict) -> None:
    """Checks the invariants of competency-taxonomy.schema.json without a jsonschema dependency."""
    import re

    if tax.get("schemaVersion") != "1.0.0":
        raise ValueError("unsupported taxonomy schemaVersion")
    if [lv["level"] for lv in tax["levels"]] != [0, 1, 2, 3]:
        raise ValueError("levels must be exactly 0..3")
    areas = {a["id"] for a in tax["areas"]}
    seen_ids: set[str] = set()
    seen_syn: dict[str, str] = {}
    for s in tax["skills"]:
        if not re.fullmatch(r"[a-z][a-z0-9_]*", s["id"]):
            raise ValueError(f"bad skill id {s['id']}")
        if s["id"] in seen_ids:
            raise ValueError(f"duplicate skill id {s['id']}")
        seen_ids.add(s["id"])
        if s["area"] not in areas:
            raise ValueError(f"skill {s['id']} has unknown area {s['area']}")
        for lang in ("en", "si", "ta"):
            if not s["label"].get(lang):
                raise ValueError(f"skill {s['id']} is missing label.{lang}")
        for syn in s["synonyms"]:
            if not re.fullmatch(r"[a-z0-9+#./ -]+", syn):
                raise ValueError(f"synonym {syn!r} must be lower-case ASCII")
            if syn in seen_syn and seen_syn[syn] != s["id"]:
                raise ValueError(f"synonym {syn!r} is used by both {seen_syn[syn]} and {s['id']}")
            seen_syn[syn] = s["id"]
