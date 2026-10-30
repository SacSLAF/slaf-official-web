import { revalidateTag } from "next/cache";
import { NextRequest, NextResponse } from "next/server";
import { timingSafeEqual } from "node:crypto";

const ALLOWED_TAGS = new Set(["home", "search", "news", "events", "tenders", "bases", "aircraft", "pages"]);

/** Called by the API when content is published, withdrawn or archived. */
export async function POST(req: NextRequest) {
  const secret = process.env.REVALIDATE_SECRET ?? "";
  const given = req.headers.get("x-revalidate-secret") ?? "";

  if (!secret || given.length !== secret.length || !timingSafeEqual(Buffer.from(given), Buffer.from(secret))) {
    return NextResponse.json({ message: "Forbidden" }, { status: 403 });
  }

  const { tags } = (await req.json().catch(() => ({}))) as { tags?: string[] };
  const valid = (tags ?? []).filter((tag) => ALLOWED_TAGS.has(tag));

  for (const tag of valid) revalidateTag(tag, { expire: 0 });

  return NextResponse.json({ revalidated: valid });
}
