import Link from "next/link";
import { geoMercator, geoPath } from "d3-geo";
import type { Feature, FeatureCollection, Geometry } from "geojson";
import StackSpread, { type StackSpreadCard } from "@/components/ui/stack-spread";
import geo from "@/data/kedah.geo.json";
import { districts, last } from "@/lib/atlas";
import { TAGLINE } from "@/lib/districtCopy";
import { rm, tx, typeInfo, type Locale } from "@/lib/i18n";

// Spread layout: roughly north at the top, a ring around the centre headline.
// Desktop targets in vw/vh from centre; touch devices use a 3 × 4 grid.
const LAYOUT: Record<string, { x: number; y: number; sm: [number, number] }> = {
  Langkawi: { x: -36, y: -34, sm: [-31, -35] },
  "Kota Setar": { x: -12, y: -34, sm: [0, -35] },
  "Kubang Pasu": { x: 12, y: -34, sm: [31, -35] },
  "Padang Terap": { x: 36, y: -34, sm: [-31, -20] },
  Yan: { x: -38, y: -6, sm: [0, -20] },
  "Kuala Muda": { x: -38, y: 15, sm: [31, -20] },
  Sik: { x: 38, y: -6, sm: [-31, 20] },
  Baling: { x: 38, y: 15, sm: [0, 20] },
  Pendang: { x: -36, y: 34, sm: [31, 20] },
  "Pokok Sena": { x: -12, y: 34, sm: [-31, 35] },
  Kulim: { x: 12, y: 34, sm: [0, 35] },
  "Bandar Baharu": { x: 36, y: 34, sm: [31, 35] },
};

const fc = geo as unknown as FeatureCollection<Geometry, { district: string }>;

/** Each district's outline, fitted to its own 100 × 100 box. */
function outline(name: string): string {
  const ft = fc.features.find((f) => f.properties.district === name) as Feature<Geometry>;
  const path = geoPath(geoMercator().fitSize([100, 100], ft)).digits(1);
  return path(ft) ?? "";
}

export default function KedahSpread({ lang }: { lang: Locale }) {
  const order = Object.keys(LAYOUT);
  const cards: StackSpreadCard[] = order.map((name, i) => {
    const d = districts.find((x) => x.name === name)!;
    const ty = typeInfo[d.type];
    const pos = LAYOUT[name];
    return {
      key: d.slug,
      z: i + 2,
      // deterministic "messy pile" while stacked
      stackOffset: { x: (((i * 7) % 9) - 4) * 1.6, y: (((i * 5) % 7) - 3) * 1.8 },
      stackRotate: (((i * 11) % 13) - 6) * 2.6,
      target: { x: pos.x, y: pos.y, rotate: 0, w: 14, h: 19 },
      targetSm: { x: pos.sm[0], y: pos.sm[1], w: 29, h: 13 },
      item: {
        content: (
          <Link
            href={`/${lang}/daerah/${d.slug}/`}
            className="flex h-full w-full flex-col gap-[0.5vh] rounded-[inherit] border border-[var(--border)] bg-[var(--surface)] p-[1.1cqw] text-[var(--ink)] no-underline shadow-[0_8px_30px_rgba(0,0,0,0.08)] max-md:p-[2.4cqw]"
            aria-label={d.name}
          >
            <svg viewBox="0 0 100 100" className="min-h-0 w-full flex-1" aria-hidden="true">
              <path d={outline(name)} fill={ty.color} stroke="var(--surface)" strokeWidth={1} />
            </svg>
            <span className="text-[clamp(10px,0.72cqw,12px)] font-bold uppercase tracking-[0.08em] text-[var(--muted)] max-md:hidden">{ty.label[lang]}</span>
            <span className="text-[clamp(15px,1.7cqw,26px)] leading-none" style={{ fontFamily: "var(--serif)" }}>{d.name}</span>
            <span className="text-[clamp(9px,0.8cqw,12.5px)] leading-snug text-[var(--ink-2)] max-md:hidden">{TAGLINE[d.slug][lang]}</span>
            <span className="text-[clamp(9px,0.8cqw,12.5px)] leading-snug text-[var(--ink-2)]">
              {rm(lang, last(d.living.income_median).value)} {tx(lang, "sebulan", "a month")}
            </span>
          </Link>
        ),
      },
    };
  });

  return (
    <StackSpread
      cards={cards}
      stickyTop="var(--header-h)"
      // Full screen on desktop: bleed under the sidebar, which fades in once the spread scrolls away.
      id="intro"
      className="-mt-6 intro-bleed"
      bgColor="var(--surface)"
      cardRadius={18}
      headline={
        <>
          12 {tx(lang, "daerah", "districts")}. <span className="opacity-60">{tx(lang, "Satu", "One")}</span> Kedah.
        </>
      }
      subtitle={tx(
        lang,
        "Ekonomi, pekerjaan dan taraf hidup setiap daerah — dan ke mana ekonominya boleh berkembang.",
        "The economy, jobs and living standards of every district — and where each can grow.",
      )}
      scrollHint={tx(lang, "Tatal", "Scroll")}
    />
  );
}
