import Link from "next/link";
import { geoMercator, geoPath } from "d3-geo";
import type { FeatureCollection, Geometry } from "geojson";
import geo from "@/data/kedah.geo.json";
import { DISTRICT_TYPES, districts } from "@/lib/atlas";
import { tx, typeInfo, type Locale } from "@/lib/i18n";

const fc = geo as unknown as FeatureCollection<Geometry, { district: string }>;

/** Landing-page doorway to /peta: a static map of district types plus a call to action. */
export default function MapTeaser({ lang }: { lang: Locale }) {
  const W = 360;
  const H = 400;
  const path = geoPath(geoMercator().fitExtent([[6, 6], [W - 6, H - 6]], fc)).digits(1);
  const typeOf = Object.fromEntries(districts.map((d) => [d.name, d.type]));
  return (
    <section aria-labelledby="map-teaser-h" className="map-teaser card">
      <Link href={`/${lang}/peta/`} className="map-teaser-map" aria-hidden="true" tabIndex={-1}>
        <svg viewBox={`0 0 ${W} ${H}`} role="presentation">
          {fc.features.map((f) => (
            <path key={f.properties.district} d={path(f) ?? ""} style={{ fill: typeInfo[typeOf[f.properties.district]].color }} />
          ))}
        </svg>
      </Link>
      <div>
        <p className="hero-kicker">{tx(lang, "Peta interaktif", "Interactive map")}</p>
        <h2 id="map-teaser-h">{tx(lang, "Apakah yang menggerakkan ekonomi setiap daerah?", "What drives each district's economy?")}</h2>
        <p className="secondary">
          {tx(lang,
            "Terokai 12 daerah mengikut jenis ekonomi, pendapatan, kemiskinan, pengangguran, migrasi dan cahaya malam — dan lihat bagaimana angka berubah dari tahun ke tahun.",
            "Explore the 12 districts by economy type, income, poverty, unemployment, migration and night lights — and watch the numbers change over the years.")}
        </p>
        <ul className="dmap-legend-cats" style={{ margin: "12px 0 16px" }}>
          {DISTRICT_TYPES.map((key) => (
            <li key={key}><span className="dmap-chip" style={{ background: typeInfo[key].color }} />{typeInfo[key].label[lang]}</li>
          ))}
        </ul>
        <Link className="btn-accent" href={`/${lang}/peta/`}>{tx(lang, "Buka peta →", "Open the map →")}</Link>
      </div>
    </section>
  );
}
