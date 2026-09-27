import { atlas, last } from "@/lib/atlas";
import { fmt, LOCALES, tx, type Locale } from "@/lib/i18n";
import { OG_SIZE, ogCard } from "@/lib/og";

export const size = OG_SIZE;
export const contentType = "image/png";
export const alt = "Bolehkah Kedah bergerak sepantas Shenzhen?";

export function generateStaticParams() {
  return LOCALES.map((lang) => ({ lang }));
}

export default async function Image({ params }: { params: Promise<{ lang: string }> }) {
  const lang = (await params).lang as Locale;
  const { kedah, malaysia } = atlas.peers;
  const share = (last(kedah.per_capita).value / last(malaysia.per_capita).value) * 100;
  return ogCard({
    kicker: tx(lang, "Cerita data", "Data story"),
    title: tx(lang, "Bolehkah Kedah bergerak sepantas Shenzhen?", "Can Kedah move at Shenzhen's speed?"),
    stat: `${fmt(lang, share, 0)}%`,
    statLabel: tx(lang, `KDNK per kapita Kedah berbanding purata Malaysia, ${atlas.peers.period[1]}`,
      `Kedah's GDP per person against the Malaysian average, ${atlas.peers.period[1]}`),
  });
}
