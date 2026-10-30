import "server-only";
import type { NextRequest } from "next/server";

const API = process.env.API_INTERNAL_URL ?? "http://127.0.0.1:8000";

/** Forward the browser's IP and UA so the API's audit and security logs record the real client. */
export function clientHeaders(req: NextRequest): Record<string, string> {
  const forwarded = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim();
  return {
    "X-Forwarded-For": forwarded || req.headers.get("x-real-ip") || "127.0.0.1",
    "User-Agent": req.headers.get("user-agent") ?? "slaf-admin",
  };
}

export function adminApi(path: string, init: RequestInit & { token?: string; req: NextRequest }) {
  const { token, req, headers, ...rest } = init;
  return fetch(`${API}/api/admin/${path.replace(/^\//, "")}`, {
    ...rest,
    cache: "no-store",
    headers: {
      Accept: "application/json",
      ...clientHeaders(req),
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...headers,
    },
  });
}

/**
 * CSRF defence for cookie-authenticated route handlers: on top of
 * SameSite=Strict cookies, state-changing requests must come from our own origin.
 */
export function isSameOrigin(req: NextRequest): boolean {
  if (["GET", "HEAD", "OPTIONS"].includes(req.method)) return true;
  const origin = req.headers.get("origin");
  const host = req.headers.get("x-forwarded-host") ?? req.headers.get("host");
  if (!origin || !host) return false;
  try {
    return new URL(origin).host === host;
  } catch {
    return false;
  }
}
