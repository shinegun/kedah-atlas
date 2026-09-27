import type { Metadata } from "next";
import { Inter, Instrument_Serif } from "next/font/google";
import { notFound } from "next/navigation";
import "../globals.css";
import Link from "next/link";
import SiteHeader from "@/components/SiteHeader";
import { atlas } from "@/lib/atlas";
import { hasLocale, LOCALES, t } from "@/lib/i18n";

const sans = Inter({ subsets: ["latin"], variable: "--font-sans", display: "swap" });
const serif = Instrument_Serif({ subsets: ["latin"], weight: "400", style: ["normal", "italic"], variable: "--font-serif", display: "swap" });

export const dynamicParams = false;

export function generateStaticParams() {
  return LOCALES.map((lang) => ({ lang }));
}

export async function generateMetadata({ params }: LayoutProps<"/[lang]">): Promise<Metadata> {
  const { lang } = await params;
  if (!hasLocale(lang)) return {};
  return {
    // Share cards need absolute URLs: set SITE_URL to the public domain when deploying.
    metadataBase: new URL(process.env.SITE_URL ?? "http://localhost:3107"),
    title: { default: t(lang).siteName, template: `%s · ${t(lang).siteName}` },
    description: t(lang).tagline,
    openGraph: { siteName: t(lang).siteName, locale: lang === "ms" ? "ms_MY" : "en_MY", type: "website" },
  };
}

export default async function LangLayout({ children, params }: LayoutProps<"/[lang]">) {
  const { lang } = await params;
  if (!hasLocale(lang)) notFound();
  const d = t(lang);
  return (
    <html lang={lang} className={`${sans.variable} ${serif.variable}`}>
      <body>
        <SiteHeader lang={lang} />
        <div className="shell">
        <main>{children}</main>
        <footer className="site-footer">
          <div className="wrap">
            <p style={{ margin: 0 }}>{d.footerNote}</p>
            <p style={{ margin: 0 }}>
              {d.builtOn}: {atlas.meta.built} · {d.sources}: DOSM / OpenDOSM (CC BY 4.0) ·{" "}
              <Link href={`/${lang}/data/`}>{d.nav.data}</Link> · <Link href={`/${lang}/kaedah/`}>{d.nav.method}</Link>
            </p>
          </div>
        </footer>
        </div>
      </body>
    </html>
  );
}
