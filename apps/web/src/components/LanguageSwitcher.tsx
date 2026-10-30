"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { localeNames, locales, type Locale } from "@/lib/i18n";

/** Switches language while staying on the same page; remembers the choice. */
export function LanguageSwitcher({ current }: { current: Locale }) {
  const pathname = usePathname();
  const rest = pathname.split("/").slice(2).join("/");

  return (
    <ul className="flex items-center gap-1" aria-label="Language">
      {locales.map((l) => (
        <li key={l}>
          <Link
            href={`/${l}${rest ? `/${rest}` : ""}`}
            hrefLang={l}
            lang={l}
            aria-current={l === current ? "true" : undefined}
            onClick={() => {
              document.cookie = `locale=${l}; path=/; max-age=31536000; samesite=lax`;
            }}
            className="rounded px-2 py-1 hover:bg-white/10 aria-[current]:bg-white/15 aria-[current]:font-semibold aria-[current]:text-white"
          >
            {localeNames[l]}
          </Link>
        </li>
      ))}
    </ul>
  );
}
