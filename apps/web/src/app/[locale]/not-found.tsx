import Link from "next/link";
import { Container } from "@/components/content";

/** Rendered inside the locale layout; the locale isn't passed here, so links go to the root redirect. */
export default function NotFound() {
  return (
    <Container className="max-w-2xl py-24">
      <p className="display font-display text-6xl font-extrabold text-navy-300">404</p>
      <h1 className="display font-display mt-4 text-2xl font-bold">We couldn&apos;t find that page.</h1>
      <p className="mt-2 text-ink-muted">It may have been moved or withdrawn.</p>
      <Link href="/" className="mt-6 inline-block font-semibold text-link hover:underline">
        Go to the home page
      </Link>
    </Container>
  );
}
