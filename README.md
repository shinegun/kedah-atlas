# Atlas Kedah

**Where Kedah's people work — and where its economy can grow.**
A bilingual (Bahasa Melayu / English) atlas of Kedah's 12 districts: economy, jobs, income, poverty and people, built entirely on open official statistics, with every modelled number labelled as an estimate.

Pilot scope ("Jobs Mirror"):

- Map of all 12 districts with switchable indicators and rankings
- A profile page per district: economy, growth breakdown, jobs by sector (estimate), living standards, people
- Kedah-wide jobs by industry and occupation (official, LFS 2023–2024) and history since 1970
- A compare table, one in-depth data story (Baling), a methodology page and downloadable data

## Layout

```
pipeline/          Python: fetch → extract → model → build
  sources.py       registry of every upstream dataset (cited on the site)
  fetch.py         downloads into data/raw/ with a SHA-256 manifest
  extract_lfs.py   pulls Kedah tables out of the Labour Force Survey PDFs
  model.py         IPF job estimates, location quotients, shift-share
  build.py         writes web/src/data/atlas.json + CSV downloads
data/
  raw/             downloaded sources (git-ignored; re-create with fetch.py)
  interim/         tables extracted from PDFs
  processed/       tidy long table of every indicator
web/               Next.js 16 static site (output: export)
docs/              roadmap and the DOSM data request
```

## Run it

```bash
uv sync
uv run python pipeline/fetch.py        # download sources (add --force to refresh)
uv run python pipeline/extract_lfs.py  # parse LFS PDFs
uv run python pipeline/build.py        # build atlas.json + downloads
pnpm --dir web install
pnpm --dir web dev                     # http://localhost:3000/ms/
pnpm --dir web build                   # static site in web/out/
```

The static build in `web/out/` can be hosted anywhere (Vercel, Netlify, GitHub Pages, any web server).

## Deploying

- Build with `SITE_URL=https://your-domain pnpm --dir web build`. Share cards (Open Graph images) need absolute URLs, so without `SITE_URL` they point at localhost.
- The export writes share images as extension-less `opengraph-image` files. Configure the host to serve them as `image/png` (most static hosts need a one-line header rule).

## Data principles

1. Every number has a source and a year.
2. Modelled numbers carry an **Estimate / Anggaran** badge and are explained on `/kaedah`.
3. District GDP is by place of production; jobs, income and poverty are by place of residence. The site says so wherever it matters.
4. DOSM suppresses some small cells; we fill them as residuals and list every filled value on the methodology page.

## Licences

- Data: Department of Statistics Malaysia via OpenDOSM / data.gov.my (CC BY 4.0). LFS report tables: "Source: Department of Statistics Malaysia".
- Code: to be decided (MIT suggested).

Inspired by [SabahKu / Atlas Ekonomi Sabah](https://github.com/IlhamKassim/sabah-atlas) (MIT); Atlas Kedah is a separate codebase focused on jobs.
