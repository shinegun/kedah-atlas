"""AI-drafted district briefs.

1. `facts`  — writes data/briefs/facts/<slug>.json: every number a brief may use,
   taken from web/src/data/atlas.json. Briefs may state no other number.
2. `draft`  — asks Claude to draft each brief from its fact sheet (needs
   ANTHROPIC_API_KEY). Drafts land in data/briefs/<slug>.json with reviewed=false.
3. Run pipeline/check_briefs.py afterwards: it rejects any number not in the facts.

A person must review each brief (set "reviewed": true) before the site drops the
"AI draft" label.

Usage: uv run python pipeline/briefs.py facts
       uv run python pipeline/briefs.py draft [slug ...]
"""

from __future__ import annotations

import json
import os
import sys
from datetime import date
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
ATLAS = ROOT / "web" / "src" / "data" / "atlas.json"
OUT = ROOT / "data" / "briefs"
MODEL = "claude-opus-5-5"


def last(xs):
    return xs[-1]


def facts_for(a: dict, d: dict) -> dict:
    k = a["kedah"]
    f = a["forecast"]["districts"][d["name"]]
    tot = {s: last(v)["value"] for s, v in d["gdp"]["by_sector"].items()}
    t = sum(tot.values())
    inc, pov = d["living"]["income_median"], d["living"]["poverty"]
    lab = last(d["labour"]["series"])
    jobs = d["jobs_estimate"]["by_sector"]
    jt = sum(v["central"] for v in jobs.values())
    y0, y1 = a["forecast"]["known_until"], a["forecast"]["horizon"]
    t0 = next(x for x in f["total"] if x["year"] == y0)
    t1 = next(x for x in f["total"] if x["year"] == y1)
    kedah_income = k["income_median"][str(last(inc)["year"])]
    return {
        "district": d["name"],
        "type": d["type"],
        "gdp_year": d["gdp"]["latest_year"],
        "gdp_rm_million": round(last(d["gdp"]["total"])["value"], 0),
        "share_of_kedah_gdp_pct": round(d["gdp"]["share_of_kedah"], 1),
        "gdp_per_capita_rm": round(d["gdp"]["per_capita_k"] * 1000, -2),
        "gdp_per_capita_rank_in_malaysia": d["gdp"]["per_capita_rank_my"],
        "kedah_gdp_per_capita_rm": round(a["meta"]["kedah_gdp_per_capita_k"] * 1000, -2),
        "sector_share_pct": {s: round(v / t * 100, 0) for s, v in tot.items()},
        "gdp_growth_2015_2019_pct_a_year": d["gdp"]["cagr_2015_2019"],
        "kedah_gdp_growth_2015_2019_pct_a_year": k["cagr_2015_2019"],
        "shift_share_local_points": d["gdp"]["shift_share"]["local"],
        "income_median_rm": {str(x["year"]): x["value"] for x in inc},
        "kedah_income_median_rm": {str(x["year"]): k["income_median"][str(x["year"])] for x in inc},
        "income_vs_kedah_pct": round((last(inc)["value"] / kedah_income - 1) * 100, 0),
        "poverty_pct": {str(x["year"]): x["value"] for x in pov},
        "kedah_poverty_pct": {str(x["year"]): k["poverty"][str(x["year"])] for x in pov},
        "unemployment_pct": lab["u_rate"], "unemployment_year": lab["year"], "kedah_unemployment_pct": k["u_rate"],
        "population_thousand": d["population"]["latest"], "population_year": d["population"]["latest_year"],
        "net_migration_per_1000_a_year": d["population"]["net_migration_per_1000_yr"],
        "farm_jobs_share_pct_estimate": round(jobs["agriculture"]["central"] / jt * 100, 0),
        "nightlights": d["place"].get("nightlights"),
        "forecast_model": a["forecast"]["model"],
        "gdp_nowcast": {"year": y0, "p50": round(t0["p50"], 0), "p10": round(t0["p10"], 0), "p90": round(t0["p90"], 0)},
        "gdp_projection": {"year": y1, "p50": round(t1["p50"], 0), "p10": round(t1["p10"], 0), "p90": round(t1["p90"], 0)},
        "gdp_growth_projection_pct_a_year": round(((t1["p50"] / t0["p50"]) ** (1 / (y1 - y0)) - 1) * 100, 1),
        "gdp_per_capita_projection_rm": round(t1["per_capita_k"] * 1000, -2),
        "highlights": [h["en"] for h in d.get("highlights", [])] if d.get("highlights") and "en" in d["highlights"][0] else [],
    }


def write_facts() -> None:
    a = json.loads(ATLAS.read_text())
    (OUT / "facts").mkdir(parents=True, exist_ok=True)
    for d in a["districts"]:
        (OUT / "facts" / f"{d['slug']}.json").write_text(json.dumps(facts_for(a, d), ensure_ascii=False, indent=1))
    print(f"facts: {len(a['districts'])} districts → {OUT / 'facts'}")


PROMPT = """You are drafting a short, neutral brief about one district of Kedah, Malaysia, for KedahKu,
a public data site. Use ONLY the facts in the JSON below. Do not state any number that is not in it
(you may round a fact, or write small whole numbers as words). Do not speculate about causes the facts
don't support; say what is unknown instead.

Write three sections, each with two short bullet points:
  working  — what is going well
  holding  — what is holding the district back
  watch    — what to watch next (use the projection and its range where useful)

Write it twice: Malaysian standard Bahasa Melayu ("ms") and English ("en"). The Malay must follow
Dewan Bahasa dan Pustaka / DOSM usage: no Indonesian words (bisa, karena, kantor, dll.), no word-for-word
translation, "kenapa" not "mengapa", never "ia", "di mana" only in questions, "KDNK per kapita",
"berbanding" (not "vs"), "angka" for statistics.

Return JSON only: {"ms": {"working": [..], "holding": [..], "watch": [..]}, "en": {...}}

FACTS:
"""


def draft(slugs: list[str]) -> None:
    import requests

    key = os.environ.get("ANTHROPIC_API_KEY")
    if not key:
        sys.exit("ANTHROPIC_API_KEY is not set")
    for path in sorted((OUT / "facts").glob("*.json")):
        slug = path.stem
        if slugs and slug not in slugs:
            continue
        r = requests.post(
            "https://api.anthropic.com/v1/messages",
            headers={"x-api-key": key, "anthropic-version": "2023-06-01", "content-type": "application/json"},
            json={"model": MODEL, "max_tokens": 2000, "messages": [{"role": "user", "content": PROMPT + path.read_text()}]},
            timeout=120,
        )
        r.raise_for_status()
        text = r.json()["content"][0]["text"]
        body = json.loads(text[text.index("{"): text.rindex("}") + 1])
        out = {"slug": slug, **body, "drafted_by": MODEL, "drafted_on": date.today().isoformat(), "reviewed": False}
        (OUT / f"{slug}.json").write_text(json.dumps(out, ensure_ascii=False, indent=1))
        print(f"drafted {slug}")


if __name__ == "__main__":
    cmd = sys.argv[1] if len(sys.argv) > 1 else "facts"
    if cmd == "facts":
        write_facts()
    elif cmd == "draft":
        draft(sys.argv[2:])
    else:
        sys.exit(__doc__)
