# Atlas Kedah

Bilingual (Bahasa Melayu default, English) atlas of Kedah's 12 districts. See README.md for layout and commands.

## Writing Bahasa Melayu

- All Malay copy must follow `docs/bm-style.md`: Malaysian standard BM (DBP / DOSM terms), never Indonesian vocabulary, never word-for-word translation from English.
- Write the Malay first-class, not as an afterthought: rephrase for meaning (e.g. "next door" → "di daerah jiran", "it's low-paid work" → "tetapi pekerjaan yang bergaji rendah").
- Watch dari/daripada, "di mana" (questions only), adalah/ialah; use "angka" for statistics, "KDNK per kapita", "berbanding" (not "vs").
- Run `uv run python pipeline/check_bm.py` after any copy change; it must report no issues. Add new ban-list words to it when you find them.

## AI briefs

- District briefs live in `data/briefs/<slug>.json` (drafted from `data/briefs/facts/`, see `pipeline/briefs.py`). They may state only numbers in the fact sheet; `pipeline/check_briefs.py` must pass. They show an "AI draft" label until a person sets `"reviewed": true`.

## Data honesty

- Every number shows source + year. Modelled numbers carry the Anggaran/Estimate badge and are explained on /kaedah.
- Don't hard-code statistics in copy; compute them from `web/src/data/atlas.json`.

## Checks before finishing

```bash
uv run python pipeline/build.py && uv run python pipeline/check_bm.py && uv run python pipeline/check_briefs.py
pnpm --dir web exec tsc --noEmit && pnpm --dir web lint && pnpm --dir web build
```
