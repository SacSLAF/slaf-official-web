import { NextRequest, NextResponse } from "next/server";
import { adminApi, isSameOrigin } from "@/lib/api-server";
import { MFA_COOKIE, SESSION_COOKIE, clearCookie, getCookie, setCookie } from "@/lib/session";

const STEPS = new Set(["setup", "confirm", "verify"]);

export async function POST(req: NextRequest, ctx: RouteContext<"/api/auth/mfa/[step]">) {
  const { step } = await ctx.params;
  if (!STEPS.has(step)) return NextResponse.json({ message: "Not found" }, { status: 404 });
  if (!isSameOrigin(req)) return NextResponse.json({ message: "Forbidden" }, { status: 403 });

  const token = await getCookie(MFA_COOKIE);
  if (!token) {
    return NextResponse.json({ message: "Your sign-in attempt expired. Please start again." }, { status: 401 });
  }

  const res = await adminApi(`auth/mfa/${step}`, {
    req,
    token,
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: step === "setup" ? "{}" : await req.text(),
  });
  const data = await res.json().catch(() => ({}));

  if (!res.ok) return NextResponse.json(data, { status: res.status });

  if (step === "setup") return NextResponse.json(data);

  // MFA complete: swap the short-lived MFA token for the full session token.
  await clearCookie(MFA_COOKIE);
  await setCookie(SESSION_COOKIE, data.token, data.expires_at);

  return NextResponse.json({
    must_change_password: data.must_change_password,
    recovery_codes: data.recovery_codes ?? null,
  });
}
