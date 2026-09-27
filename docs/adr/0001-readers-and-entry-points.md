# 0001. Who the site is for, and a page for each reader

- Status: Accepted
- Date: 2026-09-28

## Context

Atlas Kedah was built for ordinary Kedah residents (`docs/bm-style.md`: "Tulis untuk penduduk Kedah biasa"), and its home page and stories lead with poverty and catching up with Malaysia. That suits residents and planners, but we also want the site to impress investors, and an investor's first question ("can I hire here, and at what cost?") is different from a resident's.

The sister project [SabahKu](https://sabah-ku.com/) (Ilham Kassim) names its readers explicitly (planners, researchers, representatives' offices, journalists, NGOs) and builds trust with an About page, a "what it is and is not" list and a public corrections route. Atlas Kedah had none of these, and its footer was a two-line note.

SabahKu's distinctive layer is satellite night lights (where people and activity are). Atlas Kedah's is jobs: what people work in and where work can grow. The two are complementary; we should deepen jobs rather than copy night lights.

## Decision

1. **Primary readers: young people in Kedah and residents generally, then planners and elected representatives.** The stories, the seven-slide district decks and the BM-first voice stay aimed at them. Young readers are named first on the About page; the slide decks are the format we will grow for them (story-style navigation and shareable 9:16 images are the next candidates).
2. **Investors get their own entry point instead of changing the front page.** `/[lang]/pelabur/` answers the hiring question from data we already hold:
   - Headline stats: employed people and unemployment (LFS), working-age and 15–24 population (population by district and age), land area against Penang, median household income against Penang (labelled as household income, not wages).
   - Workforce by district: labour force, unemployment, participation, working-age population, implied net migration (Estimate badge).
   - Manufacturing workers by home district from the Jobs Mirror model, with 10th–90th percentile ranges (Estimate badge).
   - Kedah's occupation mix (official, state level only).
   - Each district's specialisations against Malaysia: sectors with location quotient ≥ 1.2, from DOSM GDP by district.
   - Kedah's GDP projection with its likely range, linking to `/unjuran`.
   - A "what this page cannot tell you" list (wages, industrial land and incentives → MIDA, Kedah–Penang commuting).
3. **An About page, `/[lang]/tentang/`,** with: who the site is for (four reader cards), what it is and is not, how the numbers and AI briefs are made, how to report errors, who built it, credit to SabahKu, and licences.
4. **A full site footer** (`web/src/components/SiteFooter.tsx`): brand, tagline and independence note; four link columns (Explore, Stories, Data and method, Project); data-updated date, source and CC BY 4.0. Stories come from `STORIES`, so new stories appear automatically. Corrections go to GitHub issues on the public repo.

All numbers on these pages are computed from `web/src/data/atlas.json`, never typed into copy, in line with the data-honesty rules in `CLAUDE.md`.

## Alternatives considered

- **Reframe the whole site for investors.** Rejected: it would weaken the civic voice and the stories, which are what set the site apart, and investors would still land on poverty-first stories via search and shares.
- **Add investor material to `/kedah` (Kedah in numbers).** Rejected: that page is the complete official record; mixing in modelled, audience-specific framing would blur it.
- **Add satellite night lights as a headline layer, like SabahKu.** Rejected for now: it duplicates SabahKu's strength. Night lights remain a supporting input on `/kaedah#cahaya-malam`.
- **Link Kedah's state investment agency.** Deferred until the address is confirmed; the page refers to it by description and links MIDA.

## Consequences

- Two more bilingual pages to keep correct when data is refreshed. Both are fully computed, so a pipeline rebuild updates them; copy that names specific districts (e.g. the top two manufacturing districts) is also computed.
- The investor page relies on modelled district job splits. It must keep the Estimate badges and the link to `/kaedah#jobs`, and should switch to official figures when DOSM supplies Census 2020 tables (see `docs/dosm-data-request.md`).
- The About page credits a named person; update it if authorship or contributors change.
- The code licence is still undecided, so the About page says the code "is on GitHub" rather than calling it open source.
- The roadmap item "Add a feedback / corrections link" is done.
