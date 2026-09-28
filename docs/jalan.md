# Jalan-jalan: local guides

Places and experiences shared by named locals, one guide per district, at `/[lang]/jalan/<slug>/`. Pilot: Baling. See ADR 0004 for why.

These are not statistics, so the site's data rules don't cover them. They follow the rules below instead. `pipeline/check_jalan.py` enforces them, and the page repeats them to readers.

## Rules

1. **A named local for every tip.** `shared_by` has the name they agreed to show and how they know the place ("anak Kupang", "runs the homestay"). No anonymous tips, no tips written by us.
2. **A date on everything.** `checked` is the day someone last confirmed the place is open and the details are right. After 365 days the entry drops off the site at the next build and the checker fails until it is rechecked or set back to `draft`.
3. **Cost stated plainly:** free, a price per person or group, or "ask the guide".
4. **No sponsorships, no paid placements, no reviews.**
5. **Guide, not pin, for risky or fragile places** (caves, waterfalls, jungle trails, anything with a drowning or getting-lost risk): `guide_required: true`, a guide as `contact`, and no `map`.
6. **Contact details only with consent.** A contact needs `consent: true`, meaning that person agreed to be listed. Get that agreement directly, not through the person who suggested them. WhatsApp numbers go in international form (`60123456789`).
7. **Both languages, written properly.** The Malay follows `docs/bm-style.md`; `check_bm.py` scans these files too.

## Adding a place

1. A suggestion arrives as a GitHub issue (form: `.github/ISSUE_TEMPLATE/cadang-tempat.yml`), or you collect it in person.
2. Talk to the contributor (and the guide or operator, if there is one) using the questions below.
3. Add an entry to `experiences` in `web/src/data/jalan/<slug>.json` with `"status": "draft"`. Remove the matching `wishlist` item if there is one.
4. When the details are confirmed, set `"status": "published"` and `checked` to today, then run `uv run python pipeline/check_jalan.py`.

```json
{
  "id": "gunung-baling",
  "status": "draft",
  "kind": "nature",
  "name": "Gunung Baling",
  "what": { "ms": "…", "en": "…" },
  "best_time": { "ms": "…", "en": "…" },
  "getting_there": { "ms": "…", "en": "…" },
  "cost": { "ms": "…", "en": "…" },
  "guide_required": true,
  "contact": { "name": "…", "role": { "ms": "Pemandu gunung", "en": "Mountain guide" }, "whatsapp": "60…", "consent": true },
  "shared_by": { "name": "…", "about": { "ms": "…", "en": "…" } },
  "checked": "2026-10-05"
}
```

`kind` is one of `nature`, `history`, `food`, `farm`, `culture`. `map` (`{ "lat": …, "lng": … }`) is optional and not allowed when `guide_required` is true.

## Questions to ask a local (BM)

- Tempat ini apa, dan apa yang orang buat di sana?
- Macam mana nak pergi? Jalan masuk bagaimana, ada tempat letak kereta, kereta biasa boleh masuk?
- Bila masa paling sesuai? Pagi atau petang, musim apa, elakkan hari apa?
- Berapa kosnya? Tiket, pemandu, makan, parkir.
- Perlu pemandu? Kalau perlu, siapa yang boleh dihubungi, dan boleh kami tanya dia sendiri untuk disenaraikan?
- Ada apa-apa yang pelawat selalu tersilap atau patut tahu dahulu?
- Nama apa yang boleh kami paparkan untuk anda, dan apa kaitan anda dengan tempat ini?

## Measuring the pilot

The pilot works if locals send places in and people share the guide page. There is no analytics on the site yet. Before judging the pilot, add a privacy-friendly page counter (for example Vercel Web Analytics) and compare shares and visits for `/jalan/baling/` against the district deck.
