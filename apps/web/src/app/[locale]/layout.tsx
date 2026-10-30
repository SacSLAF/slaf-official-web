import type { Metadata } from "next";
import { Archivo, Noto_Sans, Noto_Sans_Sinhala, Noto_Sans_Tamil } from "next/font/google";
import { notFound } from "next/navigation";
import { SiteFooter } from "@/components/SiteFooter";
import { SiteHeader } from "@/components/SiteHeader";
import { isLocale, locales, t } from "@/lib/i18n";
import "../globals.css";

const archivo = Archivo({ variable: "--font-archivo", subsets: ["latin"], axes: ["wdth"] });
const body = Noto_Sans({ variable: "--font-body", subsets: ["latin"] });
const sinhala = Noto_Sans_Sinhala({ variable: "--font-sinhala", subsets: ["sinhala"], weight: ["400", "600", "700"] });
const tamil = Noto_Sans_Tamil({ variable: "--font-tamil", subsets: ["tamil"], weight: ["400", "600", "700"] });

// No build-time prerendering: pages render on first request and are then cached (ISR),
// so builds never depend on the API being reachable.

export async function generateMetadata({ params }: LayoutProps<"/[locale]">): Promise<Metadata> {
  const { locale } = await params;
  if (!isLocale(locale)) return {};
  const d = t(locale);
  return {
    metadataBase: new URL(process.env.SITE_URL ?? "http://localhost:3000"),
    title: { default: `${d.siteName} — ${d.tagline}`, template: `%s | ${d.siteName}` },
    description: d.heroLead,
    alternates: { languages: Object.fromEntries(locales.map((l) => [l, `/${l}`])) },
  };
}

export default async function LocaleLayout({ children, params }: LayoutProps<"/[locale]">) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();

  return (
    <html lang={locale} className={`${archivo.variable} ${body.variable} ${sinhala.variable} ${tamil.variable}`}>
      <body className="flex min-h-dvh flex-col bg-surface text-ink antialiased">
        <SiteHeader locale={locale} />
        <main id="main" className="flex-1">
          {children}
        </main>
        <SiteFooter locale={locale} />
      </body>
    </html>
  );
}
