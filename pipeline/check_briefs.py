"""Check every AI-drafted brief against its fact sheet.

Each number in a brief must match a number in data/briefs/facts/<slug>.json
(allowing for rounding, and RM million shown as RM billion). Small whole numbers
written as digits (0–10) and years that appear in the facts are allowed.
Exits non-zero if any brief states a number the facts don't support.

Usage: uv run python pipeline/check_briefs.py
"""

from __future__ import annotations

import json
import re
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
BRIEFS = ROOT / "data" / "briefs"
NUM = re.compile(r"\d[\d,]*(?:\.\d+)?")


def numbers_in(obj) -> set[float]:
    out: set[float] = set()
    if isinstance(obj, dict):
        for k, v in obj.items():
            out |= numbers_in(k) | numbers_in(v)
    elif isinstance(obj, list):
        for v in obj:
            out |= numbers_in(v)
    elif isinstance(obj, (int, float)) and not isinstance(obj, bool):
        out.add(abs(float(obj)))
    elif isinstance(obj, str):
        out |= {float(m.replace(",", "")) for m in NUM.findall(obj)}
    return out


def supported(n: str, facts: set[float]) -> bool:
    v = float(n.replace(",", ""))
    if v <= 10 and v == int(v):
        return True
    dec = len(n.split(".")[1]) if "." in n else 0
    for f in facts:
        for cand in (f, f / 1000, f * 1000):
            if round(cand, dec) == v or round(cand, -2) == v:
                return True
    return False


def main() -> int:
    bad = 0
    briefs = sorted(p for p in BRIEFS.glob("*.json"))
    for p in briefs:
        brief = json.loads(p.read_text())
        facts = numbers_in(json.loads((BRIEFS / "facts" / p.name).read_text()))
        for lang in ("ms", "en"):
            for section, items in brief[lang].items():
                for text in items:
                    for n in NUM.findall(text):
                        if not supported(n, facts):
                            bad += 1
                            print(f"{p.stem} [{lang}/{section}]: {n!r} not in facts — {text}")
    print(f"briefs: {len(briefs)} checked, {bad} unsupported number(s)")
    return 1 if bad else 0


if __name__ == "__main__":
    sys.exit(main())
