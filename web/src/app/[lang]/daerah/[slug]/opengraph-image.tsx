import { districts, getDistrict, last } from "@/lib/atlas";
import { LOCALES, rm, tx, typeInfo, type Locale } from "@/lib/i18n";
import { OG_SIZE, ogCard } from "@/lib/og";

export const size = OG_SIZE;
export const contentType = "image/png";
export const alt = "KedahKu";

export function generateStaticParams() {
  return LOCALES.flatMap((lang) => districts.map((d) => ({ lang, slug: d.slug })));
}

export default async function Image({ params }: { params: Promise<{ lang: string; slug: string }> }) {
  const { lang: l, slug } = await params;
  const lang = l as Locale;
  const d = getDistrict(slug)!;
  const inc = last(d.living.income_median);
  return ogCard({
    kicker: `${tx(lang, "Daerah", "District")} · ${typeInfo[d.type].label[lang]}`,
    title: d.name,
    stat: rm(lang, inc.value),
    statLabel: tx(lang, `Pendapatan penengah isi rumah sebulan, ${inc.year}`, `Median monthly household income, ${inc.year}`),
    highlight: d.name,
  });
}
