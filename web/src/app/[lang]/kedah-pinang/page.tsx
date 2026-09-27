import type { Metadata } from "next";
import Link from "next/link";
import CountUp from "@/components/CountUp";
import LineChart from "@/components/LineChart";
import { atlas, getDistrict, last, SECTORS, type Sector } from "@/lib/atlas";
import { fmt, LOCALES, rm, rmBillion, t, tx, type Locale } from "@/lib/i18n";

export function generateStaticParams() {
  return LOCALES.map((lang) => ({ lang }));
}

export async function generateMetadata({ params }: PageProps<"/[lang]/kedah-pinang">): Promise<Metadata> {
  const lang = (await params).lang as Locale;
  return {
    title: tx(lang, "Kedah lawan Pulau Pinang", "Kedah vs Penang"),
    description: tx(lang,
      "Perbandingan ekonomi Kedah dan Pulau Pinang, sektor demi sektor: bidang yang Kedah sudah unggul, dan peluang untuk Kedah menang seterusnya.",
      "Kedah and Penang's economies compared, sector by sector: where Kedah already leads, and where it could win next."),
  };
}

// Outside-DOSM figures, cited at the foot of the page.
const KHTP = { workers: 70_000, target: 150_000 }; // The Vibes, May 2022
const KRC = { jobs: 14_500, plant: 2.6 }; // MIDA, Nov 2025 (RM billion)
const RUBBER = { holders: 47_855, hectares: 59_000 }; // Utusan Malaysia, Sep 2026

type Round = {
  key: string;
  label: string;
  kedah: number;
  penang: number;
  show: (v: number) => string;
  /** which side the higher number favours */
  better: "higher" | "lower";
  note: string;
};

