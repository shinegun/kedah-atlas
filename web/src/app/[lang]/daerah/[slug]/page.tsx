import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { geoMercator, geoPath } from "d3-geo";
import type { Feature, FeatureCollection, Geometry } from "geojson";
import StoryDeck, { type Slide } from "@/components/StoryDeck";
import geo from "@/data/kedah.geo.json";
import { atlas, districts, getDistrict, last, SECTORS } from "@/lib/atlas";
import { TAGLINE } from "@/lib/districtCopy";
import { PHOTOS, photoSrc } from "@/lib/photos";
import { fmt, LOCALES, rm, rmBillion, sectorLabel, tx, typeInfo, type Locale } from "@/lib/i18n";

export const dynamicParams = false;

export function generateStaticParams() {
  return LOCALES.flatMap((lang) => districts.map((d) => ({ lang, slug: d.slug })));
}

export async function generateMetadata({ params }: PageProps<"/[lang]/daerah/[slug]">): Promise<Metadata> {
  const { lang, slug } = await params;
  const d = getDistrict(slug);
  if (!d) return {};
  return { title: d.name, description: TAGLINE[slug]?.[lang as Locale] };
}

const fc = geo as unknown as FeatureCollection<Geometry, { district: string }>;

function shape(name: string, size = 100) {
  const f = fc.features.find((x) => x.properties.district === name) as Feature<Geometry>;
  return geoPath(geoMercator().fitSize([size, size], f)).digits(1)(f) ?? "";
}

