import Link from "next/link";
import type { ReactNode } from "react";
import { Container, EventList, NewsLead, SectionHeading, TenderBoard } from "@/components/content";
import { IslandChart } from "@/components/IslandChart";
import { Roundel } from "@/components/Roundel";
import { api, type AirBase, type Aircraft } from "@/lib/api";
import { t, type Locale } from "@/lib/i18n";

const icon = (path: ReactNode) => (
  <svg viewBox="0 0 24 24" className="size-6" aria-hidden fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    {path}
  </svg>
);

const ICONS = {
  join: icon(<path d="M12 3 4 7v5c0 4.5 3.4 8.3 8 9 4.6-.7 8-4.5 8-9V7l-8-4Zm-3 9 2 2 4-4" />),
  tenders: icon(<path d="M7 3h7l5 5v13H7zM14 3v5h5M10 13h6M10 17h6" />),
  bases: icon(<path d="M12 21s-7-6.2-7-11.5A7 7 0 0 1 19 9.5C19 14.8 12 21 12 21Zm0-9a2.5 2.5 0 1 0 0-5 2.5 2.5 0 0 0 0 5Z" />),
  events: icon(<path d="M5 5h14v15H5zM5 9h14M9 3v4M15 3v4" />),
};

const ROLE_LABEL: Record<string, string> = {
  fighter: "Fighter",
  transport: "Transport",
  helicopter: "Helicopter",
  trainer: "Trainer",
  surveillance: "Surveillance",
  uav: "Unmanned",
};

export default async function HomePage({ params }: PageProps<"/[locale]">) {
  const locale = (await params).locale as Locale;
  const d = t(locale);
  const [home, bases, fleet] = await Promise.all([
    api.home(locale),
    api.list<AirBase>(locale, "bases", { per_page: 50 }),
    api.list<Aircraft>(locale, "aircraft", { per_page: 20 }),
  ]);

  const news = [...home.featured, ...home.news.filter((n) => !home.featured.some((f) => f.slug === n.slug))];

  const services = [
    ["join", "/about/careers"],
    ["tenders", "/tenders"],
    ["bases", "/bases"],
    ["events", "/events"],
  ] as const;

  return (
    <>
      {/* Hero */}
      <section className="hero-sky relative overflow-hidden text-white">
        <Container className="relative grid items-center gap-10 pt-14 pb-32 md:grid-cols-[1.2fr_1fr] md:pt-20 md:pb-40">
          <div>
            <h1 className="display font-display text-[2.75rem] leading-[0.95] font-extrabold uppercase sm:text-7xl lg:text-[5.5rem]">{d.tagline}</h1>
            <p className="mt-6 max-w-lg text-lg leading-relaxed text-navy-50/90">{d.heroLead}</p>
            <div className="mt-9 flex flex-wrap gap-3">
              <Link href={`/${locale}/about/careers`} className="rounded-full bg-white px-6 py-3 font-semibold text-navy-700 shadow-sm hover:bg-navy-50">
                {d.join}
              </Link>
              <Link
                href={`/${locale}/tenders`}
                className="inline-flex items-center gap-2 rounded-full border border-white/40 px-6 py-3 font-semibold text-white hover:border-white hover:bg-white/10"
              >
                {d.viewTenders}
                {home.stats.open_tenders > 0 && (
                  <span className="rounded-full bg-white/20 px-2 py-0.5 text-sm tabular-nums">{home.stats.open_tenders}</span>
                )}
              </Link>
            </div>
          </div>

          <figure className="mx-auto w-full max-w-[15rem] sm:max-w-[20rem]">
            <div className="aspect-[285/440]">
              <IslandChart bases={bases.data} locale={locale} />
            </div>
            <figcaption className="mt-2 text-center text-sm text-navy-100">
              <Link href={`/${locale}/bases`} className="hover:text-white hover:underline">
                {d.mapCaption(bases.meta.total)}
              </Link>
            </figcaption>
          </figure>
        </Container>
      </section>

      {/* Quick services, overlapping the hero edge */}
      <Container className="relative -mt-20">
        <h2 className="sr-only">{d.servicesTitle}</h2>
        <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {services.map(([key, href]) => (
            <li key={key}>
              <Link
                href={`/${locale}${href}`}
                className="group flex h-full flex-col rounded-2xl border border-line bg-white p-6 shadow-[0_10px_30px_-12px_rgba(13,53,112,0.25)] transition-colors hover:border-navy-300 dark:bg-navy-900"
              >
                <span className="flex size-11 items-center justify-center rounded-full bg-navy-50 text-navy-600 group-hover:bg-navy-600 group-hover:text-white">
                  {ICONS[key]}
                </span>
                <span className="mt-4 font-semibold text-ink">{d.services[key][0]}</span>
                <span className="mt-1 text-sm text-ink-muted">{d.services[key][1]}</span>
              </Link>
            </li>
          ))}
        </ul>
      </Container>

      {/* Mission */}
      <section className="py-20">
        <Container className="max-w-3xl text-center">
          <Roundel className="mx-auto size-16" />
          <p className="mt-6 text-xl leading-relaxed text-ink sm:text-2xl">{d.mission}</p>
          <Link href={`/${locale}/about`} className="mt-6 inline-block font-semibold text-navy-600 hover:underline">
            {d.aboutUs}
          </Link>
        </Container>
      </section>

      {/* News */}
      <Container className="pb-20">
        <SectionHeading title={d.latestNews} href={`/${locale}/news`} linkLabel={d.allNews} />
        <NewsLead items={news} locale={locale} />
      </Container>

      {/* Tenders + events */}
      <section className="bg-surface-muted py-20">
        <Container className="grid gap-14 lg:grid-cols-[1.5fr_1fr]">
          <div>
            <SectionHeading title={d.openTenders} href={`/${locale}/tenders`} linkLabel={d.allTenders} />
            <TenderBoard items={home.tenders} locale={locale} />
          </div>
          <div>
            <SectionHeading title={d.upcomingEvents} href={`/${locale}/events`} linkLabel={d.allEvents} />
            <EventList items={home.events} locale={locale} />
          </div>
        </Container>
      </section>

      {/* Fleet */}
      <Container className="pt-20">
        <SectionHeading title={d.theFleet} href={`/${locale}/fleet`} linkLabel={d.nav.fleet} />
        <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
          {fleet.data.map((a) => (
            <li key={a.slug}>
              <Link
                href={`/${locale}/fleet/${a.slug}`}
                className="group block rounded-xl border border-line px-5 py-4 hover:border-navy-300 hover:bg-navy-50/60"
              >
                <span className="block text-xs text-navy-600">{ROLE_LABEL[a.role] ?? a.role}</span>
                <span className="display font-display mt-1 block text-lg font-bold text-ink group-hover:text-navy-700">{a.name}</span>
              </Link>
            </li>
          ))}
        </ul>
      </Container>
    </>
  );
}
