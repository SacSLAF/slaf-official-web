import type { Metadata } from "next";
import Link from "next/link";
import { Container, Cover, PageTitle } from "@/components/content";
import { api, type Aircraft } from "@/lib/api";
import { t, type Locale } from "@/lib/i18n";

export async function generateMetadata({ params }: PageProps<"/[locale]/fleet">): Promise<Metadata> {
  return { title: t((await params).locale as Locale).theFleet };
}

const ROLE_ORDER = ["fighter", "transport", "helicopter", "surveillance", "trainer", "uav"];
const ROLE_LABEL: Record<string, string> = {
  fighter: "Fighter / ground attack",
  transport: "Transport",
  helicopter: "Helicopters",
  trainer: "Trainers",
  surveillance: "Surveillance",
  uav: "Unmanned aircraft",
};

export default async function FleetIndex({ params }: PageProps<"/[locale]/fleet">) {
  const locale = (await params).locale as Locale;
  const d = t(locale);
  const fleet = await api.list<Aircraft>(locale, "aircraft", { per_page: 50 });
  const roles = ROLE_ORDER.filter((r) => fleet.data.some((a) => a.role === r));

  return (
    <>
      <PageTitle title={d.theFleet} />
      <Container className="space-y-14 py-12">
        {roles.map((role) => (
          <section key={role}>
            <h2 className="display font-display mb-5 border-b border-line pb-3 text-xl font-bold">{ROLE_LABEL[role]}</h2>
            <ul className="grid gap-x-8 gap-y-10 sm:grid-cols-2 lg:grid-cols-3">
              {fleet.data
                .filter((a) => a.role === role)
                .map((a) => (
                  <li key={a.slug}>
                    <Link href={`/${locale}/fleet/${a.slug}`} className="group block">
                      <Cover image={a.image_id} alt={a.name} className="aspect-[3/2]" />
                      <h3 className="display font-display mt-3 text-lg font-bold group-hover:text-link group-hover:underline">{a.name}</h3>
                      {a.summary && <p className="mt-1 text-sm text-ink-muted">{a.summary}</p>}
                    </Link>
                  </li>
                ))}
            </ul>
          </section>
        ))}
      </Container>
    </>
  );
}
