import type { Metadata } from "next";
import Link from "next/link";
import CatchUp from "@/components/CatchUp";
import LineChart from "@/components/LineChart";
import { atlas, last } from "@/lib/atlas";
import { fmt, LOCALES, rm, t, tx, type Locale } from "@/lib/i18n";

export function generateStaticParams() {
  return LOCALES.map((lang) => ({ lang }));
}

export async function generateMetadata({ params }: PageProps<"/[lang]/cerita/shenzhen">): Promise<Metadata> {
  const lang = (await params).lang as Locale;
  return {
    title: tx(lang, "Bolehkah Kedah bergerak sepantas Shenzhen?", "Can Kedah move at Shenzhen's speed?"),
    description: tx(lang,
      "Shenzhen, Pulau Pinang dan Bac Ninh: apa yang boleh dipelajari oleh Kedah, dan berapa pantas Kedah perlu tumbuh untuk mengejar purata Malaysia.",
      "Shenzhen, Penang and Bac Ninh: what Kedah can learn, and how fast it would need to grow to catch the Malaysian average."),
  };
}

// Figures from outside DOSM, each cited in the sources list at the foot of the page.
const SZ = {
  pop1979: 314_100, // Juan Du, The Shenzhen Experiment (2020), via Made in China Journal
  pop2025: 18.24, // million, Shenzhen statistics bureau via Yantian District Government, May 2026
  gdp2025: 3.87, // trillion yuan, same
  growth: 21.6, // % a year, 1979–2019, Xinhua, Aug 2020
  noHukou2020: 66.6, // % of residents without local hukou, 2020 census, Frontiers in Public Health 2025
};
const PG = { unemp1969: 16, pcGap1969: 12, mfgJobs1969: 3_096, mfgJobs1978: 18_700 }; // Koay Su Lyn, Economic History Malaysia
const BN = { growth: 13.9, times: 23.8, pcVsVietnam2020: 2.1 }; // VTC News Feb 2022; VietNamNet Dec 2020
const KHTP = { workers: 70_000, target: 150_000 }; // The Vibes, May 2022

