import Link from "next/link";
import { t, type Locale } from "@/lib/i18n";
import { DisplayControls } from "./DisplayControls";
import { LanguageSwitcher } from "./LanguageSwitcher";
import { Roundel } from "./Roundel";

export function Wordmark({ locale, inverse = false }: { locale: Locale; inverse?: boolean }) {
  const d = t(locale);
  return (
    <Link href={`/${locale}`} className="flex items-center gap-3">
      <Roundel className="size-11 shrink-0 drop-shadow-sm" />
      <span className={`display font-display text-lg leading-[1.05] font-extrabold sm:text-xl ${inverse ? "text-white" : "text-navy-900"}`}>
        {d.siteName}
      </span>
    </Link>
  );
}

const SearchIcon = () => (
  <svg viewBox="0 0 20 20" className="size-5" aria-hidden fill="none" stroke="currentColor" strokeWidth="2">
    <circle cx="8.5" cy="8.5" r="5.5" />
    <path d="m13 13 4 4" />
  </svg>
);

export function SiteHeader({ locale }: { locale: Locale }) {
  const d = t(locale);
  const nav = [
    ["about", "/about"],
    ["news", "/news"],
    ["fleet", "/fleet"],
    ["bases", "/bases"],
    ["tenders", "/tenders"],
    ["events", "/events"],
  ] as const;

  return (
    <>
      <a
        href="#main"
        className="sr-only focus:not-sr-only focus:fixed focus:top-2 focus:left-2 focus:z-[60] focus:rounded focus:bg-gold-500 focus:px-3 focus:py-2 focus:text-navy-950"
      >
        {d.skip}
      </a>

      <div className="bg-navy-900 text-[13px] text-navy-100">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-4 py-1.5 sm:px-6">
          <p className="hidden items-center gap-2 sm:flex">
            <Roundel className="size-3.5" />
            {d.officialSite}
          </p>
          <div className="flex w-full items-center justify-between gap-3 sm:w-auto">
            <LanguageSwitcher current={locale} />
            <DisplayControls labels={d.a11y} />
          </div>
        </div>
      </div>

      <header className="sticky top-0 z-40 border-b border-line bg-white/95 backdrop-blur supports-[backdrop-filter]:bg-white/85 dark:bg-navy-950/95">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-6 px-4 py-3 sm:px-6">
          <Wordmark locale={locale} />

          <nav aria-label="Main" className="hidden xl:block">
            <ul className="flex items-center text-[15px] font-medium">
              {nav.map(([key, href]) => (
                <li key={key}>
                  <Link
                    href={`/${locale}${href}`}
                    className="relative block px-3 py-2 text-ink hover:text-navy-600 after:absolute after:inset-x-3 after:-bottom-[13px] after:h-[3px] after:scale-x-0 after:rounded-full after:bg-navy-600 after:transition-transform hover:after:scale-x-100"
                  >
                    {d.nav[key]}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>

          <div className="flex items-center gap-2">
            <Link
              href={`/${locale}/search`}
              className="rounded-full p-2.5 text-ink hover:bg-navy-50 hover:text-navy-600"
              aria-label={d.nav.search}
            >
              <SearchIcon />
            </Link>
            <Link
              href={`/${locale}/about/careers`}
              className="hidden rounded-full bg-navy-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-navy-700 sm:inline-block"
            >
              {d.join}
            </Link>

            {/* Mobile menu: native disclosure, works without JavaScript. */}
            <details className="relative xl:hidden">
              <summary className="flex size-10 cursor-pointer list-none items-center justify-center rounded-full border border-line text-ink hover:bg-navy-50 [&::-webkit-details-marker]:hidden">
                <svg viewBox="0 0 20 20" className="size-5" aria-hidden fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M3 6h14M3 10h14M3 14h14" />
                </svg>
                <span className="sr-only">Menu</span>
              </summary>
              <nav aria-label="Main" className="absolute right-0 z-50 mt-3 w-64 rounded-xl border border-line bg-white p-2 shadow-xl dark:bg-navy-900">
                <ul>
                  {nav.map(([key, href]) => (
                    <li key={key}>
                      <Link href={`/${locale}${href}`} className="block rounded-lg px-3 py-2.5 font-medium text-ink hover:bg-navy-50 hover:text-navy-600">
                        {d.nav[key]}
                      </Link>
                    </li>
                  ))}
                  <li className="mt-1 border-t border-line pt-2">
                    <Link href={`/${locale}/about/careers`} className="block rounded-lg bg-navy-600 px-3 py-2.5 text-center font-semibold text-white hover:bg-navy-700">
                      {d.join}
                    </Link>
                  </li>
                </ul>
              </nav>
            </details>
          </div>
        </div>
      </header>
    </>
  );
}
