import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import Sources from "@/components/Sources";
import { districts, getDistrict, last } from "@/lib/atlas";
import { cropName, fmt, LOCALES, t, tx, type Locale } from "@/lib/i18n";
import { getGuide, guideSlugs, isLive, kindLabel, MAX_AGE_DAYS, suggestUrl, type Experience } from "@/lib/jalan";
import { PHOTOS, photoSrc } from "@/lib/photos";

export const dynamicParams = false;

export function generateStaticParams() {
  return LOCALES.flatMap((lang) => guideSlugs.map((slug) => ({ lang, slug })));
}

export async function generateMetadata({ params }: PageProps<"/[lang]/jalan/[slug]">): Promise<Metadata> {
  const { lang: l, slug } = await params;
  const lang = l as Locale;
  const d = getDistrict(slug);
  if (!d) return {};
  return {
    title: tx(lang, `Jalan-jalan di ${d.name}`, `Exploring ${d.name}`),
    description: tx(lang,
      `Tempat dan pengalaman di ${d.name} yang dikongsi oleh orang tempatan: cara ke sana, kos, waktu terbaik dan siapa yang boleh dihubungi.`,
      `Places and experiences in ${d.name} shared by locals: how to get there, what it costs, when to go and who to contact.`),
  };
}

const date = (lang: Locale, iso: string) =>
  new Date(iso).toLocaleDateString(lang === "ms" ? "ms-MY" : "en-MY", { day: "numeric", month: "long", year: "numeric" });

function ExperienceCard({ lang, e }: { lang: Locale; e: Experience }) {
  const rows: [string, string][] = [
    [tx(lang, "Waktu terbaik", "Best time"), e.best_time[lang]],
    [tx(lang, "Cara ke sana", "Getting there"), e.getting_there[lang]],
    [tx(lang, "Kos", "Cost"), e.cost[lang]],
  ];
  return (
    <article className="jl-card" id={e.id}>
      <p className="jl-kind">{kindLabel[e.kind][lang]}</p>
      <h3>{e.name}</h3>
      <p>{e.what[lang]}</p>
      <dl className="jl-facts">
        {rows.map(([k, v]) => (
          <div key={k}><dt>{k}</dt><dd>{v}</dd></div>
        ))}
      </dl>
      {e.guide_required && (
        <p className="callout small">
          {tx(lang,
            "Pergi bersama pemandu tempatan. Kami sengaja tidak menyiarkan lokasi tepat tempat ini demi keselamatan anda dan untuk menjaga tempat itu.",
            "Go with a local guide. We deliberately don't publish the exact location, for your safety and to protect the place.")}
        </p>
      )}
      {e.contact?.consent && (
        <p className="jl-contact">
          <strong>{e.contact.name}</strong> · {e.contact.role[lang]}
          {e.contact.whatsapp && (
            <> · <a href={`https://wa.me/${e.contact.whatsapp}`} target="_blank" rel="noopener noreferrer">WhatsApp</a></>
          )}
        </p>
      )}
      {e.map && !e.guide_required && (
        <p className="small">
          <a href={`https://www.google.com/maps/search/?api=1&query=${e.map.lat},${e.map.lng}`} target="_blank" rel="noopener noreferrer">
            {tx(lang, "Buka dalam peta", "Open in maps")} →
          </a>
        </p>
      )}
      <p className="jl-by">
        {tx(lang, "Dikongsi oleh", "Shared by")} {e.shared_by.name}, {e.shared_by.about[lang]} · {tx(lang, "disemak", "checked")} {date(lang, e.checked)}
      </p>
    </article>
  );
}

