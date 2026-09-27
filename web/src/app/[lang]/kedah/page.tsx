import type { Metadata } from "next";
import Link from "next/link";
import BarList from "@/components/BarList";
import LineChart from "@/components/LineChart";
import { atlas, districts, last } from "@/lib/atlas";
import { fmt, industryLabel, occupationLabel, LOCALES, rm, rmBillion, t, tx, type Locale } from "@/lib/i18n";

export async function generateMetadata({ params }: PageProps<"/[lang]/kedah">): Promise<Metadata> {
  const lang = (await params).lang as Locale;
  return { title: tx(lang, "Kedah dalam angka", "Kedah in numbers") };
}

export function generateStaticParams() {
  return LOCALES.map((lang) => ({ lang }));
}

export default async function KedahNumbers({ params }: PageProps<"/[lang]/kedah">) {
  const lang = (await params).lang as Locale;
  const d = t(lang);
  const k = atlas.kedah;
  const my = atlas.malaysia;
  const gdpNow = last(k.gdp_state);
  const gdpPrev = k.gdp_state[k.gdp_state.length - 2];
  const jobsYear = String(k.jobs_year);
  const prevJobsYear = String(k.jobs_year - 1);
  const employed = Object.values(k.jobs_industry[jobsYear]).reduce((a, b) => a + b, 0);
  const hiesYear = String(districts[0].living.latest_year);

  const industries = Object.entries(k.jobs_industry[jobsYear]).sort((a, b) => b[1] - a[1]);
  const occupations = Object.entries(k.jobs_occupation[jobsYear]).sort((a, b) => b[1] - a[1]);
  const gdpShare = [...districts].sort((a, b) => last(b.gdp.total).value - last(a.gdp.total).value);
  const top2Jobs = ((industries[0][1] + industries[1][1]) / employed) * 100;
  const top3 = gdpShare.slice(0, 3);
  const top3Share = top3.reduce((a, x) => a + x.gdp.share_of_kedah, 0);

  return (
    <>

    <div className="wrap">
      <nav className="crumbs"><Link href={`/${lang}/`}>{d.siteName}</Link> / {tx(lang, "Kedah dalam angka", "Kedah in numbers")}</nav>
      <p className="hero-kicker">{tx(lang, "Data penuh", "Full data")}</p>
      <h1>{tx(lang, "Kedah dalam angka", "Kedah in numbers")}</h1>
      <p className="lede secondary">
        {tx(lang,
          "Semua angka rasmi peringkat negeri: ekonomi, pekerjaan, pendapatan dan kemiskinan sejak 1970. Untuk gambaran ringkas setiap daerah, lihat slaid daerah.",
          "Every official state-level figure: economy, jobs, income and poverty since 1970. For a quick picture of each district, see the district slides.")}
      </p>

      <section aria-labelledby="kedah-now">
        <h2 id="kedah-now" className="sr-only">{tx(lang, "Kedah hari ini", "Kedah today")}</h2>
        <div className="stats">
          <div className="stat">
            <div className="label">{tx(lang, `KDNK Kedah, ${gdpNow.year}`, `Kedah GDP, ${gdpNow.year}`)}</div>
            <div className="value">{rmBillion(lang, gdpNow.total)}</div>
            <div className="context">
              {tx(lang, "Harga malar 2015", "Constant 2015 prices")} · +{fmt(lang, (gdpNow.total / gdpPrev.total - 1) * 100, 1)}%{" "}
              {tx(lang, `berbanding ${gdpPrev.year}`, `vs ${gdpPrev.year}`)}
            </div>
          </div>
          <div className="stat">
            <div className="label">{tx(lang, `Penduduk bekerja, ${jobsYear}`, `Employed people, ${jobsYear}`)}</div>
            <div className="value">{fmt(lang, employed, 0)}{tx(lang, " ribu", "k")}</div>
            <div className="context">{tx(lang, "Survei Tenaga Buruh", "Labour Force Survey")}</div>
          </div>
          <div className="stat">
            <div className="label">{tx(lang, `Pendapatan penengah isi rumah, ${hiesYear}`, `Median household income, ${hiesYear}`)}</div>
            <div className="value">{rm(lang, k.income_median[hiesYear])}</div>
            <div className="context">{tx(lang, "Malaysia", "Malaysia")}: {rm(lang, my.income_median[hiesYear])}</div>
          </div>
          <div className="stat">
            <div className="label">{tx(lang, `Kemiskinan mutlak, ${hiesYear}`, `Absolute poverty, ${hiesYear}`)}</div>
            <div className="value">{fmt(lang, k.poverty[hiesYear], 1)}%</div>
            <div className="context">{tx(lang, "Malaysia", "Malaysia")}: {fmt(lang, my.poverty[hiesYear], 1)}%</div>
          </div>
        </div>
      </section>

      <section aria-labelledby="jobs-h">
        <div className="section-head">
          <h2 id="jobs-h">{tx(lang, "Apakah pekerjaan rakyat Kedah?", "What do Kedah's people work in?")}</h2>
          <p>
            {tx(lang,
              `${fmt(lang, employed, 0)} ribu orang bekerja pada ${jobsYear}. ${industryLabel[industries[0][0]].ms} dan ${industryLabel[industries[1][0]].ms.toLowerCase()} menggaji ${fmt(lang, top2Jobs, 0)}% daripada jumlah tersebut.`,
              `${fmt(lang, employed, 0)}k people were employed in ${jobsYear}. ${industryLabel[industries[0][0]].en} and ${industryLabel[industries[1][0]].en.toLowerCase()} employ ${fmt(lang, top2Jobs, 0)}% of them.`)}
          </p>
        </div>
        <div className="grid-2">
          <div className="card">
            <h3>{tx(lang, "Mengikut industri", "By industry")} <span className="badge official">{d.official}</span></h3>
            <p className="sub">{tx(lang, `Ribu pekerja, ${jobsYear}. Garis tegak = ${prevJobsYear}.`, `Thousand workers, ${jobsYear}. Vertical tick = ${prevJobsYear}.`)}</p>
            <BarList
              tickLabel={prevJobsYear}
              rows={industries.map(([key, v]) => ({
                key, label: industryLabel[key][lang], value: v, display: fmt(lang, v, 1),
                tick: k.jobs_industry[prevJobsYear]?.[key],
                title: `${industryLabel[key][lang]}: ${fmt(lang, v, 1)} (${jobsYear}) · ${fmt(lang, k.jobs_industry[prevJobsYear]?.[key], 1)} (${prevJobsYear})`,
              }))}
            />
            <p className="source">{d.source}: DOSM, {tx(lang, "Laporan Survei Tenaga Buruh", "Labour Force Survey Report")} {jobsYear}, {tx(lang, "Jadual", "Table")} B4.8.</p>
          </div>
          <div className="card">
            <h3>{tx(lang, "Mengikut pekerjaan", "By occupation")} <span className="badge official">{d.official}</span></h3>
            <p className="sub">{tx(lang, `Ribu pekerja, ${jobsYear}. Garis tegak = ${prevJobsYear}.`, `Thousand workers, ${jobsYear}. Vertical tick = ${prevJobsYear}.`)}</p>
            <BarList
              tickLabel={prevJobsYear}
              rows={occupations.map(([key, v]) => ({
                key, label: occupationLabel[key][lang], value: v, display: fmt(lang, v, 1),
                tick: k.jobs_occupation[prevJobsYear]?.[key],
                title: `${occupationLabel[key][lang]}: ${fmt(lang, v, 1)} (${jobsYear}) · ${fmt(lang, k.jobs_occupation[prevJobsYear]?.[key], 1)} (${prevJobsYear})`,
              }))}
            />
            <p className="source">{d.source}: DOSM, {tx(lang, "Laporan Survei Tenaga Buruh", "Labour Force Survey Report")} {jobsYear}, {tx(lang, "Jadual", "Table")} B4.5.</p>
            <div className="callout info small" style={{ marginTop: 12 }}>
              {tx(lang,
                "Pecahan pekerjaan mengikut daerah belum diterbitkan secara terbuka. Kami sedang memohon jadual Banci 2020 daripada DOSM. Buat masa ini, profil daerah memaparkan anggaran mengikut sektor.",
                "District-level job breakdowns are not yet openly published. We are requesting Census 2020 tables from DOSM; until then, district profiles show sector estimates.")}
            </div>
          </div>
        </div>
      </section>

      <section aria-labelledby="gdp-h">
        <div className="section-head">
          <h2 id="gdp-h">{tx(lang, "Daerah mana paling banyak menyumbang kepada KDNK Kedah?", "Who contributes to Kedah's GDP?")}</h2>
          <p>
            {tx(lang,
              `Tiga daerah — ${top3.map((x) => x.name).join(", ")} — menghasilkan ${fmt(lang, top3Share, 0)}% daripada KDNK Kedah (2020). Sembilan daerah lain berkongsi selebihnya.`,
              `Three districts — ${top3.map((x) => x.name).join(", ")} — produce ${fmt(lang, top3Share, 0)}% of Kedah's GDP (2020). The other nine share the rest.`)}
          </p>
        </div>
        <div className="card">
          <h3>{tx(lang, "KDNK mengikut daerah, 2020", "GDP by district, 2020")} <span className="badge official">{d.official}</span></h3>
          <p className="sub">{tx(lang, "RM bilion, harga malar 2015 · % daripada KDNK Kedah", "RM billion, constant 2015 prices · % of Kedah")}</p>
          <BarList
            rows={gdpShare.map((x) => ({
              key: x.slug, label: x.name, value: last(x.gdp.total).value,
              display: `${rmBillion(lang, last(x.gdp.total).value, 2)} · ${fmt(lang, x.gdp.share_of_kedah, 1)}%`,
            }))}
          />
          <p className="source">{d.source}: DOSM, {tx(lang, "KDNK mengikut Daerah (terbitan terkini: 2020).", "GDP by District (latest edition: 2020).")}</p>
        </div>
      </section>

      <section aria-labelledby="hist-h">
        <div className="section-head">
          <h2 id="hist-h">{tx(lang, "Kedah sejak 1970", "Kedah since 1970")}</h2>
          <p>
            {tx(lang,
              `Pada 1970, ${fmt(lang, k.history.poverty["1970"], 0)}% isi rumah di Kedah hidup dalam kemiskinan. Menjelang 2016, kadar itu hampir sifar berdasarkan garis kemiskinan lama — sebelum DOSM menyemak semula Pendapatan Garis Kemiskinan (PGK) pada 2019.`,
              `In 1970, ${fmt(lang, k.history.poverty["1970"], 0)}% of Kedah households were poor. By 2016 that was near zero on the old poverty line — before DOSM raised the line in 2019.`)}
          </p>
        </div>
        <div className="grid-2">
          <div className="card">
            <h3>{tx(lang, "Pendapatan penengah isi rumah Kedah", "Kedah median household income")} <span className="badge official">{d.official}</span></h3>
            <p className="sub">{tx(lang, "RM sebulan, harga semasa (tidak dilaraskan untuk inflasi)", "RM a month, current prices (not adjusted for inflation)")}</p>
            <LineChart
              series={[{ key: "inc", label: tx(lang, "Pendapatan penengah", "Median income"), color: "var(--s-1)",
                points: Object.entries(k.history.income_median).map(([y, v]) => ({ year: +y, value: v })) }]}
              spec={{ lang, kind: "rm" }} zero ariaLabel={tx(lang, "Pendapatan penengah Kedah sejak 1974", "Kedah median income since 1974")}
            />
            <p className="source">{d.source}: DOSM, {tx(lang, "Pendapatan Isi Rumah mengikut Negeri", "Household Income by State")}.</p>
          </div>
          <div className="card">
            <h3>{tx(lang, "Kemiskinan mutlak di Kedah", "Absolute poverty in Kedah")} <span className="badge official">{d.official}</span></h3>
            <p className="sub">{tx(lang, "% isi rumah. Angka berdasarkan dua garis kemiskinan ini tidak boleh dibandingkan secara langsung.", "% of households. The two poverty lines are not directly comparable.")}</p>
            <LineChart
              series={[
                { key: "old", label: tx(lang, "PGK lama (hingga 2016)", "Old poverty line (to 2016)"), color: "var(--s-1)",
                  points: Object.entries(k.history.poverty).filter(([y]) => +y <= 2016).map(([y, v]) => ({ year: +y, value: v })) },
                { key: "new", label: tx(lang, "PGK 2019", "2019 poverty line"), color: "var(--s-2)",
                  points: Object.entries(k.history.poverty).filter(([y]) => +y >= 2019).map(([y, v]) => ({ year: +y, value: v })) },
              ]}
              spec={{ lang, kind: "pct", digits: 1 }} zero ariaLabel={tx(lang, "Kemiskinan Kedah sejak 1970", "Kedah poverty since 1970")}
            />
            <p className="source">{d.source}: DOSM, {tx(lang, "Kemiskinan mengikut Negeri", "Poverty by State")}.</p>
          </div>
        </div>
      </section>

    </div>
    </>
  );
}
