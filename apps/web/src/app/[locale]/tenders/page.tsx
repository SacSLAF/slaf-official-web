import type { Metadata } from "next";
import Link from "next/link";
import { Container, PageTitle, Pager, TenderBoard } from "@/components/content";
import { api, type Tender } from "@/lib/api";
import { t, type Locale } from "@/lib/i18n";

export async function generateMetadata({ params }: PageProps<"/[locale]/tenders">): Promise<Metadata> {
  return { title: t((await params).locale as Locale).nav.tenders };
}

const STATES = ["open", "closed", "awarded", "cancelled"] as const;

export default async function TendersIndex({ params, searchParams }: PageProps<"/[locale]/tenders">) {
  const locale = (await params).locale as Locale;
  const sp = await searchParams;
  const state = STATES.includes(sp.state as (typeof STATES)[number]) ? (sp.state as string) : "open";
  const page = Math.max(1, Number(sp.page) || 1);
  const d = t(locale);
  const tenders = await api.list<Tender>(locale, "tenders", { state, page, per_page: 20 });

  return (
    <>
      <PageTitle title={d.nav.tenders} />
      <Container className="py-10">
        <nav className="mb-6 flex flex-wrap gap-2" aria-label={d.nav.tenders}>
          {STATES.map((s) => (
            <Link
              key={s}
              href={`/${locale}/tenders?state=${s}`}
              aria-current={s === state ? "page" : undefined}
              className="rounded-full border border-line px-4 py-1.5 text-sm hover:border-navy-400 aria-[current]:border-navy-600 aria-[current]:bg-navy-600 aria-[current]:text-white"
            >
              {d.state[s]}
            </Link>
          ))}
        </nav>
        <TenderBoard items={tenders.data} locale={locale} />
        <Pager page={tenders.meta.current_page} last={tenders.meta.last_page} locale={locale} href={(p) => `/${locale}/tenders?state=${state}&page=${p}`} />
      </Container>
    </>
  );
}
