import Link from "next/link";
import { geoMercator, geoPath } from "d3-geo";
import type { FeatureCollection, Geometry } from "geojson";
import CountUp from "@/components/CountUp";
import DistrictCards from "@/components/DistrictCards";
import KedahSpread from "@/components/KedahSpread";
import geo from "@/data/kedah.geo.json";
import { atlas, districts, last } from "@/lib/atlas";
import { fmt, rm, rmBillion, t, tx, typeInfo, type Locale } from "@/lib/i18n";
import { STORIES, storyHref } from "@/lib/stories";

const fc = geo as unknown as FeatureCollection<Geometry, { district: string }>;

export default async function Home({ params }: PageProps<"/[lang]">) {
  const lang = (await params).lang as Locale;
  const d = t(lang);
  const k = atlas.kedah;
  const pk = atlas.peers;
  const F = atlas.forecast;
  const gdpNow = last(k.gdp_state);
  const hiesYear = String(districts[0].living.latest_year);
  const pov = k.poverty[hiesYear];
  const pcShare = (last(pk.kedah.per_capita).value / last(pk.malaysia.per_capita).value) * 100;
  const fc25 = F.kedah.find((x) => x.year === F.known_until)!;
  const fc30 = F.kedah[F.kedah.length - 1];
  const path = geoPath(geoMercator().fitExtent([[8, 8], [292, 332]], fc)).digits(1);
  const typeOf = Object.fromEntries(districts.map((x) => [x.name, x.type]));

  return (
    <>
      <KedahSpread lang={lang} />

      <div className="wrap home">
        <h2 className="home-hello">
          {tx(lang, "Kenali Kedah, ", "Get to know Kedah, ")}<em>{tx(lang, "daerah demi daerah.", "district by district.")}</em>
        </h2>

        <div className="home-top">
          <Link href={`/${lang}/daerah/`} className="home-hero">
            <div className="home-hero-text">
              <p className="home-hero-title">{tx(lang, "Setiap daerah dalam ", "Every district in ")}<em>{tx(lang, "tujuh slaid", "seven slides")}</em></p>
              <p className="home-hero-sub">
                {tx(lang, "Pendapatan, kemiskinan, ekonomi dan hala tujunya — tanpa perlu membaca jadual.", "Income, poverty, the economy and where it's heading — no tables to read.")}
              </p>
              <span className="home-hero-btn">{tx(lang, "Mula sekarang", "Start now")}</span>
            </div>
            <svg className="home-hero-map" viewBox="0 0 300 340" aria-hidden="true">
              {fc.features.map((f) => (
                <path key={f.properties.district} d={path(f) ?? ""} style={{ fill: typeInfo[typeOf[f.properties.district]].color }} />
              ))}
            </svg>
          </Link>

          <aside className="home-side">
            <dl className="home-stats">
              <div>
                <dt className="tnum">{rmBillion(lang, gdpNow.total, 1)}</dt>
                <dd>{tx(lang, `KDNK Kedah, ${gdpNow.year}`, `Kedah's GDP, ${gdpNow.year}`)}</dd>
              </div>
              <div>
                <dt className="tnum">{rm(lang, k.income_median[hiesYear])}</dt>
                <dd>{tx(lang, "pendapatan isi rumah biasa, sebulan", "typical household income, a month")}</dd>
              </div>
              <div>
                <dt className="tnum">{tx(lang, `1 daripada ${Math.round(100 / pov)}`, `1 in ${Math.round(100 / pov)}`)}</dt>
                <dd>{tx(lang, `isi rumah hidup dalam kemiskinan (${hiesYear})`, `households live in poverty (${hiesYear})`)}</dd>
              </div>
            </dl>
            <div className="home-progress">
              <strong>{tx(lang, "Mengejar Malaysia", "Catching up with Malaysia")}</strong>
              <p>{tx(lang, `KDNK per kapita Kedah ialah ${fmt(lang, pcShare, 0)}% daripada purata Malaysia.`, `Kedah's GDP per person is ${fmt(lang, pcShare, 0)}% of the Malaysian average.`)}</p>
              <div className="home-bar" role="img" aria-label={`${fmt(lang, pcShare, 0)}%`}><span style={{ width: `${Math.round(pcShare)}%` }} /></div>
              <Link href={`/${lang}/cerita/shenzhen/`}>{tx(lang, "Bolehkah Kedah mengejar? →", "Can Kedah catch up? →")}</Link>
            </div>
          </aside>
        </div>

        <section aria-labelledby="pick-h">
          <div className="home-head">
            <p className="home-label" id="pick-h">{tx(lang, "Pilih daerah", "Pick a district")}</p>
            <Link href={`/${lang}/peta/`} className="home-more">{tx(lang, "Lihat di peta →", "See them on the map →")}</Link>
          </div>
          <DistrictCards lang={lang} />
        </section>

        <section aria-labelledby="more-h">
          <div className="home-head">
            <p className="home-label" id="more-h">{tx(lang, "Terokai lagi", "Explore more")}</p>
          </div>
          <div className="home-feats">
            <Link href={`/${lang}/kedah-pinang/`} className="feat feat-green">
              <span className="feat-kicker">{tx(lang, "Perbandingan utama", "Head to head")}</span>
              <span className="feat-title">{tx(lang, "Kedah lawan ", "Kedah vs ")}<em>{tx(lang, "Pulau Pinang", "Penang")}</em></span>
              <span className="feat-big tnum"><CountUp lang={lang} value={pk.kedah.area_km2 / pk.penang.area_km2} suffix="×" /></span>
              <span className="feat-sub">{tx(lang, "keluasan tanah Kedah berbanding Pulau Pinang", "Kedah's land against Penang's")}</span>
            </Link>
            <Link href={`/${lang}/unjuran/`} className="feat feat-gold">
              <span className="feat-kicker">{tx(lang, "Unjuran · model diuji", "Projections · tested model")}</span>
              <span className="feat-title">{tx(lang, "Ke mana Kedah ", "Where is Kedah ")}<em>{tx(lang, "menuju?", "heading?")}</em></span>
              <span className="feat-big tnum">{rmBillion(lang, fc30.p50, 1)}</span>
              <span className="feat-sub">
                {tx(lang, `KDNK menjelang ${fc30.year} (${fmt(lang, ((fc30.p50 / fc25.p50) ** (1 / (fc30.year - fc25.year)) - 1) * 100, 1)}% setahun). Cuba simulator.`,
                  `GDP by ${fc30.year} (${fmt(lang, ((fc30.p50 / fc25.p50) ** (1 / (fc30.year - fc25.year)) - 1) * 100, 1)}% a year). Try the simulator.`)}
              </span>
            </Link>
            {STORIES.filter((s) => s.slug !== "kedah-pinang").map((s) => (
              <Link key={s.slug} href={storyHref(lang, s)} className="feat">
                <span className="feat-kicker">{s.kicker[lang]}</span>
                <span className="feat-title">{s.title[lang]}</span>
                <span className="feat-sub">{s.blurb[lang]}</span>
              </Link>
            ))}
          </div>
        </section>

        <p className="home-foot">
          {tx(lang, "Mahu semua angka? ", "Want every number? ")}
          <Link href={`/${lang}/kedah/`}>{tx(lang, "Kedah dalam angka", "Kedah in numbers")}</Link>
          {" · "}
          <Link href={`/${lang}/data/`}>{d.nav.data}</Link>
          {" · "}
          <Link href={`/${lang}/kaedah/`}>{d.nav.method}</Link>
          {" · "}
          <Link href={`/${lang}/pelabur/`}>{tx(lang, "Untuk pelabur", "For investors")}</Link>
          {" · "}
          <Link href={`/${lang}/tentang/`}>{tx(lang, "Tentang", "About")}</Link>
        </p>
      </div>
    </>
  );
}
