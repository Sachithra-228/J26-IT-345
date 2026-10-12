"""pytest setup for the C3 Python tests: makes ml/c3 and its src folders importable."""
import sys
from pathlib import Path

C3 = Path(__file__).resolve().parents[3] / "ml" / "c3"
if str(C3) not in sys.path:
    sys.path.insert(0, str(C3))

import c3_common  # noqa: E402,F401  (adds the hyphenated src folders to sys.path)
