import type { Metadata } from "next";
import Link from "next/link";
import { Container, PageTitle } from "@/components/content";
import { api, type Page } from "@/lib/api";
import { t, type Locale } from "@/lib/i18n";

export async function generateMetadata({ params }: PageProps<"/[locale]/about">): Promise<Metadata> {
  return { title: t((await params).locale as Locale).nav.about };
}

export default async function AboutIndex({ params }: PageProps<"/[locale]/about">) {
  const locale = (await params).locale as Locale;
  const d = t(locale);
  const pages = await api.list<Page>(locale, "pages", { per_page: 50 });

  return (
    <>
      <PageTitle title={d.nav.about} lead={d.heroLead} />
      <Container className="py-12">
        <ul className="grid gap-x-12 gap-y-8 md:grid-cols-2">
          {pages.data.map((p) => (
            <li key={p.slug} className="border-t-2 border-navy-600 pt-4">
              <Link href={`/${locale}/about/${p.slug}`} className="group block">
                <h2 lang={p.translated === false ? "en" : locale} className="display font-display text-2xl font-bold group-hover:text-link group-hover:underline">
                  {p.title}
                </h2>
                {p.summary && <p className="mt-2 max-w-prose text-ink-muted">{p.summary}</p>}
              </Link>
            </li>
          ))}
        </ul>
      </Container>
    </>
  );
}
