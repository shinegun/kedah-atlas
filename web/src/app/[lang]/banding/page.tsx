import type { Metadata } from "next";
import { geoMercator, geoPath } from "d3-geo";
import type { Feature, FeatureCollection, Geometry } from "geojson";
import CompareDeck, { type CompareDistrict } from "@/components/CompareDeck";
import CompareTable, { type Column, type Row } from "@/components/CompareTable";
import geo from "@/data/kedah.geo.json";
import { TAGLINE } from "@/lib/districtCopy";
import { atlas, districts, last, SECTORS } from "@/lib/atlas";
import { sectorLabel, t, tx, typeInfo, type Locale } from "@/lib/i18n";

const fc = geo as unknown as FeatureCollection<Geometry, { district: string }>;

export async function generateMetadata({ params }: PageProps<"/[lang]/banding">): Promise<Metadata> {
  return { title: t((await params).lang as Locale).nav.compare };
}

export default async function Compare({ params }: PageProps<"/[lang]/banding">) {
  const lang = (await params).lang as Locale;
  const tr = t(lang);
  const d0 = districts[0];
  const columns: Column[] = [
    { key: "pop", label: tx(lang, `Penduduk ${d0.population.latest_year} (ribu)`, `Population ${d0.population.latest_year} (k)`), spec: { lang, kind: "num", digits: 1 } },
    { key: "gdp", label: tx(lang, `KDNK ${d0.gdp.latest_year} (RM juta)`, `GDP ${d0.gdp.latest_year} (RM m)`), spec: { lang, kind: "num" } },
    { key: "share", label: tx(lang, "% KDNK Kedah", "% of Kedah GDP"), spec: { lang, kind: "pct", digits: 1 } },
    { key: "gdppc", label: tx(lang, "KDNK per kapita (RM)", "GDP/person (RM)"), spec: { lang, kind: "num" } },
    { key: "growth", label: tx(lang, "Pertumbuhan 2015–19 (%/thn)", "Growth 2015–19 (%/yr)"), spec: { lang, kind: "num", digits: 1 } },
    { key: "agri", label: tx(lang, "Pertanian % KDNK", "Farming % GDP"), spec: { lang, kind: "pct", digits: 0 } },
    { key: "mfg", label: tx(lang, "Pembuatan % KDNK", "Manufacturing % GDP"), spec: { lang, kind: "pct", digits: 0 } },
    { key: "income", label: tx(lang, `Pendapatan penengah ${d0.living.latest_year} (RM)`, `Median income ${d0.living.latest_year} (RM)`), spec: { lang, kind: "num" } },
    { key: "poverty", label: tx(lang, `Kemiskinan ${d0.living.latest_year}`, `Poverty ${d0.living.latest_year}`), spec: { lang, kind: "pct", digits: 1 } },
    { key: "gini", label: "Gini", spec: { lang, kind: "num", digits: 3 } },
    { key: "urate", label: tx(lang, `Pengangguran ${d0.labour.latest_year}`, `Unemployment ${d0.labour.latest_year}`), spec: { lang, kind: "pct", digits: 1 } },
    { key: "prate", label: tx(lang, "Kadar penyertaan tenaga buruh", "Labour participation"), spec: { lang, kind: "pct", digits: 1 } },
    { key: "mig", label: tx(lang, "Migrasi bersih /1,000/thn", "Net migration /1,000/yr"), spec: { lang, kind: "num", digits: 1 }, estimate: true },
    { key: "elderly", label: tx(lang, "Warga emas 65+", "Aged 65+"), spec: { lang, kind: "pct", digits: 1 } },
  ];
  const rows: Row[] = districts.map((d) => {
    const tot = SECTORS.reduce((a, s) => a + last(d.gdp.by_sector[s]).value, 0);
    const lab = last(d.labour.series);
    return {
      slug: d.slug,
      name: d.name,
      values: {
        pop: d.population.latest,
        gdp: last(d.gdp.total).value,
        share: d.gdp.share_of_kedah,
        gdppc: d.gdp.per_capita_k * 1000,
        growth: d.gdp.cagr_2015_2019,
        agri: (last(d.gdp.by_sector.agriculture).value / tot) * 100,
        mfg: (last(d.gdp.by_sector.manufacturing).value / tot) * 100,
        income: last(d.living.income_median).value,
        poverty: last(d.living.poverty).value,
        gini: last(d.living.gini).value,
        urate: lab.u_rate,
        prate: lab.p_rate,
        mig: d.population.net_migration_per_1000_yr,
        elderly: d.population.age_share.elderly,
      },
    };
  });
  const F = atlas.forecast;
  const deck: CompareDistrict[] = districts.map((d) => {
    const f = fc.features.find((x) => x.properties.district === d.name) as Feature<Geometry>;
    const tot = SECTORS.reduce((a, s) => a + last(d.gdp.by_sector[s]).value, 0);
    const f25 = F.districts[d.name].total.find((x) => x.year === F.known_until)!;
    const f30 = last(F.districts[d.name].total);
    return {
      slug: d.slug, name: d.name, typeLabel: typeInfo[d.type].label[lang], color: typeInfo[d.type].color, tagline: TAGLINE[d.slug][lang],
      shape: geoPath(geoMercator().fitSize([100, 100], f)).digits(1)(f) ?? "",
      income: last(d.living.income_median).value, poverty: last(d.living.poverty).value, gdppc: d.gdp.per_capita_k * 1000,
      growthPast: d.gdp.cagr_2015_2019, gdp2030: f30.p50, growth2030: ((f30.p50 / f25.p50) ** (1 / (f30.year - f25.year)) - 1) * 100,
      sectors: SECTORS.map((s) => ({ key: s, label: sectorLabel[s][lang], v: (last(d.gdp.by_sector[s]).value / tot) * 100 })).sort((a, b) => b.v - a.v),
    };
  });
  const hy = String(d0.living.latest_year);
  const [ss0, ss1] = atlas.meta.shift_share_period;
  return (
    <div className="wrap home">
      <h1 className="home-hello">{tx(lang, "Bandingkan ", "Compare ")}<em>{tx(lang, "dua daerah.", "two districts.")}</em></h1>
      <CompareDeck
        lang={lang}
        districts={deck}
        kedah={{ income: atlas.kedah.income_median[hy], poverty: atlas.kedah.poverty[hy], gdppc: atlas.meta.kedah_gdp_per_capita_k * 1000 }}
        years={{ income: d0.living.latest_year, gdp: d0.gdp.latest_year, horizon: F.horizon, past: `${ss0}–${ss1}` }}
      />
      <details className="cmp-table">
        <summary>{tx(lang, "Jadual penuh: semua 12 daerah, 14 ukuran", "Full table: all 12 districts, 14 measures")}</summary>
        <p className="secondary small">
          {tx(lang, "Klik tajuk lajur untuk menyusun. Klik nama daerah untuk slaidnya.", "Click a column heading to sort. Click a district name for its slides.")}
        </p>
      <section>
        <CompareTable lang={lang} columns={columns} rows={rows} estimateLabel={tr.estimate} />
        <p className="source">
          * {tr.estimate}. {tr.source}: DOSM / OpenDOSM. {tx(lang, "KDNK diukur mengikut lokasi pengeluaran; penunjuk lain mengikut tempat tinggal.", "GDP by place of production; other indicators by place of residence.")}{" "}
          <a href={`/downloads/atlas-kedah-indicators.csv`}>{tx(lang, "Muat turun CSV", "Download CSV")}</a>
        </p>
      </section>
      </details>
    </div>
  );
}
