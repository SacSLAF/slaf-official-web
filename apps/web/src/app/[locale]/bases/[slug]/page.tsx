import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Container, Cover, Prose, TranslationNotice } from "@/components/content";
import { IslandChart } from "@/components/IslandChart";
import { api, type AirBase } from "@/lib/api";
import { t, type Locale } from "@/lib/i18n";

type Props = PageProps<"/[locale]/bases/[slug]">;

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale, slug } = await params;
  const item = await api.show<AirBase>(locale as Locale, "bases", slug);
  return item ? { title: item.name } : {};
}

export default async function BasePage({ params }: Props) {
  const { locale: l, slug } = await params;
  const locale = l as Locale;
  const d = t(locale);
  const [item, all] = await Promise.all([api.show<AirBase>(locale, "bases", slug), api.list<AirBase>(locale, "bases", { per_page: 50 })]);
  if (!item) notFound();
  const lang = item.translated === false ? "en" : locale;

  return (
    <article>
      <Container className="grid gap-12 py-12 md:grid-cols-[1fr_18rem]">
        <div className="min-w-0">
          <TranslationNotice translated={item.translated} locale={locale} />
          <h1 lang={lang} className="display font-display text-3xl leading-tight font-extrabold sm:text-5xl">
            {item.name}
          </h1>
          {item.summary && (
            <p lang={lang} className="mt-4 max-w-2xl text-lg text-ink-muted">
              {item.summary}
            </p>
          )}
          {item.image_id && <Cover image={item.image_id} alt={item.name} className="mt-8 aspect-[16/9]" />}
          <div className="mt-8">
            <Prose html={item.body} lang={lang} />
          </div>
        </div>
        <aside className="space-y-6">
          <div className="hero-sky rounded-2xl p-3">
            <div className="aspect-[285/440]">
              <IslandChart bases={all.data} locale={locale} highlight={item.slug} />
            </div>
          </div>
          <dl className="text-sm">
            {item.province && (
              <div className="border-t border-line py-2">
                <dt className="text-ink-muted">{d.province}</dt>
                <dd className="font-medium capitalize">{item.province.replace("_", " ")}</dd>
              </div>
            )}
            {item.established_year && (
              <div className="border-t border-line py-2">
                <dt className="text-ink-muted">{d.established}</dt>
                <dd className="font-medium">{item.established_year}</dd>
              </div>
            )}
          </dl>
        </aside>
      </Container>
    </article>
  );
}
