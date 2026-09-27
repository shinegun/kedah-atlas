import type { Metadata } from "next";
import Link from "next/link";
import { STORIES, storyHref } from "@/lib/stories";
import { LOCALES, t, tx, type Locale } from "@/lib/i18n";

export function generateStaticParams() {
  return LOCALES.map((lang) => ({ lang }));
}

export async function generateMetadata({ params }: PageProps<"/[lang]/cerita">): Promise<Metadata> {
  const lang = (await params).lang as Locale;
  return { title: tx(lang, "Cerita data", "Data stories") };
}

export default async function Stories({ params }: PageProps<"/[lang]/cerita">) {
  const lang = (await params).lang as Locale;
  const tr = t(lang);
  return (
    <div className="wrap">
      <nav className="crumbs">
        <Link href={`/${lang}/`}>{tr.siteName}</Link> / {tr.nav.story}
      </nav>
      <h1>{tx(lang, "Cerita data", "Data stories")}</h1>
      <p className="lede secondary">
        {tx(lang,
          "Setiap cerita menjawab satu soalan tentang ekonomi Kedah menggunakan data terbuka, dengan sumber bagi setiap angka.",
          "Each story answers one question about Kedah's economy with open data, with a source for every number.")}
      </p>
      <div className="story-list">
        {STORIES.map((s) => (
          <Link key={s.slug} href={storyHref(lang, s)} className="card story-card">
            <span className="muted small">{s.kicker[lang]}</span>
            <strong>{s.title[lang]}</strong>
            <span className="secondary">{s.blurb[lang]}</span>
            <span className="story-more">{tx(lang, "Baca cerita →", "Read the story →")}</span>
          </Link>
        ))}
      </div>
    </div>
  );
}
