"""Check the local guides in web/src/data/jalan/ against the rules in docs/jalan.md.

Published entries must name who shared them, say when they were last checked
(within a year), be complete in both languages, never pin places that need a
guide, and list a contact only with their consent. Drafts are skipped.

Usage: uv run python pipeline/check_jalan.py
"""

import json
import re
import sys
from datetime import date
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
GUIDES = ROOT / "web/src/data/jalan"
KINDS = {"nature", "history", "food", "farm", "culture"}
TEXT_FIELDS = ["what", "best_time", "getting_there", "cost"]
MAX_AGE_DAYS = 365  # keep in step with MAX_AGE_DAYS in web/src/lib/jalan.ts


def bilingual(x) -> bool:
    return isinstance(x, dict) and all(isinstance(x.get(k), str) and x[k].strip() for k in ("ms", "en"))


def check_experience(e: dict, today: date) -> list[str]:
    if e.get("status") != "published":
        return []
    out = []
    if e.get("kind") not in KINDS:
        out.append(f"kind must be one of {sorted(KINDS)}")
    if not str(e.get("name", "")).strip():
        out.append("missing name")
    out += [f"'{f}' needs both ms and en" for f in TEXT_FIELDS if not bilingual(e.get(f))]
    by = e.get("shared_by") or {}
    if not str(by.get("name", "")).strip() or not bilingual(by.get("about")):
        out.append("shared_by needs a name and an 'about' in ms and en")
    try:
        age = (today - date.fromisoformat(e.get("checked", ""))).days
        if age < 0:
            out.append("'checked' is in the future")
        elif age > MAX_AGE_DAYS:
            out.append(f"last checked {age} days ago; recheck it or set status to draft")
    except ValueError:
        out.append("'checked' must be YYYY-MM-DD")
    contact = e.get("contact")
    if e.get("guide_required"):
        if "map" in e:
            out.append("guide_required places must not have a map pin")
        if not contact:
            out.append("guide_required places must list a guide as contact")
    if contact:
        if contact.get("consent") is not True:
            out.append("contact listed without consent: true")
        if not str(contact.get("name", "")).strip() or not bilingual(contact.get("role")):
            out.append("contact needs a name and a role in ms and en")
        if "whatsapp" in contact and not re.fullmatch(r"60\d{8,10}", str(contact["whatsapp"])):
            out.append("whatsapp must be digits in international form, e.g. 60123456789")
    return out


def main() -> int:
    today = date.today()
    problems = published = 0
    for path in sorted(GUIDES.glob("*.json")):
        guide = json.loads(path.read_text())
        rel = path.relative_to(ROOT)
        if guide.get("district") != path.stem:
            problems += 1
            print(f"{rel}: 'district' should be '{path.stem}'")
        ids = [x.get("id") for x in guide.get("experiences", []) + guide.get("wishlist", [])]
        for dup in {i for i in ids if ids.count(i) > 1}:
            problems += 1
            print(f"{rel}: duplicate id '{dup}'")
        for w in guide.get("wishlist", []):
            if w.get("kind") not in KINDS or not bilingual(w.get("title")) or not bilingual(w.get("ask")):
                problems += 1
                print(f"{rel}: wishlist '{w.get('id')}' needs a valid kind and a title and ask in ms and en")
        for e in guide.get("experiences", []):
            published += e.get("status") == "published"
            for msg in check_experience(e, today):
                problems += 1
                print(f"{rel}: {e.get('id', '?')}: {msg}")
    print(f"{problems} issue(s)" if problems else f"jalan: {published} published place(s), no issues")
    return 1 if problems else 0


if __name__ == "__main__":
    sys.exit(main())
