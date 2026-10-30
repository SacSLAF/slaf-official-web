import { NextRequest, NextResponse } from "next/server";
import { adminApi, isSameOrigin } from "@/lib/api-server";
import { SESSION_COOKIE, clearCookie, getCookie } from "@/lib/session";

export async function POST(req: NextRequest) {
  if (!isSameOrigin(req)) return NextResponse.json({ message: "Forbidden" }, { status: 403 });

  const token = await getCookie(SESSION_COOKIE);
  if (token) await adminApi("auth/logout", { req, token, method: "POST" }).catch(() => null);
  await clearCookie(SESSION_COOKIE);

  return NextResponse.json({ ok: true });
}
