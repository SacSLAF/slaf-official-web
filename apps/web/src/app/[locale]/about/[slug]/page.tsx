import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Container, Cover, PageTitle, Prose, TranslationNotice } from "@/components/content";
import { api, type Page } from "@/lib/api";
import type { Locale } from "@/lib/i18n";

type Props = PageProps<"/[locale]/about/[slug]">;

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale, slug } = await params;
  const item = await api.show<Page>(locale as Locale, "pages", slug);
  return item ? { title: item.title, description: item.summary ?? undefined } : {};
}

export default async function AboutPage({ params }: Props) {
  const { locale: l, slug } = await params;
  const locale = l as Locale;
  const item = await api.show<Page>(locale, "pages", slug);
  if (!item) notFound();
  const lang = item.translated === false ? "en" : locale;

  return (
    <article>
      <PageTitle title={item.title} lead={item.summary} lang={lang} />
      <Container className="max-w-4xl py-12">
        <TranslationNotice translated={item.translated} locale={locale} />
        {item.image_id && <Cover image={item.image_id} alt={item.title} className="mb-8 aspect-[16/9]" />}
        <Prose html={item.body} lang={lang} />
      </Container>
    </article>
  );
}
