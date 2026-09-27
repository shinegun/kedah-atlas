import type { Metadata } from "next";
import Link from "next/link";
import ScenarioSim, { type Project } from "@/components/ScenarioSim";
import { atlas, districts, SECTORS, type Sector } from "@/lib/atlas";
import { fmt, LOCALES, t, tx, type Locale } from "@/lib/i18n";

export function generateStaticParams() {
  return LOCALES.map((lang) => ({ lang }));
}

export async function generateMetadata({ params }: PageProps<"/[lang]/unjuran">): Promise<Metadata> {
  const lang = (await params).lang as Locale;
  return {
    title: tx(lang, "Unjuran ekonomi hingga 2030", "Economic projections to 2030"),
    description: tx(lang, "Anggaran KDNK setiap daerah Kedah hingga 2030, dengan julat ketidakpastian dan simulator senario.",
      "GDP estimates for every Kedah district to 2030, with uncertainty ranges and a scenario simulator."),
  };
}

// Project assumptions (above-trend jobs), cited on the page.
const KHTP_EXTRA_BY_2035 = 80_000; // 70k (2022) → 150k target (The Vibes, May 2022)
const KRC_JOBS = 14_500;           // over 15 years (MIDA, Nov 2025)
const KRC_START = 2027;            // tyre plant due to start operating

const MODEL_NAME: Record<string, Record<Locale, string>> = {
  naive: { ms: "Bahagian tetap KDNK negeri", en: "Constant share of state GDP" },
  shift_share: { ms: "Bahagian tetap setiap sektor (shift-share)", en: "Constant share of each sector (shift-share)" },
  momentum: { ms: "Momentum (separuh trend lalu)", en: "Momentum (half the past trend)" },
  ml: { ms: "Pembelajaran mesin (gradient-boosted trees)", en: "Machine learning (gradient-boosted trees)" },
};

