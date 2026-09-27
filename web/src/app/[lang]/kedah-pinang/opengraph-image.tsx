import { atlas, last } from "@/lib/atlas";
import { fmt, LOCALES, tx, type Locale } from "@/lib/i18n";
import { OG_SIZE, ogCard } from "@/lib/og";

export const size = OG_SIZE;
export const contentType = "image/png";
export const alt = "Kedah lawan Pulau Pinang";

export function generateStaticParams() {
  return LOCALES.map((lang) => ({ lang }));
}

export default async function Image({ params }: { params: Promise<{ lang: string }> }) {
  const lang = (await params).lang as Locale;
  const { kedah: K, penang: P } = atlas.peers;
  return ogCard({
    kicker: tx(lang, "Perbandingan utama", "Head to head"),
    title: tx(lang, "Kedah lawan Pulau Pinang", "Kedah vs Penang"),
    stat: `${fmt(lang, K.area_km2 / P.area_km2, 0)}× · ${fmt(lang, last(K.sectors.agriculture).value / last(P.sectors.agriculture).value, 1)}×`,
    statLabel: tx(lang, "Tanah dan KDNK pertanian Kedah berbanding Pulau Pinang", "Kedah's land and farm GDP against Penang's"),
  });
}
