import type { Metadata } from "next";
import { atlas } from "@/lib/atlas";
import { t, tx, type Locale } from "@/lib/i18n";
import { PHOTOS } from "@/lib/photos";

export async function generateMetadata({ params }: PageProps<"/[lang]/data">): Promise<Metadata> {
  return { title: t((await params).lang as Locale).nav.data };
}

export default async function Data({ params }: PageProps<"/[lang]/data">) {
  const lang = (await params).lang as Locale;
  const files = [
    ["atlas-kedah-indicators.csv", tx(lang, "Semua penunjuk daerah (format panjang: daerah, tahun, penunjuk, nilai, unit, jenis dan sumber)", "All district indicators (long format: district, year, indicator, value, unit, kind, source)")],
    ["atlas-kedah-estimates.csv", tx(lang, "Anggaran sahaja (pekerjaan mengikut sektor dengan julat, unjuran KDNK)", "Estimates only (jobs by sector with ranges, GDP projections)")],
    ["kedah-jobs-by-industry.csv", tx(lang, "Pekerja Kedah mengikut industri, diekstrak daripada Laporan Survei Tenaga Buruh", "Kedah workers by industry, extracted from the Labour Force Survey Report")],
    ["kedah-jobs-by-occupation.csv", tx(lang, "Pekerja Kedah mengikut pekerjaan", "Kedah workers by occupation")],
    ["kedah-districts.geojson", tx(lang, "Sempadan 12 daerah (DOSM)", "Boundaries of the 12 districts (DOSM)")],
  ];
  return (
    <div className="wrap">
      <h1>{t(lang).nav.data}</h1>
      <p className="lede secondary">
        {tx(lang,
          "Semua data yang digunakan di laman ini boleh dimuat turun. Sila nyatakan sumber asal (DOSM) dan Atlas Kedah apabila menggunakan data ini.",
          "All data used on this site can be downloaded. Please credit the original source (DOSM) and Atlas Kedah when you use it.")}
      </p>
      <section>
        <h2>{tx(lang, "Muat turun", "Downloads")}</h2>
        <ul>
          {files.map(([f, desc]) => (
            <li key={f}>
              <a href={`/downloads/${f}`} download>{f}</a> — <span className="secondary">{desc}</span>
            </li>
          ))}
        </ul>
      </section>
      <section>
        <h2>{tx(lang, "Sumber", "Sources")}</h2>
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>{tx(lang, "Set data", "Dataset")}</th>
                <th style={{ textAlign: "left" }}>{tx(lang, "Penerbit", "Publisher")}</th>
                <th>{tx(lang, "Tahun", "Years")}</th>
                <th style={{ textAlign: "left" }}>{tx(lang, "Lesen", "Licence")}</th>
                <th>{tx(lang, "Dimuat turun", "Retrieved")}</th>
                <th>SHA-256</th>
              </tr>
            </thead>
            <tbody>
              {atlas.sources.map((s) => (
                <tr key={s.id}>
                  <td style={{ whiteSpace: "normal", minWidth: 220 }}><a href={s.catalogue}>{s.title}</a>{s.note ? <div className="tiny muted">{s.note}</div> : null}</td>
                  <td style={{ textAlign: "left", whiteSpace: "normal" }}>{s.publisher}</td>
                  <td>{s.years}</td>
                  <td style={{ textAlign: "left" }}>{s.licence}</td>
                  <td>{s.retrieved}</td>
                  <td><code className="tiny">{s.sha256?.slice(0, 10)}</code></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section id="foto">
        <h2>{tx(lang, "Foto", "Photos")}</h2>
        <p className="secondary">
          {tx(lang,
            "Foto daerah daripada Wikimedia Commons, digunakan di bawah lesen masing-masing. Kami mengubah saiz dan memotong foto untuk laman web; versi yang diubah dikongsi di bawah lesen yang sama.",
            "District photos from Wikimedia Commons, used under their licences. We resized and cropped them for the web; the changed versions are shared under the same licences.")}
        </p>
        <ul className="small">
          {Object.entries(PHOTOS).map(([slug, p]) => (
            <li key={slug}>
              <a href={p.page}>{p.title}</a> — {p.artist}, <a href={p.licence_url}>{p.licence}</a>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
