import type { Metadata } from "next";
import Link from "next/link";
import DistrictCards from "@/components/DistrictCards";
import { DISTRICT_TYPES } from "@/lib/atlas";
import { tx, typeInfo, type Locale } from "@/lib/i18n";

export async function generateMetadata({ params }: PageProps<"/[lang]/daerah">): Promise<Metadata> {
  const lang = (await params).lang as Locale;
  return { title: tx(lang, "12 daerah Kedah", "Kedah's 12 districts") };
}

export default async function DistrictsIndex({ params }: PageProps<"/[lang]/daerah">) {
  const lang = (await params).lang as Locale;
  return (
    <div className="wrap home">
      <h1 className="home-hello">{tx(lang, "Dua belas daerah, ", "Twelve districts, ")}<em>{tx(lang, "dua belas cerita.", "twelve stories.")}</em></h1>
      <p className="lede secondary" style={{ maxWidth: 640 }}>
        {tx(lang,
          "Pilih daerah untuk melihat tujuh slaid ringkas: pendapatan, kemiskinan, ekonomi dan hala tujunya. Warna menunjukkan apa yang menggerakkan ekonominya.",
          "Pick a district for seven quick slides: income, poverty, the economy and where it's heading. The colour shows what drives its economy.")}
      </p>
      <ul className="dmap-legend-cats" style={{ margin: "0 0 20px" }}>
        {DISTRICT_TYPES.map((key) => (
          <li key={key}><span className="dmap-chip" style={{ background: typeInfo[key].color }} />{typeInfo[key].label[lang]}</li>
        ))}
      </ul>
      <DistrictCards lang={lang} />
      <p className="home-foot">
        <Link href={`/${lang}/peta/`}>{tx(lang, "Lihat di peta", "See them on the map")}</Link>
        {" · "}
        <Link href={`/${lang}/banding/`}>{tx(lang, "Bandingkan dua daerah", "Compare two districts")}</Link>
      </p>
    </div>
  );
}
