import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Container, Cover, Prose, TranslationNotice } from "@/components/content";
import { api, type Aircraft } from "@/lib/api";
import { t, type Locale } from "@/lib/i18n";

type Props = PageProps<"/[locale]/fleet/[slug]">;

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale, slug } = await params;
  const item = await api.show<Aircraft>(locale as Locale, "aircraft", slug);
  return item ? { title: item.name } : {};
}

export default async function AircraftPage({ params }: Props) {
  const { locale: l, slug } = await params;
  const locale = l as Locale;
  const d = t(locale);
  const item = await api.show<Aircraft>(locale, "aircraft", slug);
  if (!item) notFound();
  const lang = item.translated === false ? "en" : locale;

  const facts = [
    [d.manufacturer, item.manufacturer],
    [d.origin, item.origin_country],
    [d.inducted, item.inducted_year?.toString()],
  ].filter(([, v]) => v) as [string, string][];

  return (
    <article>
      <Container className="pt-12">
        <TranslationNotice translated={item.translated} locale={locale} />
        <h1 lang={lang} className="display font-display text-4xl font-extrabold sm:text-6xl">
          {item.name}
        </h1>
        {item.summary && (
          <p lang={lang} className="mt-4 max-w-2xl text-lg text-ink-muted">
            {item.summary}
          </p>
        )}
      </Container>
      <Container className="mt-10 grid gap-12 md:grid-cols-[1fr_18rem]">
        <div className="min-w-0">
          {item.image_id && <Cover image={item.image_id} alt={item.name} priority className="mb-8 aspect-[16/9]" />}
          <Prose html={item.body} lang={lang} />
        </div>
        {facts.length > 0 && (
          <dl className="self-start border-l-4 border-navy-500 pl-5 text-sm">
            {facts.map(([k, v]) => (
              <div key={k} className="py-2">
                <dt className="text-ink-muted">{k}</dt>
                <dd className="font-semibold">{v}</dd>
              </div>
            ))}
          </dl>
        )}
      </Container>
    </article>
  );
}
