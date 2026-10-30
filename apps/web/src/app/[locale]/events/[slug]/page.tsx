import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Container, Cover, Prose, TranslationNotice } from "@/components/content";
import { api, type Event } from "@/lib/api";
import { formatDate, formatTime, t, type Locale } from "@/lib/i18n";

type Props = PageProps<"/[locale]/events/[slug]">;

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale, slug } = await params;
  const item = await api.show<Event>(locale as Locale, "events", slug);
  return item ? { title: item.title } : {};
}

export default async function EventPage({ params }: Props) {
  const { locale: l, slug } = await params;
  const locale = l as Locale;
  const d = t(locale);
  const item = await api.show<Event>(locale, "events", slug);
  if (!item) notFound();
  const lang = item.translated === false ? "en" : locale;

  return (
    <article>
      <Container className="max-w-4xl py-12">
        <TranslationNotice translated={item.translated} locale={locale} />
        <h1 lang={lang} className="display font-display text-3xl font-extrabold sm:text-5xl">
          {item.title}
        </h1>
        <dl className="mt-6 flex flex-wrap gap-x-10 gap-y-3 border-l-4 border-navy-500 pl-5">
          <div>
            <dt className="text-sm text-ink-muted">{formatDate(item.starts_at, locale)}</dt>
            <dd className="font-semibold">{formatTime(item.starts_at, locale)}{item.ends_at && `–${formatTime(item.ends_at, locale)}`}</dd>
          </div>
          {item.venue && (
            <div>
              <dt className="text-sm text-ink-muted">{d.venue}</dt>
              <dd className="font-semibold">{item.venue}</dd>
            </div>
          )}
        </dl>
        {item.summary && <p className="mt-6 text-lg text-ink-muted">{item.summary}</p>}
        {item.image_id && <Cover image={item.image_id} alt={item.title} className="mt-8 aspect-[16/9]" />}
        <div className="mt-8">
          <Prose html={item.body} lang={lang} />
        </div>
      </Container>
    </article>
  );
}
