import type { Metadata } from "next";
import Link from "next/link";
import { Container, EventList, PageTitle } from "@/components/content";
import { api, type Event } from "@/lib/api";
import { t, type Locale } from "@/lib/i18n";

export async function generateMetadata({ params }: PageProps<"/[locale]/events">): Promise<Metadata> {
  return { title: t((await params).locale as Locale).nav.events };
}

export default async function EventsIndex({ params, searchParams }: PageProps<"/[locale]/events">) {
  const locale = (await params).locale as Locale;
  const when = (await searchParams).when === "past" ? "past" : "upcoming";
  const d = t(locale);
  const events = await api.list<Event>(locale, "events", { when, per_page: 30 });

  return (
    <>
      <PageTitle title={d.nav.events} />
      <Container className="max-w-3xl py-10">
        <nav className="mb-8 flex gap-2">
          {(["upcoming", "past"] as const).map((w) => (
            <Link
              key={w}
              href={`/${locale}/events?when=${w}`}
              aria-current={w === when ? "page" : undefined}
              className="rounded-full border border-line px-4 py-1.5 text-sm aria-[current]:border-navy-600 aria-[current]:bg-navy-600 aria-[current]:text-white"
            >
              {d[w]}
            </Link>
          ))}
        </nav>
        <EventList items={events.data} locale={locale} />
      </Container>
    </>
  );
}
