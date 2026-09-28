import type { Metadata } from "next";
import { Inter, Instrument_Serif } from "next/font/google";
import { notFound } from "next/navigation";
import "../globals.css";
import { districts } from "@/lib/atlas";
import SiteFooter from "@/components/SiteFooter";
import SiteHeader from "@/components/SiteHeader";
import SharePrompt from "@/components/SharePrompt";
import { hasLocale, LOCALES, t } from "@/lib/i18n";
import { RAIL_SCRIPT } from "@/lib/sidebar";

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
    // Share cards need absolute URLs. SITE_URL overrides the public domain (e.g. for previews).
    metadataBase: new URL(process.env.SITE_URL ?? "https://kedah-ku.com"),
    // "Atlas" left the name when it became KedahKu, so the home title says what the site is.
    title: {
      default: `${t(lang).siteName} · ${lang === "ms" ? `Atlas ekonomi ${districts.length} daerah Kedah` : `The economic atlas of Kedah's ${districts.length} districts`}`,
      template: `%s · ${t(lang).siteName}`,
    },
    description: t(lang).tagline,
    openGraph: { siteName: t(lang).siteName, locale: lang === "ms" ? "ms_MY" : "en_MY", type: "website" },
  };
}

export default async function LangLayout({ children, params }: LayoutProps<"/[lang]">) {
  const { lang } = await params;
  if (!hasLocale(lang)) notFound();
  return (
    // suppressHydrationWarning: RAIL_SCRIPT may set data-sidebar on <html> before React hydrates.
    <html lang={lang} className={`${sans.variable} ${serif.variable}`} suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: RAIL_SCRIPT }} />
      </head>
      <body>
        <SiteHeader lang={lang} />
        <div className="shell">
        <main>{children}</main>
        <SiteFooter lang={lang} />
        </div>
        <SharePrompt lang={lang} districtNames={Object.fromEntries(districts.map((d) => [d.slug, d.name]))} />
      </body>
    </html>
  );
}
