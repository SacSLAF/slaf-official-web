import type { Metadata } from "next";
import { Container, NewsLead, PageTitle, Pager } from "@/components/content";
import { api, type News } from "@/lib/api";
import { t, type Locale } from "@/lib/i18n";

export async function generateMetadata({ params }: PageProps<"/[locale]/news">): Promise<Metadata> {
  return { title: t((await params).locale as Locale).nav.news };
}

export default async function NewsIndex({ params, searchParams }: PageProps<"/[locale]/news">) {
  const locale = (await params).locale as Locale;
  const page = Math.max(1, Number((await searchParams).page) || 1);
  const d = t(locale);
  const news = await api.list<News>(locale, "news", { page, per_page: 13 });

  return (
    <>
      <PageTitle title={d.nav.news} />
      <Container className="py-12">
        <NewsLead items={news.data} locale={locale} />
        {news.data.length > 6 && (
          <ul className="mt-10 grid gap-x-10 gap-y-6 border-t border-line pt-8 md:grid-cols-2">
            {news.data.slice(6).map((n) => (
              <li key={n.slug}>
                <a href={`/${locale}/news/${n.slug}`} className="group block">
                  <h3 className="font-semibold text-ink group-hover:text-link group-hover:underline">{n.title}</h3>
                  {n.summary && <p className="mt-1 line-clamp-2 text-sm text-ink-muted">{n.summary}</p>}
                </a>
              </li>
            ))}
          </ul>
        )}
        <Pager page={news.meta.current_page} last={news.meta.last_page} locale={locale} href={(p) => `/${locale}/news?page=${p}`} />
      </Container>
    </>
  );
}