export default async function Shenzhen({ params }: PageProps<"/[lang]/cerita/shenzhen">) {
  const lang = (await params).lang as Locale;
  const tr = t(lang);
  const { peers } = atlas;
  const [y0, y1] = peers.period;
  const kPc = last(peers.kedah.per_capita).value;
  const pPc = last(peers.penang.per_capita).value;
  const mPc = last(peers.malaysia.per_capita).value;
  const kShare0 = (peers.kedah.per_capita[0].value / peers.malaysia.per_capita[0].value) * 100;
  const kShare1 = (kPc / mPc) * 100;
  const penangOverMy = (pPc / mPc - 1) * 100;
  const szTimes = (SZ.pop2025 * 1e6) / SZ.pop1979;
  const k = peers.kedah;
  const my = peers.malaysia;
  const pen = peers.penang;

  return (
    <div className="wrap">
      <nav className="crumbs">
        <Link href={`/${lang}/`}>{tr.siteName}</Link> / <Link href={`/${lang}/cerita/`}>{tr.nav.story}</Link> / Shenzhen
      </nav>
      <article className="narrow prose">
        <p className="muted small">{tx(lang, "Cerita data · Kedah dan dunia", "Data story · Kedah and the world")}</p>
        <h1>{tx(lang, "Bolehkah Kedah bergerak sepantas Shenzhen?", "Can Kedah move at Shenzhen's speed?")}</h1>
        <p className="lede secondary" style={{ fontSize: "1.15rem" }}>
          {tx(lang,
            `Pada 1979, Shenzhen ialah kawasan pertanian dan perikanan dengan kira-kira ${fmt(lang, SZ.pop1979, 0)} penduduk di sempadan Hong Kong. Empat dekad kemudian, penduduknya melebihi 18 juta dan ekonominya lebih besar daripada Hong Kong. Kedah tidak dapat meniru kelajuan China, tetapi resipinya boleh dipelajari — dan Malaysia pernah melakukannya betul-betul di sebelah Kedah.`,
            `In 1979, Shenzhen was a farming and fishing area of about ${fmt(lang, SZ.pop1979, 0)} people on the Hong Kong border. Four decades later it has more than 18 million people and an economy bigger than Hong Kong's. Kedah can't copy China's speed, but it can learn the recipe — and Malaysia has already done it once, right next door to Kedah.`)}
        </p>

        <div className="stats" style={{ margin: "20px 0 6px" }}>
          <div className="stat">
            <div className="label">{tx(lang, "Penduduk Shenzhen, 1979", "Shenzhen population, 1979")}</div>
            <div className="value tnum">{fmt(lang, SZ.pop1979 / 1000, 0)}{tx(lang, " ribu", "k")}</div>
          </div>
          <div className="stat">
            <div className="label">{tx(lang, "Penduduk Shenzhen, 2025", "Shenzhen population, 2025")}</div>
            <div className="value tnum">{fmt(lang, SZ.pop2025, 2)}{tx(lang, " juta", "m")}</div>
          </div>
          <div className="stat">
            <div className="label">{tx(lang, "KDNK Shenzhen, 2025 (yuan)", "Shenzhen GDP, 2025 (yuan)")}</div>
            <div className="value tnum">{fmt(lang, SZ.gdp2025, 2)}{tx(lang, " trilion", "tn")}</div>
          </div>
          <div className="stat">
            <div className="label">{tx(lang, "Pertumbuhan setahun, 1979–2019", "Growth a year, 1979–2019")}</div>
            <div className="value tnum">{fmt(lang, SZ.growth, 1)}%</div>
          </div>
        </div>
        <p className="source">{tr.source}: {tx(lang, "Biro Statistik Shenzhen; Xinhua; Juan Du (2020). Lihat senarai sumber di bawah.", "Shenzhen Statistics Bureau; Xinhua; Juan Du (2020). See the source list below.")}</p>

        <h2>{tx(lang, "1. Apa yang sebenarnya berlaku di Shenzhen", "1. What actually happened in Shenzhen")}</h2>
        <p>
          {tx(lang,
            "Kisah “kampung nelayan” itu separuh mitos. Kawasan itu ialah Daerah Bao'an, dengan sawah, ladang tiram dan kolam garam, serta sebuah pekan sempadan kecil bernama Shenzhen. Yang istimewa bukan kemiskinannya, tetapi kedudukannya: bersebelahan Hong Kong, antara bandar terkaya di Asia ketika itu. Lima perkara menjadikan Shenzhen berjaya:",
            "The “fishing village” story is half myth. The area was Bao'an County — rice fields, oyster beds and salt pans — plus a small border town called Shenzhen. What made it special wasn't its poverty but its location: next to Hong Kong, one of Asia's richest cities at the time. Five things made Shenzhen work:")}
        </p>
        <ol>
          <li>
            <strong>{tx(lang, "Jiran yang kaya. ", "A rich neighbour. ")}</strong>
            {tx(lang,
              "Pengilang Hong Kong memindahkan kilang ke seberang sempadan untuk mendapatkan tanah dan pekerja yang lebih murah, dan membawa modal, pelanggan serta kepakaran bersama mereka.",
              "Hong Kong manufacturers moved factories across the border for cheaper land and labour, bringing capital, customers and know-how with them.")}
          </li>
          <li>
            <strong>{tx(lang, "Peraturan khas. ", "Special rules. ")}</strong>
            {tx(lang,
              "Pada 1980, Shenzhen menjadi Zon Ekonomi Khas pertama China, dengan peraturan cukai, tanah dan pelaburan asing yang lebih longgar berbanding kawasan lain di negara itu.",
              "In 1980 Shenzhen became China's first Special Economic Zone, with looser rules on tax, land and foreign investment than the rest of the country.")}
          </li>
          <li>
            <strong>{tx(lang, "Pekerja dari seluruh negara. ", "Workers from across the country. ")}</strong>
            {tx(lang,
              `Berjuta-juta pekerja berhijrah dari wilayah lain; penduduk bertambah kira-kira ${fmt(lang, szTimes, 0)} kali ganda. Pada 2020, ${fmt(lang, SZ.noHukou2020, 0)}% penduduk Shenzhen masih tidak mempunyai pendaftaran isi rumah (hukou) tempatan.`,
              `Millions of workers moved in from other provinces; the population grew about ${fmt(lang, szTimes, 0)}-fold. In 2020, ${fmt(lang, SZ.noHukou2020, 0)}% of Shenzhen's residents still had no local household registration (hukou).`)}
          </li>
          <li>
            <strong>{tx(lang, "Sokongan kerajaan pusat. ", "Central government backing. ")}</strong>
            {tx(lang,
              "Beijing membenarkan Shenzhen mencuba dasar baharu lebih awal daripada kawasan lain, dan menyokongnya selama beberapa dekad.",
              "Beijing let Shenzhen try new policies before anywhere else, and backed it for decades.")}
          </li>
          <li>
            <strong>{tx(lang, "Masa yang tepat. ", "Good timing. ")}</strong>
            {tx(lang,
              "Pada 1980-an, syarikat dunia sedang mencari tempat pengeluaran yang lebih murah di Asia.",
              "In the 1980s, global companies were looking for cheaper places to make things in Asia.")}
          </li>
        </ol>
        <p>
          {tx(lang,
            "Kelajuan ini ada harganya. Pekerja migran tanpa hukou tempatan tidak mendapat akses penuh kepada sekolah, perumahan dan perkhidmatan awam di bandar tempat mereka bekerja. Sebahagian besar pertumbuhan KDNK Shenzhen juga datang daripada pertambahan penduduk, bukan hanya daripada setiap pekerja menjadi lebih produktif.",
            "That speed came at a price. Migrant workers without local hukou didn't get full access to schools, housing and public services in the city where they worked. Much of Shenzhen's GDP growth also came from more people arriving, not only from each worker becoming more productive.")}
        </p>

        <h2>{tx(lang, "2. Pulau Pinang ialah “Hong Kong” Kedah", "2. Penang is Kedah's “Hong Kong”")}</h2>
        <div className="pairs" role="group" aria-label={tx(lang, "Dua pasangan jiran", "Two pairs of neighbours")}>
          <Pair
            when="1980"
            rich="Hong Kong"
            grow="Shenzhen"
            out={tx(lang, "kilang, modal, kepakaran", "factories, capital, know-how")}
            back={tx(lang, "tanah dan pekerja", "land and workers")}
          />
          <Pair
            when={tx(lang, "Kini", "Today")}
            rich="Pulau Pinang"
            grow={tx(lang, "Kedah (Kulim)", "Kedah (Kulim)")}
            out={tx(lang, "kilang, modal, kepakaran", "factories, capital, know-how")}
            back={tx(lang, "tanah, air dan pekerja", "land, water and workers")}
          />
        </div>
        <p>
          {tx(lang,
            `Kedudukan Kedah hampir sama. Setiap penduduk Pulau Pinang menghasilkan KDNK ${rm(lang, pPc)} setahun, berbanding ${rm(lang, kPc)} di Kedah — ${fmt(lang, pPc / kPc, 1)} kali ganda (${y1}, harga malar 2015). Taman Teknologi Tinggi Kulim (KHTP), berhampiran sempadan Pulau Pinang, menggaji kira-kira ${fmt(lang, KHTP.workers, 0)} orang, dan kerajaan negeri menjangka ${fmt(lang, KHTP.target, 0)} menjelang 2035. Kedah juga membekalkan air: Empangan Muda dan Beris mengalirkan air ke Sungai Muda, sumber lebih 80% air mentah Pulau Pinang.`,
            `Kedah's position is much the same. Each Penang resident produces ${rm(lang, pPc)} of GDP a year, against ${rm(lang, kPc)} in Kedah — ${fmt(lang, pPc / kPc, 1)} times as much (${y1}, 2015 prices). Kulim Hi-Tech Park (KHTP), near the Penang border, employs about ${fmt(lang, KHTP.workers, 0)} people, and the state expects ${fmt(lang, KHTP.target, 0)} by 2035. Kedah supplies water too: the Muda and Beris dams feed the Muda River, the source of more than 80% of Penang's raw water.`)}
        </p>

        <div className="card" style={{ margin: "20px 0" }}>
          <h3>{tx(lang, "KDNK per kapita", "GDP per person")} <span className="badge official">{tr.official}</span></h3>
          <p className="sub">{tx(lang, `RM setahun, harga malar 2015, ${y0}–${y1}`, `RM a year, constant 2015 prices, ${y0}–${y1}`)}</p>
          <LineChart
            zero
            spec={{ lang, kind: "rm" }}
            ariaLabel={tx(lang, "KDNK per kapita Pulau Pinang, Malaysia dan Kedah", "GDP per person: Penang, Malaysia and Kedah")}
            series={[
              { key: "p", label: "Pulau Pinang", color: "var(--s-1)", points: pen.per_capita },
              { key: "m", label: "Malaysia", color: "var(--s-2)", points: my.per_capita },
              { key: "k", label: "Kedah", color: "var(--s-3)", points: k.per_capita },
            ]}
          />
          <p className="source">
            {tr.source}: DOSM, {tx(lang, "KDNK Benar Tahunan mengikut Negeri; Jadual Penduduk: Negeri dan Malaysia. KDNK per kapita dikira oleh Atlas Kedah.", "Annual Real GDP by State; Population Tables: States and Malaysia. GDP per person calculated by Atlas Kedah.")}
          </p>
        </div>
        <p>
          {tx(lang,
            `Masalahnya: jurang Kedah tidak berubah dalam sedekad. KDNK per kapita Kedah ialah ${fmt(lang, kShare0, 0)}% daripada purata Malaysia pada ${y0}, dan ${fmt(lang, kShare1, 0)}% pada ${y1}. Ekonomi Kedah tumbuh ${fmt(lang, k.cagr_gdp, 1)}% setahun, sedikit lebih perlahan daripada Malaysia (${fmt(lang, my.cagr_gdp, 1)}%) dan jauh di belakang Pulau Pinang (${fmt(lang, pen.cagr_gdp, 1)}%).`,
            `The problem: Kedah's gap hasn't moved in a decade. Kedah's GDP per person was ${fmt(lang, kShare0, 0)}% of the Malaysian average in ${y0}, and ${fmt(lang, kShare1, 0)}% in ${y1}. Kedah's economy grew ${fmt(lang, k.cagr_gdp, 1)}% a year — a little slower than Malaysia (${fmt(lang, my.cagr_gdp, 1)}%) and well behind Penang (${fmt(lang, pen.cagr_gdp, 1)}%).`)}
        </p>

        <h2>{tx(lang, "3. Malaysia pernah melakukannya: Pulau Pinang, 1969–1972", "3. Malaysia has done it before: Penang, 1969–1972")}</h2>
        <p>
          {tx(lang,
            `Pada 1969, Pulau Pinang kehilangan status pelabuhan bebas. Kadar pengangguran naik hingga ${PG.unemp1969}%, dan pendapatan per kapita jatuh ${PG.pcGap1969}% di bawah purata negara. Kerajaan negeri menubuhkan Perbadanan Pembangunan Pulau Pinang (PDC) pada November 1969 dan membuka Zon Perdagangan Bebas Bayan Lepas — yang pertama di Malaysia — pada Januari 1972. Menjelang pertengahan 1972, Intel, Hewlett-Packard, Hitachi dan Motorola sudah tiba. Pekerjaan pembuatan meningkat daripada ${fmt(lang, PG.mfgJobs1969, 0)} (1969) kepada ${fmt(lang, PG.mfgJobs1978, 0)} (1978).`,
            `In 1969, Penang lost its free-port status. Unemployment rose to ${PG.unemp1969}%, and income per person fell ${PG.pcGap1969}% below the national average. The state set up the Penang Development Corporation (PDC) in November 1969 and opened the Bayan Lepas Free Trade Zone — Malaysia's first — in January 1972. By mid-1972, Intel, Hewlett-Packard, Hitachi and Motorola had arrived. Manufacturing jobs rose from ${fmt(lang, PG.mfgJobs1969, 0)} (1969) to ${fmt(lang, PG.mfgJobs1978, 0)} (1978).`)}
        </p>
        <div className="stats" style={{ margin: "16px 0" }}>
          <div className="stat">
            <div className="label">{tx(lang, "Pulau Pinang berbanding purata Malaysia, 1969", "Penang against the Malaysian average, 1969")}</div>
            <div className="value tnum">−{PG.pcGap1969}%</div>
            <div className="context">{tx(lang, "pendapatan per kapita", "income per person")}</div>
          </div>
          <div className="stat">
            <div className="label">{tx(lang, `Pulau Pinang berbanding purata Malaysia, ${y1}`, `Penang against the Malaysian average, ${y1}`)}</div>
            <div className="value tnum">+{fmt(lang, penangOverMy, 0)}%</div>
            <div className="context">{tx(lang, "KDNK per kapita", "GDP per person")}</div>
          </div>
        </div>
        <p className="source">
          {tr.source}: {tx(lang, `Koay Su Lyn, Economic History Malaysia (1969); DOSM (${y1}). Kedua-dua ukuran tidak sama sepenuhnya, tetapi arahnya jelas.`, `Koay Su Lyn, Economic History Malaysia (1969); DOSM (${y1}). The two measures aren't identical, but the direction is clear.`)}
        </p>
        <p>
          {tx(lang,
            "Pulau Pinang tidak hanya menunggu kerajaan pusat. Kerajaan negeri sendiri aktif mencari pelabur, menyediakan tanah dan menawarkan pekerja yang terlatih. Inilah pengajaran yang paling dekat dengan Kedah.",
            "Penang didn't just wait for the federal government. The state itself went looking for investors, prepared land and offered trained workers. That is the lesson closest to home for Kedah.")}
        </p>

        <h2>{tx(lang, "4. Contoh yang lebih serupa: Bac Ninh, Vietnam", "4. A closer match: Bac Ninh, Vietnam")}</h2>
        <p>
          {tx(lang,
            `Bac Ninh ialah wilayah kecil berhampiran Hanoi yang bergantung pada pertanian dan kraf tangan ketika ditubuhkan semula pada 1997 — lebih serupa dengan Kedah berbanding Shenzhen. Samsung mula mengeluarkan telefon bimbit di Yen Phong, Bac Ninh, pada April 2009. Antara 1997 dan 2021, ekonomi Bac Ninh tumbuh purata ${fmt(lang, BN.growth, 1)}% setahun dan membesar ${fmt(lang, BN.times, 1)} kali ganda. Pada 2020, KDNK per kapitanya ${fmt(lang, BN.pcVsVietnam2020, 1)} kali purata Vietnam.`,
            `Bac Ninh is a small province near Hanoi that depended on farming and handicrafts when it was re-established in 1997 — more like Kedah than Shenzhen was. Samsung started making phones at Yen Phong, Bac Ninh, in April 2009. Between 1997 and 2021 the province's economy grew an average ${fmt(lang, BN.growth, 1)}% a year and became ${fmt(lang, BN.times, 1)} times larger. By 2020 its GDP per person was ${fmt(lang, BN.pcVsVietnam2020, 1)} times the Vietnamese average.`)}
        </p>
        <p className="secondary">
          {tx(lang,
            "Pengajarannya: satu pelabur utama, tanah industri yang siap, dan jalan yang baik ke bandar besar boleh mengubah wilayah pertanian dalam masa sedekad. Namun, Bac Ninh bermula daripada paras pendapatan yang jauh lebih rendah daripada Kedah hari ini, dan pertumbuhan lebih mudah dicapai dari titik mula yang rendah.",
            "The lesson: one anchor investor, ready industrial land and a good road to a big city can transform a farming province within a decade. But Bac Ninh started from a much lower income than Kedah has today, and growth is easier from a low base.")}
        </p>

        <h2>{tx(lang, "5. Resipi untuk Kedah", "5. A recipe for Kedah")}</h2>
        <div className="recipe">
          <div className="recipe-col">
            <h3><span aria-hidden="true">✓</span> {tx(lang, "Sudah ada", "Already has")}</h3>
            <ul>
              <li>{tx(lang, "Jiran yang kaya: Pulau Pinang, dan KHTP berhampiran sempadannya.", "A rich neighbour: Penang, with KHTP near its border.")}</li>
              <li>{tx(lang, "Tanah: di bawah Perlembagaan Persekutuan, tanah ialah perkara negeri, jadi Kedah sendiri boleh menyediakan tanah industri.", "Land: under the Federal Constitution land is a state matter, so Kedah itself can make industrial land available.")}</li>
              <li>{tx(lang, "Air: Sungai Muda membekalkan sebahagian besar air mentah Pulau Pinang.", "Water: the Muda River supplies most of Penang's raw water.")}</li>
              <li>{tx(lang, "Industri baharu: Bandar Getah Kedah di Padang Terap, dengan sasaran 14,500 peluang pekerjaan dalam 15 tahun.", "New industry: Kedah Rubber City in Padang Terap, targeting 14,500 jobs over 15 years.")}</li>
            </ul>
          </div>
          <div className="recipe-col">
            <h3><span aria-hidden="true">→</span> {tx(lang, "Boleh ditiru", "Can copy")}</h3>
            <ul>
              <li>{tx(lang, "Zon dengan peraturan mudah dan kelulusan pantas, seperti Bayan Lepas (1972) dan Zon Ekonomi Khas Johor–Singapura (2025).", "A zone with simple rules and fast approvals, like Bayan Lepas (1972) and the Johor–Singapore Special Economic Zone (2025).")}</li>
              <li>{tx(lang, "Badan pembangunan negeri yang aktif mencari pelabur, seperti PDC.", "A state development agency that actively hunts for investors, like PDC.")}</li>
              <li>{tx(lang, "Latihan kemahiran yang direka bersama majikan.", "Skills training designed with employers.")}</li>
              <li>{tx(lang, "Pengangkutan dan perumahan untuk pekerja dari daerah luar bandar.", "Transport and housing for workers from rural districts.")}</li>
            </ul>
          </div>
          <div className="recipe-col">
            <h3><span aria-hidden="true">✕</span> {tx(lang, "Sukar ditiru", "Hard to copy")}</h3>
            <ul>
              <li>{tx(lang, "Cukai, kastam dan insentif pelaburan ditentukan oleh kerajaan persekutuan, bukan negeri.", "Tax, customs and investment incentives are set by the federal government, not the state.")}</li>
              <li>{tx(lang, "Tiada ratusan juta pekerja migran: pertumbuhan Kedah mesti datang daripada produktiviti, bukan sekadar pertambahan penduduk.", "No pool of hundreds of millions of migrant workers: Kedah's growth has to come from productivity, not just more people.")}</li>
              <li>{tx(lang, "Kuasa kerajaan pusat China yang sangat besar, termasuk ke atas tanah, tidak sesuai dengan sistem persekutuan Malaysia.", "The Chinese central government's sweeping powers, including over land, don't fit Malaysia's federal system.")}</li>
            </ul>
          </div>
        </div>

        <h2>{tx(lang, "6. Berapa pantas Kedah perlu tumbuh?", "6. How fast does Kedah need to grow?")}</h2>
        <p>
          {tx(lang,
            `Pilih kadar pertumbuhan dan lihat pada tahun berapa Kedah mengejar purata Malaysia. Pada kadar sedekad lalu, KDNK per kapita Kedah tumbuh ${fmt(lang, k.cagr_per_capita, 2)}% setahun, hampir sama dengan Malaysia (${fmt(lang, my.cagr_per_capita, 2)}%) — itulah sebabnya jurang itu tidak mengecil.`,
            `Pick a growth rate and see when Kedah catches the Malaysian average. At the past decade's pace, Kedah's GDP per person grew ${fmt(lang, k.cagr_per_capita, 2)}% a year, almost the same as Malaysia's (${fmt(lang, my.cagr_per_capita, 2)}%) — which is why the gap never closed.`)}
        </p>
        <CatchUp
          lang={lang}
          year={y1}
          kedahPc={kPc}
          malaysiaPc={mPc}
          kedahPopGrowth={k.cagr_pop}
          malaysiaPcGrowth={my.cagr_per_capita}
          presets={[
            { key: "kedah", label: tx(lang, "Kedah", "Kedah"), rate: +k.cagr_gdp.toFixed(1), note: `${y0}–${y1}` },
            { key: "penang", label: "Pulau Pinang", rate: +pen.cagr_gdp.toFixed(1), note: `${y0}–${y1}` },
            { key: "bacninh", label: "Bac Ninh", rate: BN.growth, note: "1997–2021" },
            { key: "shenzhen", label: "Shenzhen", rate: SZ.growth, note: "1979–2019" },
          ]}
        />

        <h2>{tx(lang, "7. Apa maksudnya untuk Kedah", "7. What it means for Kedah")}</h2>
        <ul>
          <li>
            {tx(lang,
              "Kelajuan Shenzhen tidak realistik untuk Kedah. Tetapi pertumbuhan pada kadar Pulau Pinang sekarang sudah cukup untuk mula merapatkan jurang — perlahan, tetapi berterusan.",
              "Shenzhen's speed isn't realistic for Kedah. But growing at Penang's current rate would already start closing the gap — slowly, but steadily.")}
          </li>
          <li>
            {tx(lang,
              "Tumbuh sama pantas dengan Malaysia hanya mengekalkan jurang. Kedah perlu tumbuh lebih pantas daripada purata negara.",
              "Growing as fast as Malaysia only holds the gap in place. Kedah has to grow faster than the national average.")}
          </li>
          <li>
            {tx(lang,
              "Kulim, Kuala Muda dan Padang Terap ialah pintu masuk pelaburan. Daerah luar bandar seperti Baling perlu dihubungkan dengan pintu itu melalui latihan, pengangkutan dan rantaian bekalan.",
              "Kulim, Kuala Muda and Padang Terap are the doors for investment. Rural districts like Baling need to be connected to those doors through training, transport and supply links.")}
          </li>
        </ul>
        <p>
          <Link href={`/${lang}/daerah/kulim/`}>{tx(lang, "Profil Kulim →", "Kulim profile →")}</Link>{" · "}
          <Link href={`/${lang}/daerah/padang-terap/`}>{tx(lang, "Profil Padang Terap →", "Padang Terap profile →")}</Link>{" · "}
          <Link href={`/${lang}/cerita/baling/`}>{tx(lang, "Cerita Baling →", "The Baling story →")}</Link>
        </p>

        <h3>{tr.sources}</h3>
        <ul className="small secondary">
          <li>DOSM / OpenDOSM: {tx(lang, "KDNK Benar Tahunan mengikut Negeri; Jadual Penduduk: Negeri dan Malaysia (CC BY 4.0).", "Annual Real GDP by State; Population Tables: States and Malaysia (CC BY 4.0).")}</li>
          <li><a href="https://madeinchinajournal.com/2021/02/08/border-at-the-centre-of-myth-fishing-village-caiwuwei-shenzhen/">Made in China Journal, Feb 2021</a> — {tx(lang, "mitos kampung nelayan; penduduk 1979 (Juan Du, The Shenzhen Experiment, 2020).", "the fishing-village myth; 1979 population (Juan Du, The Shenzhen Experiment, 2020).")}</li>
          <li><a href="https://www.yantian.gov.cn/English/news/content/post_12813049.html">{tx(lang, "Kerajaan Daerah Yantian, Shenzhen, Mei 2026", "Yantian District Government, Shenzhen, May 2026")}</a> — {tx(lang, "penduduk 18.24 juta dan KDNK 3.87 trilion yuan, 2025.", "18.24 million residents and 3.87 trillion yuan GDP, 2025.")}</li>
          <li><a href="http://www.xinhuanet.com/english/2020-08/26/c_139320084.htm">Xinhua, Aug 2020</a> — {tx(lang, "pertumbuhan KDNK 21.6% setahun, 1979–2019.", "GDP growth of 21.6% a year, 1979–2019.")}</li>
          <li><a href="https://www.scmp.com/economy/china-economy/article/2187949/hong-kong-economy-surpassed-neighbour-shenzhen-first-time-2018">South China Morning Post, Feb 2019</a> — {tx(lang, "ekonomi Shenzhen melepasi Hong Kong pada 2018.", "Shenzhen's economy passed Hong Kong's in 2018.")}</li>
          <li><a href="https://pmc.ncbi.nlm.nih.gov/articles/PMC12358437/">Frontiers in Public Health, 2025</a> — {tx(lang, "penduduk Shenzhen mengikut status hukou, Banci 2020.", "Shenzhen residents by hukou status, 2020 census.")}</li>
          <li><a href="https://www.ehm.my/publications/articles/penangs-industrialization-and-economic-transformation-1960s-to-1980s">Economic History Malaysia (Koay Su Lyn)</a> — {tx(lang, "Pulau Pinang 1969–1978.", "Penang 1969–1978.")}</li>
          <li><a href="https://vtcnews.vn/sau-25-nam-tai-lap-tinh-bac-ninh-dung-thu-4-toan-quoc-ve-grdp-theo-dau-nguoi-ar663291.html">VTC News, Feb 2022</a> {tx(lang, "dan", "and")} <a href="https://vietnamnet.vn/bac-ninh-ky-tich-tinh-nho-thuan-nong-vao-top-7-giau-nhat-nuoc-700479.html">VietNamNet, Dec 2020</a> — {tx(lang, "ekonomi Bac Ninh.", "Bac Ninh's economy.")}</li>
          <li><a href="https://news.samsung.com/global/samsung-electronics-recognized-in-vietnam-as-one-of-the-best-enterprises-for-employees">Samsung Newsroom</a> — {tx(lang, "kilang Samsung di Bac Ninh sejak April 2009.", "Samsung's Bac Ninh plant, operating since April 2009.")}</li>
          <li><a href="https://www.thevibes.com/articles/business/61835/kedah-to-upgrade-kulim-hi-tech-park-infrastructure-expecting-150000-workers-by-2035">The Vibes, May 2022</a> — {tx(lang, "KHTP: ~70,000 pekerja, sasaran 150,000 menjelang 2035.", "KHTP: ~70,000 workers, 150,000 expected by 2035.")}</li>
          <li><a href="https://www.freemalaysiatoday.com/category/nation/2024/07/15/kedah-asked-to-release-water-into-sungai-muda-as-levels-drop">Free Malaysia Today, Jul 2024</a> — {tx(lang, "Sungai Muda: lebih 80% air mentah Pulau Pinang.", "Muda River: more than 80% of Penang's raw water.")}</li>
          <li><a href="https://www.mida.gov.my/prinx-chengsan-breaks-ground-at-kedah-rubber-city-a-rm2-6-billion-endorsement-of-malaysias-rubber-industry-vision/">MIDA, Nov 2025</a> — {tx(lang, "Bandar Getah Kedah.", "Kedah Rubber City.")}</li>
          <li><a href="https://www.edb.gov.sg/en/about-edb/media-releases-publications/agreement-between-singapore-and-malaysia-and-the-johor-singapore-special-economic-zone.html">Singapore EDB, Jan 2025</a> — {tx(lang, "perjanjian Zon Ekonomi Khas Johor–Singapura.", "the Johor–Singapore Special Economic Zone agreement.")}</li>
        </ul>
      </article>
    </div>
  );
}

function Pair({ when, rich, grow, out, back }: { when: string; rich: string; grow: string; out: string; back: string }) {
  return (
    <figure className="pair">
      <figcaption className="muted small">{when}</figcaption>
      <div className="pair-row">
        <div className="pair-box rich">{rich}</div>
        <div className="pair-flow">
          <span>{out} <i className="arr-x" aria-hidden="true">→</i><i className="arr-y" aria-hidden="true">↓</i></span>
          <span><i className="arr-x" aria-hidden="true">←</i><i className="arr-y" aria-hidden="true">↑</i> {back}</span>
        </div>
        <div className="pair-box grow">{grow}</div>
      </div>
    </figure>
  );
}
