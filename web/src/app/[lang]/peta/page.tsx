import type { Metadata } from "next";
import DistrictMap from "@/components/DistrictMap";
import { districts, last } from "@/lib/atlas";
import { LOCALES, rm, tx, type Locale } from "@/lib/i18n";
import { mapIndicators } from "@/lib/mapIndicators";

export function generateStaticParams() {
  return LOCALES.map((lang) => ({ lang }));
}

export async function generateMetadata({ params }: PageProps<"/[lang]/peta">): Promise<Metadata> {
  const lang = (await params).lang as Locale;
  return {
    title: tx(lang, "Peta 12 daerah", "Map of the 12 districts"),
    description: tx(lang, "Peta interaktif daerah Kedah: jenis ekonomi, pendapatan, kemiskinan, pekerjaan dan migrasi.",
      "Interactive map of Kedah's districts: economy type, income, poverty, jobs and migration."),
  };
}

export default async function MapPage({ params }: PageProps<"/[lang]/peta">) {
  const lang = (await params).lang as Locale;
  const slugs = Object.fromEntries(districts.map((x) => [x.name, x.slug]));
  const byIncome = [...districts].sort((a, b) => last(a.living.income_median).value - last(b.living.income_median).value);
  const [poorest, richest] = [byIncome[0], byIncome[byIncome.length - 1]];
  const year = last(richest.living.income_median).year;
  const intro = (
    <>
      <p className="hero-kicker">{tx(lang, "Peta interaktif", "Interactive map")}</p>
      <h1 className="hero-title">{tx(lang, "Peta 12 daerah", "Map of the 12 districts")}</h1>
      <p className="hero-sub">
        {tx(lang,
          "Pilih penunjuk, tuding pada daerah, dan klik untuk mengezum. Merah lebih teruk daripada purata Kedah, biru lebih baik.",
          "Pick an indicator, point at a district, and click to zoom in. Red is worse than the Kedah average, blue is better.")}
      </p>
      <div className="hero-range">
        <div className="hero-range-v tnum">
          {rm(lang, last(poorest.living.income_median).value)} <span aria-hidden="true">→</span> {rm(lang, last(richest.living.income_median).value)}
        </div>
        <div className="muted small">
          {tx(lang, `Pendapatan penengah isi rumah sebulan, ${year}: ${poorest.name} hingga ${richest.name}`,
            `Median monthly household income, ${year}: ${poorest.name} to ${richest.name}`)}
        </div>
      </div>
    </>
  );
  return <DistrictMap lang={lang} indicators={mapIndicators(lang)} slugs={slugs} hero={intro} />;
}