export default async function KedahPenang({ params }: PageProps<"/[lang]/kedah-pinang">) {
  const lang = (await params).lang as Locale;
  const tr = t(lang);
  const { kedah: K, penang: P } = atlas.peers;
  const [y0, y1] = atlas.peers.period;
  const hiesYear = last(K.income_median).year;
  const pct = (v: number) => `${fmt(lang, v, 1)}%`;
  const pctYr = (v: number) => tx(lang, `${fmt(lang, v, 1)}% setahun`, `${fmt(lang, v, 1)}% a year`);
  const densK = (last(K.population).value * 1000) / K.area_km2;
  const densP = (last(P.population).value * 1000) / P.area_km2;
  const sec = (s: Sector, side: typeof K) => last(side.sectors[s]).value;
  const langkawi = getDistrict("langkawi")!;
  const kulim = getDistrict("kulim")!;
  const shareOf = (d: typeof kulim, s: Sector) =>
    (last(d.gdp.by_sector[s]).value / SECTORS.reduce((a, x) => a + last(d.gdp.by_sector[x]).value, 0)) * 100;

  const rounds: Round[] = [
    { key: "gdp", label: tx(lang, `Saiz ekonomi (KDNK), ${y1}`, `Size of the economy (GDP), ${y1}`), kedah: last(K.gdp).value, penang: last(P.gdp).value,
      show: (v) => rmBillion(lang, v), better: "higher", note: tx(lang, "Harga malar 2015.", "Constant 2015 prices.") },
    { key: "pc", label: tx(lang, `KDNK per kapita, ${y1}`, `GDP per person, ${y1}`), kedah: last(K.per_capita).value, penang: last(P.per_capita).value,
      show: (v) => rm(lang, v), better: "higher", note: tx(lang, "Ukuran utama kemakmuran.", "The headline measure of prosperity.") },
    { key: "growth", label: tx(lang, `Pertumbuhan KDNK, ${y0}–${y1}`, `GDP growth, ${y0}–${y1}`), kedah: K.cagr_gdp, penang: P.cagr_gdp,
      show: pctYr, better: "higher", note: tx(lang, "Purata setahun.", "Average a year.") },
    { key: "mfg", label: tx(lang, `KDNK pembuatan, ${y1}`, `Manufacturing GDP, ${y1}`), kedah: sec("manufacturing", K), penang: sec("manufacturing", P),
      show: (v) => rmBillion(lang, v), better: "higher", note: tx(lang, "Kekuatan terbesar Pulau Pinang.", "Penang's biggest strength.") },
    { key: "mfgg", label: tx(lang, `Pertumbuhan pembuatan, ${y0}–${y1}`, `Manufacturing growth, ${y0}–${y1}`), kedah: K.cagr_sectors.manufacturing, penang: P.cagr_sectors.manufacturing,
      show: pctYr, better: "higher", note: tx(lang, "Jurang ini semakin melebar.", "This gap is widening.") },
    { key: "svc", label: tx(lang, `KDNK perkhidmatan, ${y1}`, `Services GDP, ${y1}`), kedah: sec("services", K), penang: sec("services", P),
      show: (v) => rmBillion(lang, v), better: "higher", note: tx(lang, "Termasuk perdagangan, kewangan dan pelancongan.", "Includes trade, finance and tourism.") },
    { key: "agri", label: tx(lang, `KDNK pertanian, ${y1}`, `Farm GDP, ${y1}`), kedah: sec("agriculture", K), penang: sec("agriculture", P),
      show: (v) => rmBillion(lang, v), better: "higher", note: tx(lang, "Jelapang padi negara, getah dan buah-buahan.", "Malaysia's rice bowl, rubber and fruit.") },
    { key: "con", label: tx(lang, `Pertumbuhan pembinaan, ${y0}–${y1}`, `Construction growth, ${y0}–${y1}`), kedah: K.cagr_sectors.construction, penang: P.cagr_sectors.construction,
      show: pctYr, better: "higher", note: tx(lang, "Petunjuk awal pelaburan baharu.", "An early signal of new investment.") },
    { key: "land", label: tx(lang, "Keluasan tanah", "Land area"), kedah: K.area_km2, penang: P.area_km2,
      show: (v) => `${fmt(lang, v, 0)} km²`, better: "higher", note: tx(lang, "Ruang untuk kilang, ladang dan perumahan baharu.", "Room for new factories, farms and homes.") },
    { key: "pop", label: tx(lang, `Penduduk, ${y1}`, `Population, ${y1}`), kedah: last(K.population).value, penang: last(P.population).value,
      show: (v) => tx(lang, `${fmt(lang, v / 1000, 2)} juta`, `${fmt(lang, v / 1000, 2)}m`), better: "higher", note: tx(lang, "Tenaga buruh yang lebih besar.", "A bigger pool of workers.") },
    { key: "inc", label: tx(lang, `Pendapatan penengah isi rumah, ${hiesYear}`, `Median household income, ${hiesYear}`), kedah: last(K.income_median).value, penang: last(P.income_median).value,
      show: (v) => rm(lang, v), better: "higher", note: tx(lang, "Sebulan.", "A month.") },
    { key: "pov", label: tx(lang, `Kemiskinan mutlak, ${hiesYear}`, `Absolute poverty, ${hiesYear}`), kedah: last(K.poverty).value, penang: last(P.poverty).value,
      show: pct, better: "lower", note: tx(lang, "Peratusan isi rumah; lebih rendah lebih baik.", "Share of households; lower is better.") },
  ];
  const winner = (r: Round) => ((r.kedah > r.penang) === (r.better === "higher") ? "kedah" : "penang");
  const kWins = rounds.filter((r) => winner(r) === "kedah").length;
  const pWins = rounds.length - kWins;
  const bn = (pts: { year: number; value: number }[]) => pts.map((p) => ({ year: p.year, value: p.value / 1000 }));

  return (
    <div className="wrap">
      <nav className="crumbs">
        <Link href={`/${lang}/`}>{tr.siteName}</Link> / {tx(lang, "Kedah lawan Pulau Pinang", "Kedah vs Penang")}
      </nav>
      <article>
        <div className="narrow">
          <p className="hero-kicker">{tx(lang, "Perbandingan utama", "Head to head")}</p>
          <h1>{tx(lang, "Kedah lawan Pulau Pinang", "Kedah vs Penang")}</h1>
          <p className="lede secondary" style={{ fontSize: "1.15rem" }}>
            {tx(lang,
              `Pulau Pinang menghasilkan ${fmt(lang, last(P.per_capita).value / last(K.per_capita).value, 1)} kali ganda KDNK bagi setiap penduduk berbanding Kedah. Tetapi Kedah mempunyai ${fmt(lang, K.area_km2 / P.area_km2, 0)} kali ganda keluasan tanah, lebih ramai penduduk, dan ekonomi pertanian yang lebih besar. Soalannya bukan bagaimana Kedah mengalahkan Pulau Pinang dalam semua perkara, tetapi dalam bidang apa Kedah boleh menang.`,
              `Penang produces ${fmt(lang, last(P.per_capita).value / last(K.per_capita).value, 1)} times as much GDP per resident as Kedah. But Kedah has ${fmt(lang, K.area_km2 / P.area_km2, 0)} times the land, more people, and a bigger farm economy. The question isn't how Kedah beats Penang at everything — it's where Kedah can win.`)}
          </p>
        </div>

        <section aria-labelledby="score-h" className="vs-score">
          <h2 id="score-h" className="sr-only">{tx(lang, "Skor", "Score")}</h2>
          <div className="vs-side kedah">
            <span className="vs-name">Kedah</span>
            <span className="vs-num tnum"><CountUp lang={lang} value={kWins} /></span>
          </div>
          <div className="vs-mid">
            <span>{tx(lang, "unggul dalam", "leads in")}</span>
            <strong>{tx(lang, `${rounds.length} ukuran`, `${rounds.length} measures`)}</strong>
          </div>
          <div className="vs-side penang">
            <span className="vs-num tnum"><CountUp lang={lang} value={pWins} /></span>
            <span className="vs-name">Pulau Pinang</span>
          </div>
        </section>
        <p className="source" style={{ textAlign: "center" }}>
          {tr.source}: DOSM — {tx(lang, "KDNK Benar mengikut Negeri; Jadual Penduduk; Survei Pendapatan Isi Rumah; Kawasanku.", "Real GDP by State; Population Tables; Household Income Survey; Kawasanku.")}
        </p>

        <section aria-labelledby="rounds-h">
          <h2 id="rounds-h">{tx(lang, "1. Ukuran demi ukuran", "1. Measure by measure")}</h2>
          <ul className="vs-legend" aria-hidden="true">
            <li><span className="swatch kedah" />Kedah</li>
            <li><span className="swatch penang" />Pulau Pinang</li>
          </ul>
          <ol className="vs-rounds">
            {rounds.map((r) => {
              const w = winner(r);
              const total = r.kedah + r.penang;
              return (
                <li key={r.key} className={`vs-round ${w}`}>
                  <div className="vs-round-h">
                    <span className="vs-round-label">{r.label}</span>
                    <span className={`vs-badge ${w}`}>
                      {w === "kedah" ? tx(lang, "Kedah unggul", "Kedah leads") : tx(lang, "Pulau Pinang unggul", "Penang leads")}
                    </span>
                  </div>
                  <div className="vs-bar" role="img"
                    aria-label={`Kedah ${r.show(r.kedah)}, Pulau Pinang ${r.show(r.penang)}`}>
                    <span className="kedah" style={{ flexGrow: r.kedah / total }} title={`Kedah: ${r.show(r.kedah)}`} />
                    <span className="penang" style={{ flexGrow: r.penang / total }} title={`Pulau Pinang: ${r.show(r.penang)}`} />
                  </div>
                  <div className="vs-vals tnum">
                    <span><strong>{r.show(r.kedah)}</strong></span>
                    <span className="muted small">{r.note}</span>
                    <span><strong>{r.show(r.penang)}</strong></span>
                  </div>
                </li>
              );
            })}
          </ol>
        </section>

        <div className="narrow prose">
          <h2>{tx(lang, "2. Jurang pembuatan semakin melebar", "2. The manufacturing gap is widening")}</h2>
          <p>
            {tx(lang,
              `Pembuatan ialah enjin utama Pulau Pinang. Antara ${y0} dan ${y1}, KDNK pembuatan Pulau Pinang tumbuh ${fmt(lang, P.cagr_sectors.manufacturing, 1)}% setahun, berbanding ${fmt(lang, K.cagr_sectors.manufacturing, 1)}% di Kedah. Pada kadar ini, Kedah tidak akan mengejar Pulau Pinang dalam pembuatan — tetapi Kedah tidak perlu. Kedah perlu menjadi tempat pembuatan Pulau Pinang berkembang seterusnya.`,
              `Manufacturing is Penang's main engine. Between ${y0} and ${y1}, Penang's manufacturing GDP grew ${fmt(lang, P.cagr_sectors.manufacturing, 1)}% a year, against ${fmt(lang, K.cagr_sectors.manufacturing, 1)}% in Kedah. At this pace Kedah won't catch Penang in manufacturing — but it doesn't need to. Kedah needs to be where Penang's manufacturing grows next.`)}
          </p>
        </div>
        <div className="card narrow" style={{ margin: "16px auto" }}>
          <h3>{tx(lang, "KDNK pembuatan", "Manufacturing GDP")} <span className="badge official">{tr.official}</span></h3>
          <p className="sub">{tx(lang, `RM bilion, harga malar 2015, ${y0}–${y1}`, `RM billion, constant 2015 prices, ${y0}–${y1}`)}</p>
          <LineChart
            zero
            spec={{ lang, kind: "num", digits: 1 }}
            ariaLabel={tx(lang, "KDNK pembuatan Pulau Pinang dan Kedah", "Manufacturing GDP, Penang and Kedah")}
            series={[
              { key: "p", label: "Pulau Pinang", color: "var(--penang)", points: bn(P.sectors.manufacturing) },
              { key: "k", label: "Kedah", color: "var(--kedah)", points: bn(K.sectors.manufacturing) },
            ]}
          />
          <p className="source">{tr.source}: DOSM, {tx(lang, "KDNK Benar Tahunan mengikut Negeri dan Sektor Ekonomi.", "Annual Real GDP by State and Economic Sector.")}</p>
        </div>

        <div className="narrow prose">
          <h2>{tx(lang, "3. Pulau Pinang sudah penuh", "3. Penang is running out of room")}</h2>
          <p>
            {tx(lang,
              `Pulau Pinang mempunyai ${fmt(lang, densP, 0)} penduduk bagi setiap km², berbanding ${fmt(lang, densK, 0)} di Kedah — ${fmt(lang, densP / densK, 0)} kali lebih padat. Imej satelit cahaya waktu malam menunjukkan perkara yang sama: purata keamatan cahaya Pulau Pinang ${fmt(lang, P.nightlights / K.nightlights, 0)} kali ganda Kedah. Kepadatan ini bermakna tanah untuk kilang baharu di Pulau Pinang lebih terhad. Kedah mempunyai tanah, air dan pekerja betul-betul di sebelahnya.`,
              `Penang has ${fmt(lang, densP, 0)} people per km², against ${fmt(lang, densK, 0)} in Kedah — ${fmt(lang, densP / densK, 0)} times as dense. Night-time satellite imagery says the same: Penang's average light intensity is ${fmt(lang, P.nightlights / K.nightlights, 0)} times Kedah's. That density means land for new factories in Penang is scarcer. Kedah has land, water and workers right next door.`)}
          </p>
          <div className="stats" style={{ margin: "16px 0" }}>
            <div className="stat">
              <div className="label">{tx(lang, "Kepadatan penduduk, Pulau Pinang", "Population density, Penang")}</div>
              <div className="value tnum">{fmt(lang, densP, 0)}</div>
              <div className="context">{tx(lang, "orang bagi setiap km²", "people per km²")}</div>
            </div>
            <div className="stat">
              <div className="label">{tx(lang, "Kepadatan penduduk, Kedah", "Population density, Kedah")}</div>
              <div className="value tnum">{fmt(lang, densK, 0)}</div>
              <div className="context">{tx(lang, "orang bagi setiap km²", "people per km²")}</div>
            </div>
          </div>
          <p className="source">{tr.source}: DOSM, {tx(lang, `Jadual Penduduk ${y1}; keluasan dan cahaya malam daripada Kawasanku (${atlas.meta.kawasanku_as_of}).`, `Population Tables ${y1}; area and night lights from Kawasanku (${atlas.meta.kawasanku_as_of}).`)}</p>

          <h2>{tx(lang, "4. Di mana Kedah boleh menang seterusnya?", "4. Where could Kedah win next?")}</h2>
          <p className="secondary">
            {tx(lang,
              "Empat peluang yang disokong data. Setiap satu disertakan bukti dan perkara yang belum diketahui.",
              "Four opportunities the data supports. Each comes with its evidence and what we don't yet know.")}
          </p>

          <div className="option">
            <h3>{tx(lang, "A. Menjadi tempat kilang Pulau Pinang berkembang", "A. Be where Penang's factories expand")}</h3>
            <p>
              {tx(lang,
                `Pembuatan sudah menyumbang ${fmt(lang, shareOf(kulim, "manufacturing"), 0)}% daripada KDNK Kulim. Taman Teknologi Tinggi Kulim (KHTP) menggaji kira-kira ${fmt(lang, KHTP.workers, 0)} orang, dan kerajaan negeri menjangka ${fmt(lang, KHTP.target, 0)} menjelang 2035. Dengan tanah yang ${fmt(lang, K.area_km2 / P.area_km2, 0)} kali lebih luas, Kedah boleh menawarkan ruang yang semakin terhad di Pulau Pinang.`,
                `Manufacturing already makes up ${fmt(lang, shareOf(kulim, "manufacturing"), 0)}% of Kulim's GDP. Kulim Hi-Tech Park (KHTP) employs about ${fmt(lang, KHTP.workers, 0)} people, and the state expects ${fmt(lang, KHTP.target, 0)} by 2035. With ${fmt(lang, K.area_km2 / P.area_km2, 0)} times the land, Kedah can offer the space that is getting scarce in Penang.`)}
            </p>
            <p className="evidence"><strong>{tx(lang, "Belum diketahui: ", "Unknown: ")}</strong>
              {tx(lang, "harga dan ketersediaan tanah industri, serta kos buruh berbanding Pulau Pinang.", "industrial land prices and availability, and labour costs compared with Penang.")}</p>
          </div>

          <div className="option">
            <h3>{tx(lang, "B. Getah: dari ladang ke produk siap", "B. Rubber: from plantation to finished product")}</h3>
            <p>
              {tx(lang,
                `Kedah mempunyai ${fmt(lang, RUBBER.holders, 0)} pemegang permit getah (PAT-G) dengan lebih ${fmt(lang, RUBBER.hectares, 0)} hektar getah pekebun kecil. Bandar Getah Kedah di Padang Terap menyasarkan ${fmt(lang, KRC.jobs, 0)} peluang pekerjaan dalam 15 tahun, dan kilang tayar RM${fmt(lang, KRC.plant, 1)} bilion dijangka beroperasi pada 2027. Pulau Pinang tidak mempunyai asas getah seperti ini.`,
                `Kedah has ${fmt(lang, RUBBER.holders, 0)} rubber permit (PAT-G) holders working more than ${fmt(lang, RUBBER.hectares, 0)} hectares of smallholder rubber. Kedah Rubber City in Padang Terap targets ${fmt(lang, KRC.jobs, 0)} jobs over 15 years, and a RM${fmt(lang, KRC.plant, 1)} billion tyre plant is due in 2027. Penang has no rubber base like this.`)}
            </p>
            <p className="evidence"><strong>{tx(lang, "Belum diketahui: ", "Unknown: ")}</strong>
              {tx(lang, "sama ada kilang baharu akan membeli getah daripada pekebun kecil tempatan.", "whether the new factories will buy rubber from local smallholders.")}</p>
          </div>

          <div className="option">
            <h3>{tx(lang, "C. Makanan untuk Pulau Pinang dan dunia", "C. Food for Penang and the world")}</h3>
            <p>
              {tx(lang,
                `KDNK pertanian Kedah ${fmt(lang, sec("agriculture", K) / sec("agriculture", P), 1)} kali ganda Pulau Pinang, dan empat daerah Kedah ialah jelapang pertanian. Pasaran ${fmt(lang, last(P.population).value / 1000, 1)} juta penduduk Pulau Pinang, serta lapangan terbang dan pelabuhannya, terletak di sebelah. Namun, KDNK pertanian Kedah hanya tumbuh ${fmt(lang, K.cagr_sectors.agriculture, 1)}% setahun — nilai tambah melalui pemprosesan makanan ialah peluangnya.`,
                `Kedah's farm GDP is ${fmt(lang, sec("agriculture", K) / sec("agriculture", P), 1)} times Penang's, and four Kedah districts are farming heartlands. Penang's market of ${fmt(lang, last(P.population).value / 1000, 1)} million people, plus its airport and port, is next door. But Kedah's farm GDP grows only ${fmt(lang, K.cagr_sectors.agriculture, 1)}% a year — adding value through food processing is the opportunity.`)}
            </p>
            <p className="evidence"><strong>{tx(lang, "Belum diketahui: ", "Unknown: ")}</strong>
              {tx(lang, "berapa banyak hasil Kedah sudah diproses di Pulau Pinang, bukan di Kedah.", "how much Kedah produce is already processed in Penang rather than in Kedah.")}</p>
          </div>

          <div className="option">
            <h3>{tx(lang, "D. Langkawi", "D. Langkawi")}</h3>
            <p>
              {tx(lang,
                `Perkhidmatan menyumbang ${fmt(lang, shareOf(langkawi, "services"), 0)}% daripada KDNK Langkawi, dan KDNK per kapitanya ${rm(lang, langkawi.gdp.per_capita_k * 1000)}, di atas purata Kedah. Pulau Pinang bersaing untuk pelancong yang sama, tetapi Langkawi mempunyai kelebihan yang tiada di Pulau Pinang: status pulau bebas cukai.`,
                `Services are ${fmt(lang, shareOf(langkawi, "services"), 0)}% of Langkawi's GDP, and its GDP per person of ${rm(lang, langkawi.gdp.per_capita_k * 1000)} is above the Kedah average. Penang competes for the same visitors, but Langkawi has an edge Penang lacks: duty-free island status.`)}
            </p>
            <p className="evidence"><strong>{tx(lang, "Belum diketahui: ", "Unknown: ")}</strong>
              {tx(lang, "data pelawat dan perbelanjaan pelancong mengikut daerah.", "visitor and tourist-spending data by district.")}</p>
          </div>

          <h2>{tx(lang, "5. Rakan kongsi, bukan hanya pesaing", "5. Partners, not only rivals")}</h2>
          <p>
            {tx(lang,
              "Lebih 80% air mentah Pulau Pinang datang dari Sungai Muda di Kedah, dan KHTP di Kulim terletak berhampiran sempadan Pulau Pinang. Kedua-dua negeri paling berjaya apabila Kedah menjadi tempat Pulau Pinang berkembang, dan Pulau Pinang menjadi pintu Kedah ke pasaran dunia — seperti Shenzhen dan Hong Kong.",
              "More than 80% of Penang's raw water comes from Kedah's Muda River, and KHTP in Kulim sits near the Penang border. Both states do best when Kedah is where Penang grows, and Penang is Kedah's door to world markets — like Shenzhen and Hong Kong.")}
          </p>
          <p>
            <Link href={`/${lang}/cerita/shenzhen/`}>{tx(lang, "Cerita Shenzhen →", "The Shenzhen story →")}</Link>{" · "}
            <Link href={`/${lang}/daerah/kulim/`}>{tx(lang, "Profil Kulim →", "Kulim profile →")}</Link>{" · "}
            <Link href={`/${lang}/daerah/langkawi/`}>{tx(lang, "Profil Langkawi →", "Langkawi profile →")}</Link>
          </p>

          <h3>{tr.sources}</h3>
          <ul className="small secondary">
            <li>DOSM / OpenDOSM: {tx(lang, "KDNK Benar Tahunan mengikut Negeri dan Sektor; Jadual Penduduk: Negeri; Pendapatan dan Kemiskinan Isi Rumah mengikut Negeri; KDNK mengikut Daerah; Kawasanku (CC BY 4.0).", "Annual Real GDP by State and Sector; Population Tables: States; Household Income and Poverty by State; GDP by District; Kawasanku (CC BY 4.0).")}</li>
            <li><a href="https://www.thevibes.com/articles/business/61835/kedah-to-upgrade-kulim-hi-tech-park-infrastructure-expecting-150000-workers-by-2035">The Vibes, May 2022</a> — {tx(lang, "KHTP: ~70,000 pekerja, sasaran 150,000 menjelang 2035.", "KHTP: ~70,000 workers, 150,000 expected by 2035.")}</li>
            <li><a href="https://www.mida.gov.my/prinx-chengsan-breaks-ground-at-kedah-rubber-city-a-rm2-6-billion-endorsement-of-malaysias-rubber-industry-vision/">MIDA, Nov 2025</a> — {tx(lang, "Bandar Getah Kedah.", "Kedah Rubber City.")}</li>
            <li><a href="https://www.utusan.com.my/nasional/2026/09/pekebun-kecil-sumbang-88-7-peratus-pengeluaran-getah-negara/">Utusan Malaysia, Sep 2026</a> — {tx(lang, "pemegang PAT-G dan keluasan getah di Kedah.", "PAT-G holders and rubber area in Kedah.")}</li>
            <li><a href="https://www.freemalaysiatoday.com/category/nation/2024/07/15/kedah-asked-to-release-water-into-sungai-muda-as-levels-drop">Free Malaysia Today, Jul 2024</a> — {tx(lang, "Sungai Muda: lebih 80% air mentah Pulau Pinang.", "Muda River: more than 80% of Penang's raw water.")}</li>
          </ul>
        </div>
      </article>
    </div>
  );
}
