# Roadmap

## Pilot — Jobs Mirror (built 2026-09-27)
- [x] Reproducible pipeline over 17 official sources, with checksums
- [x] Map of 12 districts, 6 indicators, rankings
- [x] District profiles: economy, shift-share, 2025 GDP projection, jobs by sector (estimate + range), living standards, people/migration
- [x] Kedah jobs by industry & occupation (LFS 2023–2024); Kedah income & poverty since 1970
- [x] Compare table, Baling data story, methodology, downloads
- [x] Bahasa Melayu default + English; light/dark; mobile

## Before public launch
- [ ] Send the DOSM data request (`docs/dosm-data-request.md`)
- [ ] Have someone from Kedah (ideally UUM / UPEN Kedah / DOSM Kedah) review the Baling story and the Malay copy
- [ ] Choose a domain and deploy the static build (`web/out/`)
- [ ] Pick a code licence (MIT suggested) and publish the repo
- [x] Add a feedback / corrections link (GitHub issues, in the footer and on /tentang)

## v1 (≈3 months)
- [ ] Replace job estimates with Census 2020 tables when DOSM replies
- [ ] **Opportunity Finder**: which industries each district could grow into (establishment data + economic complexity)
- [ ] **AI analyst**: answers questions about a district, citing only atlas data
- [ ] Parliament / DUN level views (OpenDOSM has income, poverty, labour by constituency)
- [ ] More stories: Kulim (manufacturing boom), Langkawi (tourism & unemployment), Pokok Sena (farm productivity)

## Jalan-jalan pilot (started 2026-09-28, ADR 0004)
- [x] Baling guide page, suggestion form, rules and checker
- [ ] Collect the first 8–10 places from Baling locals (`docs/jalan.md`)
- [x] Add a page counter so the pilot can be measured (Vercel Web Analytics)
- [ ] Decide whether to extend to more districts

## Full vision (≈+6 months)
- [ ] **What-if simulator** using DOSM input–output tables
- [ ] **Time machine**: district series back to Census 1980/1991/2000/2010 (needs digitising)
- [ ] **Project tracker**: KRC, KHTP expansion, Bukit Kayu Hitam SEZ, KXP — promised vs delivered
- [ ] **Satellite nowcasts**: paddy area (Sentinel-2), night lights (VIIRS) for years between surveys
