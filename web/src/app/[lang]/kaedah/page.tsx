import type { Metadata } from "next";
import Link from "next/link";
import { atlas } from "@/lib/atlas";
import { fmt, sectorLabel, t, tx, typeInfo, type Locale } from "@/lib/i18n";

export async function generateMetadata({ params }: PageProps<"/[lang]/kaedah">): Promise<Metadata> {
  return { title: t((await params).lang as Locale).nav.method };
}

export default async function Method({ params }: PageProps<"/[lang]/kaedah">) {
  const lang = (await params).lang as Locale;
  const tr = t(lang);
  const m = atlas.meta;
  const [s0, s1] = m.shift_share_period;
  const [g0, g1] = m.migration_period;
  const [j0, j1] = m.jobs_seed_years;
  const jy = atlas.kedah.jobs_year;
  return (
    <div className="wrap">
      <article className="narrow prose">
        <h1>{tr.nav.method}</h1>
        <p className="lede secondary">
          {tx(lang,
            "Setiap angka di KedahKu disertakan sumber dan tahun. Setiap angka yang dihasilkan oleh model dilabel ‘Anggaran’ dan diterangkan di halaman ini. Kami tidak membuat sebarang dakwaan yang tidak dapat disokong oleh data.",
            "Every number on KedahKu has a source and a year. Every modelled number is labelled ‘Estimate’ and explained here. If we can't back a claim with data, we don't make it.")}
        </p>

        <h2>{tx(lang, "Tiga jenis angka", "Three kinds of number")}</h2>
        <ul>
          <li><span className="badge official">{tr.official}</span> {tx(lang, "Diterbitkan terus oleh DOSM atau agensi kerajaan. Kami hanya membundarkan angka tersebut.", "Published directly by DOSM or a government agency. We only round.")}</li>
          <li><strong>{tx(lang, "Kiraan", "Derived")}</strong> — {tx(lang, "kiraan mudah berdasarkan angka rasmi (peratusan, KDNK per kapita, kedudukan).", "simple arithmetic on official numbers (shares, GDP per person, rankings).")}</li>
          <li><span className="badge estimate">{tr.estimate}</span> {tx(lang, "Dihasilkan oleh model kami. Sentiasa dilabel, beserta julat jika ada.", "Our model. Always labelled, with a range where possible.")}</li>
        </ul>

        <h2 id="jobs">{tx(lang, "Cermin Kerja: anggaran pekerjaan mengikut sektor", "Jobs Mirror: estimated jobs by sector")}</h2>
        <p>
          {tx(lang,
            "DOSM menerbitkan jumlah penduduk bekerja bagi setiap daerah, dan pekerjaan mengikut industri bagi Kedah secara keseluruhan — tetapi bukan pekerjaan mengikut industri bagi setiap daerah. Kami menganggarkan jadual yang hilang itu:",
            "DOSM publishes the number of employed residents in each district, and employment by industry for Kedah as a whole — but not employment by industry for each district. We estimate that missing table:")}
        </p>
        <ol>
          <li>{tx(lang, `Titik permulaan: struktur KDNK setiap daerah (purata ${j0}–${j1}) bagi lima sektor.`, `Starting point: each district's GDP structure (average of ${j0}–${j1}) across the five sectors.`)}</li>
          <li>{tx(lang,
            `Pelarasan berkadar berulang (IPF / RAS) menskala semula jadual sehingga (a) setiap baris sama dengan jumlah penduduk bekerja daerah itu pada ${jy}, dan (b) setiap lajur sama dengan jumlah pekerja Kedah dalam sektor itu pada ${jy}.`,
            `Iterative proportional fitting (IPF / RAS) rescales the table until (a) each row equals that district's employed residents in ${jy}, and (b) each column equals Kedah's workers in that sector in ${jy}.`)}</li>
          <li>{tx(lang,
            "Julat: proses ini diulang sebanyak 2,000 kali dengan membenarkan output setiap pekerja berbeza antara daerah (log-normal, sisihan 25%) dan jumlah pekerja daerah berbeza ±5% (ralat pensampelan). Julat yang dipaparkan ialah persentil ke-10 hingga ke-90.",
            "Range: we repeat this 2,000 times, letting output per worker differ between districts (log-normal, 25% spread) and district employment totals vary ±5% (sampling error). The range shown is the 10th to 90th percentile.")}</li>
        </ol>
        <p><strong>{tx(lang, "Batasan", "Known limits")}</strong></p>
        <ul>
          <li>{tx(lang,
            "Model menganggap pekerja dalam sektor yang sama menghasilkan output yang serupa di setiap daerah. Di daerah dengan pertanian bernilai rendah (cth. getah pekebun kecil), pekerjaan pertanian mungkin dianggar terlalu rendah; di daerah dengan kilang teknologi tinggi, pekerjaan pembuatan mungkin dianggar terlalu tinggi.",
            "The model assumes workers in the same sector produce similar output in every district. Where farming is low-value (e.g. smallholder rubber) farm jobs are probably underestimated; where factories are high-tech, manufacturing jobs may be overestimated.")}</li>
          <li>{tx(lang,
            "KDNK diukur di tempat pengeluaran; pekerjaan diukur di tempat tinggal. Pekerja yang berulang-alik (cth. ke Kulim atau Pulau Pinang) dikira di daerah tempat tinggal mereka.",
            "GDP is measured where output is produced; jobs are measured where people live. Commuters (e.g. to Kulim or Penang) are counted in their home district.")}</li>
          <li>{tx(lang, "Anggaran ini akan digantikan dengan jadual Banci 2020 sebaik sahaja diperoleh daripada DOSM.", "These estimates will be replaced by Census 2020 tables once obtained from DOSM.")}</li>
        </ul>

        <h2 id="lq">{tx(lang, "Pengkhususan (pekali lokasi, LQ)", "Specialisation (location quotient)")}</h2>
        <p>
          {tx(lang,
            "LQ = bahagian sektor dalam KDNK daerah ÷ bahagian sektor yang sama dalam KDNK Kedah. LQ 2.0 bermaksud sektor itu dua kali lebih penting di daerah ini berbanding Kedah secara purata. LQ berbanding Malaysia (160 daerah) turut disediakan dalam fail data.",
            "LQ = the sector's share of district GDP ÷ its share of Kedah's GDP. An LQ of 2.0 means the sector matters twice as much here as in Kedah on average. We also compute LQ against Malaysia (all 160 districts) in the data files.")}
        </p>

        <h2 id="shift-share">{tx(lang, "Punca pertumbuhan daerah (analisis shift-share)", "Why districts grew (shift-share)")}</h2>
        <p>
          {tx(lang,
            `Pertumbuhan KDNK setiap daerah ${s0}–${s1} dipecahkan kepada tiga bahagian: (1) kesan pertumbuhan negeri — pertumbuhan sekiranya daerah tumbuh pada kadar Kedah; (2) kesan campuran industri — kesan mempunyai sektor yang tumbuh lebih pesat atau perlahan di seluruh Kedah; (3) kesan prestasi tempatan — bakinya, iaitu sama ada sektor daerah mengatasi sektor yang sama di peringkat negeri. Analisis berakhir pada ${s1} kerana data 2020 terjejas akibat COVID-19.`,
            `Each district's GDP growth ${s0}–${s1} is split into three parts: (1) Kedah-wide growth — what it would have grown at Kedah's rate; (2) industry mix — the effect of holding sectors that grew faster or slower across Kedah; (3) local performance — the remainder: whether the district's sectors beat the same sectors statewide. We stop at ${s1} because 2020 was distorted by COVID-19.`)}
        </p>

        <h2 id="projection">{tx(lang, "Anggaran KDNK tahun terkini", "Recent GDP estimates")}</h2>
        <p>
          {tx(lang,
            `KDNK daerah terkini yang diterbitkan ialah ${atlas.districts[0].gdp.latest_year}. Untuk ${atlas.kedah.gdp_latest_year}, kami menganggap setiap daerah mengekalkan bahagiannya dalam setiap sektor Kedah, dan setiap sektor berkembang seperti yang diterbitkan untuk Kedah. Jumlah semua daerah bersamaan dengan KDNK Kedah yang diterbitkan. Kaedah ini tidak mengambil kira perubahan tempatan selepas ${atlas.districts[0].gdp.latest_year} (cth. kilang baharu).`,
            `The latest published district GDP is for ${atlas.districts[0].gdp.latest_year}. For ${atlas.kedah.gdp_latest_year}, we assume each district keeps its share of each Kedah sector while each sector grows as published for Kedah. The districts sum to Kedah's published GDP. This cannot capture local changes after ${atlas.districts[0].gdp.latest_year} (e.g. new factories).`)}
        </p>

        <h2 id="migration">{tx(lang, "Migrasi bersih", "Net migration")}</h2>
        <p>
          {tx(lang,
            `Migrasi bersih tersirat = perubahan penduduk ${g0}–${g1} − (kelahiran − kematian dalam tahun ${g0}–${g1 - 1}). Anggaran penduduk DOSM sendiri mengandungi andaian migrasi, jadi angka ini hanya petunjuk kasar, bukan kiraan sebenar.`,
            `Implied net migration = population change ${g0}–${g1} − (births − deaths in ${g0}–${g1 - 1}). DOSM's population estimates embed their own migration assumptions, so treat this as a rough signal, not a count.`)}
        </p>

        <h2 id="unjuran">{tx(lang, "Anggaran dan unjuran KDNK daerah", "District GDP nowcasts and projections")}</h2>
        <p>
          {tx(lang,
            `DOSM menerbitkan KDNK daerah hingga 2020, tetapi KDNK negeri mengikut sektor setiap tahun. Untuk ${atlas.forecast.years[0]}–${atlas.forecast.known_until}, setiap sektor setiap daerah bergerak mengikut sektor yang sama di peringkat negeri, dan jumlah daerah disamakan dengan angka rasmi negeri. Selepas ${atlas.forecast.known_until}, setiap sektor negeri diandaikan tumbuh pada kadar purata ${atlas.peers.period[0]}–${atlas.peers.period[1]}.`,
            `DOSM publishes district GDP to 2020, but state GDP by sector every year. For ${atlas.forecast.years[0]}–${atlas.forecast.known_until}, each district's sectors move with the same sector at state level, and district totals are matched to the official state figures. After ${atlas.forecast.known_until}, each state sector is assumed to grow at its ${atlas.peers.period[0]}–${atlas.peers.period[1]} average rate.`)}
        </p>
        <p>
          {tx(lang,
            `Model ini dipilih selepas ujian ke atas ${atlas.forecast.backtest.n_districts} daerah di seluruh Malaysia: setiap model meramal satu negeri tanpa melihat data negeri itu (ujian tinggal-satu-negeri). Model pembelajaran mesin (gradient-boosted trees, dengan ciri seperti momentum, campuran sektor, kepadatan penduduk dan cahaya malam) turut diuji. Julat P10–P90 diambil daripada ralat sebenar model dalam ujian ini; selepas tiga tahun, julat dilebarkan mengikut punca kuasa dua bilangan tahun, dan unjuran negeri ditambah ketidakpastian daripada pertumbuhan tahunan sebenar ${atlas.peers.period[0] + 1}–${atlas.peers.period[1]} (simulasi Monte Carlo).`,
            `This model was chosen after testing on ${atlas.forecast.backtest.n_districts} districts across Malaysia: each model forecast one state without seeing that state's data (leave-one-state-out). A machine-learning model (gradient-boosted trees, with features such as momentum, sector mix, population density and night lights) was tested too. The P10–P90 range comes from the model's actual errors in this test; beyond three years it widens with the square root of the number of years, and state projections add uncertainty drawn from actual annual growth in ${atlas.peers.period[0] + 1}–${atlas.peers.period[1]} (Monte Carlo simulation).`)}
        </p>
        <p>
          {tx(lang,
            "Simulator senario mengubah kadar pertumbuhan sektor negeri; setiap daerah mengekalkan bahagian sektornya. Projek besar menambah output pembuatan di daerahnya, melebihi trend, pada kadar output purata setiap pekerja kilang di Kedah. Julat senario menggunakan lebar julat model asas.",
            "The scenario simulator changes state sector growth rates; each district keeps its sector shares. Major projects add manufacturing output in their district, above trend, at Kedah's average output per factory worker. Scenario ranges reuse the baseline model's range widths.")}
        </p>

        <h2 id="ringkasan-ai">{tx(lang, "Ringkasan AI setiap daerah", "AI district briefs")}</h2>
        <p>
          {tx(lang,
            "Ringkasan di setiap halaman daerah didraf oleh model bahasa Claude (Anthropic) daripada satu helaian fakta bagi daerah itu, yang dijana daripada data atlas ini. Ringkasan hanya boleh menyebut angka yang ada dalam helaian fakta. Pemeriksa automatik menolak sebarang angka yang tidak sepadan dengan data, dan teks BM disemak dengan panduan gaya kami. Setiap ringkasan dilabel sebagai draf AI sehingga disemak oleh manusia.",
            "The brief on each district page is drafted by the Claude language model (Anthropic) from a fact sheet for that district, generated from this atlas's data. A brief may only state numbers that appear in its fact sheet. An automatic checker rejects any number that doesn't match the data, and the Malay text is checked against our style guide. Each brief is labelled an AI draft until a person has reviewed it.")}
        </p>

        <h2 id="jenis">{tx(lang, "Jenis daerah", "District types")}</h2>
        <p>
          {tx(lang,
            `Setiap daerah diberi satu jenis berdasarkan campuran KDNK daerah (${atlas.districts[0].gdp.latest_year}, harga malar 2015). Peraturan digunakan mengikut urutan di bawah; daerah menerima jenis pertama yang dipenuhinya. Purata KDNK per kapita Kedah ialah RM${fmt(lang, atlas.meta.kedah_gdp_per_capita_k * 1000, 0)}. Hanya empat jenis digunakan kerana lima warna kategori tidak dapat dibezakan dengan jelas apabila mana-mana dua daerah bersebelahan.`,
            `Each district gets one type from its GDP mix (${atlas.districts[0].gdp.latest_year}, constant 2015 prices). The rules are applied in the order below; a district takes the first type it meets. Kedah's average GDP per person is RM${fmt(lang, atlas.meta.kedah_gdp_per_capita_k * 1000, 0)}. Only four types are used because five category colours can't be told apart reliably when any two districts may touch.`)}
        </p>
        <ol>
          {atlas.meta.type_rules.map(([key]) => (
            <li key={key}><strong>{typeInfo[key].label[lang]}</strong>: {typeInfo[key].rule[lang]}</li>
          ))}
        </ol>

        <h2 id="cahaya-malam">{tx(lang, "Cahaya malam", "Night lights")}</h2>
        <p>
          {tx(lang,
            `Keamatan cahaya waktu malam daripada imej satelit, seperti yang diterbitkan di papan pemuka Kawasanku DOSM (${atlas.meta.kawasanku_as_of}). Angka Kedah dan Pulau Pinang ialah purata daerah yang ditimbang mengikut keluasan. Cahaya malam ialah petunjuk kasar kepadatan bandar dan aktiviti ekonomi, bukan ukuran KDNK.`,
            `Night-time light intensity from satellite imagery, as published on DOSM's Kawasanku dashboard (${atlas.meta.kawasanku_as_of}). The Kedah and Penang figures are district averages weighted by area. Night lights are a rough signal of urban density and economic activity, not a measure of GDP.`)}
        </p>

        <h2 id="catch-up">{tx(lang, "Kalkulator mengejar purata Malaysia", "The catch-up calculator")}</h2>
        <p>
          {tx(lang,
            "KDNK per kapita = KDNK benar negeri (harga malar 2015) ÷ anggaran penduduk pertengahan tahun. KDNK Malaysia ialah jumlah semua negeri termasuk Supra. Dalam kalkulator cerita Shenzhen, KDNK Kedah tumbuh pada kadar yang dipilih, penduduk Kedah bertambah pada kadar purata sedekad lalu, dan KDNK per kapita Malaysia tumbuh pada kadar purata sedekad lalu. Tahun Kedah menyamai purata Malaysia ialah tahun pertama KDNK per kapita Kedah melepasi paras Malaysia. Ini senario, bukan ramalan: kadar pertumbuhan jarang kekal sama selama beberapa dekad, dan kadar Shenzhen serta Bac Ninh dicapai dari titik mula yang jauh lebih rendah.",
            "GDP per person = state real GDP (constant 2015 prices) ÷ mid-year population estimate. Malaysia's GDP is the sum of all states including Supra. In the Shenzhen story's calculator, Kedah's GDP grows at the chosen rate, Kedah's population grows at its average rate over the past decade, and Malaysia's GDP per person grows at its own past-decade average. The catch-up year is the first year Kedah's GDP per person passes Malaysia's. This is a scenario, not a forecast: growth rates rarely hold for decades, and Shenzhen's and Bac Ninh's rates were reached from far lower starting points.")}
        </p>

        <h2 id="imputed">{tx(lang, "Nilai yang dirahsiakan oleh DOSM", "Cells DOSM suppresses")}</h2>
        <p>
          {tx(lang,
            "DOSM tidak menerbitkan sesetengah nilai sektor yang kecil bagi melindungi kerahsiaan. Kami mengisi nilai tersebut sebagai baki: jumlah KDNK daerah ditolak anggaran duti import dan sektor yang diketahui. Nilai yang diisi:",
            "DOSM withholds some small sector values for confidentiality. We fill them as a residual: district GDP total, minus an estimate of import duties, minus the known sectors. Filled values:")}
        </p>
        <div className="table-wrap">
          <table>
            <thead><tr><th>{tx(lang, "Daerah", "District")}</th><th>{tx(lang, "Tahun", "Year")}</th><th>{tx(lang, "Sektor", "Sector")}</th><th>RM {tx(lang, "juta", "m")}</th></tr></thead>
            <tbody>
              {m.gdp_imputed.map((r) => (
                <tr key={`${r.district}${r.year}${r.sector}`}>
                  <td>{r.district}</td><td>{r.year}</td><td style={{ textAlign: "right" }}>{sectorLabel[r.sector][lang]}</td><td>{fmt(lang, r.value, 1)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <h2>{tx(lang, "Sorotan automatik", "Automatic highlights")}</h2>
        <p>
          {tx(lang,
            "‘Kekuatan’ dan ‘Cabaran’ pada setiap profil dijana oleh peraturan tetap (cth. kemiskinan ≥ 1.3 kali purata Kedah; LQ ≥ 1.2 dan peratusan ≥ 8%), bukan oleh AI. Peraturan yang sama digunakan bagi setiap daerah.",
            "The ‘Strength’ and ‘Challenge’ points on each profile come from fixed rules (e.g. poverty ≥ 1.3× the Kedah average; LQ ≥ 1.2 with a share ≥ 8%), not AI. The same rules apply to every district.")}
        </p>

        <h2>{tx(lang, "Pembetulan", "Corrections")}</h2>
        <p>
          {tx(lang,
            "Menemui kesilapan? Maklumkan kepada kami dan kami akan membetulkannya serta merekodkannya di sini. Kod dan data adalah terbuka.",
            "Found a mistake? Tell us and we'll fix it and log it here. The code and data are open.")}{" "}
          <Link href={`/${lang}/data/`}>{tx(lang, "Muat turun data", "Download the data")}</Link>
        </p>
      </article>
    </div>
  );
}
