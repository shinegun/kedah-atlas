"use client";

// Site navigation: a calm left sidebar on desktop (icons + labels), a compact
// top bar with a scrolling row of links on phones. Same markup, CSS decides.

import Link from "next/link";
import { usePathname } from "next/navigation";
import { t, type Locale } from "@/lib/i18n";

const ICON: Record<string, React.ReactNode> = {
  home: <path d="M3 10.5 12 3l9 7.5V20a1 1 0 0 1-1 1h-5v-6H9v6H4a1 1 0 0 1-1-1z" />,
  districts: <><rect x="3" y="3" width="7" height="7" rx="1.5" /><rect x="14" y="3" width="7" height="7" rx="1.5" /><rect x="3" y="14" width="7" height="7" rx="1.5" /><rect x="14" y="14" width="7" height="7" rx="1.5" /></>,
  map: <><path d="M9 4 3 6v14l6-2 6 2 6-2V4l-6 2z" /><path d="M9 4v14M15 6v14" /></>,
  forecast: <><path d="M3 17l5-5 4 3 8-8" /><path d="M15 7h5v5" /></>,
  compare: <><path d="M12 3v18" /><path d="M5 7h5l-2.5 6h-5zM14 7h5l2.5 6h-5z" /></>,
  story: <><path d="M4 5a2 2 0 0 1 2-2h13v16H6a2 2 0 0 0-2 2z" /><path d="M4 19V5M8 7h7" /></>,
  method: <><circle cx="12" cy="12" r="9" /><path d="M12 11v6M12 7.5v.5" /></>,
  data: <><ellipse cx="12" cy="6" rx="8" ry="3" /><path d="M4 6v6c0 1.7 3.6 3 8 3s8-1.3 8-3V6M4 12v6c0 1.7 3.6 3 8 3s8-1.3 8-3v-6" /></>,
};

export default function SiteHeader({ lang }: { lang: Locale }) {
  const path = usePathname() ?? `/${lang}/`;
  const d = t(lang);
  const other: Locale = lang === "ms" ? "en" : "ms";
  const swapped = path.replace(/^\/(ms|en)(?=\/|$)/, `/${other}`);
  const items = [
    ["", "home", d.nav.home],
    ["daerah/", "districts", d.nav.districts],
    ["peta/", "map", d.nav.map],
    ["unjuran/", "forecast", d.nav.forecast],
    ["banding/", "compare", d.nav.compare],
    ["cerita/", "story", d.nav.story],
    ["kaedah/", "method", d.nav.method],
    ["data/", "data", d.nav.data],
  ] as const;
  const isCurrent = (href: string) => (href === `/${lang}/` ? path === href : path.startsWith(href));

  return (
    <header className="site-header">
      <div className="sb-inner">
        <Link href={`/${lang}/`} className="brand">
          <span className="brand-mark" aria-hidden="true" />
          {d.siteName}
        </Link>
        <nav className="nav" aria-label={lang === "ms" ? "Navigasi utama" : "Main navigation"}>
          {items.map(([seg, icon, label]) => {
            const href = `/${lang}/${seg}`;
            return (
              <Link key={seg} href={href} aria-current={isCurrent(href) ? "page" : undefined}>
                <svg className="nav-icon" viewBox="0 0 24 24" aria-hidden="true">{ICON[icon]}</svg>
                <span>{label}</span>
              </Link>
            );
          })}
        </nav>
        <div className="sb-foot">
          <Link href={swapped} className="lang" hrefLang={other} lang={other}>
            {d.langSwitch}
          </Link>
          <p className="sb-note">{lang === "ms" ? "Data terbuka DOSM · setiap angka ada sumbernya" : "DOSM open data · every number sourced"}</p>
        </div>
      </div>
    </header>
  );
}
