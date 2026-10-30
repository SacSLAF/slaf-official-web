import { NextRequest, NextResponse } from "next/server";
import { adminApi, isSameOrigin } from "@/lib/api-server";
import { SESSION_COOKIE, clearCookie, getCookie } from "@/lib/session";

/**
 * Backend-for-frontend proxy: browser → /api/bff/<path> → Laravel /api/admin/<path>,
 * attaching the session token from the httpOnly cookie. Auth endpoints that mint
 * tokens are deliberately not reachable through here.
 */
async function handle(req: NextRequest, ctx: RouteContext<"/api/bff/[...path]">) {
  const { path } = await ctx.params;
  const target = path.map(encodeURIComponent).join("/");

  if (target.startsWith("auth/login") || target.startsWith("auth/mfa")) {
    return NextResponse.json({ message: "Not found" }, { status: 404 });
  }
  if (!isSameOrigin(req)) return NextResponse.json({ message: "Forbidden" }, { status: 403 });

  const token = await getCookie(SESSION_COOKIE);
  if (!token) return NextResponse.json({ message: "Unauthenticated." }, { status: 401 });

  const contentType = req.headers.get("content-type");
  const hasBody = !["GET", "HEAD"].includes(req.method);

  const res = await adminApi(`${target}${req.nextUrl.search}`, {
    req,
    token,
    method: req.method,
    headers: contentType ? { "Content-Type": contentType } : {},
    body: hasBody ? await req.arrayBuffer() : undefined,
  });

  if (res.status === 401) await clearCookie(SESSION_COOKIE);

  const headers = new Headers({ "Cache-Control": "no-store" });
  for (const h of ["content-type", "content-disposition", "content-length"]) {
    const v = res.headers.get(h);
    if (v) headers.set(h, v);
  }

  return new NextResponse(res.body, { status: res.status, headers });
}

export { handle as GET, handle as POST, handle as PUT, handle as DELETE };
