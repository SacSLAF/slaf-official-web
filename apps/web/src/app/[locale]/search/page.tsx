import type { Metadata } from "next";
import Link from "next/link";
import { Container } from "@/components/content";
import { api } from "@/lib/api";
import { t, type Locale } from "@/lib/i18n";

export async function generateMetadata({ params }: PageProps<"/[locale]/search">): Promise<Metadata> {
  return { title: t((await params).locale as Locale).nav.search, robots: { index: false } };
}

const PATH: Record<string, string> = { news: "news", tenders: "tenders", bases: "bases", aircraft: "fleet", events: "events", pages: "about" };

export default async function SearchPage({ params, searchParams }: PageProps<"/[locale]/search">) {
  const locale = (await params).locale as Locale;
  const raw = (await searchParams).q;
  const q = (Array.isArray(raw) ? raw[0] : raw)?.trim().slice(0, 100) ?? "";
  const d = t(locale);
  const results = q.length >= 2 ? await api.search(locale, q) : null;

  return (
    <Container className="max-w-3xl py-12">
      <h1 className="display font-display text-3xl font-extrabold">{d.nav.search}</h1>
      <form action={`/${locale}/search`} role="search" className="mt-6 flex gap-2">
        <label htmlFor="q" className="sr-only">
          {d.nav.search}
        </label>
        <input
          id="q"
          name="q"
          type="search"
          defaultValue={q}
          minLength={2}
          maxLength={100}
          placeholder={d.searchPlaceholder}
          className="w-full rounded-full border border-line bg-surface-raised px-5 py-3 text-base focus:border-navy-500 focus:outline-none"
        />
        <button type="submit" className="rounded-full bg-navy-600 px-6 font-semibold text-white hover:bg-navy-700">
          {d.nav.search}
        </button>
      </form>

      {results && (
        <section className="mt-10" aria-live="polite">
          <p className="mb-4 text-sm text-ink-muted">{d.searchResults(results.meta.total, q)}</p>
          {results.data.length === 0 ? (
            <p>{d.noResults}</p>
          ) : (
            <ul className="divide-y divide-line border-y border-line">
              {results.data.map((r) => {
                const item = r as unknown as { type: string; slug: string; title?: string; name?: string; summary?: string | null; translated?: boolean };
                return (
                  <li key={`${item.type}-${item.slug}`}>
                    <Link href={`/${locale}/${PATH[item.type]}/${item.slug}`} className="group block py-4">
                      <p className="text-xs text-ink-muted">{d.types[item.type]}</p>
                      <h2 lang={item.translated === false ? "en" : locale} className="font-semibold text-ink group-hover:text-link group-hover:underline">
                        {item.title ?? item.name}
                      </h2>
                      {item.summary && <p className="mt-1 line-clamp-2 text-sm text-ink-muted">{item.summary}</p>}
                    </Link>
                  </li>
                );
              })}
            </ul>
          )}
        </section>
      )}
    </Container>
  );
}
