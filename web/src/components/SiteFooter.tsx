// Site footer: who made this and on what terms, then the whole site map in four
// columns, then the data vintage and licence line. Server component.

import Link from "next/link";
import { atlas, districts } from "@/lib/atlas";
import { t, tx, type Locale } from "@/lib/i18n";
import { STORIES, storyHref } from "@/lib/stories";

const REPO = "https://github.com/shinegun/kedah-atlas";

export default function SiteFooter({ lang }: { lang: Locale }) {
  const d = t(lang);
  const L = (seg: string) => `/${lang}/${seg}`;

  const columns: { title: string; links: { href: string; label: string; external?: boolean }[] }[] = [
    {
      title: tx(lang, "Terokai", "Explore"),
      links: [
        { href: L("daerah/"), label: tx(lang, `${districts.length} daerah`, `${districts.length} districts`) },
        { href: L("peta/"), label: d.nav.map },
        { href: L("banding/"), label: d.nav.compare },
        { href: L("unjuran/"), label: d.nav.forecast },
      ],
    },
    {
      title: tx(lang, "Cerita", "Stories"),
      links: STORIES.map((s) => ({ href: storyHref(lang, s), label: s.title[lang] })),
    },
    {
      title: tx(lang, "Data dan kaedah", "Data and method"),
      links: [
        { href: L("kedah/"), label: tx(lang, "Kedah dalam angka", "Kedah in numbers") },
        { href: L("data/"), label: tx(lang, "Muat turun data", "Download the data") },
        { href: L("kaedah/"), label: tx(lang, "Cara angka dihasilkan", "How the numbers are made") },
      ],
    },
    {
      title: tx(lang, "Projek", "Project"),
      links: [
        { href: L("tentang/"), label: tx(lang, "Tentang", "About") },
        { href: L("pelabur/"), label: tx(lang, "Untuk pelabur", "For investors") },
        { href: REPO, label: tx(lang, "Kod sumber (GitHub)", "Source code (GitHub)"), external: true },
        { href: `${REPO}/issues/new`, label: tx(lang, "Laporkan kesilapan", "Report an error"), external: true },
        { href: "https://open.dosm.gov.my/", label: "OpenDOSM", external: true },
        { href: "https://sabah-ku.com/", label: tx(lang, "Diilhamkan oleh SabahKu", "Inspired by SabahKu"), external: true },
      ],
    },
  ];

  return (
    <footer className="site-footer">
      <div className="wrap">
        <div className="sf-top">
          <div className="sf-about">
            <Link href={L("")} className="brand">
              <span className="brand-mark" aria-hidden="true" />
              {d.siteName}
            </Link>
            <p className="sf-tagline">{d.tagline}</p>
            <p className="sf-note">{d.footerNote}</p>
          </div>
          <nav className="sf-cols" aria-label={tx(lang, "Peta laman", "Site map")}>
            {columns.map((c) => (
              <div key={c.title}>
                <h2 className="sf-h">{c.title}</h2>
                <ul>
                  {c.links.map((l) => (
                    <li key={l.href}>
                      {l.external ? (
                        <a href={l.href} target="_blank" rel="noopener noreferrer">
                          {l.label} <span aria-hidden="true">↗</span>
                        </a>
                      ) : (
                        <Link href={l.href}>{l.label}</Link>
                      )}
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </nav>
        </div>
        <div className="sf-bottom">
          <p>
            {d.builtOn}: {atlas.meta.built} · {d.sources}: {tx(lang, "Jabatan Perangkaan Malaysia (DOSM)", "Department of Statistics Malaysia (DOSM)")} ·{" "}
            <a href="https://creativecommons.org/licenses/by/4.0/" target="_blank" rel="noopener noreferrer">CC BY 4.0</a>
          </p>
        </div>
      </div>
    </footer>
  );
}