export default async function Projections({ params }: PageProps<"/[lang]/unjuran">) {
  const lang = (await params).lang as Locale;
  const tr = t(lang);
  const F = atlas.forecast;
  const P = atlas.peers;
  const bt = F.backtest.median_abs_pct_error;
  const models = Object.keys(bt).sort((a, b) => bt[a]["3"] - bt[b]["3"]);
  const mlLost = F.model !== "ml";
  const years = F.proj_years;
  const khtp: Project = {
    key: "khtp", district: "Kulim",
    label: tx(lang, "KHTP mencapai 150,000 pekerja menjelang 2035", "KHTP reaches 150,000 workers by 2035"),
    note: tx(lang, `+${fmt(lang, KHTP_EXTRA_BY_2035 / 10, 0)} pekerja kilang setahun di Kulim, melebihi trend`, `+${fmt(lang, KHTP_EXTRA_BY_2035 / 10, 0)} factory workers a year in Kulim, above trend`),
    jobs: years.map((y) => (KHTP_EXTRA_BY_2035 / 10) * (y - F.known_until)),
  };
  const krc: Project = {
    key: "krc", district: "Padang Terap",
    label: tx(lang, "Bandar Getah Kedah beroperasi", "Kedah Rubber City opens"),
    note: tx(lang, `${fmt(lang, KRC_JOBS, 0)} pekerjaan dalam 15 tahun di Padang Terap, bermula ${KRC_START}`, `${fmt(lang, KRC_JOBS, 0)} jobs over 15 years in Padang Terap, from ${KRC_START}`),
    jobs: years.map((y) => Math.max(0, y - KRC_START + 1) * (KRC_JOBS / 15)),
  };
  const history = Object.keys(P.kedah.sectors.services).map((_, i) => ({
    year: P.kedah.sectors.services[i].year,
    value: SECTORS.reduce((a, s) => a + P.kedah.sectors[s][i].value, 0),
  }));
  const population = Object.fromEntries(F.kedah_population_k.map((p) => [p.year, p.value]));
  const districtPopulation = Object.fromEntries(districts.map((d) => [d.name, Object.fromEntries(F.districts[d.name].population_k.map((p) => [p.year, p.value]))]));
  const start = Object.fromEntries(districts.map((d) => [d.name, F.districts[d.name].total.find((x) => x.year === F.known_until)!.p50]));
  const penang = Object.fromEntries(SECTORS.map((s) => [s, P.penang.cagr_sectors[s]])) as Record<Sector, number>;
  const slugs = Object.fromEntries(districts.map((d) => [d.name, d.slug]));
  const lastYear = years[years.length - 1];

  return (
    <div className="wrap">
      <nav className="crumbs"><Link href={`/${lang}/`}>{tr.siteName}</Link> / {tx(lang, "Unjuran", "Projections")}</nav>
      <div className="narrow">
        <p className="hero-kicker">{tx(lang, "Unjuran · model yang diuji", "Projections · tested models")}</p>
        <h1>{tx(lang, "Ke mana ekonomi Kedah menuju?", "Where is Kedah's economy heading?")}</h1>
        <p className="lede secondary" style={{ fontSize: "1.15rem" }}>
          {tx(lang,
            `DOSM berhenti menerbitkan KDNK daerah selepas 2020. Kami menganggarkan ${F.years[0]}–${F.known_until} bagi setiap daerah dan mengunjurkan hingga ${lastYear}, dengan julat ketidakpastian. Model dipilih kerana ketepatannya apabila diuji pada data sebenar, bukan kerana kecanggihannya.`,
            `DOSM stopped publishing district GDP after 2020. We estimate ${F.years[0]}–${F.known_until} for every district and project to ${lastYear}, with uncertainty ranges. The model was chosen for how accurate it proved on real data, not for how sophisticated it is.`)}
        </p>
      </div>

      <section aria-labelledby="sim-h" style={{ marginTop: 8 }}>
        <h2 id="sim-h">{tx(lang, "Simulator senario", "Scenario simulator")}</h2>
        <p className="secondary narrow" style={{ marginTop: 0 }}>
          {tx(lang,
            "Ubah kadar pertumbuhan setiap sektor, atau hidupkan projek besar, dan lihat kesannya pada KDNK Kedah dan setiap daerah hingga 2030.",
            "Change each sector's growth rate, or switch on major projects, and see the effect on Kedah's GDP and every district to 2030.")}
        </p>
        <ScenarioSim
          lang={lang}
          projYears={years}
          knownUntil={F.known_until}
          stateBase={F.state_base}
          baseline={Object.fromEntries(SECTORS.map((s) => [s, +F.baseline_growth[s].toFixed(1)])) as Record<Sector, number>}
          penang={penang}
          shares={F.shares}
          districtBand={F.district_band}
          kedahBand={F.kedah_band}
          history={history}
          population={population}
          districtPopulation={districtPopulation}
          malaysiaPc={{ year: P.period[1], value: P.malaysia.per_capita[P.malaysia.per_capita.length - 1].value, growth: P.malaysia.cagr_per_capita }}
          productivity={F.productivity.manufacturing_rm_per_worker}
          projects={[khtp, krc]}
          start={start}
          slugs={slugs}
        />
        <p className="source">
          <span className="badge estimate">{tx(lang, "Unjuran", "Projection")}</span>{" "}
          {tx(lang,
            `KDNK sektor Kedah (tidak termasuk duti import), harga malar 2015. Output setiap pekerja kilang tambahan: RM${fmt(lang, F.productivity.manufacturing_rm_per_worker, 0)} (purata pembuatan Kedah, ${F.productivity.year}). KDNK per kapita Malaysia diandaikan tumbuh ${fmt(lang, P.malaysia.cagr_per_capita, 1)}% setahun. Sumber: DOSM; The Vibes (2022); MIDA (2025).`,
            `Kedah sector GDP (excluding import duties), constant 2015 prices. Output per extra factory worker: RM${fmt(lang, F.productivity.manufacturing_rm_per_worker, 0)} (Kedah manufacturing average, ${F.productivity.year}). Malaysia's GDP per person is assumed to grow ${fmt(lang, P.malaysia.cagr_per_capita, 1)}% a year. Sources: DOSM; The Vibes (2022); MIDA (2025).`)}{" "}
          <Link href={`/${lang}/kaedah/#unjuran`}>{tx(lang, "Kaedah →", "Method →")}</Link>
        </p>
      </section>

      <section aria-labelledby="models-h" className="narrow">
        <h2 id="models-h">{tx(lang, "Bagaimana kami memilih model", "How we chose the model")}</h2>
        <p>
          {tx(lang,
            `Kami menguji empat model pada ${F.backtest.n_districts} daerah di seluruh Malaysia menggunakan data 2015–2020. Setiap model meramal satu negeri tanpa pernah melihat data negeri itu, kemudian ramalannya dibandingkan dengan angka sebenar DOSM.`,
            `We tested four models on ${F.backtest.n_districts} districts across Malaysia using 2015–2020 data. Each model forecast one state without ever seeing that state's data, and its forecasts were then compared with DOSM's actual figures.`)}
        </p>
        <div className="table-wrap">
          <table>
            <caption className="sr-only">{tx(lang, "Ralat model", "Model error")}</caption>
            <thead>
              <tr>
                <th scope="col">{tx(lang, "Model", "Model")}</th>
                <th scope="col">{tx(lang, "Ralat, 1 tahun", "Error, 1 year")}</th>
                <th scope="col">{tx(lang, "Ralat, 3 tahun", "Error, 3 years")}</th>
              </tr>
            </thead>
            <tbody>
              {models.map((m) => (
                <tr key={m} className={m === F.model ? "win" : undefined}>
                  <td>{MODEL_NAME[m][lang]}{m === F.model && <span className="badge official" style={{ marginLeft: 6 }}>{tx(lang, "Dipilih", "Chosen")}</span>}</td>
                  <td className="tnum">{fmt(lang, bt[m]["1"], 1)}%</td>
                  <td className="tnum">{fmt(lang, bt[m]["3"], 1)}%</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="source">{tx(lang, "Ralat = median ralat mutlak KDNK daerah, dalam peratus. Lebih rendah lebih baik.", "Error = median absolute error of district GDP, in per cent. Lower is better.")}</p>
        {mlLost && (
          <div className="callout info">
            {tx(lang,
              "Pembelajaran mesin tidak mengalahkan model yang lebih mudah. Dengan hanya enam tahun data daerah, kebanyakan perbezaan antara daerah dan negerinya ialah hingar rawak — dan model yang canggih cenderung mempelajari hingar itu. Kami menggunakan model yang paling tepat, dan akan menguji semula apabila DOSM menerbitkan data baharu.",
              "Machine learning did not beat the simpler model. With only six years of district data, most of the difference between a district and its state is random noise — and sophisticated models tend to learn that noise. We use the most accurate model, and will re-test when DOSM publishes new data.")}
          </div>
        )}
      </section>
    </div>
  );
}
