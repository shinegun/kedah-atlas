import { districts, last } from "@/lib/atlas";
import { LOCALES, rm, tx, type Locale } from "@/lib/i18n";
import { OG_SIZE, ogCard } from "@/lib/og";

export const size = OG_SIZE;
export const contentType = "image/png";
export const alt = "KedahKu";

export function generateStaticParams() {
  return LOCALES.map((lang) => ({ lang }));
}

export default async function Image({ params }: { params: Promise<{ lang: string }> }) {
  const lang = (await params).lang as Locale;
  const inc = [...districts].sort((a, b) => last(a.living.income_median).value - last(b.living.income_median).value);
  const lo = last(inc[0].living.income_median);
  const hi = last(inc[inc.length - 1].living.income_median);
  return ogCard({
    kicker: tx(lang, "Atlas ekonomi · 12 daerah", "Economic atlas · 12 districts"),
    title: tx(lang, "12 daerah. Satu Kedah.", "12 districts. One Kedah."),
    stat: `${rm(lang, lo.value)} → ${rm(lang, hi.value)}`,
    statLabel: tx(lang, `Pendapatan penengah isi rumah, ${hi.year}: ${inc[0].name} hingga ${inc[inc.length - 1].name}`,
      `Median household income, ${hi.year}: ${inc[0].name} to ${inc[inc.length - 1].name}`),
  });
}
