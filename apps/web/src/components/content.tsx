import Image from "next/image";
import Link from "next/link";
import type { ReactNode } from "react";
import type { Event, Image as Img, News, Tender } from "@/lib/api";
import { formatDate, t, type Locale } from "@/lib/i18n";

export function Container({ children, className = "" }: { children: ReactNode; className?: string }) {
  return <div className={`mx-auto max-w-7xl px-4 sm:px-6 ${className}`}>{children}</div>;
}

export function SectionHeading({ title, href, linkLabel }: { title: string; href?: string; linkLabel?: string }) {
  return (
    <div className="relative mb-6 flex items-baseline justify-between gap-4 border-b border-line pb-3 after:absolute after:-bottom-px after:left-0 after:h-[3px] after:w-12 after:rounded-full after:bg-navy-600">
      <h2 className="display font-display text-2xl font-bold text-ink">{title}</h2>
      {href && (
        <Link href={href} className="shrink-0 rounded-full px-3 py-1 text-sm font-semibold text-navy-600 hover:bg-navy-50">
          {linkLabel}
        </Link>
      )}
    </div>
  );
}

export function PageTitle({ title, lead, lang }: { title: string; lead?: string | null; lang?: string }) {
  return (
    <div className="hero-sky text-white">
      <Container className="py-14">
        <h1 lang={lang} className="display font-display max-w-4xl text-3xl leading-tight font-extrabold sm:text-5xl">
          {title}
        </h1>
        {lead && (
          <p lang={lang} className="mt-4 max-w-2xl text-lg text-navy-50/90">
            {lead}
          </p>
        )}
      </Container>
    </div>
  );
}

/** CMS HTML — already sanitised by the API's allow-list before storage. */
export function Prose({ html, lang }: { html?: string | null; lang?: string }) {
  if (!html) return null;
  return <div lang={lang} className="prose-slaf" dangerouslySetInnerHTML={{ __html: html }} />;
}

export function TranslationNotice({ translated, locale }: { translated?: boolean; locale: Locale }) {
  if (translated !== false || locale === "en") return null;
  return (
    <p className="mb-6 rounded-md border-l-4 border-navy-500 bg-gold-300/15 px-4 py-2 text-sm text-ink">{t(locale).notTranslatedOther}</p>
  );
}

export function Cover({ image, alt, priority, className = "" }: { image: Img; alt: string; priority?: boolean; className?: string }) {
  if (!image) {
    return (
      <div className={`flex items-center justify-center bg-navy-900 ${className}`} aria-hidden>
        <svg viewBox="0 0 64 40" className="w-16 text-navy-700">
          <path d="M32 20 4 10l6 6-6 2 8 3-6 3 12 1 14-5Z M32 20 60 10l-6 6 6 2-8 3 6 3-12 1-14-5Z" fill="currentColor" />
          <circle cx="32" cy="20" r="7" fill="currentColor" />
        </svg>
      </div>
    );
  }
  return (
    <div className={`relative overflow-hidden bg-navy-900 ${className}`}>
      <Image src={image.url} alt={image.alt ?? alt} fill sizes="(min-width: 1024px) 50vw, 100vw" className="object-cover" priority={priority} />
    </div>
  );
}

const lang = (item: { translated?: boolean }, locale: Locale) => (item.translated === false ? "en" : locale);

