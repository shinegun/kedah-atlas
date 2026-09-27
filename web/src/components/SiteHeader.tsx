"use client";

// Site navigation: a calm left sidebar on desktop (icons + labels), a compact
// top bar with a scrolling row of links on phones. Same markup, CSS decides.
// On desktop the sidebar can shrink to an icon rail (remembered per browser),
// and on the home page it stays out of the way until the opening spread has played.

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useSyncExternalStore } from "react";
import { t, tx, type Locale } from "@/lib/i18n";
import { RAIL_KEY } from "@/lib/sidebar";

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

function subscribeRail(onChange: () => void) {
  const mo = new MutationObserver(onChange);
  mo.observe(document.documentElement, { attributes: true, attributeFilter: ["data-sidebar"] });
  return () => mo.disconnect();
}

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
  const isHome = path === `/${lang}/`;

  // Icon rail: <html data-sidebar="rail"> is the source of truth (set before first
  // paint by RAIL_SCRIPT in the layout); the button flips it and remembers the choice.
  const rail = useSyncExternalStore(subscribeRail, () => document.documentElement.dataset.sidebar === "rail", () => false);
  const toggleRail = () => {
    const next = !rail;
    if (next) document.documentElement.dataset.sidebar = "rail";
    else delete document.documentElement.dataset.sidebar;
    try {
      localStorage.setItem(RAIL_KEY, next ? "1" : "0");
    } catch {}
  };

  // Home intro: on desktop the sidebar is hidden while the opening spread fills the
  // screen, then fades in as the spread scrolls away (--sb-in: 0 → 1, read by CSS).
  useEffect(() => {
    const root = document.documentElement;
    const el = isHome ? document.getElementById("intro") : null;
    if (!el) return;
    const read = () => {
      const h = window.innerHeight;
      const v = Math.min(1, Math.max(0, (h - el.getBoundingClientRect().bottom) / (h * 0.45)));
      root.style.setProperty("--sb-in", v.toFixed(3));
      root.toggleAttribute("data-intro", v < 0.5);
    };
    read();
    window.addEventListener("scroll", read, { passive: true });
    window.addEventListener("resize", read);
    return () => {
      window.removeEventListener("scroll", read);
      window.removeEventListener("resize", read);
      root.style.removeProperty("--sb-in");
      root.removeAttribute("data-intro");
    };
  }, [isHome]);

  const railLabel = rail ? tx(lang, "Besarkan menu", "Expand menu") : tx(lang, "Kecilkan menu", "Collapse menu");

  return (
    <header className={`site-header${isHome ? " home-intro" : ""}`}>
      <div className="sb-inner">
        <Link href={`/${lang}/`} className="brand">
          <span className="brand-mark" aria-hidden="true" />
          {d.siteName}
        </Link>
        <nav className="nav" aria-label={lang === "ms" ? "Navigasi utama" : "Main navigation"}>
          {items.map(([seg, icon, label]) => {
            const href = `/${lang}/${seg}`;
            return (
              <Link key={seg} href={href} aria-current={isCurrent(href) ? "page" : undefined} title={rail ? label : undefined}>
                <svg className="nav-icon" viewBox="0 0 24 24" aria-hidden="true">{ICON[icon]}</svg>
                <span>{label}</span>
              </Link>
            );
          })}
        </nav>
        <div className="sb-foot">
          <Link href={swapped} className="lang" hrefLang={other} lang={other} title={rail ? d.langSwitch : undefined}>
            <span className="lang-long">{d.langSwitch}</span>
            <span className="lang-short" aria-hidden="true">{other === "en" ? "EN" : "BM"}</span>
          </Link>
          <p className="sb-note">{lang === "ms" ? "Data terbuka DOSM · setiap angka ada sumbernya" : "DOSM open data · every number sourced"}</p>
          <button type="button" className="sb-toggle" onClick={toggleRail} aria-pressed={rail} title={railLabel}>
            <svg className="nav-icon" viewBox="0 0 24 24" aria-hidden="true">
              <rect x="3" y="4" width="18" height="16" rx="2" />
              <path d="M9 4v16" />
              <path d={rail ? "m13 10 2 2-2 2" : "m15 10-2 2 2 2"} />
            </svg>
            <span>{railLabel}</span>
          </button>
        </div>
      </div>
    </header>
  );
}
