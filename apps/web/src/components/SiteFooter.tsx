import Link from "next/link";
import { t, type Locale } from "@/lib/i18n";
import { Wordmark } from "./SiteHeader";

export function SiteFooter({ locale }: { locale: Locale }) {
  const d = t(locale);
  const columns: [string, [string, string][]][] = [
    [
      d.nav.about,
      [
        [d.aboutUs, "/about"],
        [d.nav.fleet, "/fleet"],
        [d.nav.bases, "/bases"],
      ],
    ],
    [
      d.footer.links,
      [
        [d.nav.news, "/news"],
        [d.nav.events, "/events"],
        [d.nav.tenders, "/tenders"],
        [d.join, "/about/careers"],
      ],
    ],
  ];

  return (
    <footer className="mt-24 bg-navy-950 text-navy-200">
      <div className="h-1 bg-gradient-to-r from-navy-600 via-navy-400 to-navy-600" aria-hidden />
      <div className="mx-auto grid max-w-7xl gap-12 px-4 py-14 sm:px-6 md:grid-cols-[1.5fr_1fr_1fr]">
        <div>
          <Wordmark locale={locale} inverse />
          <p className="mt-5 max-w-sm text-sm leading-relaxed">{d.mission}</p>
          <address className="mt-5 text-sm not-italic text-navy-300">{d.footer.contact}</address>
        </div>
        {columns.map(([title, links]) => (
          <nav key={title} aria-label={title}>
            <h2 className="text-sm font-semibold text-white">{title}</h2>
            <ul className="mt-4 space-y-2.5 text-sm">
              {links.map(([label, href]) => (
                <li key={href}>
                  <Link href={`/${locale}${href}`} className="hover:text-white hover:underline">
                    {label}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>
        ))}
      </div>
      <div className="border-t border-white/10">
        <p className="mx-auto max-w-7xl px-4 py-5 text-xs text-navy-300 sm:px-6">
          © {new Date().getFullYear()} {d.footer.rights}
        </p>
      </div>
    </footer>
  );
}
