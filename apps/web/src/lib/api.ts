import "server-only";
import type { Locale } from "./i18n";

const API = process.env.API_INTERNAL_URL ?? "http://127.0.0.1:8000";

/** Pages are regenerated at most every 5 minutes, and immediately when the CMS publishes. */
const REVALIDATE = 300;

export type Image = { id: number; url: string; width: number; height: number; alt: string | null } | null;

type Base = { id: number; type: string; slug: string; published_at: string | null; updated_at: string | null; translated?: boolean };

export type News = Base & { title: string; summary: string | null; body?: string | null; category: string; image_id: Image; is_featured: boolean };
export type Event = Base & { title: string; summary: string | null; body?: string | null; venue: string | null; starts_at: string; ends_at: string | null; image_id: Image };
export type Tender = Base & {
  title: string;
  summary: string | null;
  body?: string | null;
  reference_no: string;
  category: string;
  procurement_method?: string | null;
  opens_at: string | null;
  closes_at: string;
  tender_state: string;
  state: string;
  bid_security_lkr?: number | null;
  documents?: { id: number; title: string; file_name: string; mime_type: string; size: number; sha256: string; download_url: string }[];
};
export type AirBase = Base & {
  name: string;
  summary: string | null;
  body?: string | null;
  base_type: string;
  province: string | null;
  latitude?: number | null;
  longitude?: number | null;
  established_year?: number | null;
  image_id: Image;
};
export type Aircraft = Base & {
  name: string;
  summary: string | null;
  body?: string | null;
  role: string;
  manufacturer: string | null;
  origin_country?: string | null;
  inducted_year?: number | null;
  image_id: Image;
};
export type Page = Base & { title: string; summary: string | null; body?: string | null; section: string; image_id: Image };

export type Paginated<T> = { data: T[]; meta: { current_page: number; last_page: number; total: number } };

export type Home = { featured: News[]; news: News[]; events: Event[]; tenders: Tender[]; stats: { open_tenders: number } };

async function get<T>(path: string, tags: string[]): Promise<T | null> {
  const res = await fetch(`${API}/api/v1/${path}`, {
    headers: { Accept: "application/json" },
    next: { revalidate: REVALIDATE, tags },
  });
  if (res.status === 404) return null;
  if (!res.ok) throw new Error(`API ${res.status} for ${path}`);
  return res.json();
}

const qs = (params: Record<string, string | number | undefined>) => {
  const p = new URLSearchParams(Object.entries(params).filter(([, v]) => v !== undefined && v !== "") as [string, string][]);
  return p.size ? `?${p}` : "";
};

export const api = {
  home: (l: Locale) => get<{ data: Home }>(`${l}/home`, ["home"]).then((r) => r!.data),
  list: <T>(l: Locale, type: string, params: Record<string, string | number | undefined> = {}) =>
    get<Paginated<T>>(`${l}/${type}${qs(params)}`, [type]).then((r) => r!),
  show: <T>(l: Locale, type: string, slug: string) => get<{ data: T }>(`${l}/${type}/${encodeURIComponent(slug)}`, [type]).then((r) => r?.data ?? null),
  /** Search is per-query and short-lived, so it bypasses the page cache. */
  search: async (l: Locale, q: string) => {
    const res = await fetch(`${API}/api/v1/${l}/search${qs({ q })}`, { headers: { Accept: "application/json" }, cache: "no-store" });
    if (!res.ok) return { data: [] as (News | Tender | AirBase | Aircraft | Event | Page)[], meta: { total: 0 } };
    return res.json() as Promise<{ data: (News & AirBase & Tender)[]; meta: { total: number } }>;
  },
};

/** Tender documents are served by the API directly to the browser. */
export const publicApiOrigin = process.env.NEXT_PUBLIC_API_ORIGIN ?? "http://localhost:8000";
