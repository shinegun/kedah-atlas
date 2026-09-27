import type { Metadata } from "next";
import Link from "next/link";
import BarList from "@/components/BarList";
import Sources from "@/components/Sources";
import { atlas, districts, last, SECTORS } from "@/lib/atlas";
import { fmt, LOCALES, occupationLabel, rm, rmBillion, sectorLabel, t, tx, typeInfo, type Locale } from "@/lib/i18n";

export async function generateMetadata({ params }: PageProps<"/[lang]/pelabur">): Promise<Metadata> {
  const lang = (await params).lang as Locale;
  return {
    title: tx(lang, "Untuk pelabur", "For investors"),
    description: tx(lang,
      "Tenaga buruh, kemahiran dan kekuatan ekonomi setiap daerah Kedah, berdasarkan data rasmi DOSM.",
      "The workforce, skills and economic strengths of every Kedah district, from official DOSM data."),
  };
}

export function generateStaticParams() {
  return LOCALES.map((lang) => ({ lang }));
}

const LQ_MIN = 1.2;

export default async function Investors({ params }: PageProps<"/[lang]/pelabur">) {
  const lang = (await params).lang as Locale;
  const d = t(lang);
  const k = atlas.kedah;
  const pk = atlas.peers;
  const F = atlas.forecast;

  // Workforce (official LFS: state tables for jobs, district tables for unemployment).
  const lfYear = districts[0].labour.latest_year;
  const jobsYear = String(k.jobs_year);
  const employed = Object.values(k.jobs_industry[jobsYear]).reduce((a, b) => a + b, 0);

  // People (official population estimates by district and age).
  const popYear = districts[0].population.latest_year;
  const working = districts.reduce((a, x) => a + (x.population.latest * x.population.age_share.working) / 100, 0);
  const youth = districts.reduce((a, x) => a + (x.population.latest * x.population.age_share.youth) / 100, 0);

  // Land and household income against Penang.
  const landRatio = pk.kedah.area_km2 / pk.penang.area_km2;
  const incK = last(pk.kedah.income_median);
  const incP = last(pk.penang.income_median);
  const incGap = (1 - incK.value / incP.value) * 100;

  // District workforce table, largest first.
  const [mig0, mig1] = atlas.meta.migration_period;
  const byLf = [...districts].sort((a, b) => last(b.labour.series).lf - last(a.labour.series).lf);

  // Manufacturing workers by district (KedahKu estimate).
  const jy = districts[0].jobs_estimate.year;
  const mfg = [...districts].sort((a, b) => b.jobs_estimate.by_sector.manufacturing.central - a.jobs_estimate.by_sector.manufacturing.central);
  const mfgTotal = mfg.reduce((a, x) => a + x.jobs_estimate.by_sector.manufacturing.central, 0);
  const mfgTop2 = mfg.slice(0, 2);
  const mfgTop2Share = (mfgTop2.reduce((a, x) => a + x.jobs_estimate.by_sector.manufacturing.central, 0) / mfgTotal) * 100;

  // Skills (official LFS, state level).
  const occ = Object.entries(k.jobs_occupation[jobsYear]).sort((a, b) => b[1] - a[1]);
  const occTotal = occ.reduce((a, [, v]) => a + v, 0);
  const midSkill = ["technicians", "craft", "operators"].reduce((a, key) => a + (k.jobs_occupation[jobsYear][key] ?? 0), 0);
  const midShare = (midSkill / occTotal) * 100;

  // Specialisation against Malaysia (GDP by district).
  const gy = districts[0].gdp.latest_year;
  const [cg0, cg1] = [2015, 2019];
  const byGdp = [...districts].sort((a, b) => last(b.gdp.total).value - last(a.gdp.total).value);

  // Kedah GDP projection.
  const fcEnd = last(F.kedah);
  const fcNow = F.kedah.find((b) => b.year === F.known_until) ?? F.kedah[0];
  const fcGrowth = ((fcEnd.p50 / fcNow.p50) ** (1 / (fcEnd.year - fcNow.year)) - 1) * 100;

  const L = (seg: string) => `/${lang}/${seg}`;

  return (
    <div className="wrap">
      <nav className="crumbs"><Link href={L("")}>{d.siteName}</Link> / {tx(lang, "Untuk pelabur", "For investors")}</nav>
      <p className="hero-kicker">{tx(lang, "Untuk pelabur", "For investors")}</p>
      <h1>{tx(lang, "Mencari pekerja di Kedah? Mulakan dengan data.", "Hiring in Kedah? Start with the data.")}</h1>
      <p className="lede secondary">
        {tx(lang,
          "Siapa yang bekerja di setiap daerah, apa kemahiran mereka, dan sektor yang setiap daerah paling kuat — semuanya daripada data terbuka DOSM, dengan sumber dan tahun pada setiap angka.",
          "Who works in each district, what skills they have, and which sectors each district is strongest in — all from DOSM open data, with a source and year on every number.")}
      </p>

      <section aria-labelledby="inv-now">
        <h2 id="inv-now" className="sr-only">{tx(lang, "Ringkasan", "Summary")}</h2>
        <div className="stats">
          <div className="stat">
            <div className="label">{tx(lang, `Penduduk bekerja, ${jobsYear}`, `Employed people, ${jobsYear}`)}</div>
            <div className="value">{fmt(lang, employed, 0)}{tx(lang, " ribu", "k")}</div>
            <div className="context">{tx(lang, `Kadar pengangguran ${fmt(lang, k.u_rate, 1)}% (${lfYear})`, `Unemployment rate ${fmt(lang, k.u_rate, 1)}% (${lfYear})`)}</div>
          </div>
          <div className="stat">
            <div className="label">{tx(lang, `Umur bekerja (15–64), ${popYear}`, `Working age (15–64), ${popYear}`)}</div>
            <div className="value">{fmt(lang, working / 1000, 2)}{tx(lang, " juta", "m")}</div>
            <div className="context">{tx(lang, `Termasuk ${fmt(lang, youth, 0)} ribu belia berumur 15–24`, `Including ${fmt(lang, youth, 0)}k young people aged 15–24`)}</div>
          </div>
          <div className="stat">
            <div className="label">{tx(lang, "Keluasan tanah", "Land area")}</div>
            <div className="value">{tx(lang, `${fmt(lang, landRatio, 0)} kali`, `${fmt(lang, landRatio, 0)}×`)}</div>
            <div className="context">{tx(lang, `keluasan Pulau Pinang · ${fmt(lang, pk.kedah.area_km2, 0)} km²`, `the size of Penang · ${fmt(lang, pk.kedah.area_km2, 0)} km²`)}</div>
          </div>
          <div className="stat">
            <div className="label">{tx(lang, `Pendapatan penengah isi rumah, ${incK.year}`, `Median household income, ${incK.year}`)}</div>
            <div className="value">{rm(lang, incK.value)}</div>
            <div className="context">
              {tx(lang, `${fmt(lang, incGap, 0)}% lebih rendah daripada Pulau Pinang (${rm(lang, incP.value)})`, `${fmt(lang, incGap, 0)}% below Penang (${rm(lang, incP.value)})`)}
            </div>
          </div>
        </div>
        <p className="source">
          {d.source}: DOSM — {tx(lang, "Laporan Survei Tenaga Buruh", "Labour Force Survey Report")} {jobsYear};{" "}
          {tx(lang, "Jadual Penduduk mengikut Daerah", "Population Table by District")} {popYear};{" "}
          {tx(lang, "Pendapatan Isi Rumah mengikut Negeri", "Household Income by State")} {incK.year}.{" "}
          {tx(lang, "Pendapatan isi rumah bukan kadar gaji; angka ini memberi gambaran kasar kos hidup dan upah.", "Household income is not a wage rate; treat it as a rough guide to living costs and pay.")}
        </p>
      </section>

      <section aria-labelledby="inv-lf">
        <div className="section-head">
          <h2 id="inv-lf">{tx(lang, "Di manakah tenaga buruh?", "Where is the workforce?")}</h2>
          <p>
            {tx(lang,
              `${byLf[0].name}, ${byLf[1].name} dan ${byLf[2].name} mempunyai tenaga buruh paling besar. Migrasi bersih menunjukkan daerah yang menarik penduduk baharu dan daerah yang kehilangan penduduk.`,
              `${byLf[0].name}, ${byLf[1].name} and ${byLf[2].name} have the largest workforces. Net migration shows which districts draw new residents and which are losing people.`)}
          </p>
        </div>
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>{tx(lang, "Daerah", "District")}</th>
                <th style={{ textAlign: "left" }}>{tx(lang, "Jenis", "Type")}</th>
                <th>{tx(lang, `Tenaga buruh, ${lfYear} (ribu)`, `Labour force, ${lfYear} (k)`)}</th>
                <th>{tx(lang, "Pengangguran", "Unemployment")}</th>
                <th>{tx(lang, "Penyertaan", "Participation")}</th>
                <th>{tx(lang, `Umur 15–64, ${popYear} (ribu)`, `Aged 15–64, ${popYear} (k)`)}</th>
                <th>{tx(lang, `Migrasi bersih setahun, ${mig0}–${mig1}`, `Net migration a year, ${mig0}–${mig1}`)} <span className="badge estimate">{d.estimate}</span></th>
              </tr>
            </thead>
            <tbody>
              {byLf.map((x) => {
                const l = last(x.labour.series);
                const mig = (x.population.net_migration_k * 1000) / (mig1 - mig0);
                return (
                  <tr key={x.slug}>
                    <td><Link href={L(`daerah/${x.slug}/`)}>{x.name}</Link></td>
                    <td style={{ textAlign: "left" }}>
                      <span className="dmap-chip" style={{ background: typeInfo[x.type].color }} /> {typeInfo[x.type].label[lang]}
                    </td>
                    <td className="tnum">{fmt(lang, l.lf, 1)}</td>
                    <td className="tnum">{fmt(lang, l.u_rate, 1)}%</td>
                    <td className="tnum">{fmt(lang, l.p_rate, 1)}%</td>
                    <td className="tnum">{fmt(lang, (x.population.latest * x.population.age_share.working) / 100, 1)}</td>
                    <td className="tnum">{mig >= 0 ? "+" : "−"}{fmt(lang, Math.abs(mig), 0)}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        <p className="source">
          {d.source}: DOSM — {tx(lang, "Statistik Tenaga Buruh mengikut Daerah (ralat piawai tinggi, gunakan dengan berhati-hati)", "Labour Force Statistics by District (high standard error, use with care)")};{" "}
          {tx(lang, "Jadual Penduduk mengikut Daerah; kelahiran dan kematian mengikut daerah.", "Population Table by District; births and deaths by district.")}{" "}
          {tx(lang, "Migrasi bersih ialah anggaran kasar kami. ", "Net migration is our rough estimate. ")}
          <Link href={L("kaedah/#migration")}>{tx(lang, "Cara kami mengira", "How we calculate this")}</Link>
        </p>
      </section>

      <section aria-labelledby="inv-mfg">
        <div className="section-head">
          <h2 id="inv-mfg">{tx(lang, "Di manakah pekerja kilang?", "Where are the factory workers?")}</h2>
          <p>
            {tx(lang,
              `${mfgTop2[0].name} dan ${mfgTop2[1].name} dianggarkan menempatkan ${fmt(lang, mfgTop2Share, 0)}% daripada pekerja pembuatan di Kedah.`,
              `${mfgTop2[0].name} and ${mfgTop2[1].name} are home to an estimated ${fmt(lang, mfgTop2Share, 0)}% of Kedah's manufacturing workers.`)}
          </p>
        </div>
        <div className="card">
          <h3>{tx(lang, `Pekerja pembuatan mengikut daerah kediaman, ${jy}`, `Manufacturing workers by home district, ${jy}`)} <span className="badge estimate">{d.estimate}</span></h3>
          <p className="sub">{tx(lang, "Ribu pekerja. Garis julat = julat kemungkinan (persentil ke-10 hingga ke-90).", "Thousand workers. Whiskers = likely range (10th–90th percentile).")}</p>
          <BarList
            rows={mfg.map((x) => {
              const j = x.jobs_estimate.by_sector.manufacturing;
              return {
                key: x.slug, label: x.name, value: j.central, low: j.low, high: j.high, color: "var(--s-manufacturing)",
                display: `~${fmt(lang, j.central, j.central < 10 ? 1 : 0)}`,
                title: `${x.name}: ~${fmt(lang, j.central, 1)} (${fmt(lang, j.low, 1)}–${fmt(lang, j.high, 1)})`,
              };
            })}
          />
          <div className="callout small" style={{ marginTop: 14 }}>
            {tx(lang,
              "Anggaran KedahKu, bukan statistik rasmi. DOSM belum menerbitkan pekerjaan mengikut sektor bagi setiap daerah; kami membahagikan jumlah rasmi mengikut struktur KDNK daerah. Pekerja dikira mengikut tempat tinggal, bukan tempat kerja. ",
              "KedahKu estimate, not an official statistic. DOSM does not yet publish jobs by sector for each district; we split the official totals using each district's GDP mix. Workers are counted where they live, not where they work. ")}
            <Link href={L("kaedah/#jobs")}>{tx(lang, "Cara kami mengira", "How we calculate this")}</Link>
          </div>
        </div>
      </section>

      <section aria-labelledby="inv-skills">
        <div className="section-head">
          <h2 id="inv-skills">{tx(lang, "Apakah kemahiran pekerja Kedah?", "What skills do Kedah's workers have?")}</h2>
          <p>
            {tx(lang,
              `${fmt(lang, midShare, 0)}% pekerja Kedah ialah juruteknik, tukang mahir atau operator mesin — kemahiran teras bagi sektor pembuatan.`,
              `${fmt(lang, midShare, 0)}% of Kedah's workers are technicians, skilled tradespeople or machine operators — the core skills for manufacturing.`)}
          </p>
        </div>
        <div className="card">
          <h3>{tx(lang, `Pekerja mengikut pekerjaan, ${jobsYear}`, `Workers by occupation, ${jobsYear}`)} <span className="badge official">{d.official}</span></h3>
          <p className="sub">{tx(lang, "% daripada penduduk bekerja di Kedah", "% of employed people in Kedah")}</p>
          <BarList
            rows={occ.map(([key, v]) => ({
              key, label: occupationLabel[key][lang], value: (v / occTotal) * 100, display: `${fmt(lang, (v / occTotal) * 100, 0)}%`,
              title: `${occupationLabel[key][lang]}: ${fmt(lang, v, 1)} ${tx(lang, "ribu", "k")}`,
            }))}
          />
          <p className="source">
            {d.source}: DOSM, {tx(lang, "Laporan Survei Tenaga Buruh", "Labour Force Survey Report")} {jobsYear}, {tx(lang, "Jadual", "Table")} B4.5.{" "}
            {tx(lang, "Pecahan pekerjaan mengikut daerah belum diterbitkan.", "Occupation by district is not yet published.")}
          </p>
        </div>
      </section>

      <section aria-labelledby="inv-lq">
        <div className="section-head">
          <h2 id="inv-lq">{tx(lang, "Setiap daerah paling kuat dalam sektor apa?", "What is each district strongest in?")}</h2>
          <p>
            {tx(lang,
              `Daerah disusun mengikut saiz ekonomi. Label menunjukkan sektor yang ${fmt(lang, LQ_MIN, 1)} kali atau lebih penting dalam ekonomi daerah berbanding purata Malaysia (pekali lokasi, ${gy}).`,
              `Districts are ordered by the size of their economy. Tags show sectors that matter ${fmt(lang, LQ_MIN, 1)} times or more in the district's economy than across Malaysia (location quotient, ${gy}).`)}
          </p>
        </div>
        <div className="inv-grid">
          {byGdp.map((x) => (
            <Link key={x.slug} href={L(`daerah/${x.slug}/`)} className="district-card">
              <strong>{x.name}</strong>
              <div className="meta">
                {tx(lang, "KDNK", "GDP")} {gy}: {rmBillion(lang, last(x.gdp.total).value, 1)} · {tx(lang, `${fmt(lang, x.gdp.cagr_2015_2019, 1)}% setahun, ${cg0}–${cg1}`, `${fmt(lang, x.gdp.cagr_2015_2019, 1)}% a year, ${cg0}–${cg1}`)}
              </div>
              <div className="inv-chips">
                {SECTORS.filter((s) => x.gdp.lq_malaysia[s] >= LQ_MIN)
                  .sort((a, b) => x.gdp.lq_malaysia[b] - x.gdp.lq_malaysia[a])
                  .map((s) => (
                    <span key={s} className="inv-chip" style={{ borderColor: `var(--s-${s})` }}>
                      {sectorLabel[s][lang]} <b className="tnum">{fmt(lang, x.gdp.lq_malaysia[s], 1)}×</b>
                    </span>
                  ))}
              </div>
            </Link>
          ))}
        </div>
        <p className="source">
          {d.source}: DOSM, {tx(lang, `KDNK mengikut Daerah dan Sektor Ekonomi (harga malar 2015, terbitan terkini ${gy}). Pekali lokasi dikira oleh KedahKu. `, `GDP by District and Economic Sector (constant 2015 prices, latest edition ${gy}). Location quotients computed by KedahKu. `)}
          <Link href={L("kaedah/#lq")}>{tx(lang, "Apakah pekali lokasi?", "What is a location quotient?")}</Link>
        </p>
      </section>

      <section aria-labelledby="inv-growth">
        <div className="section-head">
          <h2 id="inv-growth">{tx(lang, "Ke mana ekonomi Kedah menuju?", "Where is Kedah's economy heading?")}</h2>
        </div>
        <div className="card">
          <h3>{tx(lang, `KDNK Kedah menjelang ${fcEnd.year}`, `Kedah GDP by ${fcEnd.year}`)} <span className="badge estimate">{d.estimate}</span></h3>
          <p style={{ fontSize: "1.6rem", fontWeight: 650, margin: "4px 0" }} className="tnum">{rmBillion(lang, fcEnd.p50, 1)}</p>
          <p className="sub" style={{ marginBottom: 8 }}>
            {tx(lang,
              `Unjuran tengah, kira-kira ${fmt(lang, fcGrowth, 1)}% setahun dari ${fcNow.year}. Julat kemungkinan: ${rmBillion(lang, fcEnd.p10, 1)} hingga ${rmBillion(lang, fcEnd.p90, 1)}.`,
              `Central projection, about ${fmt(lang, fcGrowth, 1)}% a year from ${fcNow.year}. Likely range: ${rmBillion(lang, fcEnd.p10, 1)} to ${rmBillion(lang, fcEnd.p90, 1)}.`)}
          </p>
          <Link href={L("unjuran/")}>{tx(lang, "Lihat unjuran setiap daerah dan cuba simulator →", "See each district's projection and try the simulator →")}</Link>
        </div>
      </section>

      <section aria-labelledby="inv-limits">
        <h2 id="inv-limits">{tx(lang, "Perkara yang laman ini tidak dapat jawab", "What this page cannot tell you")}</h2>
        <ul>
          <li>{tx(lang, "Gaji mengikut pekerjaan atau daerah: DOSM tidak menerbitkannya pada peringkat daerah.", "Wages by occupation or district: DOSM does not publish them at district level.")}</li>
          <li>{tx(lang, "Tanah industri, utiliti, pelabuhan dan insentif pelaburan: rujuk ", "Industrial land, utilities, ports and investment incentives: see ")}
            <a href="https://www.mida.gov.my/" target="_blank" rel="noopener noreferrer">MIDA</a>
            {tx(lang, " dan agensi pelaburan negeri Kedah.", " and Kedah's state investment agency.")}
          </li>
          <li>{tx(lang, "Ulang-alik antara Kedah dan Pulau Pinang: data rasmi belum diterbitkan secara terbuka, jadi kami belum dapat mengukurnya.", "Commuting between Kedah and Penang: official data is not openly published, so we cannot measure it yet.")}</li>
        </ul>
        <p className="secondary">
          {tx(lang, "Semua angka di halaman ini boleh dimuat turun. ", "Every number on this page can be downloaded. ")}
          <Link href={L("data/")}>{tx(lang, "Muat turun data", "Download the data")}</Link>
          {" · "}
          <Link href={L("kedah-pinang/")}>{tx(lang, "Kedah berbanding Pulau Pinang, sektor demi sektor", "Kedah vs Penang, sector by sector")}</Link>
        </p>
        <Sources lang={lang} ids={["lfs_annual_2024", "lfs_district", "population_district", "births_district", "deaths_district", "gdp_district", "hh_income_state"]} />
      </section>
    </div>
  );
}
