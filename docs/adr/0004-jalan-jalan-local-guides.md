# 0004. Jalan-jalan: local guides, piloted in Baling

- Status: Accepted
- Date: 2026-09-28

## Context

Young people in Kedah often don't know where to go in their own state. They find places through TikTok and word of mouth. That works for discovery, but videos rarely say whether a place is still open, how to get there, what it costs, when to go or who to contact.

KedahKu's Baling story already names Baling's under-used assets (Gunung Baling, the Gunung Pulai caves, the 1955 Baling Talks) and notes there is no visitor data. Sending visitors to local guides, homestays and shops in poorer districts puts money directly in residents' hands, which fits the site's aim.

We first considered making the guides exclusive ("only on KedahKu"). That would not last, since anything good ends up on TikTok within days, and it works against asking readers to share (the share prompt added in commit 4fe28c9). What lasts is practical detail, checked recently and tied to a local person.

## Decision

- **A guide page per district** at `/[lang]/jalan/<slug>/`, generated only for districts with a file in `web/src/data/jalan/`. Pilot: Baling only. It is linked from the last slide of that district's deck and from the Baling story. It is not in the main navigation until the pilot proves itself.
- **Places come from named locals, never from us.** The pilot launches with no places. It shows a "we're collecting" list of places we want locals to tell us about (the wishlist), each with a prefilled suggestion link. The one number on the wishlist (orchard and kelulut area) comes from `atlas.json` with its source and year.
- **Rules of their own** (`docs/jalan.md`): named contributor, date last checked with a one-year expiry, cost stated plainly, no sponsorships, a guide rather than a map pin for risky places, contact details only with consent. `pipeline/check_jalan.py` enforces them. `check_bm.py` scans the Malay.
- **Suggestions go through a GitHub issue form** for now (`.github/ISSUE_TEMPLATE/cadang-tempat.yml`), bilingual, warning that issues are public so no phone numbers. The link is built in one place (`suggestUrl` in `web/src/lib/jalan.ts`) so it can be switched to another channel.

## Alternatives considered

- **Exclusive "secret spots".** Rejected: exclusivity doesn't survive sharing, and posting fragile or dangerous places widely without a guide can hurt the place and the people who visit it.
- **Seed the pilot with places we write ourselves from web research.** Rejected: it would break the trust the site depends on and defeat the point of local knowledge.
- **Add it as a slide inside the district deck.** Deferred: a slide is too small for several places with directions and contacts. The deck links to the page instead.
- **A Google Form or WhatsApp line for suggestions.** Probably better for reaching young locals who don't use GitHub; needs an account or a number the project owns. Swap it in via `suggestUrl`.
- **Cover all 12 districts at once.** Rejected: one district tells us whether locals contribute before we promise more.

## Consequences

- A new kind of content to maintain: someone has to recheck each place at least yearly, or it drops off the site.
- `isLive` in `web/src/lib/jalan.ts` is evaluated at build time, so stale entries disappear only when the site is rebuilt. Rebuilds happen on every push.
- GitHub is a barrier for non-technical contributors. If few suggestions arrive, change the channel before judging the idea.
- There is no analytics yet, so the pilot can't be measured until a page counter is added (see `docs/jalan.md`).
