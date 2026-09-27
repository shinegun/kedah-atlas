import type { Metadata } from "next";
import Link from "next/link";
import BarList from "@/components/BarList";
import LineChart from "@/components/LineChart";
import { atlas, districts, getDistrict, last } from "@/lib/atlas";
import { fmt, LOCALES, rm, t, tx, type Locale } from "@/lib/i18n";

export const dynamicParams = false;

export function generateStaticParams() {
  return LOCALES.map((lang) => ({ lang, story: "baling" }));
}

export async function generateMetadata({ params }: PageProps<"/[lang]/cerita/[story]">): Promise<Metadata> {
  const lang = (await params).lang as Locale;
  return {
    title: tx(lang, "Baling: jalan keluar daripada kemiskinan", "Baling: ways out of poverty"),
    description: tx(lang, "Kenapa Baling mempunyai kadar kemiskinan tertinggi di Kedah, dan pilihan yang disokong data.",
      "Why Baling has Kedah's highest poverty rate, and the options the data supports."),
  };
}

const pct = (a: number, b: number) => (a / b - 1) * 100;

export default async function Story({ params }: PageProps<"/[lang]/cerita/[story]">) {
  const lang = (await params).lang as Locale;
  const tr = t(lang);
  const b = getDistrict("baling")!;
  const k = atlas.kedah;
  const inc = b.living.income_median;
  const [inc0, inc1] = [inc[0], last(inc)];
  const kInc0 = k.income_median[String(inc0.year)];
  const kInc1 = k.income_median[String(inc1.year)];
  const pov = last(b.living.poverty);
  const lab = last(b.labour.series);
  const lab2020 = b.labour.series.find((s) => s.year === 2020)!;
  const agriShare = (last(b.gdp.by_sector.agriculture).value / last(b.gdp.total).value) * 100;
  const mfgShare = (last(b.gdp.by_sector.manufacturing).value / last(b.gdp.total).value) * 100;
  const svcShare = (last(b.gdp.by_sector.services).value / last(b.gdp.total).value) * 100;
  const kMfgShare = (districts.reduce((a, d) => a + last(d.gdp.by_sector.manufacturing).value, 0) /
    districts.reduce((a, d) => a + last(d.gdp.total).value, 0)) * 100;
  const neighbours = ["kulim", "kuala-muda", "sik"].map((s) => getDistrict(s)!);
  const oneIn = Math.round(100 / pov.value);
  const MS_WORDS = ["", "satu", "dua", "tiga", "empat", "lima", "enam", "tujuh", "lapan", "sembilan", "sepuluh"];
  const oneInMs = MS_WORDS[oneIn] ?? String(oneIn);
  const gap = kInc1 - inc1.value;

  const povRanking = [...districts].sort((a, c) => last(c.living.poverty).value - last(a.living.poverty).value);



  return (
    <div className="wrap">
      <nav className="crumbs">
        <Link href={`/${lang}/`}>{tr.siteName}</Link> / {tr.nav.story}
      </nav>
      <article className="narrow prose">
        <p className="muted small">{tx(lang, "Cerita data · Daerah Baling", "Data story · Baling district")}</p>
        <h1>{tx(lang, "Rakyat Baling bekerja keras. Kenapa masih miskin?", "Baling works hard. Why is it still poor?")}</h1>
        <p className="lede secondary" style={{ fontSize: "1.15rem" }}>
          {tx(lang,
            `Kira-kira satu daripada ${oneInMs} isi rumah di Baling hidup di bawah garis kemiskinan — kadar tertinggi di Kedah. Namun, hampir semua yang mahu bekerja sudah mempunyai pekerjaan. Masalah Baling bukan kekurangan pekerjaan, tetapi pekerjaan yang bergaji rendah.`,
            `About one in ${oneIn} Baling households lives below the poverty line — the highest rate in Kedah. Yet almost everyone who wants a job has one. Baling's problem isn't a lack of work; it's low-paid work.`)}
        </p>

        <h2>{tx(lang, "1. Apa yang data tunjukkan", "1. What the data shows")}</h2>
        <ul>
          <li>
            {tx(lang,
              `Kemiskinan mutlak ${fmt(lang, pov.value, 1)}% (${pov.year}), berbanding ${fmt(lang, k.poverty[String(pov.year)], 1)}% bagi Kedah. Baling berada di kedudukan ke-${b.living.poverty_rank_my[0]} tertinggi daripada ${b.living.poverty_rank_my[1]} daerah di Malaysia.`,
              `Absolute poverty is ${fmt(lang, pov.value, 1)}% (${pov.year}), against ${fmt(lang, k.poverty[String(pov.year)], 1)}% for Kedah. Baling ranks #${b.living.poverty_rank_my[0]} highest of ${b.living.poverty_rank_my[1]} districts in Malaysia.`)}
          </li>
          <li>
            {tx(lang,
              `Pendapatan penengah isi rumah turun daripada ${rm(lang, inc0.value)} (${inc0.year}) kepada ${rm(lang, inc1.value)} (${inc1.year}) — ${fmt(lang, Math.abs(pct(inc1.value, inc0.value)), 0)}% lebih rendah, sebelum mengambil kira kenaikan harga. Dalam tempoh yang sama, penengah Kedah naik ${fmt(lang, pct(kInc1, kInc0), 0)}%.`,
              `Median household income fell from ${rm(lang, inc0.value)} (${inc0.year}) to ${rm(lang, inc1.value)} (${inc1.year}) — ${fmt(lang, Math.abs(pct(inc1.value, inc0.value)), 0)}% lower, before accounting for rising prices. Over the same years Kedah's median rose ${fmt(lang, pct(kInc1, kInc0), 0)}%.`)}
          </li>
          <li>
            {tx(lang,
              `Namun pengangguran hanya ${fmt(lang, lab.u_rate, 1)}% (${lab.year}), dan bilangan penduduk bekerja naik daripada ${fmt(lang, lab2020.employed, 1)} ribu (2020) kepada ${fmt(lang, lab.employed, 1)} ribu.`,
              `Yet unemployment is only ${fmt(lang, lab.u_rate, 1)}% (${lab.year}), and the number of employed residents rose from ${fmt(lang, lab2020.employed, 1)}k (2020) to ${fmt(lang, lab.employed, 1)}k.`)}
          </li>
          <li>
            {tx(lang,
              `Ekonomi Baling bergantung pada pertanian (${fmt(lang, agriShare, 0)}% daripada KDNK daerah, lebih dua kali ganda purata Kedah) — sebahagian besarnya getah pekebun kecil. Pembuatan hanya ${fmt(lang, mfgShare, 0)}%, berbanding ${fmt(lang, kMfgShare, 0)}% bagi Kedah.`,
              `Baling's economy leans on farming (${fmt(lang, agriShare, 0)}% of district GDP, more than twice the Kedah average) — much of it smallholder rubber. Manufacturing is only ${fmt(lang, mfgShare, 0)}%, against ${fmt(lang, kMfgShare, 0)}% for Kedah.`)}
          </li>
          <li>
            {tx(lang,
              `Antara 2015 dan 2019, KDNK Baling tumbuh ${fmt(lang, b.gdp.cagr_2015_2019, 1)}% setahun berbanding ${fmt(lang, k.cagr_2015_2019, 1)}% bagi Kedah. Analisis shift-share menunjukkan sebahagian besar jurang ini berpunca daripada prestasi tempatan (${fmt(lang, b.gdp.shift_share.local, 1)} mata peratusan), bukan sekadar campuran industri (${fmt(lang, b.gdp.shift_share.mix, 1)}).`,
              `Between 2015 and 2019, Baling's GDP grew ${fmt(lang, b.gdp.cagr_2015_2019, 1)}% a year against ${fmt(lang, k.cagr_2015_2019, 1)}% for Kedah. Shift-share analysis puts most of the gap on local performance (${fmt(lang, b.gdp.shift_share.local, 1)} points), not just industry mix (${fmt(lang, b.gdp.shift_share.mix, 1)}).`)}
          </li>
        </ul>

        <div className="card" style={{ margin: "20px 0" }}>
          <h3>{tx(lang, "Pendapatan penengah isi rumah", "Median household income")} <span className="badge official">{tr.official}</span></h3>
          <p className="sub">{tx(lang, "RM sebulan, harga semasa", "RM a month, current prices")}</p>
          <LineChart
            zero
            spec={{ lang, kind: "rm" }}
            ariaLabel={tx(lang, "Pendapatan penengah Baling dan Kedah", "Median income, Baling and Kedah")}
            series={[
              { key: "b", label: "Baling", color: "var(--s-1)", points: inc },
              { key: "k", label: "Kedah", color: "var(--s-2)", points: Object.entries(k.income_median).map(([y, v]) => ({ year: +y, value: v })) },
            ]}
          />
          <p className="source">{tr.source}: DOSM, {tx(lang, "Survei Pendapatan dan Perbelanjaan Isi Rumah 2019, 2022, 2024.", "Household Income & Expenditure Survey 2019, 2022, 2024.")}</p>
        </div>

        <div className="card" style={{ margin: "20px 0" }}>
          <h3>{tx(lang, `Kemiskinan mutlak mengikut daerah, ${pov.year}`, `Absolute poverty by district, ${pov.year}`)} <span className="badge official">{tr.official}</span></h3>
          <p className="sub">{tx(lang, "% isi rumah. Garis tegak = Kedah.", "% of households. Vertical tick = Kedah.")}</p>
          <BarList
            tickLabel="Kedah"
            rows={povRanking.map((d) => ({
              key: d.slug, label: d.name, value: last(d.living.poverty).value, display: `${fmt(lang, last(d.living.poverty).value, 1)}%`,
              color: d.slug === "baling" ? "var(--s-1)" : "var(--axis)", tick: k.poverty[String(pov.year)],
            }))}
          />
          <p className="source">{tr.source}: DOSM, {tx(lang, "Kemiskinan mengikut Daerah Pentadbiran.", "Poverty by Administrative District.")}</p>
        </div>

        <p>
          {tx(lang,
            "Kaitan antara harga getah dan kesusahan hidup di Baling bukan perkara baharu — kaitan inilah yang mencetuskan demonstrasi Baling pada 1974. Lima dekad kemudian, ekonomi daerah ini masih bergantung pada komoditi yang harganya ditentukan di luar kawalan penduduk.",
            "The link between rubber prices and hardship in Baling is old — it sparked the Baling demonstrations of 1974. Five decades on, the district still depends on a commodity whose price is set far beyond its residents' control.")}
        </p>

        <h2>{tx(lang, "2. Tiga pilihan yang disokong data", "2. Three options the data supports")}</h2>
        <p className="secondary">
          {tx(lang,
            "Pilihan ini untuk dibincangkan, bukan cadangan muktamad. Setiap pilihan disertakan dengan bukti dan perkara yang belum diketahui.",
            "These are options to discuss, not prescriptions. Each comes with its evidence and what we don't yet know.")}
        </p>

        <div className="option">
          <h3>{tx(lang, "A. Hubungkan pekerja Baling dengan pekerjaan bergaji lebih tinggi di daerah jiran", "A. Connect Baling workers to better-paid jobs next door")}</h3>
          <p>
            {tx(lang,
              `Baling bersempadan dengan Kulim dan Kuala Muda — dua daripada tiga ekonomi terbesar Kedah. KDNK per kapita Kulim ialah ${rm(lang, neighbours[0].gdp.per_capita_k * 1000)} berbanding ${rm(lang, b.gdp.per_capita_k * 1000)} di Baling. Taman Teknologi Tinggi Kulim (KHTP) menggaji kira-kira 70,000 orang pada 2022 dan kerajaan negeri menjangka 150,000 menjelang 2035; kerajaan persekutuan menubuhkan sekretariat tetap pada 2024 untuk menangani kekurangan pekerja mahir di sana.`,
              `Baling borders Kulim and Kuala Muda — two of Kedah's three largest economies. Kulim produces ${rm(lang, neighbours[0].gdp.per_capita_k * 1000)} of GDP per resident against ${rm(lang, b.gdp.per_capita_k * 1000)} in Baling. Kulim Hi-Tech Park (KHTP) employed about 70,000 people in 2022 and the state expects 150,000 by 2035; in 2024 the federal government set up a permanent secretariat to tackle its shortage of skilled workers.`)}
          </p>
          <p>
            {tx(lang,
              "Langkah yang boleh dipertimbangkan: program latihan TVET di Baling yang direka bersama majikan KHTP; pengangkutan untuk pekerja kilang yang berulang-alik; dan pengiktirafan kemahiran bagi pekerja sedia ada.",
              "Steps worth considering: TVET training pathways in Baling designed with KHTP employers; commuter transport for factory shifts; and skills recognition for existing workers.")}
          </p>
          <p className="evidence">
            <strong>{tx(lang, "Perkara penting: ", "Worth knowing: ")}</strong>
            {tx(lang,
              "Jika penduduk Baling berulang-alik ke Kulim, KDNK dikira di Kulim — tetapi gaji dibawa pulang ke isi rumah di Baling. Kemiskinan (yang diukur mengikut tempat tinggal) boleh menurun walaupun KDNK Baling tidak berubah. Walau apa pun, KDNK Kedah tetap bertambah.",
              "If Baling residents commute to Kulim, the GDP is counted in Kulim — but the wages come home to Baling households. Poverty (measured where people live) can fall even if Baling's own GDP doesn't move. Either way, Kedah's GDP grows.")}
          </p>
          <p className="evidence">
            <strong>{tx(lang, "Belum diketahui: ", "Unknown: ")}</strong>
            {tx(lang,
              "berapa ramai penduduk Baling sudah berulang-alik, dan kemahiran apa yang paling diperlukan oleh majikan KHTP.",
              "how many Baling residents already commute, and which skills KHTP employers need most.")}
          </p>
        </div>

        <div className="option">
          <h3>{tx(lang, "B. Tingkatkan pendapatan daripada getah dan buah-buahan", "B. Earn more from rubber and fruit")}</h3>
          <p>
            {tx(lang,
              "Kedah mempunyai 47,855 pemegang Permit Autoriti Transaksi Getah (PAT-G) dengan lebih 59,000 hektar getah pekebun kecil (Kementerian Perladangan dan Komoditi, September 2026). Bandar Getah Kedah (Kedah Rubber City) di Padang Terap ialah taman perindustrian getah pertama negara, menyasarkan 14,500 peluang pekerjaan dalam tempoh 15 tahun. Pelaburan terbesarnya, kilang tayar RM2.6 bilion, dijangka beroperasi pada 2027.",
              "Kedah has 47,855 registered rubber transaction permit (PAT-G) holders working more than 59,000 hectares of smallholder rubber (Ministry of Plantation and Commodities, September 2026). Kedah Rubber City in Padang Terap is the country's first dedicated rubber industrial park, targeting 14,500 jobs over 15 years. Its largest investment, a RM2.6 billion tyre plant, is due to start operating in 2027.")}
          </p>
          <p>
            {tx(lang,
              "Langkah yang boleh dipertimbangkan: perjanjian bekalan antara koperasi pekebun kecil Baling dan kilang di Bandar Getah Kedah; gred susu getah yang lebih tinggi untuk harga lebih baik; dan tanaman selingan bernilai tinggi. Data tanaman 2017 menunjukkan rambutan dan durian antara tanaman buah utama Baling — asas untuk pemprosesan dan pemasaran.",
              "Steps worth considering: supply agreements between Baling smallholder cooperatives and Kedah Rubber City factories; higher latex grades for better prices; and high-value intercropping. 2017 crop data shows rambutan and durian among Baling's main fruit crops — a base for processing and marketing.")}
          </p>
          <p className="evidence">
            <strong>{tx(lang, "Belum diketahui: ", "Unknown: ")}</strong>
            {tx(lang,
              "sama ada kilang di Bandar Getah Kedah merancang membeli getah tempatan (pengumuman pelaburan tidak menyebutnya), dan pendapatan sebenar pekebun kecil Baling.",
              "whether Kedah Rubber City factories plan to buy local rubber (the investment announcements don't say), and what Baling smallholders actually earn.")}
          </p>
        </div>

        <div className="option">
          <h3>{tx(lang, "C. Perkukuh sektor perkhidmatan tempatan", "C. Build a stronger local services economy")}</h3>
          <p>
            {tx(lang,
              `Sektor perkhidmatan sudah merangkumi ${fmt(lang, svcShare, 0)}% daripada KDNK Baling, tetapi perkhidmatan tempatan bergantung pada perbelanjaan penduduk, yang terhad oleh pendapatan yang rendah. Baling mempunyai aset yang belum dimanfaatkan sepenuhnya: Gunung Baling dan gua-gua Gunung Pulai, sejarah Rundingan Baling 1955, dan kedudukan di sempadan Thailand.`,
              `Services are already about ${fmt(lang, svcShare, 0)}% of Baling's GDP, but local services depend on residents' spending, which low incomes hold back. Baling has under-used assets: Gunung Baling and the Gunung Pulai caves, the history of the 1955 Baling Talks, and a border with Thailand.`)}
          </p>
          <p className="evidence">
            <strong>{tx(lang, "Bukti lebih lemah: ", "Weaker evidence: ")}</strong>
            {tx(lang,
              "kami tidak menemui data pelawat bagi Baling. Kesan pilihan ini lebih kecil dan mengambil masa lebih lama berbanding A dan B.",
              "we found no visitor data for Baling. This option is smaller and longer-term than A and B.")}
          </p>
        </div>

        <h2>{tx(lang, "3. Berapa besar jurangnya?", "3. How big is the gap?")}</h2>
        <p>
          {tx(lang,
            `Untuk mencapai paras penengah Kedah, isi rumah penengah di Baling memerlukan tambahan ${rm(lang, gap)} sebulan (${fmt(lang, (gap / inc1.value) * 100, 0)}% lebih tinggi). Jurang ini besar, dan semakin melebar: pada ${inc0.year} jurang itu hanya ${rm(lang, kInc0 - inc0.value)}.`,
            `To reach the Kedah median, Baling's median household needs another ${rm(lang, gap)} a month (${fmt(lang, (gap / inc1.value) * 100, 0)}% more). It's a big gap, and it has widened: in ${inc0.year} it was ${rm(lang, kInc0 - inc0.value)}.`)}
        </p>
        <p>
          {tx(lang,
            "Petunjuk kemajuan yang boleh dipantau dalam survei pendapatan DOSM yang akan datang: kemiskinan Baling turun ke bawah purata Kedah; pendapatan penengah tumbuh lebih pantas daripada Kedah; dan — apabila data Banci diperoleh — bahagian pekerja Baling dalam pembuatan meningkat.",
            "Progress markers to watch in DOSM's next income survey: Baling's poverty falling below the Kedah average; median income growing faster than Kedah's; and — once Census data arrives — a rising share of Baling workers in manufacturing.")}
        </p>

        <h2>{tx(lang, "4. Data yang masih diperlukan", "4. What we need to know more")}</h2>
        <ul>
          <li>{tx(lang, "Pekerjaan mengikut industri dan jenis pekerjaan untuk Baling (Banci 2020) — kami sedang memohon daripada DOSM.", "Jobs by industry and occupation for Baling (Census 2020) — we are requesting this from DOSM.")}</li>
          <li>{tx(lang, "Aliran ulang-alik antara Baling, Kulim dan Kuala Muda.", "Commuting flows between Baling, Kulim and Kuala Muda.")}</li>
          <li>{tx(lang, "Pendapatan pekebun kecil getah mengikut daerah (RISDA / LGM).", "Rubber smallholder incomes by district (RISDA / Malaysian Rubber Board).")}</li>
        </ul>
        <div className="callout small">
          {tx(lang,
            "Nota: anggaran pekerjaan pertanian kami bagi Baling (~11 ribu) mungkin terlalu rendah, kerana model menganggap setiap pekerja ladang menghasilkan output pada paras purata Kedah, sedangkan penoreh getah pekebun kecil biasanya menghasilkan kurang. Data Banci akan membetulkan anggaran ini.",
            "Note: our farm-jobs estimate for Baling (~11k) is probably too low, because the model assumes each farm worker produces Kedah's average output; smallholder rubber tappers usually produce less. Census data will correct this.")}
        </div>

        <h3>{tr.sources}</h3>
        <ul className="small secondary">
          <li>DOSM / OpenDOSM: {tx(lang, "KDNK mengikut Daerah; Survei Pendapatan Isi Rumah; Kemiskinan; Statistik Tenaga Buruh mengikut Daerah; Jadual Penduduk (CC BY 4.0).", "GDP by District; Household Income Survey; Poverty; Labour Force by District; Population Tables (CC BY 4.0).")}</li>
          <li><a href="https://www.thevibes.com/articles/business/61835/kedah-to-upgrade-kulim-hi-tech-park-infrastructure-expecting-150000-workers-by-2035">The Vibes, 28 May 2022</a> — {tx(lang, "KHTP: ~70,000 pekerja, sasaran 150,000 menjelang 2035.", "KHTP: ~70,000 workers, 150,000 expected by 2035.")}</li>
          <li><a href="https://www.nst.com.my/news/nation/2024/10/1116104/updated-federal-govt-help-resolve-kulim-hi-tech-park-skilled-worker">New Straits Times, Oct 2024</a> — {tx(lang, "sekretariat kekurangan pekerja mahir KHTP.", "KHTP skilled-worker secretariat.")}</li>
          <li><a href="https://www.mida.gov.my/prinx-chengsan-breaks-ground-at-kedah-rubber-city-a-rm2-6-billion-endorsement-of-malaysias-rubber-industry-vision/">MIDA, Nov 2025</a> — {tx(lang, "Bandar Getah Kedah: 14,500 pekerjaan dalam 15 tahun; kilang tayar RM2.6 bilion.", "Kedah Rubber City: 14,500 jobs over 15 years; RM2.6 billion tyre plant.")}</li>
          <li><a href="https://www.utusan.com.my/nasional/2026/09/pekebun-kecil-sumbang-88-7-peratus-pengeluaran-getah-negara/">Utusan Malaysia, 3 Sep 2026</a> — {tx(lang, "47,855 pemegang PAT-G, >59,000 ha getah pekebun kecil di Kedah.", "47,855 PAT-G holders, >59,000 ha of smallholder rubber in Kedah.")}</li>
          <li><a href="https://en.wikipedia.org/wiki/Baling_District">Wikipedia: Baling District</a> — {tx(lang, "geografi dan sejarah.", "geography and history.")}</li>
        </ul>
        <p>
          <Link href={`/${lang}/daerah/baling/`}>{tx(lang, "Lihat profil penuh Baling →", "See Baling's full profile →")}</Link>
        </p>
      </article>
    </div>
  );
}
