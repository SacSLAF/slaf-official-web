"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState, type ReactNode } from "react";
import { can, useContentTypes, useMe } from "@/lib/client";
import { Insignia } from "./Insignia";
import { Spinner, cx } from "./ui";

type NavItem = { href: string; label: string; show: boolean };

export function Shell({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const { me, isLoading } = useMe();
  const { types } = useContentTypes();
  const [menuOpen, setMenuOpen] = useState(false);

  if (isLoading || !me) return <Spinner />;

  const canReview = types?.some((t) => t.can_approve);

  const sections: { title: string; items: NavItem[] }[] = [
    {
      title: "Overview",
      items: [
        { href: "/", label: "Dashboard", show: true },
        { href: "/review", label: "Review queue", show: !!canReview },
      ],
    },
    {
      title: "Content",
      items: (types ?? []).map((t) => ({ href: `/content/${t.type}`, label: t.label, show: true })),
    },
    {
      title: "Assets",
      items: [{ href: "/media", label: "Media library", show: can(me, "media.manage") }],
    },
    {
      title: "Governance",
      items: [
        { href: "/users", label: "Users & roles", show: can(me, "users.manage") },
        { href: "/audit", label: "Audit trail", show: can(me, "audit.view") },
        { href: "/security", label: "Security events", show: can(me, "security.view") },
      ],
    },
  ];

  const isActive = (href: string) => (href === "/" ? pathname === "/" : pathname.startsWith(href));

  async function logout() {
    await fetch("/api/auth/logout", { method: "POST" });
    // Full reload so no cached data from this session survives sign-out.
    // eslint-disable-next-line @next/next/no-location-assign-relative-destination
    window.location.href = "/login";
  }

  return (
    <div className="flex min-h-dvh bg-surface-muted">
      <a href="#main" className="sr-only focus:not-sr-only focus:absolute focus:z-50 focus:m-2 focus:rounded focus:bg-gold-500 focus:px-3 focus:py-2 focus:text-navy-950">
        Skip to content
      </a>

      <aside
        className={cx(
          "fixed inset-y-0 left-0 z-40 w-64 shrink-0 flex-col bg-navy-900 text-navy-100 lg:static lg:flex",
          menuOpen ? "flex" : "hidden",
        )}
      >
        <div className="flex items-center gap-3 border-b border-white/10 px-5 py-4">
          <Insignia className="size-9 shrink-0" />
          <div className="leading-tight">
            <div className="text-sm font-semibold text-white">Sri Lanka Air Force</div>
            <div className="text-xs text-navy-200">Content Management</div>
          </div>
        </div>

        <nav className="flex-1 overflow-y-auto px-3 py-4" aria-label="Main">
          {sections.map((section) => {
            const items = section.items.filter((i) => i.show);
            if (!items.length) return null;
            return (
              <div key={section.title} className="mb-5">
                <div className="px-2 pb-1.5 text-[11px] font-semibold uppercase tracking-wider text-navy-300">{section.title}</div>
                <ul className="space-y-0.5">
                  {items.map((item) => (
                    <li key={item.href}>
                      <Link
                        href={item.href}
                        onClick={() => setMenuOpen(false)}
                        aria-current={isActive(item.href) ? "page" : undefined}
                        className={cx(
                          "block rounded-md px-2.5 py-1.5 text-sm transition-colors",
                          isActive(item.href)
                            ? "bg-white/10 font-medium text-white shadow-[inset_3px_0_0_var(--color-navy-300)]"
                            : "text-navy-100 hover:bg-white/5 hover:text-white",
                        )}
                      >
                        {item.label}
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
            );
          })}
        </nav>

        <div className="border-t border-white/10 px-5 py-4 text-xs text-navy-300">
          <div className="font-medium text-white">
            {me.rank ? `${me.rank} ` : ""}
            {me.name}
          </div>
          <div className="truncate">{me.roles.map((r) => r.replace(/-/g, " ")).join(", ")}</div>
          <div className="mt-3 flex gap-3">
            <Link href="/account/password" className="underline-offset-2 hover:text-white hover:underline">
              Change password
            </Link>
            <button onClick={logout} className="underline-offset-2 hover:text-white hover:underline">
              Sign out
            </button>
          </div>
        </div>
      </aside>

      {menuOpen && <div className="fixed inset-0 z-30 bg-navy-950/50 lg:hidden" onClick={() => setMenuOpen(false)} />}

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="flex items-center gap-3 border-b border-line bg-surface-raised px-4 py-3 lg:hidden">
          <button onClick={() => setMenuOpen(true)} className="rounded border border-line px-2.5 py-1 text-sm" aria-label="Open menu">
            ☰
          </button>
          <span className="text-sm font-semibold">SLAF CMS</span>
        </header>
        <main id="main" className="mx-auto w-full max-w-7xl flex-1 px-4 py-6 sm:px-8 sm:py-8">
          {me.recovery_codes_remaining > 0 && me.recovery_codes_remaining <= 2 && (
            <p className="mb-4 rounded-md border border-amber-300 bg-amber-50 px-4 py-2 text-sm text-amber-900">
              Only {me.recovery_codes_remaining} MFA recovery code(s) left. Ask a super administrator to reset your MFA to issue new ones.
            </p>
          )}
          {children}
        </main>
      </div>
    </div>
  );
}
