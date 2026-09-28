// "Jalan-jalan": places and experiences shared by named locals, one guide per district.
// Unlike the rest of the site these are not statistics, so they carry their own rules
// (docs/jalan.md, enforced by pipeline/check_jalan.py): a named contributor, a date last
// checked, and no map pin for places that need a guide. Pilot: Baling only.

import baling from "@/data/jalan/baling.json";
import type { Locale } from "@/lib/i18n";
import { REPO } from "@/lib/site";

type Text = Record<Locale, string>;

export const KINDS = ["nature", "history", "food", "farm", "culture"] as const;
export type Kind = (typeof KINDS)[number];

export const kindLabel: Record<Kind, Text> = {
  nature: { ms: "Alam semula jadi", en: "Nature" },
  history: { ms: "Sejarah", en: "History" },
  food: { ms: "Makanan", en: "Food" },
  farm: { ms: "Dusun dan ladang", en: "Farms and orchards" },
  culture: { ms: "Budaya dan kraf", en: "Culture and crafts" },
};

export type Experience = {
  id: string;
  /** only "published" entries appear on the site */
  status: "draft" | "published";
  kind: Kind;
  name: string;
  what: Text;
  best_time: Text;
  getting_there: Text;
  cost: Text;
  /** caves, waterfalls, jungle trails: go with a local guide, and we never publish a map pin */
  guide_required: boolean;
  map?: { lat: number; lng: number };
  /** a local operator who has agreed to be listed */
  contact?: { name: string; role: Text; whatsapp?: string; consent: boolean };
  shared_by: { name: string; about: Text };
  /** YYYY-MM-DD; entries drop off the site a year after this */
  checked: string;
};

/** A place we want a local to tell us about. `crops` links it to the district's crop data. */
export type Wish = { id: string; kind: Kind; title: Text; ask: Text; crops?: string[] };

export type Guide = { district: string; wishlist: Wish[]; experiences: Experience[] };

const GUIDES = [baling] as unknown as Guide[];

export const MAX_AGE_DAYS = 365;
// Evaluated when the static site is built, so a rebuild hides entries that have gone stale.
const BUILT = Date.now();

export const isLive = (e: Experience) =>
  e.status === "published" && BUILT - Date.parse(e.checked) <= MAX_AGE_DAYS * 86_400_000;

export const guideSlugs = GUIDES.map((g) => g.district);
export const getGuide = (slug: string) => GUIDES.find((g) => g.district === slug);

/** GitHub issue form for suggesting a place, prefilled with the district and (optionally) the place. */
export function suggestUrl(district: string, place?: string) {
  const title = `[Jalan-jalan] ${district}${place ? `: ${place}` : ""}`;
  return `${REPO}/issues/new?template=cadang-tempat.yml&title=${encodeURIComponent(title)}`;
}
