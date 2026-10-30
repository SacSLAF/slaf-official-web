import { NextRequest, NextResponse } from "next/server";
import { adminApi, isSameOrigin } from "@/lib/api-server";
import { MFA_COOKIE, SESSION_COOKIE, clearCookie, setCookie } from "@/lib/session";

export async function POST(req: NextRequest) {
  if (!isSameOrigin(req)) return NextResponse.json({ message: "Forbidden" }, { status: 403 });

  const body = await req.json().catch(() => ({}));
  const res = await adminApi("auth/login", {
    req,
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email: body.email, password: body.password }),
  });
  const data = await res.json().catch(() => ({}));

  if (!res.ok) return NextResponse.json(data, { status: res.status });

  await clearCookie(SESSION_COOKIE);
  await setCookie(MFA_COOKIE, data.token, data.expires_at);

  return NextResponse.json({ next: data.next });
}
