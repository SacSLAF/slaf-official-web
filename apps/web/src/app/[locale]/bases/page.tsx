import type { Metadata } from "next";
import Link from "next/link";
import { Container, PageTitle } from "@/components/content";
import { IslandChart } from "@/components/IslandChart";
import { api, type AirBase } from "@/lib/api";
import { t, type Locale } from "@/lib/i18n";

export async function generateMetadata({ params }: PageProps<"/[locale]/bases">): Promise<Metadata> {
  return { title: t((await params).locale as Locale).nav.bases };
}

export default async function BasesIndex({ params }: PageProps<"/[locale]/bases">) {
  const locale = (await params).locale as Locale;
  const d = t(locale);
  const bases = await api.list<AirBase>(locale, "bases", { per_page: 50 });

  return (
    <>
      <PageTitle title={d.nav.bases} lead={d.mapCaption(bases.meta.total)} />
      <Container className="grid gap-12 py-12 md:grid-cols-[22rem_1fr]">
        <div className="hero-sky rounded-2xl p-4 md:sticky md:top-6 md:self-start">
          <div className="aspect-[285/440]">
            <IslandChart bases={bases.data} locale={locale} />
          </div>
        </div>
        <ul className="divide-y divide-line border-y border-line">
          {bases.data.map((b) => (
            <li key={b.slug}>
              <Link href={`/${locale}/bases/${b.slug}`} className="group block py-5">
                <h2 lang={b.translated === false ? "en" : locale} className="display font-display text-xl font-bold text-ink group-hover:text-link group-hover:underline">
                  {b.name}
                </h2>
                {b.summary && <p className="mt-1 max-w-prose text-ink-muted">{b.summary}</p>}
              </Link>
            </li>
          ))}
        </ul>
      </Container>
    </>
  );
}