/** Lead story plus a column of headlines — newsroom layout rather than a card grid. */
export function NewsLead({ items, locale }: { items: News[]; locale: Locale }) {
  const [lead, ...rest] = items;
  if (!lead) return <p className="text-ink-muted">{t(locale).empty}</p>;

  return (
    <div className="grid gap-8 lg:grid-cols-[1.35fr_1fr]">
      <article className="group">
        <Link href={`/${locale}/news/${lead.slug}`} className="block">
          {lead.image_id && <Cover image={lead.image_id} alt="" priority className="mb-4 aspect-[16/9] rounded-sm" />}
          <p className="text-sm text-ink-muted">{formatDate(lead.published_at, locale)}</p>
          <h3
            lang={lang(lead, locale)}
            className={`display font-display mt-1 leading-tight font-bold text-ink group-hover:underline ${lead.image_id ? "text-2xl sm:text-3xl" : "text-3xl sm:text-5xl"}`}
          >
            {lead.title}
          </h3>
          {lead.summary && (
            <p lang={lang(lead, locale)} className="mt-3 max-w-prose text-ink-muted">
              {lead.summary}
            </p>
          )}
        </Link>
      </article>

      <ul className="divide-y divide-line border-t border-line lg:border-t-0">
        {rest.slice(0, 5).map((n) => (
          <li key={n.slug}>
            <Link href={`/${locale}/news/${n.slug}`} className="group block py-4 first:pt-0">
              <p className="text-xs text-ink-muted">{formatDate(n.published_at, locale)}</p>
              <h3 lang={lang(n, locale)} className="mt-1 text-[1.05rem] leading-snug font-semibold text-ink group-hover:text-link group-hover:underline">
                {n.title}
              </h3>
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}

function daysUntil(iso: string) {
  return Math.ceil((new Date(iso).getTime() - Date.now()) / 86_400_000);
}

/** Procurement notice board: reference, title and how long bidders have left. */
export function TenderBoard({ items, locale }: { items: Tender[]; locale: Locale }) {
  const d = t(locale);
  if (!items.length) return <p className="text-ink-muted">{d.empty}</p>;

  return (
    <ul className="divide-y divide-line border-y border-line">
      {items.map((tender) => {
        const left = daysUntil(tender.closes_at);
        const open = tender.state === "open";
        return (
          <li key={tender.slug}>
            <Link href={`/${locale}/tenders/${tender.slug}`} className="group grid gap-x-6 gap-y-1 py-4 sm:grid-cols-[1fr_auto]">
              <div className="min-w-0">
                <p className="font-mono text-xs text-ink-muted">{tender.reference_no}</p>
                <h3 lang={lang(tender, locale)} className="mt-0.5 leading-snug font-semibold text-ink group-hover:text-link group-hover:underline">
                  {tender.title}
                </h3>
              </div>
              <div className="flex items-center gap-3 text-sm sm:flex-col sm:items-end sm:gap-0.5">
                <span
                  className={
                    open
                      ? left <= 7
                        ? "font-semibold text-danger"
                        : "font-semibold text-ok"
                      : "font-semibold text-ink-muted"
                  }
                >
                  {open ? d.daysLeft(left) : (d.state[tender.state] ?? tender.state)}
                </span>
                <span className="text-ink-muted">
                  {d.closes} {formatDate(tender.closes_at, locale)}
                </span>
              </div>
            </Link>
          </li>
        );
      })}
    </ul>
  );
}

export function EventList({ items, locale }: { items: Event[]; locale: Locale }) {
  if (!items.length) return <p className="text-ink-muted">{t(locale).empty}</p>;
  const tz = { timeZone: "Asia/Colombo" } as const;
  const loc = locale === "en" ? "en-GB" : `${locale}-LK`;

  return (
    <ul className="space-y-5">
      {items.map((e) => {
        const date = new Date(e.starts_at);
        return (
          <li key={e.slug}>
            <Link href={`/${locale}/events/${e.slug}`} className="group flex gap-4">
              <div className="w-14 shrink-0 border-l-4 border-navy-500 pl-3 leading-none">
                <div className="display font-display text-2xl font-bold text-ink">{date.toLocaleDateString(loc, { day: "numeric", ...tz })}</div>
                <div className="mt-1 text-xs text-ink-muted">{date.toLocaleDateString(loc, { month: "short", ...tz })}</div>
              </div>
              <div className="min-w-0">
                <h3 lang={lang(e, locale)} className="leading-snug font-semibold text-ink group-hover:text-link group-hover:underline">
                  {e.title}
                </h3>
                {e.venue && <p className="mt-0.5 text-sm text-ink-muted">{e.venue}</p>}
              </div>
            </Link>
          </li>
        );
      })}
    </ul>
  );
}

export function Pager({ page, last, href, locale }: { page: number; last: number; href: (p: number) => string; locale: Locale }) {
  if (last <= 1) return null;
  const d = t(locale);
  return (
    <nav className="mt-10 flex items-center justify-between border-t border-line pt-4 text-sm" aria-label="Pagination">
      {page > 1 ? (
        <Link href={href(page - 1)} className="font-medium text-link hover:underline" rel="prev">
          {d.previous}
        </Link>
      ) : (
        <span />
      )}
      <span className="text-ink-muted">
        {page} / {last}
      </span>
      {page < last ? (
        <Link href={href(page + 1)} className="font-medium text-link hover:underline" rel="next">
          {d.next}
        </Link>
      ) : (
        <span />
      )}
    </nav>
  );
}
