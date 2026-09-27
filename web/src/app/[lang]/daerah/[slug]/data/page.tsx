import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import BarList from "@/components/BarList";
import FanChart from "@/components/FanChart";
import Diverging from "@/components/Diverging";
import LineChart, { type Series } from "@/components/LineChart";
import Sources from "@/components/Sources";
import { atlas, districts, getDistrict, last, SECTORS } from "@/lib/atlas";
import { cropName, fmt, LOCALES, rm, rmBillion, sectorLabel, t, tx, typeInfo, type Locale } from "@/lib/i18n";

export const dynamicParams = false;

export function generateStaticParams() {
  return LOCALES.flatMap((lang) => districts.map((d) => ({ lang, slug: d.slug })));
}

export async function generateMetadata({ params }: PageProps<"/[lang]/daerah/[slug]/data">): Promise<Metadata> {
  const { lang, slug } = await params;
  const d = getDistrict(slug);
  if (!d) return {};
  return {
    title: `${d.name} · ${tx(lang as Locale, "Data penuh", "Full data")}`,
    description: tx(lang as Locale, `Profil ekonomi, pekerjaan dan taraf hidup daerah ${d.name}, Kedah.`,
      `Economy, jobs and living standards profile of ${d.name} district, Kedah.`),
  };
}

const sectorColor = (s: string) => `var(--s-${s})`;

