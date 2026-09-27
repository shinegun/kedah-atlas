# 0002. Collapsible sidebar and full-screen home intro

- Status: Accepted
- Date: 2026-09-28

## Context

On desktop (≥ 1000px) the site uses a fixed 236px left sidebar. Two problems:

1. The home page opens with the district "stack spread" animation (`KedahSpread` → `components/ui/stack-spread.tsx`), which is sized to its container. Beside the sidebar it loses a fifth of the screen, and the sidebar competes with it for attention in the first seconds of a visit.
2. Wide charts and tables (maps, compare table, investor table) would benefit from the sidebar's width once a reader knows their way around.

## Decision

**Home intro.** On desktop the intro section (`id="intro"`, class `intro-bleed`) extends under the sidebar to fill the viewport. The sidebar (`SiteHeader`, class `home-intro` on the home route) starts hidden and fades and slides in as the intro scrolls away:

- `SiteHeader` measures the intro's bottom edge on scroll and resize and writes `--sb-in` (0 → 1 over the first 45% of a viewport after the spread ends) to `<html>`. CSS maps it to `opacity` and a 20px slide. This is driven by scroll position, not a timer, so scrolling back up hides the sidebar again.
- While `--sb-in < 0.5`, `<html data-intro>` disables pointer events on the sidebar so hidden links can't be clicked.
- `:focus-within` shows the sidebar at once, so keyboard users are never locked out.

**Icon rail.** A button at the foot of the sidebar ("Kecilkan menu" / "Collapse menu") collapses it to a 72px icon rail:

- State lives in one place: `<html data-sidebar="rail">`, which sets `--sidebar-w: 72px`. The header and `.shell` margin both read `--sidebar-w`, and transition width and margin over 0.22s.
- The choice is saved in `localStorage` (`atlas-sidebar-rail`, see `web/src/lib/sidebar.ts`). `RAIL_SCRIPT` runs inline in `<head>` before first paint to restore it, so the sidebar doesn't flash open; `<html>` has `suppressHydrationWarning` because of that attribute.
- `SiteHeader` reads the attribute with `useSyncExternalStore` plus a `MutationObserver` (no `setState` inside effects).
- In the rail, labels stay in the DOM but are visually hidden (screen readers still read them), links get `title` tooltips, and the language button shows "EN" / "BM".

**Scope.** Desktop only. Phones and tablets (< 1000px) keep the sticky top bar unchanged. Reduced-motion users get no transitions. The new CSS sits unlayered at the end of `globals.css` because it must beat Tailwind's `w-full` utility on the intro section.

## Alternatives considered

- **Hide the sidebar on the home page entirely.** Rejected: readers lose navigation on the page they land on most.
- **Fade the sidebar in on a timer after load.** Rejected: it would appear mid-animation over the scattering cards; tying it to scroll matches what the reader is doing.
- **Overlay (off-canvas) sidebar everywhere with a hamburger.** Rejected on desktop: the always-visible labelled sidebar is easier for first-time and older readers. The rail is opt-in.
- **Hide the phone top bar during the intro too.** Deferred: the bar is sticky in normal flow, so hiding it means reworking its positioning and the `--header-h` offsets used by the map and slide decks.

## Consequences

- Any component that positions itself against the sidebar must use `--sidebar-w` rather than a fixed 236px, or it will break in rail mode.
- The home route has an extra scroll listener; it only writes one CSS variable and one attribute per event.
- `localStorage` may be unavailable (private mode, blocked storage); the site then falls back to the full sidebar every visit, which is the default anyway.
- Scroll events do not fire in a hidden browser tab, so automated checks of the fade must dispatch `scroll` manually.
