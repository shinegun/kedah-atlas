import type { Metadata } from "next";
import Link from "next/link";
import { atlas, districts } from "@/lib/atlas";
import { LOCALES, t, tx, type Locale } from "@/lib/i18n";

import { REPO } from "@/lib/site";

export async function generateMetadata({ params }: PageProps<"/[lang]/tentang">): Promise<Metadata> {
  const lang = (await params).lang as Locale;
  return {
    title: tx(lang, "Tentang", "About"),
    description: tx(lang,
      "Siapa yang membina KedahKu, untuk siapa, dan cara setiap angka dihasilkan.",
      "Who builds KedahKu, who it is for, and how every number is made."),
  };
}

export function generateStaticParams() {
  return LOCALES.map((lang) => ({ lang }));
}

export default async function About({ params }: PageProps<"/[lang]/tentang">) {
  const lang = (await params).lang as Locale;
  const d = t(lang);
  const n = districts.length;
  const L = (seg: string) => `/${lang}/${seg}`;

  const readers = [
    {
      title: tx(lang, "Anak muda Kedah", "Young people in Kedah"),
      body: tx(lang,
        "Kenali daerah anda dalam beberapa slaid ringkas: pekerjaan, pendapatan dan hala tuju ekonominya. Tiada jadual untuk dibaca.",
        "Get to know your district in a few quick slides: its jobs, incomes and where its economy is heading. No tables to read."),
      href: L("daerah/"), cta: tx(lang, "Pilih daerah anda →", "Pick your district →"),
    },
    {
      title: tx(lang, "Perancang dan wakil rakyat", "Planners and elected representatives"),
      body: tx(lang,
        "Bandingkan daerah, lihat punca pertumbuhan dan uji unjuran dengan simulator. Setiap angka boleh dirujuk kepada sumbernya.",
        "Compare districts, see what drove growth and test projections in the simulator. Every number traces back to its source."),
      href: L("banding/"), cta: tx(lang, "Bandingkan daerah →", "Compare districts →"),
    },
    {
      title: tx(lang, "Wartawan dan penyelidik", "Journalists and researchers"),
      body: tx(lang,
        "Muat turun data dalam format CSV, baca kaedah kami dan semak batasannya. Sila petik KedahKu dan DOSM.",
        "Download the data as CSV, read our methods and check their limits. Please cite KedahKu and DOSM."),
      href: L("data/"), cta: tx(lang, "Muat turun data →", "Download the data →"),
    },
    {
      title: tx(lang, "Pelabur", "Investors"),
      body: tx(lang,
        "Tenaga buruh, kemahiran dan kekuatan ekonomi setiap daerah dalam satu halaman.",
        "The workforce, skills and economic strengths of every district on one page."),
      href: L("pelabur/"), cta: tx(lang, "Untuk pelabur →", "For investors →"),
    },
  ];

  return (
    <div className="wrap">
      <nav className="crumbs"><Link href={L("")}>{d.siteName}</Link> / {tx(lang, "Tentang", "About")}</nav>
      <p className="hero-kicker">{tx(lang, "Tentang", "About")}</p>
      <h1>{tx(lang, "Angka tentang Kedah yang boleh dipercayai, dalam bahasa yang mudah", "Numbers about Kedah you can trust, in plain words")}</h1>
      <p className="lede secondary">
        {tx(lang,
          `Data tentang ekonomi Kedah wujud, tetapi tersebar dalam laporan PDF, hamparan dan papan pemuka. KedahKu menghimpunkannya untuk ${n} daerah dan menerangkan maksudnya: pekerjaan rakyat, pendapatan mereka dan ke mana ekonomi setiap daerah boleh berkembang.`,
          `The data on Kedah's economy exists, but it is scattered across PDF reports, spreadsheets and dashboards. KedahKu brings it together for all ${n} districts and explains what it means: what people work in, what they earn, and where each district's economy can grow.`)}
      </p>

      <section aria-labelledby="who-h">
        <h2 id="who-h">{tx(lang, "Untuk siapa?", "Who is it for?")}</h2>
        <div className="about-grid">
          {readers.map((r) => (
            <div key={r.href} className="card">
              <h3>{r.title}</h3>
              <p>{r.body}</p>
              <Link href={r.href}>{r.cta}</Link>
            </div>
          ))}
        </div>
      </section>

      <section className="prose" aria-labelledby="is-h">
        <h2 id="is-h">{tx(lang, "Apa laman ini, dan apa yang bukan", "What it is, and is not")}</h2>
        <ul>
          <li>{tx(lang,
            "Atlas bukti berdasarkan statistik rasmi Jabatan Perangkaan Malaysia (DOSM), dengan sumber dan tahun pada setiap angka.",
            "An evidence atlas built on official statistics from the Department of Statistics Malaysia (DOSM), with a source and year on every number.")}</li>
          <li>{tx(lang,
            "Bukan penerbitan rasmi kerajaan. Angka bertanda ‘Anggaran’ dihasilkan oleh model kami, dan kaedahnya diterangkan sepenuhnya.",
            "Not an official government publication. Figures marked ‘Estimate’ come from our models, and the methods are fully explained.")}</li>
          <li>{tx(lang,
            "Bukan data individu. Setiap angka ialah agregat yang diterbitkan oleh DOSM atau dikira daripadanya.",
            "Not individual data. Every figure is an aggregate published by DOSM or computed from one.")}</li>
          <li>{tx(lang,
            "Bukan politik. Tiada kandungan parti atau calon.",
            "Not political. No party or candidate content.")}</li>
          <li>{tx(lang,
            "Bukan masa nyata. Laman ini dikemas kini apabila DOSM menerbitkan data baharu.",
            "Not real time. The site is updated when DOSM publishes new data.")}</li>
        </ul>

        <h2>{tx(lang, "Cara angka dihasilkan", "How the numbers are made")}</h2>
        <p>
          {tx(lang,
            `Kami memuat turun ${atlas.sources.length} set data terbuka daripada DOSM dan OpenDOSM, menyimpan cap jari SHA-256 bagi setiap fail, dan membina semula laman ini daripada data tersebut. DOSM tidak menerbitkan pekerjaan mengikut sektor bagi setiap daerah, jadi kami menganggarkannya dan melabel setiap anggaran dengan jelas.`,
            `We download ${atlas.sources.length} open datasets from DOSM and OpenDOSM, record a SHA-256 fingerprint for each file, and rebuild the site from them. DOSM does not publish jobs by sector for each district, so we estimate them and label every estimate clearly.`)}{" "}
          <Link href={L("kaedah/")}>{tx(lang, "Baca kaedah penuh", "Read the full method")}</Link>.
        </p>
        <p>
          {tx(lang,
            "Ringkasan pada setiap slaid daerah dirangka oleh AI daripada helaian fakta, dan disemak secara automatik supaya tidak menyebut angka di luar helaian itu. Ringkasan ini berlabel ‘Draf AI’ sehingga disemak oleh manusia.",
            "The brief on each district's slides is drafted by AI from a fact sheet, and checked automatically so it cannot state a number that is not on that sheet. Each brief is labelled ‘AI draft’ until a person has reviewed it.")}{" "}
          <Link href={L("kaedah/#ringkasan-ai")}>{tx(lang, "Ketahui lebih lanjut", "Learn more")}</Link>.
        </p>

        <h2>{tx(lang, "Pembetulan", "Corrections")}</h2>
        <p>
          {tx(lang,
            "Jika angka kelihatan salah, nama daerah tersilap, atau ayat tidak adil, sila laporkan kepada kami. Setiap pembetulan direkodkan secara terbuka dalam sejarah kod sumber.",
            "If a number looks wrong, a district is misnamed, or a sentence is unfair, please tell us. Every correction is recorded publicly in the source code history.")}{" "}
          <a href={`${REPO}/issues/new`} target="_blank" rel="noopener noreferrer">{tx(lang, "Laporkan kesilapan", "Report an error")}</a>.
        </p>

        <h2>{tx(lang, "Siapa kami", "Who we are")}</h2>
        <p>
          {tx(lang, "KedahKu ialah projek bebas oleh Aqil Nazri. Kod sumber boleh dilihat di ", "KedahKu is an independent project by Aqil Nazri. The source code is on ")}
          <a href={REPO} target="_blank" rel="noopener noreferrer">GitHub</a>
          {tx(lang, ". Kami mengalu-alukan semakan dan sumbangan daripada penyelidik, perancang dan pembaca.", ". Reviews and contributions from researchers, planners and readers are welcome.")}
        </p>
        <p>
          {tx(lang, "Projek ini diilhamkan oleh ", "The project was inspired by ")}
          <a href="https://sabah-ku.com/" target="_blank" rel="noopener noreferrer">SabahKu</a>
          {tx(lang,
            ", atlas ekonomi Sabah oleh Ilham Kassim. SabahKu turut menggunakan data cahaya malam daripada satelit untuk melihat taburan penduduk dan aktiviti ekonomi; KedahKu pula memberi tumpuan kepada pekerjaan rakyat dan ke mana pekerjaan boleh berkembang. Kedua-dua projek dibina secara berasingan.",
            ", Ilham Kassim's economic atlas of Sabah. SabahKu also uses satellite night-lights data to see where people and economic activity are; KedahKu focuses on the work people do and where jobs can grow. The two projects are built separately.")}
        </p>

        <h2>{tx(lang, "Lesen", "Licences")}</h2>
        <p>
          {tx(lang,
            "Data: Jabatan Perangkaan Malaysia melalui OpenDOSM dan data.gov.my, di bawah lesen ",
            "Data: Department of Statistics Malaysia via OpenDOSM and data.gov.my, under ")}
          <a href="https://creativecommons.org/licenses/by/4.0/" target="_blank" rel="noopener noreferrer">CC BY 4.0</a>
          {tx(lang, ". Foto daerah daripada Wikimedia Commons, di bawah lesen masing-masing (", ". District photos from Wikimedia Commons, under their own licences (")}
          <Link href={L("data/#foto")}>{tx(lang, "senarai penuh", "full list")}</Link>
          {tx(lang, `). Data dikemas kini: ${atlas.meta.built}.`, `). Data updated: ${atlas.meta.built}.`)}
        </p>
      </section>
    </div>
  );
}