export default async function JalanPage({ params }: PageProps<"/[lang]/jalan/[slug]">) {
  const { lang: l, slug } = await params;
  const lang = l as Locale;
  const d = getDistrict(slug);
  const guide = getGuide(slug);
  if (!d || !guide) notFound();
  const tr = t(lang);

  const live = guide.experiences.filter(isLive);
  const pov = last(d.living.poverty);
  const povRank = [...districts].sort((a, b) => last(b.living.poverty).value - last(a.living.poverty).value).findIndex((x) => x.slug === slug) + 1;
  const crop = (key: string) => d.crops_2017.find((c) => c.crop === key);
  const rankMs = povRank === 1 ? "tertinggi" : `ke-${povRank} tertinggi`;
  const rankEn = povRank === 1 ? "the highest" : `#${povRank} highest`;
  const photo = photoSrc(slug);
  const credit = PHOTOS[slug];

  return (
    <div className="wrap">
      <nav className="crumbs">
        <Link href={`/${lang}/`}>{tr.siteName}</Link> / <Link href={`/${lang}/daerah/${slug}/`}>{d.name}</Link> / {tx(lang, "Jalan-jalan", "Exploring")}
      </nav>

      <header className={`jl-hero${photo ? " has-photo" : ""}`}>
        {photo && <div className="jl-photo" style={{ backgroundImage: `url(${photo})` }} role="img" aria-label={credit.title} />}
        <div className="jl-hero-text">
          <p className="jl-pilot">{tx(lang, "Rintis", "Pilot")} · {d.name}</p>
          <h1>{tx(lang, `Jalan-jalan di ${d.name}, ikut cadangan orang ${d.name}`, `${d.name}, the way locals would show you`)}</h1>
          <p className="jl-lede">
            {tx(lang,
              "Tempat dan pengalaman yang dikongsi oleh orang tempatan, dengan maklumat yang jarang ada dalam video: cara ke sana, kos, waktu terbaik, dan siapa yang boleh dihubungi.",
              "Places and experiences shared by locals, with what the videos usually leave out: how to get there, what it costs, when to go, and who to contact.")}
          </p>
        </div>
        {photo && <a className="sl-credit" href={credit.page} target="_blank" rel="noopener noreferrer">{credit.artist} · {credit.licence}</a>}
      </header>

      <section className="jl-why">
        <h2>{tx(lang, `Kenapa bermula di ${d.name}?`, `Why start in ${d.name}?`)}</h2>
        <p>
          {tx(lang,
            `Kemiskinan mutlak di ${d.name} ialah ${fmt(lang, pov.value, 1)}% (${pov.year}), ${rankMs} antara ${districts.length} daerah di Kedah. Apabila anda menggunakan khidmat pemandu, homestay dan kedai milik orang tempatan, wang anda terus sampai kepada penduduk ${d.name}.`,
            `Absolute poverty in ${d.name} is ${fmt(lang, pov.value, 1)}% (${pov.year}), ${rankEn} of Kedah's ${districts.length} districts. When you use local guides, homestays and shops, your money goes straight to people who live here.`)}{" "}
          {slug === "baling" && <Link href={`/${lang}/cerita/baling/`}>{tx(lang, "Baca cerita Baling", "Read the Baling story")} →</Link>}
        </p>
      </section>

      {live.length > 0 && (
        <section aria-labelledby="jl-list">
          <h2 id="jl-list">{tx(lang, "Dikongsi oleh orang tempatan", "Shared by locals")}</h2>
          <div className="jl-grid">
            {live.map((e) => <ExperienceCard key={e.id} lang={lang} e={e} />)}
          </div>
        </section>
      )}

      <section aria-labelledby="jl-wish">
        <h2 id="jl-wish">{live.length ? tx(lang, "Kami masih mencari", "Still looking for") : tx(lang, "Kami sedang mengumpul", "We're collecting")}</h2>
        <p className="secondary">
          {tx(lang,
            `Kenal tempat ini? Anda orang ${d.name}, atau ada saudara-mara di sini? Beritahu kami, dan kami akan menghubungi anda sebelum menyiarkan apa-apa.`,
            `Know one of these? Are you from ${d.name}, or do you have family here? Tell us, and we'll get in touch before we publish anything.`)}
        </p>
        <div className="jl-grid">
          {guide.wishlist.map((w) => {
            const crops = (w.crops ?? []).map(crop).filter((c) => c !== undefined);
            return (
              <div key={w.id} className="jl-card jl-wish">
                <p className="jl-kind">{kindLabel[w.kind][lang]}</p>
                <h3>{w.title[lang]}</h3>
                <p className="secondary">{w.ask[lang]}</p>
                {crops.length > 0 && (
                  <p className="jl-data small">
                    {tx(lang, `Keluasan bertanam di ${d.name}: `, `Planted area in ${d.name}: `)}
                    {crops.map((c) => `${cropName(lang, c.crop).toLowerCase()} ${fmt(lang, c.hectares, 0)} ha`).join(", ")}
                    {tx(lang, " (Jabatan Pertanian, 2017).", " (Department of Agriculture, 2017).")}
                  </p>
                )}
                <a className="sl-btn" href={suggestUrl(d.name, w.title.ms)} target="_blank" rel="noopener noreferrer">
                  {tx(lang, "Saya tahu tempat ini", "I know this place")} →
                </a>
              </div>
            );
          })}
        </div>
        <p>
          <a className="sl-btn primary" href={suggestUrl(d.name)} target="_blank" rel="noopener noreferrer">
            {tx(lang, "Cadangkan tempat lain", "Suggest another place")}
          </a>
        </p>
      </section>

      <section className="prose narrow" aria-labelledby="jl-rules">
        <h2 id="jl-rules">{tx(lang, "Cara senarai ini disusun", "How this list works")}</h2>
        <ul>
          <li>{tx(lang, "Setiap cadangan datang daripada orang tempatan yang dinamakan.", "Every tip comes from a named local.")}</li>
          <li>{tx(lang,
            `Setiap tempat menunjukkan tarikh terakhir disemak. Tempat yang tidak disemak semula dalam tempoh ${fmt(lang, MAX_AGE_DAYS / 30.4, 0)} bulan akan diturunkan.`,
            `Every place shows when it was last checked. Anything not rechecked within ${fmt(lang, MAX_AGE_DAYS / 30.4, 0)} months comes down.`)}</li>
          <li>{tx(lang, "Kos dinyatakan dengan jelas, sama ada percuma atau berbayar.", "Costs are stated plainly, free or paid.")}</li>
          <li>{tx(lang, "Tiada tajaan dan tiada ulasan berbayar.", "No sponsorships and no paid reviews.")}</li>
          <li>{tx(lang,
            "Bagi gua, air terjun dan denai hutan, kami menyenaraikan pemandu tempatan, bukan lokasi tepat.",
            "For caves, waterfalls and jungle trails we list a local guide, not an exact location.")}</li>
          <li>{tx(lang,
            "Butiran untuk menghubungi seseorang hanya disiarkan dengan izinnya.",
            "Contact details are published only with the person's permission.")}</li>
        </ul>
        <Sources lang={lang} ids={["hh_poverty_district", "crops_district_area"]} />
      </section>
    </div>
  );
}
