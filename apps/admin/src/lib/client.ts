"use client";

import useSWR from "swr";
import type { ContentTypeDef, Me } from "./types";

export class ApiError extends Error {
  constructor(
    message: string,
    public status: number,
    public errors: Record<string, string[]> = {},
  ) {
    super(message);
  }
}

type Init = { method?: string; body?: unknown };

/** Calls the admin API through the same-origin BFF (/api/bff/*). */
export async function api<T = unknown>(path: string, init: Init = {}): Promise<T> {
  const isForm = init.body instanceof FormData;
  const res = await fetch(`/api/bff/${path.replace(/^\//, "")}`, {
    method: init.method ?? (init.body ? "POST" : "GET"),
    headers: { Accept: "application/json", ...(init.body && !isForm ? { "Content-Type": "application/json" } : {}) },
    body: init.body ? (isForm ? (init.body as FormData) : JSON.stringify(init.body)) : undefined,
    credentials: "same-origin",
  });

  if (res.status === 204) return undefined as T;

  const data = await res.json().catch(() => ({}));

  // Full reloads on purpose: they drop every cached response from the old session.
  if (res.status === 401) {
    // eslint-disable-next-line @next/next/no-location-assign-relative-destination
    window.location.href = "/login?expired=1";
  } else if (res.status === 403 && data?.message?.includes("change your password") && window.location.pathname !== "/account/password") {
    // eslint-disable-next-line @next/next/no-location-assign-relative-destination
    window.location.href = "/account/password";
  }

  if (!res.ok) throw new ApiError(data?.message ?? `Request failed (${res.status})`, res.status, data?.errors);

  return data as T;
}

export const fetcher = <T,>(path: string) => api<T>(path);

export function useMe() {
  const { data, ...rest } = useSWR<{ user: Me; session_expires_at: string; idle_timeout_minutes: number }>(
    "auth/me",
    fetcher,
    { revalidateOnFocus: false },
  );
  return { me: data?.user, session: data, ...rest };
}

export function useContentTypes() {
  const { data, ...rest } = useSWR<{ data: ContentTypeDef[]; locales: string[] }>("content-types", fetcher, {
    revalidateOnFocus: false,
  });
  return { types: data?.data, ...rest };
}

export function can(me: Me | undefined, permission: string) {
  return !!me?.permissions.includes(permission);
}

/** ISO string → value for <input type="datetime-local"> in the browser's time zone. */
export function toLocalInput(iso?: string | null) {
  if (!iso) return "";
  const d = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export function fromLocalInput(value: string) {
  return value ? new Date(value).toISOString() : null;
}

export function formatDate(iso?: string | null, withTime = true) {
  if (!iso) return "—";
  return new Intl.DateTimeFormat("en-GB", {
    dateStyle: "medium",
    ...(withTime ? { timeStyle: "short" } : {}),
  }).format(new Date(iso));
}
