"""pytest setup for the C4 Python tests: makes the mentor-matching and evaluation folders importable."""
import sys
from pathlib import Path

C4 = Path(__file__).resolve().parents[3] / "ml" / "c4"
for sub in ("src/mentor-matching", "evaluation", "."):
    p = str(C4 / sub)
    if p not in sys.path:
        sys.path.insert(0, p)
