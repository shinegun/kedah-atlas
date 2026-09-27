# 0003. Rename to KedahKu, with a Gunung Jerai mark

- Status: Accepted
- Date: 2026-09-28

## Context

The site launched as "Atlas Kedah" at kedah-ku.com, so the name and the domain didn't match. Its logo was a plain green tile with a gold outline, which says nothing about Kedah and was easy to miss as a favicon. The favicon itself was still the Next.js default.

The sister project SabahKu ("my Sabah") uses a short possessive name and a small pictorial mark: Mount Kinabalu's summit above the sea, with the sun, on a dark rounded tile.

## Decision

- **Name: KedahKu** ("my Kedah"), matching the domain and pairing with SabahKu. The wordmark is always set as "Kedah" plus "Ku" in the accent colour (`Wordmark` in `web/src/components/BrandMark.tsx`). `siteName` in `web/src/lib/i18n.ts` is "KedahKu" in both languages.
- **Home page title** keeps the word "atlas" for search and link previews: "KedahKu · Atlas ekonomi 12 daerah Kedah" / "KedahKu · The economic atlas of Kedah's 12 districts" (district count computed).
- **Mark:** Gunung Jerai rising over two rows of paddy, with the sun behind, on a dark paddy-green rounded tile. Gunung Jerai over the rice plains is the view most people in Kedah know, and paddy is the state's identity ("Jelapang Padi"). Same visual grammar as SabahKu's mark, clearly a different place.
  - Colours are fixed (`#123a26` tile, `#f2c14e` sun, `#e6efe8` peak, `#7cc98f` paddy) so it reads the same in light mode, dark mode and share cards.
  - The paddy rows are filled rounded rectangles, not strokes, so they survive every renderer (ImageMagick's SVG renderer dropped the strokes).
- **Where it lives:**
  - `BrandMark.tsx`: the React mark (sidebar, footer, share cards; `bare` drops the tile on the share cards' green background).
  - `web/src/app/icon.svg`: the favicon for modern browsers. Same shapes as `BrandMark`; edit both together.
  - `web/src/app/favicon.ico` (16/32/48 px) and `web/src/app/apple-icon.png` (180 px, full-bleed square because iOS rounds the corners itself), rendered from the SVG with ImageMagick.
- **Copy:** every "Atlas Kedah" in the site, pipeline prompt, README, CLAUDE.md, BM style guide and DOSM data request now says "KedahKu". ADR 0001 keeps the old name because it records what was true when it was written.

## Alternatives considered

- **Keep "Atlas Kedah".** Rejected: it doesn't match the domain, and the "-Ku" pairing with SabahKu tells readers the two are siblings.
- **Menara Alor Setar or the Kedah flag as the mark.** Rejected: the tower is one city, not the state; the flag's crescent and wreath are official state emblems we should not borrow for an independent project.
- **Generate the PNG icons at build time with `ImageResponse`.** Rejected: the static export writes generated images without file extensions (see `web/vercel.json`). Committed files are simpler and don't change.

## Consequences

- Rendering the icons again needs ImageMagick. The commands are:
  `magick -background none -density 1200 icon.svg -define icon:auto-resize=48,32,16 favicon.ico` and, for the apple icon, the SVG with a square tile (no `rx`) at `-density 1600 -resize 180x180 -alpha off -depth 8`.
- In Satori (share cards) two adjacent spans get a word gap, so `lib/og.tsx` pulls "Ku" back with a negative margin.
- The repository is still called `kedah-atlas`, and the sidebar setting keeps its `atlas-sidebar-rail` storage key so readers' saved choice survives the rename.