export default async function DistrictSlides({ params }: PageProps<"/[lang]/daerah/[slug]">) {
  const { lang: l, slug } = await params;
  const lang = l as Locale;
  const d = getDistrict(slug);
  if (!d) notFound();
  const k = atlas.kedah;
  const my = atlas.malaysia;
  const F = atlas.forecast;
  const ty = typeInfo[d.type];
  const inc = last(d.living.income_median);
  const kInc = k.income_median[String(inc.year)];
  const myInc = my.income_median[String(inc.year)];
  const incGap = (inc.value / kInc - 1) * 100;
  const pov = last(d.living.poverty);
  const kPov = k.poverty[String(pov.year)];
  const oneIn = Math.max(1, Math.round(100 / pov.value));
  const kOneIn = Math.round(100 / kPov);
  const oneInText = (n: number) => tx(lang, `1 daripada ${n}`, `1 in ${n}`);
  const sectorTot = SECTORS.reduce((a, s) => a + last(d.gdp.by_sector[s]).value, 0);
  const shares = SECTORS.map((s) => ({ s, v: (last(d.gdp.by_sector[s]).value / sectorTot) * 100 })).sort((a, b) => b.v - a.v);
  // the sector that stands out most against Kedah, among those that are a real part of the economy
  const standout = shares.filter((x) => x.v >= 5).map((x) => x.s).sort((a, b) => d.gdp.lq_kedah[b] - d.gdp.lq_kedah[a])[0];
  const f25 = F.districts[d.name].total.find((x) => x.year === F.known_until)!;
  const f30 = last(F.districts[d.name].total);
  const g30 = ((f30.p50 / f25.p50) ** (1 / (f30.year - f25.year)) - 1) * 100;
  const idx = districts.findIndex((x) => x.slug === d.slug);
  const nextD = districts[(idx + 1) % districts.length];
  const brief = d.brief?.[lang];
  const incMax = Math.max(inc.value, kInc, myInc);
  const tone = (good: boolean) => (good ? "good" : "bad");
  const photo = photoSrc(d.slug);
  const credit = PHOTOS[d.slug];

  const slides: Slide[] = [
    {
      key: "cover", theme: "dark", label: d.name,
      content: (
        <div className={`sl-cover${photo ? " has-photo" : ""}`}>
          {photo && <div className="sl-photo" style={{ backgroundImage: `url(${photo})` }} role="img" aria-label={credit.title} />}
          <div className="sl-cover-text">
            <p className="sl-kicker">{tx(lang, `Daerah ${idx + 1} daripada 12`, `District ${idx + 1} of 12`)} · {ty.label[lang]}</p>
            <h1 className="sl-title">{d.name}</h1>
            <p className="sl-lede">{TAGLINE[d.slug][lang]}</p>
            <p className="sl-chips">
              <span>{fmt(lang, d.population.latest, 0)} {tx(lang, "ribu penduduk", "thousand people")}</span>
              {d.area_km2 && <span>{fmt(lang, d.area_km2, 0)} km²</span>}
              <span>{fmt(lang, d.gdp.share_of_kedah, 1)}% {tx(lang, "KDNK Kedah", "of Kedah's GDP")}</span>
            </p>
          </div>
          <svg className="sl-shape" viewBox="0 0 100 100" aria-hidden="true">
            <path d={shape(d.name)} style={{ fill: ty.color }} />
          </svg>
          {photo && (
            <a className="sl-credit" href={credit.page} rel="noopener">
              {tx(lang, "Foto", "Photo")}: {credit.artist} · {credit.licence}
            </a>
          )}
        </div>
      ),
    },
    {
      key: "income", label: tx(lang, "Pendapatan", "Income"),
      content: (
        <div className="sl-body">
          <p className="sl-kicker">{tx(lang, "Pendapatan isi rumah", "Household income")}</p>
          <h2 className="sl-q">{tx(lang, `Berapa pendapatan isi rumah biasa di ${d.name}?`, `What does a typical household in ${d.name} earn?`)}</h2>
          <div className="sl-big">{rm(lang, inc.value)}<span>{tx(lang, ` sebulan (${inc.year})`, ` a month (${inc.year})`)}</span></div>
          <p className={`sl-verdict ${tone(incGap >= 0)}`}>
            {Math.abs(incGap) < 3
              ? tx(lang, "Hampir sama dengan purata Kedah.", "About the same as the Kedah average.")
              : tx(lang, `${fmt(lang, Math.abs(incGap), 0)}% ${incGap > 0 ? "lebih tinggi" : "lebih rendah"} daripada purata Kedah.`,
                `${fmt(lang, Math.abs(incGap), 0)}% ${incGap > 0 ? "higher" : "lower"} than the Kedah average.`)}
          </p>
          <div className="sl-bars">
            {[[d.name, inc.value, true], ["Kedah", kInc, false], ["Malaysia", myInc, false]].map(([name, v, me]) => (
              <div key={name as string} className={`sl-bar${me ? " me" : ""}`}>
                <span className="sl-bar-name">{name as string}</span>
                <span className="sl-bar-track"><span style={{ width: `${((v as number) / incMax) * 100}%` }} /></span>
                <span className="sl-bar-v tnum">{rm(lang, v as number)}</span>
              </div>
            ))}
          </div>
          <p className="sl-source">{tx(lang, "Pendapatan penengah isi rumah. Sumber: DOSM, Survei Pendapatan Isi Rumah.", "Median household income. Source: DOSM, Household Income Survey.")}</p>
        </div>
      ),
    },
    {
      key: "poverty", label: tx(lang, "Kemiskinan", "Poverty"),
      content: (
        <div className="sl-body">
          <p className="sl-kicker">{tx(lang, "Kemiskinan", "Poverty")}</p>
          <h2 className="sl-q">{tx(lang, "Berapa ramai hidup di bawah garis kemiskinan?", "How many live below the poverty line?")}</h2>
          <div className="sl-big">{oneInText(oneIn)}<span>{tx(lang, " isi rumah", " households")}</span></div>
          <div className="sl-dots" aria-hidden="true">
            {Array.from({ length: Math.min(oneIn, 30) }, (_, n) => <span key={n} className={n === 0 ? "on" : undefined} />)}
          </div>
          <p className={`sl-verdict ${tone(pov.value <= kPov)}`}>
            {tx(lang,
              `${fmt(lang, pov.value, 1)}% (${pov.year}). Bagi Kedah: ${oneInText(kOneIn)} (${fmt(lang, kPov, 1)}%).`,
              `${fmt(lang, pov.value, 1)}% (${pov.year}). Kedah: ${oneInText(kOneIn)} (${fmt(lang, kPov, 1)}%).`)}
          </p>
          <p className="sl-source">{tx(lang, "Kemiskinan mutlak. Sumber: DOSM.", "Absolute poverty. Source: DOSM.")}</p>
        </div>
      ),
    },
    {
      key: "economy", theme: "accent", label: tx(lang, "Ekonomi", "Economy"),
      content: (
        <div className="sl-body">
          <p className="sl-kicker">{tx(lang, "Ekonomi", "Economy")} · {ty.label[lang]}</p>
          <h2 className="sl-q">{tx(lang, `Apa yang menggerakkan ekonomi ${d.name}?`, `What drives ${d.name}'s economy?`)}</h2>
          <div className="sl-big">{fmt(lang, shares[0].v, 0)}%<span> {sectorLabel[shares[0].s][lang].toLowerCase()}</span></div>
          <div className="sl-stack" role="img" aria-label={shares.map((x) => `${sectorLabel[x.s][lang]} ${fmt(lang, x.v, 0)}%`).join(", ")}>
            {shares.filter((x) => x.v >= 0.5).map((x) => (
              <span key={x.s} style={{ flexGrow: x.v, background: `var(--s-${x.s})` }} title={`${sectorLabel[x.s][lang]} ${fmt(lang, x.v, 0)}%`} />
            ))}
          </div>
          <ul className="sl-legend">
            {shares.filter((x) => x.v >= 3).map((x) => (
              <li key={x.s}><span style={{ background: `var(--s-${x.s})` }} />{sectorLabel[x.s][lang]} <strong className="tnum">{fmt(lang, x.v, 0)}%</strong></li>
            ))}
          </ul>
          {d.gdp.lq_kedah[standout] >= 1.3 && (
            <p className="sl-verdict neutral">
              {tx(lang,
                `${sectorLabel[standout].ms.replace(" & ", " dan ")} di sini ${fmt(lang, d.gdp.lq_kedah[standout], 1)} kali lebih penting berbanding purata Kedah.`,
                `${sectorLabel[standout].en} matters ${fmt(lang, d.gdp.lq_kedah[standout], 1)} times more here than across Kedah.`)}
            </p>
          )}
          <p className="sl-source">{tx(lang, `Bahagian KDNK daerah, ${d.gdp.latest_year}. Sumber: DOSM.`, `Share of district GDP, ${d.gdp.latest_year}. Source: DOSM.`)}</p>
        </div>
      ),
    },
    ...(brief ? [{
      key: "brief", label: tx(lang, "Kekuatan dan cabaran", "Strengths and challenges"),
      content: (
        <div className="sl-body">
          <p className="sl-kicker">{tx(lang, "Ringkasan", "In short")} <span className="badge ai">{d.brief!.reviewed ? tx(lang, "Disemak", "Reviewed") : tx(lang, "Draf AI", "AI draft")}</span></p>
          <h2 className="sl-q">{tx(lang, "Apa yang berjalan baik, dan apa yang menghalang?", "What's working, and what's holding it back?")}</h2>
          <div className="sl-two">
            <div className="sl-card good"><strong>▲ {tx(lang, "Berjalan baik", "Working")}</strong><p>{brief.working[0]}</p></div>
            <div className="sl-card bad"><strong>▼ {tx(lang, "Menghalang", "Holding back")}</strong><p>{brief.holding[0]}</p></div>
          </div>
          <p className="sl-source">{tx(lang, "Didraf oleh AI (Claude) hanya daripada data atlas; setiap angka disemak secara automatik.", "Drafted by AI (Claude) only from atlas data; every number is checked automatically.")}</p>
        </div>
      ),
    } satisfies Slide] : []),
    {
      key: "future", theme: "gold", label: tx(lang, "Menjelang 2030", "By 2030"),
      content: (
        <div className="sl-body">
          <p className="sl-kicker">{tx(lang, "Unjuran", "Projection")} · {f30.year}</p>
          <h2 className="sl-q">{tx(lang, `Ke mana ${d.name} menuju?`, `Where is ${d.name} heading?`)}</h2>
          <div className="sl-big">{rmBillion(lang, f30.p50, 1)}<span>{tx(lang, ` KDNK menjelang ${f30.year}`, ` GDP by ${f30.year}`)}</span></div>
          <p className="sl-verdict neutral">
            {tx(lang,
              `${fmt(lang, g30, 1)}% setahun jika trend semasa berterusan. Julat: ${rmBillion(lang, f30.p10, 1)}–${rmBillion(lang, f30.p90, 1)}.`,
              `${fmt(lang, g30, 1)}% a year if current trends hold. Range: ${rmBillion(lang, f30.p10, 1)}–${rmBillion(lang, f30.p90, 1)}.`)}
          </p>
          <Spark lang={lang} actual={d.gdp.total} fc={F.districts[d.name].total} />
          <p className="sl-source">
            {tx(lang, `Harga malar 2015. Model diuji pada ${F.backtest.n_districts} daerah; ralat median 3 tahun ${fmt(lang, F.backtest.median_abs_pct_error[F.model]["3"], 1)}%.`,
              `Constant 2015 prices. Model tested on ${F.backtest.n_districts} districts; 3-year median error ${fmt(lang, F.backtest.median_abs_pct_error[F.model]["3"], 1)}%.`)}
          </p>
        </div>
      ),
    },
    {
      key: "next", label: tx(lang, "Seterusnya", "What next"),
      content: (
        <div className="sl-body">
          <p className="sl-kicker">{tx(lang, "Seterusnya", "What next")}</p>
          <h2 className="sl-q">{tx(lang, "Perkara untuk dipantau", "What to watch")}</h2>
          {brief && <p className="sl-lede-dark">{brief.watch[1] ?? brief.watch[0]}</p>}
          <div className="sl-actions">
            {d.slug === "baling" && <Link className="sl-btn primary" href={`/${lang}/cerita/baling/`}>{tx(lang, "Baca cerita Baling", "Read the Baling story")} →</Link>}
            <Link className="sl-btn" href={`/${lang}/banding/#a=${d.slug}`}>{tx(lang, "Bandingkan dengan daerah lain", "Compare with another district")}</Link>
            <Link className="sl-btn" href={`/${lang}/unjuran/`}>{tx(lang, "Cuba simulator masa depan", "Try the future simulator")}</Link>
            <Link className="sl-btn" href={`/${lang}/daerah/${d.slug}/data/`}>{tx(lang, "Lihat data penuh", "See the full data")}</Link>
          </div>
          <p className="sl-source">{tx(lang, `Daerah seterusnya: ${nextD.name}.`, `Next district: ${nextD.name}.`)}</p>
        </div>
      ),
    },
  ];

  return (
    <div className="deck-page">
      <StoryDeck
        lang={lang}
        title={d.name}
        slides={slides}
        exit={{ href: `/${lang}/daerah/`, label: tx(lang, "Semua daerah", "All districts") }}
        next={{ href: `/${lang}/daerah/${nextD.slug}/`, label: nextD.name }}
      />
    </div>
  );
}

