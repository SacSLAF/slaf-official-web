import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Container, Cover, Prose, TranslationNotice } from "@/components/content";
import { api, type News } from "@/lib/api";
import { formatDate, type Locale } from "@/lib/i18n";

type Props = PageProps<"/[locale]/news/[slug]">;

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale, slug } = await params;
  const item = await api.show<News>(locale as Locale, "news", slug);
  return item ? { title: item.title, description: item.summary ?? undefined } : {};
}

export default async function NewsArticle({ params }: Props) {
  const { locale: l, slug } = await params;
  const locale = l as Locale;
  const item = await api.show<News>(locale, "news", slug);
  if (!item) notFound();
  const lang = item.translated === false ? "en" : locale;

  return (
    <article>
      <Container className="max-w-4xl pt-12">
        <TranslationNotice translated={item.translated} locale={locale} />
        <p className="text-sm text-ink-muted">
          <time dateTime={item.published_at ?? undefined}>{formatDate(item.published_at, locale)}</time>
        </p>
        <h1 lang={lang} className="display font-display mt-2 text-3xl leading-tight font-extrabold text-ink sm:text-5xl">
          {item.title}
        </h1>
        {item.summary && (
          <p lang={lang} className="mt-5 max-w-2xl text-xl leading-relaxed text-ink-muted">
            {item.summary}
          </p>
        )}
      </Container>
      {item.image_id && (
        <Container className="mt-10 max-w-5xl">
          <Cover image={item.image_id} alt={item.title} priority className="aspect-[16/9]" />
        </Container>
      )}
      <Container className="mt-10 max-w-4xl">
        <Prose html={item.body} lang={lang} />
      </Container>
    </article>
  );
}
