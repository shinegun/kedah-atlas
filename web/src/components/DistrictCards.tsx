import Link from "next/link";
import { geoMercator, geoPath } from "d3-geo";
import type { Feature, FeatureCollection, Geometry } from "geojson";
import geo from "@/data/kedah.geo.json";
import { districts, last } from "@/lib/atlas";
import { TAGLINE } from "@/lib/districtCopy";
import { photoSrc } from "@/lib/photos";
import { rm, tx, typeInfo, type Locale } from "@/lib/i18n";

const fc = geo as unknown as FeatureCollection<Geometry, { district: string }>;

/** Twelve cards, one per district: shape, name, one line, one number — each opens its slides. */
export default function DistrictCards({ lang }: { lang: Locale }) {
  return (
    <ul className="dcards">
      {districts.map((d) => {
        const f = fc.features.find((x) => x.properties.district === d.name) as Feature<Geometry>;
        const path = geoPath(geoMercator().fitSize([80, 80], f)).digits(1)(f) ?? "";
        const inc = last(d.living.income_median);
        const photo = photoSrc(d.slug);
        return (
          <li key={d.slug}>
            <Link href={`/${lang}/daerah/${d.slug}/`} className={`dcard${photo ? " has-photo" : ""}`}>
              <span className="dcard-media" style={photo ? { backgroundImage: `url(${photo})` } : undefined}>
                <svg viewBox="0 0 80 80" aria-hidden="true"><path d={path} style={{ fill: typeInfo[d.type].color }} /></svg>
              </span>
              <span className="dcard-type">{typeInfo[d.type].label[lang]}</span>
              <strong className="dcard-name">{d.name}</strong>
              <span className="dcard-line">{TAGLINE[d.slug][lang]}</span>
              <span className="dcard-foot">
                <span className="tnum">{rm(lang, inc.value)} <span className="muted">{tx(lang, "sebulan", "a month")}</span></span>
                <span className="dcard-go">{tx(lang, "7 slaid →", "7 slides →")}</span>
              </span>
            </Link>
          </li>
        );
      })}
    </ul>
  );
}
