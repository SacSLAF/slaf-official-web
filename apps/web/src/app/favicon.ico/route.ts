/**
 * Browsers request /favicon.ico on their own. Without this route the request
 * falls into the [locale] segment and triggers API calls for locale "favicon.ico".
 * The Location is relative so it stays correct behind Docker and proxies.
 */
export function GET() {
  return new Response(null, { status: 308, headers: { Location: "/icon.svg" } });
}