/** Tiny GDP line: actual (solid) then projection (dashed) with its range. */
function Spark({ lang, actual, fc }: { lang: Locale; actual: { year: number; value: number }[]; fc: { year: number; p10: number; p50: number; p90: number }[] }) {
  const W = 520, H = 120, P = 8;
  const all = [...actual.map((p) => p.value), ...fc.map((p) => p.p90), ...fc.map((p) => p.p10)];
  const [lo, hi] = [Math.min(...all) * 0.95, Math.max(...all)];
  const y0 = actual[0].year, y1 = fc[fc.length - 1].year;
  const x = (y: number) => P + ((y - y0) / (y1 - y0)) * (W - 2 * P);
  const y = (v: number) => H - P - ((v - lo) / (hi - lo)) * (H - 2 * P);
  const la = actual[actual.length - 1];
  const band = `M${x(la.year)},${y(la.value)}${fc.map((p) => `L${x(p.year)},${y(p.p90)}`).join("")}${[...fc].reverse().map((p) => `L${x(p.year)},${y(p.p10)}`).join("")}Z`;
  return (
    <svg className="sl-spark" viewBox={`0 0 ${W} ${H + 18}`} role="img" aria-label={tx(lang, "KDNK sebenar dan unjuran", "Actual and projected GDP")}>
      <path d={band} className="band" />
      <path d={actual.map((p, i) => `${i ? "L" : "M"}${x(p.year)},${y(p.value)}`).join("")} className="act" />
      <path d={[la, ...fc.map((p) => ({ year: p.year, value: p.p50 }))].map((p, i) => `${i ? "L" : "M"}${x(p.year)},${y(p.value)}`).join("")} className="proj" />
      <text x={x(y0)} y={H + 14}>{y0}</text>
      <text x={x(la.year)} y={H + 14} textAnchor="middle">{la.year}</text>
      <text x={x(y1)} y={H + 14} textAnchor="end">{y1}</text>
    </svg>
  );
}