export default async function DistrictPage({ params }: PageProps<"/[lang]/daerah/[slug]/data">) {
  const { lang: l, slug } = await params;
  const lang = l as Locale;
  const d = getDistrict(slug);
  if (!d) notFound();
  const tr = t(lang);
  const k = atlas.kedah;
  const F = atlas.forecast;
  const my = atlas.malaysia;
  const idx = districts.findIndex((x) => x.slug === slug);
  const prev = districts[(idx + districts.length - 1) % districts.length];
  const next = districts[(idx + 1) % districts.length];
  const g = d.gdp;
  const gy = g.latest_year;
  const now25 = F.districts[d.name].total.find((p) => p.year === F.known_until)!;
  const [ss0, ss1] = atlas.meta.shift_share_period;
  const [mig0, mig1] = atlas.meta.migration_period;
  const lab = last(d.labour.series);
  const inc = last(d.living.income_median);
  const pov = last(d.living.poverty);
  const hy = String(d.living.latest_year);

  // Sector shares, district vs Kedah (sum of all districts).
  const gdpOf = (x: typeof d, s: (typeof SECTORS)[number]) => last(x.gdp.by_sector[s]).value;
  const dTot = SECTORS.reduce((a, s) => a + gdpOf(d, s), 0);
  const kTot = SECTORS.reduce((a, s) => a + districts.reduce((b, x) => b + gdpOf(x, s), 0), 0);
  const kShare = (s: (typeof SECTORS)[number]) => (districts.reduce((b, x) => b + gdpOf(x, s), 0) / kTot) * 100;

  // Growth index (first year = 100), district vs Kedah.
  const years = g.total.map((p) => p.year);
  const kedahTotal = years.map((y) => districts.reduce((a, x) => a + x.gdp.total.find((p) => p.year === y)!.value, 0));
  const growth: Series[] = [
    { key: "d", label: d.name, color: "var(--s-1)", points: g.total.map((p) => ({ year: p.year, value: (p.value / g.total[0].value) * 100 })) },
    { key: "k", label: "Kedah", color: "var(--s-2)", points: years.map((y, i) => ({ year: y, value: (kedahTotal[i] / kedahTotal[0]) * 100 })) },
  ];

  // Jobs estimate.
  const jobs = d.jobs_estimate.by_sector;
  const jobsTotal = SECTORS.reduce((a, s) => a + jobs[s].central, 0);
  const kJobsTotal = SECTORS.reduce((a, s) => a + k.jobs_by_sector[s], 0);

  const incomeSeries: Series[] = [
    { key: "d", label: d.name, color: "var(--s-1)", points: d.living.income_median },
    { key: "k", label: "Kedah", color: "var(--s-2)", points: Object.entries(k.income_median).map(([y, v]) => ({ year: +y, value: v })) },
    { key: "m", label: "Malaysia", color: "var(--s-agriculture)", points: Object.entries(my.income_median).filter(([y]) => +y >= d.living.income_median[0].year).map(([y, v]) => ({ year: +y, value: v })) },
  ];
  const povertySeries: Series[] = [
    { key: "d", label: d.name, color: "var(--s-1)", points: d.living.poverty },
    { key: "k", label: "Kedah", color: "var(--s-2)", points: Object.entries(k.poverty).map(([y, v]) => ({ year: +y, value: v })) },
    { key: "m", label: "Malaysia", color: "var(--s-agriculture)", points: Object.entries(my.poverty).filter(([y]) => +y >= d.living.poverty[0].year).map(([y, v]) => ({ year: +y, value: v })) },
  ];

  const kedahIncome = k.income_median[hy];
  const incGap = (inc.value / kedahIncome - 1) * 100;
  const signed = (v: number) => `${v >= 0 ? "+" : "−"}${fmt(lang, Math.abs(v), 1)}%`;
  const migPeople = (Math.abs(d.population.net_migration_k) * 1000) / (mig1 - mig0);

  return (
    <div className="wrap">
      <nav className="crumbs">
        <Link href={`/${lang}/`}>{tr.siteName}</Link> / <Link href={`/${lang}/daerah/`}>{tr.nav.districts}</Link> / <Link href={`/${lang}/daerah/${d.slug}/`}>{d.name}</Link> / {tx(lang, "Data penuh", "Full data")}
      </nav>
      <p className="hero-kicker">{tx(lang, "Data penuh", "Full data")}</p>
      <h1>{d.name}</h1>
      <p><Link href={`/${lang}/daerah/${d.slug}/`}>{tx(lang, "← Kembali ke slaid ringkas", "← Back to the quick slides")}</Link></p>
      <p className="type-pill">
        <span className="dmap-chip" style={{ background: typeInfo[d.type].color }} />
        <Link href={`/${lang}/peta/#peta=jenis&daerah=${d.slug}`}>{typeInfo[d.type].label[lang]}</Link>
        <span className="muted"> · {typeInfo[d.type].rule[lang]}</span>
      </p>
      <p className="lede secondary" style={{ fontSize: "1.1rem", maxWidth: 760 }}>
        {tx(lang,
          `${fmt(lang, d.population.latest, 1)} ribu penduduk (${d.population.latest_year})${d.area_km2 ? `, keluasan ${fmt(lang, d.area_km2)} km²` : ""}. Menyumbang ${fmt(lang, g.share_of_kedah, 1)}% daripada KDNK Kedah (${gy}).`,
          `${fmt(lang, d.population.latest, 1)}k people (${d.population.latest_year})${d.area_km2 ? `, ${fmt(lang, d.area_km2)} km²` : ""}. Produces ${fmt(lang, g.share_of_kedah, 1)}% of Kedah's GDP (${gy}).`)}
      </p>

      {d.highlights.length > 0 && (
        <section aria-labelledby="hl" style={{ marginTop: 20 }}>
          <h2 id="hl" className="sr-only">{tx(lang, "Perkara utama", "Key points")}</h2>
          <ul className="highlights">
            {d.highlights.map((h, i) => (
              <li key={i}>
                <span className={`tone ${h.tone}`}>
                  <span aria-hidden="true">{h.tone === "strength" ? "▲" : "▼"}</span>
                  {h.tone === "strength" ? tx(lang, "Kekuatan", "Strength") : tx(lang, "Cabaran", "Challenge")}
                </span>
                <span>{h[lang]}</span>
              </li>
            ))}
          </ul>
        </section>
      )}

      <section>
        <div className="stats">
          <div className="stat">
            <div className="label">{tx(lang, `KDNK, ${gy}`, `GDP, ${gy}`)}</div>
            <div className="value">{rmBillion(lang, last(g.total).value, 2)}</div>
            <div className="context">{tx(lang, "Harga malar 2015", "Constant 2015 prices")}</div>
          </div>
          <div className="stat">
            <div className="label">{tx(lang, `KDNK per kapita, ${gy}`, `GDP per person, ${gy}`)}</div>
            <div className="value">{rm(lang, g.per_capita_k * 1000)}</div>
            <div className="context">{tx(lang, `Ke-${g.per_capita_rank_my[0]} daripada ${g.per_capita_rank_my[1]} daerah Malaysia`, `#${g.per_capita_rank_my[0]} of ${g.per_capita_rank_my[1]} Malaysian districts`)}</div>
          </div>
          <div className="stat">
            <div className="label">{tx(lang, `Pendapatan penengah, ${inc.year}`, `Median income, ${inc.year}`)}</div>
            <div className="value">{rm(lang, inc.value)}</div>
            <div className="context">
              {incGap >= 0 ? "+" : "−"}{fmt(lang, Math.abs(incGap), 0)}% {tx(lang, "berbanding Kedah", "vs Kedah")} ({rm(lang, kedahIncome)})
            </div>
          </div>
          <div className="stat">
            <div className="label">{tx(lang, `Kemiskinan mutlak, ${pov.year}`, `Absolute poverty, ${pov.year}`)}</div>
            <div className="value">{fmt(lang, pov.value, 1)}%</div>
            <div className="context">Kedah {fmt(lang, k.poverty[hy], 1)}% · Malaysia {fmt(lang, my.poverty[hy], 1)}%</div>
          </div>
          <div className="stat">
            <div className="label">{tx(lang, `Pengangguran, ${lab.year}`, `Unemployment, ${lab.year}`)}</div>
            <div className="value">{fmt(lang, lab.u_rate, 1)}%</div>
            <div className="context">Kedah {fmt(lang, k.u_rate, 1)}%</div>
          </div>
        </div>
      </section>

      {/* ---------------- AI brief */}
      {d.brief && (
        <section aria-labelledby="brief-h" className="brief">
          <div className="section-head">
            <h2 id="brief-h">
              {tx(lang, "Ringkasan", "Brief")}{" "}
              {d.brief.reviewed ? (
                <span className="badge official">{tx(lang, "Disemak", "Reviewed")}</span>
              ) : (
                <span className="badge ai">{tx(lang, "Draf AI · belum disemak", "AI draft · not yet reviewed")}</span>
              )}
            </h2>
            <p>
              {tx(lang,
                "Ditulis oleh AI (Claude) hanya daripada angka di halaman ini. Setiap angka disemak secara automatik dengan data.",
                "Written by AI (Claude) only from the figures on this page. Every number is checked automatically against the data.")}{" "}
              <Link href={`/${lang}/kaedah/#ringkasan-ai`}>{tx(lang, "Bagaimana →", "How →")}</Link>
            </p>
          </div>
          <div className="brief-grid">
            {(["working", "holding", "watch"] as const).map((sec) => (
              <div key={sec} className={`brief-col ${sec}`}>
                <h3>
                  <span aria-hidden="true">{sec === "working" ? "▲" : sec === "holding" ? "▼" : "◎"}</span>{" "}
                  {sec === "working" ? tx(lang, "Apa yang berjalan baik", "What's working")
                    : sec === "holding" ? tx(lang, "Apa yang menghalang", "What's holding it back")
                      : tx(lang, "Perkara untuk dipantau", "What to watch")}
                </h3>
                <ul>
                  {d.brief![lang][sec].map((t, i) => <li key={i}>{t}</li>)}
                </ul>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* ---------------- Forecast */}
      <section aria-labelledby="fc-h">
        <div className="section-head">
          <h2 id="fc-h">{tx(lang, `Ke mana ${d.name} menuju?`, `Where is ${d.name} heading?`)}</h2>
          <p>
            {tx(lang,
              `KDNK sebenar hingga ${gy}, anggaran hingga ${F.known_until}, dan unjuran hingga ${F.horizon} dengan julat P10–P90.`,
              `Actual GDP to ${gy}, estimates to ${F.known_until}, and projections to ${F.horizon} with a P10–P90 range.`)}{" "}
            <Link href={`/${lang}/unjuran/`}>{tx(lang, "Cuba simulator senario →", "Try the scenario simulator →")}</Link>
          </p>
        </div>
        <div className="card">
          <h3>{tx(lang, "KDNK daerah", "District GDP")} <span className="badge estimate">{tx(lang, "Anggaran dan unjuran", "Estimates and projections")}</span></h3>
          <p className="sub">{tx(lang, "RM juta, harga malar 2015", "RM million, constant 2015 prices")}</p>
          <FanChart
            lang={lang}
            knownUntil={gy}
            splitAt={F.known_until}
            spec={{ lang, kind: "num" }}
            ariaLabel={tx(lang, `KDNK ${d.name}: sebenar, anggaran dan unjuran`, `${d.name} GDP: actual, estimated and projected`)}
            series={[{
              key: "d", label: d.name, color: "var(--s-services)",
              actual: g.total.map((p) => ({ year: p.year, value: p.value })),
              forecast: [
                { year: gy, p10: last(g.total).value, p50: last(g.total).value, p90: last(g.total).value },
                ...F.districts[d.name].total.map((p) => ({ year: p.year, p10: p.p10, p50: p.p50, p90: p.p90 })),
              ],
            }]}
          />
          <p className="source">
            {tr.source}: DOSM ({tx(lang, `KDNK daerah hingga ${gy}; KDNK negeri mengikut sektor hingga ${F.known_until}`, `district GDP to ${gy}; state GDP by sector to ${F.known_until}`)}); {tx(lang, "model KedahKu", "KedahKu model")} ({tx(lang, `ralat median 3 tahun ${fmt(lang, F.backtest.median_abs_pct_error[F.model]["3"], 1)}%`, `3-year median error ${fmt(lang, F.backtest.median_abs_pct_error[F.model]["3"], 1)}%`)}).
          </p>
        </div>
      </section>

      {/* ---------------- Economy */}
      <section aria-labelledby="eco">
        <div className="section-head">
          <h2 id="eco">{tx(lang, "Ekonomi", "Economy")}</h2>
          <p>{tx(lang, "Apa yang dihasilkan di daerah ini dan sepantas mana ekonominya berkembang.", "What the district produces, and how fast it has grown.")}</p>
        </div>
        <div className="grid-2">
          <div className="card">
            <h3>{tx(lang, `Struktur ekonomi, ${gy}`, `Economic structure, ${gy}`)} <span className="badge official">{tr.official}</span></h3>
            <p className="sub">{tx(lang, "% daripada KDNK daerah. Garis tegak = purata Kedah.", "% of district GDP. Vertical tick = Kedah average.")}</p>
            <BarList
              max={100}
              tickLabel="Kedah"
              rows={SECTORS.map((s) => {
                const share = (gdpOf(d, s) / dTot) * 100;
                return {
                  key: s, label: sectorLabel[s][lang], value: share, display: `${fmt(lang, share, 1)}%`,
                  color: sectorColor(s), tick: kShare(s),
                  title: `${sectorLabel[s][lang]}: ${fmt(lang, share, 1)}% (Kedah ${fmt(lang, kShare(s), 1)}%) · LQ ${fmt(lang, g.lq_kedah[s], 2)}`,
                };
              })}
            />
            <p className="small secondary" style={{ marginTop: 12 }}>
              {tx(lang, "Pengkhususan (LQ berbanding Kedah): ", "Specialisation (LQ vs Kedah): ")}
              {SECTORS.filter((s) => g.lq_kedah[s] >= 1.2 && (gdpOf(d, s) / dTot) * 100 >= 3)
                .map((s) => `${sectorLabel[s][lang]} ${fmt(lang, g.lq_kedah[s], 1)}×`)
                .join(" · ") || tx(lang, "tiada sektor menonjol", "no stand-out sector")}
            </p>
            <p className="source">{tr.source}: DOSM, {tx(lang, "KDNK mengikut Daerah", "GDP by District")}.</p>
          </div>
          <div className="card">
            <h3>{tx(lang, `Pertumbuhan KDNK (${years[0]} = 100)`, `GDP growth (${years[0]} = 100)`)} <span className="badge official">{tr.official}</span></h3>
            <p className="sub">{tx(lang, "Harga malar. Data 2020 terjejas akibat COVID-19.", "Constant prices. 2020 was hit by COVID-19.")}</p>
            <LineChart series={growth} spec={{ lang, kind: "num" }} ariaLabel={tx(lang, "Indeks KDNK", "GDP index")} />
            <p className="source">{tr.source}: DOSM, {tx(lang, "KDNK mengikut Daerah", "GDP by District")}.</p>
          </div>
        </div>
        <div className="grid-2" style={{ marginTop: 16 }}>
          <div className="card">
            <h3>{tx(lang, `Punca pertumbuhan daerah, ${ss0}–${ss1}`, `Why it grew the way it did, ${ss0}–${ss1}`)}</h3>
            <p className="sub">{tx(lang, "Analisis shift-share, % daripada KDNK " + ss0, "Shift-share analysis, % of " + ss0 + " GDP")}</p>
            <Diverging
              posLabel={tx(lang, "positif", "positive")}
              negLabel={tx(lang, "negatif", "negative")}
              rows={[
                { key: "state", label: tx(lang, "Kesan pertumbuhan negeri", "Kedah-wide growth"), value: g.shift_share.state, display: signed(g.shift_share.state) },
                { key: "mix", label: tx(lang, "Kesan campuran industri", "Industry mix"), value: g.shift_share.mix, display: signed(g.shift_share.mix) },
                { key: "local", label: tx(lang, "Kesan prestasi tempatan", "Local performance"), value: g.shift_share.local, display: signed(g.shift_share.local) },
                { key: "actual", label: tx(lang, "Pertumbuhan sebenar", "Actual growth"), value: g.shift_share.actual, display: signed(g.shift_share.actual), strong: true },
              ]}
            />
            <p className="small secondary" style={{ marginTop: 12 }}>
              {tx(lang,
                "Campuran industri: kesan mempunyai sektor yang tumbuh pesat atau perlahan di seluruh Kedah. Prestasi tempatan: sama ada sektor di daerah ini tumbuh lebih pantas daripada sektor yang sama di peringkat negeri.",
                "Industry mix: the effect of holding sectors that grew fast or slowly across Kedah. Local performance: whether the district's sectors outgrew the same sectors statewide.")}
            </p>
          </div>
          <div className="card">
            <h3>{tx(lang, `Anggaran KDNK ${F.known_until}`, `Estimated GDP, ${F.known_until}`)} <span className="badge estimate">{tr.estimate}</span></h3>
            <p className="sub">{tx(lang, "Dianggarkan daripada data negeri; DOSM belum menerbitkan KDNK daerah selepas 2020.", "Estimated from state data; DOSM has not published district GDP after 2020.")}</p>
            <div className="value" style={{ fontSize: "2rem", fontWeight: 650 }}>{rmBillion(lang, now25.p50, 2)}</div>
            <p className="muted small" style={{ margin: "0 0 8px" }}>
              {tx(lang, "Julat P10–P90", "P10–P90 range")}: {rmBillion(lang, now25.p10, 2)}–{rmBillion(lang, now25.p90, 2)}
            </p>
            <p className="small secondary">
              {tx(lang,
                `Andaian: bahagian daerah dalam setiap sektor Kedah kekal seperti pada ${gy}, dan jumlah daerah disamakan dengan KDNK rasmi negeri. Model ini paling tepat dalam ujian ke atas ${F.backtest.n_districts} daerah.`,
                `Assumes the district keeps its ${gy} share of each Kedah sector, with district totals matched to official state GDP. This model was the most accurate in tests on ${F.backtest.n_districts} districts.`)}{" "}
              <Link href={`/${lang}/kaedah/#unjuran`}>{tx(lang, "Kaedah →", "Method →")}</Link>
            </p>
          </div>
        </div>
      </section>

      {/* ---------------- Jobs mirror */}
      <section aria-labelledby="jobs">
        <div className="section-head">
          <h2 id="jobs">{tx(lang, "Cermin Kerja: dalam sektor apa penduduk di sini bekerja?", "Jobs Mirror: what do people here work in?")}</h2>
          <p>
            {tx(lang,
              `${fmt(lang, lab.employed, 1)} ribu penduduk bekerja pada ${lab.year}. Pecahan mengikut sektor adalah anggaran.`,
              `${fmt(lang, lab.employed, 1)}k residents were employed in ${lab.year}. The split by sector is an estimate.`)}
          </p>
        </div>
        <div className="grid-2">
          <div className="card">
            <h3>{tx(lang, `Pekerja mengikut sektor, ${d.jobs_estimate.year}`, `Workers by sector, ${d.jobs_estimate.year}`)} <span className="badge estimate">{tr.estimate}</span></h3>
            <p className="sub">{tx(lang, "Ribu pekerja. Garis julat = julat kemungkinan (persentil ke-10 hingga ke-90).", "Thousand workers. Whiskers = likely range (10th–90th percentile).")}</p>
            <BarList
              rows={SECTORS.map((s) => ({
                key: s, label: sectorLabel[s][lang], value: jobs[s].central, low: jobs[s].low, high: jobs[s].high,
                color: sectorColor(s),
                display: `~${fmt(lang, jobs[s].central, jobs[s].central < 10 ? 1 : 0)}`,
                title: `${sectorLabel[s][lang]}: ~${fmt(lang, jobs[s].central, 1)} (${fmt(lang, jobs[s].low, 1)}–${fmt(lang, jobs[s].high, 1)}) · ${fmt(lang, (jobs[s].central / jobsTotal) * 100, 0)}%`,
              }))}
            />
            <div className="callout small" style={{ marginTop: 14 }}>
              {tx(lang,
                "Anggaran KedahKu, bukan statistik rasmi. Jumlah pekerja bagi setiap daerah dan bagi setiap sektor di Kedah adalah angka rasmi; pecahan antara kedua-duanya dianggarkan berdasarkan struktur KDNK daerah. ",
                "KedahKu estimate, not an official statistic. Each district's employed total and Kedah's employed per sector are official; the split between them follows the district's GDP mix. ")}
              <Link href={`/${lang}/kaedah/#jobs`}>{tx(lang, "Cara kami mengira", "How we calculate this")}</Link>
            </div>
          </div>
          <div className="card">
            <h3>{tx(lang, "Peratusan pekerja: daerah berbanding Kedah", "Share of workers, district vs Kedah")} <span className="badge estimate">{tr.estimate}</span></h3>
            <p className="sub">{tx(lang, "% pekerja. Garis tegak = Kedah (rasmi).", "% of workers. Vertical tick = Kedah (official).")}</p>
            <BarList
              max={100}
              tickLabel="Kedah"
              rows={SECTORS.map((s) => {
                const sh = (jobs[s].central / jobsTotal) * 100;
                const ks = (k.jobs_by_sector[s] / kJobsTotal) * 100;
                return { key: s, label: sectorLabel[s][lang], value: sh, color: sectorColor(s), tick: ks, display: `${fmt(lang, sh, 0)}%`,
                  title: `${sectorLabel[s][lang]}: ${fmt(lang, sh, 1)}% (Kedah ${fmt(lang, ks, 1)}%)` };
              })}
            />
            <h3 style={{ marginTop: 22 }}>{tx(lang, "Penduduk bekerja", "Employed residents")} <span className="badge official">{tr.official}</span></h3>
            <p className="sub">{tx(lang, "Ribu orang", "Thousand people")}</p>
            <LineChart
              height={180}
              series={[{ key: "e", label: tx(lang, "Bekerja", "Employed"), color: "var(--s-1)", points: d.labour.series.map((p) => ({ year: p.year, value: p.employed })) }]}
              spec={{ lang, kind: "num", digits: 1 }}
              ariaLabel={tx(lang, "Penduduk bekerja", "Employed residents")}
            />
            <p className="source">{tr.source}: DOSM, {tx(lang, "Statistik Tenaga Buruh mengikut Daerah (gunakan dengan berhati-hati kerana ralat piawai adalah tinggi).", "Labour Force Statistics by District (use with caution: high standard error).")}</p>
          </div>
        </div>
      </section>

      {/* ---------------- Living standards */}
      <section aria-labelledby="living">
        <div className="section-head">
          <h2 id="living">{tx(lang, "Taraf hidup", "Living standards")}</h2>
          <p>
            {tx(lang,
              `Kedudukan dalam kalangan ${d.living.income_rank_my[1]} daerah Malaysia (1 = tertinggi): pendapatan penengah ke-${d.living.income_rank_my[0]}, kemiskinan ke-${d.living.poverty_rank_my[0]}.`,
              `Rank among ${d.living.income_rank_my[1]} Malaysian districts (1 = highest): median income #${d.living.income_rank_my[0]}, poverty #${d.living.poverty_rank_my[0]}.`)}
          </p>
        </div>
        <div className="grid-2">
          <div className="card">
            <h3>{tx(lang, "Pendapatan penengah isi rumah", "Median household income")} <span className="badge official">{tr.official}</span></h3>
            <p className="sub">{tx(lang, "RM sebulan, harga semasa", "RM a month, current prices")}</p>
            <LineChart series={incomeSeries} spec={{ lang, kind: "rm" }} zero ariaLabel={tx(lang, "Pendapatan penengah", "Median income")} />
            <p className="source">{tr.source}: DOSM, {tx(lang, "Survei Pendapatan dan Perbelanjaan Isi Rumah", "Household Income & Expenditure Survey")}.</p>
          </div>
          <div className="card">
            <h3>{tx(lang, "Kemiskinan mutlak", "Absolute poverty")} <span className="badge official">{tr.official}</span></h3>
            <p className="sub">{tx(lang, "% isi rumah di bawah Pendapatan Garis Kemiskinan (PGK)", "% of households below the poverty line income")}</p>
            <LineChart series={povertySeries} spec={{ lang, kind: "pct", digits: 1 }} zero ariaLabel={tx(lang, "Kemiskinan", "Poverty")} />
            <p className="source">
              {tr.source}: DOSM. {tx(lang, "Pekali Gini", "Gini coefficient")} {hy}: {fmt(lang, last(d.living.gini).value, 3)} (Kedah {fmt(lang, k.gini[hy], 3)}).
            </p>
          </div>
        </div>
      </section>

      {/* ---------------- People */}
      <section aria-labelledby="people">
        <div className="section-head">
          <h2 id="people">{tx(lang, "Penduduk", "People")}</h2>
          <p>
            {Math.abs(d.population.net_migration_per_1000_yr) < 1
              ? tx(lang, `Bilangan yang berpindah masuk dan keluar hampir seimbang (${mig0}–${mig1}).`, `Moves in and out roughly balance (${mig0}–${mig1}).`)
              : d.population.net_migration_k < 0
                ? tx(lang, `Lebih ramai berpindah keluar daripada masuk: anggaran bersih ~${fmt(lang, migPeople, 0)} orang setahun (${mig0}–${mig1}).`,
                    `More people leave than arrive: an estimated net ~${fmt(lang, migPeople, 0)} a year (${mig0}–${mig1}).`)
                : tx(lang, `Lebih ramai berpindah masuk daripada keluar: anggaran bersih ~${fmt(lang, migPeople, 0)} orang setahun (${mig0}–${mig1}).`,
                    `More people arrive than leave: an estimated net ~${fmt(lang, migPeople, 0)} a year (${mig0}–${mig1}).`)}
          </p>
        </div>
        <div className="grid-2">
          <div className="card">
            <h3>{tx(lang, "Penduduk", "Population")} <span className="badge official">{tr.official}</span></h3>
            <p className="sub">{tx(lang, "Ribu, anggaran pertengahan tahun", "Thousand, mid-year estimates")}</p>
            <LineChart
              height={180}
              series={[{ key: "p", label: tx(lang, "Penduduk", "Population"), color: "var(--s-1)", points: d.population.series }]}
              spec={{ lang, kind: "num", digits: 1 }}
              ariaLabel={tx(lang, "Penduduk", "Population")}
            />
            <p className="source">{tr.source}: DOSM, {tx(lang, "Jadual Penduduk: Daerah Pentadbiran", "Population Table: Administrative Districts")}.</p>
          </div>
          <div className="card">
            <h3>{tx(lang, `Struktur umur, ${d.population.latest_year}`, `Age structure, ${d.population.latest_year}`)} <span className="badge official">{tr.official}</span></h3>
            <p className="sub">{tx(lang, "% penduduk", "% of population")}</p>
            <BarList
              max={100}
              rows={[
                ["children", tx(lang, "Kanak-kanak (0–14)", "Children (0–14)")],
                ["working", tx(lang, "Umur bekerja (15–64)", "Working age (15–64)")],
                ["youth", tx(lang, "   antaranya belia (15–24)", "   of which youth (15–24)")],
                ["elderly", tx(lang, "Warga emas (65+)", "Elderly (65+)")],
              ].map(([key, label]) => {
                const v = d.population.age_share[key as keyof typeof d.population.age_share];
                return { key, label, value: v, display: `${fmt(lang, v, 1)}%` };
              })}
            />
            <p className="small secondary" style={{ marginTop: 12 }}>
              {tx(lang,
                `Pertambahan semula jadi ${mig0}–${mig1 - 1}: ${fmt(lang, d.population.natural_increase_k, 1)} ribu. Migrasi bersih tersirat: ${fmt(lang, d.population.net_migration_k, 1)} ribu.`,
                `Natural increase ${mig0}–${mig1 - 1}: ${fmt(lang, d.population.natural_increase_k, 1)}k. Implied net migration: ${fmt(lang, d.population.net_migration_k, 1)}k.`)}{" "}
              <span className="badge estimate">{tr.estimate}</span>
            </p>
          </div>
        </div>
      </section>

      {d.crops_2017.length > 0 && (
        <section aria-labelledby="crops">
          <div className="card">
            <h3 id="crops">{tx(lang, "Tanaman utama (selain padi, kelapa sawit dan getah), 2017", "Main crops (excluding paddy, oil palm and rubber), 2017")} <span className="badge official">{tr.official}</span></h3>
            <p className="sub">{tx(lang, "Keluasan bertanam, hektar", "Planted area, hectares")}</p>
            <BarList rows={d.crops_2017.map((c) => ({ key: c.crop, label: cropName(lang, c.crop), value: c.hectares, display: fmt(lang, c.hectares) }))} />
            <p className="source">{tr.source}: {tx(lang, "Jabatan Pertanian, melalui data.gov.my. Data terbuka terkini di peringkat daerah adalah bagi tahun 2017.", "Department of Agriculture, via data.gov.my. 2017 is the latest open district data.")}</p>
          </div>
        </section>
      )}

      <section>
        <Sources lang={lang} ids={["gdp_district", "gdp_state", "lfs_district", "lfs_annual_2024", "population_district", "births_district", "deaths_district", "hh_income_district", "hh_poverty_district", "hh_inequality_district", "hies_state", "crops_district_area"]} />
      </section>

      <nav className="pager">
        <Link href={`/${lang}/daerah/${prev.slug}/`}>← {prev.name}</Link>
        <Link href={`/${lang}/daerah/${next.slug}/`}>{next.name} →</Link>
      </nav>
    </div>
  );
}
