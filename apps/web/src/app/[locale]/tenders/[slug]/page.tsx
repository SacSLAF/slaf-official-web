import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Container, Prose, TranslationNotice } from "@/components/content";
import { api, type Tender } from "@/lib/api";
import { formatDate, formatNumber, t, type Locale } from "@/lib/i18n";

type Props = PageProps<"/[locale]/tenders/[slug]">;

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale, slug } = await params;
  const item = await api.show<Tender>(locale as Locale, "tenders", slug);
  return item ? { title: `${item.reference_no} — ${item.title}` } : {};
}

const METHODS: Record<string, string> = {
  ncb: "National Competitive Bidding",
  icb: "International Competitive Bidding",
  shopping: "Shopping",
  direct: "Direct contracting",
};

const size = (b: number) => (b > 1048576 ? `${(b / 1048576).toFixed(1)} MB` : `${Math.ceil(b / 1024)} KB`);

export default async function TenderNotice({ params }: Props) {
  const { locale: l, slug } = await params;
  const locale = l as Locale;
  const d = t(locale);
  const item = await api.show<Tender>(locale, "tenders", slug);
  if (!item) notFound();
  const lang = item.translated === false ? "en" : locale;

  const facts: [string, string][] = [
    [d.reference, item.reference_no],
    [d.closes, formatDate(item.closes_at, locale, true)],
    ...(item.procurement_method ? ([[d.method, METHODS[item.procurement_method] ?? item.procurement_method]] as [string, string][]) : []),
    ...(item.bid_security_lkr ? ([[d.bidSecurity, `LKR ${formatNumber(item.bid_security_lkr, locale)}`]] as [string, string][]) : []),
  ];

  return (
    <article>
      <Container className="grid gap-12 py-12 lg:grid-cols-[1fr_22rem]">
        <div className="min-w-0">
          <TranslationNotice translated={item.translated} locale={locale} />
          <p className="font-mono text-sm text-ink-muted">{item.reference_no}</p>
          <h1 lang={lang} className="display font-display mt-2 text-3xl leading-tight font-extrabold text-ink sm:text-4xl">
            {item.title}
          </h1>
          {item.summary && (
            <p lang={lang} className="mt-4 text-lg text-ink-muted">
              {item.summary}
            </p>
          )}
          <div className="mt-8">
            <Prose html={item.body} lang={lang} />
          </div>

          <section className="mt-12">
            <h2 className="display font-display mb-4 text-xl font-bold">{d.biddingDocuments}</h2>
            {!item.documents?.length ? (
              <p className="text-ink-muted">{d.noDocuments}</p>
            ) : (
              <ul className="divide-y divide-line border-y border-line">
                {item.documents.map((doc) => (
                  <li key={doc.id} className="flex flex-wrap items-center justify-between gap-4 py-4">
                    <div className="min-w-0">
                      <p className="font-semibold">{doc.title}</p>
                      <p className="text-sm text-ink-muted">
                        {doc.file_name}, {size(doc.size)}
                      </p>
                      <p className="mt-1 font-mono text-[11px] break-all text-ink-muted" title={d.checksum}>
                        {d.checksum}: {doc.sha256}
                      </p>
                    </div>
                    <a href={doc.download_url} download className="rounded-full bg-navy-600 px-5 py-2 text-sm font-semibold text-white hover:bg-navy-700">
                      {d.download}
                    </a>
                  </li>
                ))}
              </ul>
            )}
          </section>
        </div>

        <aside className="lg:pt-8">
          <dl className="rounded-2xl border border-line bg-surface-muted p-6">
            <div className="mb-4">
              <dt className="sr-only">State</dt>
              <dd className={`display font-display text-2xl font-bold ${item.state === "open" ? "text-ok" : "text-ink-muted"}`}>
                {d.state[item.state] ?? item.state}
              </dd>
            </div>
            {facts.map(([k, v]) => (
              <div key={k} className="border-t border-line py-2.5">
                <dt className="text-xs text-ink-muted">{k}</dt>
                <dd className="font-medium">{v}</dd>
              </div>
            ))}
          </dl>
        </aside>
      </Container>
    </article>
  );
}
