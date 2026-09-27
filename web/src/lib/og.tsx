// Share cards (Open Graph images), rendered at build time. A dark paddy-green card
// with the Kedah map coloured by district type, a headline and one key number —
// what a link shows when it is posted on WhatsApp, LinkedIn or X.

import { ImageResponse } from "next/og";
import { geoMercator, geoPath } from "d3-geo";
import type { FeatureCollection, Geometry } from "geojson";
import geo from "@/data/kedah.geo.json";
import { districts } from "@/lib/atlas";

export const OG_SIZE = { width: 1200, height: 630 };

const fc = geo as unknown as FeatureCollection<Geometry, { district: string }>;
// Same hues as the site's validated type palette (light mode values).
const TYPE_FILL: Record<string, string> = { industry: "#eb6834", services: "#2a78d6", farm: "#1baf7a", rural: "#d3d1c8" };

type Card = { kicker: string; title: string; stat?: string; statLabel?: string; highlight?: string };

export function ogCard({ kicker, title, stat, statLabel, highlight }: Card) {
  const W = 430;
  const H = 520;
  const path = geoPath(geoMercator().fitExtent([[10, 10], [W - 10, H - 10]], fc)).digits(1);
  const typeOf = Object.fromEntries(districts.map((d) => [d.name, d.type]));
  return new ImageResponse(
    (
      <div style={{ width: "100%", height: "100%", display: "flex", background: "#123a26", color: "#ffffff", padding: "56px 64px" }}>
        <div style={{ display: "flex", flexDirection: "column", flex: 1, paddingRight: 32 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 14, fontSize: 26, fontWeight: 700 }}>
            <div style={{ width: 34, height: 34, borderRadius: 8, background: "#7cc98f", display: "flex" }} />
            Atlas Kedah
          </div>
          <div style={{ marginTop: 44, fontSize: 24, letterSpacing: 3, textTransform: "uppercase", color: "#f2c14e", fontWeight: 700 }}>{kicker}</div>
          <div style={{ marginTop: 12, fontSize: title.length > 42 ? 54 : 64, fontWeight: 800, lineHeight: 1.05, letterSpacing: -1.5 }}>{title}</div>
          {stat && (
            <div style={{ display: "flex", flexDirection: "column", marginTop: "auto" }}>
              <div style={{ fontSize: stat.length > 12 ? 56 : 72, fontWeight: 800, color: "#f2c14e", letterSpacing: -2 }}>{stat}</div>
              <div style={{ fontSize: 24, color: "#cfe3d6" }}>{statLabel}</div>
            </div>
          )}
        </div>
        <svg width={W} height={H} viewBox={`0 0 ${W} ${H}`}>
          {fc.features.map((f) => {
            const n = f.properties.district;
            const dim = highlight && highlight !== n;
            return (
              <path key={n} d={path(f) ?? ""} fill={highlight ? (dim ? "#2b5a41" : "#f2c14e") : TYPE_FILL[typeOf[n]]}
                stroke="#123a26" strokeWidth={2} />
            );
          })}
        </svg>
      </div>
    ),
    OG_SIZE,
  );
}
