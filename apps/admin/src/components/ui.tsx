"use client";

import Link from "next/link";
import { useEffect, useRef, type ButtonHTMLAttributes, type ReactNode } from "react";
import type { Status } from "@/lib/types";

const cx = (...c: (string | false | null | undefined)[]) => c.filter(Boolean).join(" ");

type Variant = "primary" | "secondary" | "danger" | "ghost" | "success";

const variants: Record<Variant, string> = {
  primary: "bg-navy-600 text-white hover:bg-navy-700 disabled:bg-navy-300",
  secondary: "bg-surface-raised text-ink border border-line hover:bg-surface-muted",
  danger: "bg-danger text-white hover:opacity-90",
  success: "bg-ok text-white hover:opacity-90",
  ghost: "text-ink-muted hover:text-ink hover:bg-surface-muted",
};

export function Button({
  variant = "primary",
  className,
  loading,
  children,
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: Variant; loading?: boolean }) {
  return (
    <button
      {...props}
      disabled={props.disabled || loading}
      className={cx(
        "inline-flex items-center justify-center gap-2 rounded-md px-3.5 py-2 text-sm font-medium transition-colors disabled:cursor-not-allowed disabled:opacity-60",
        variants[variant],
        className,
      )}
    >
      {loading && <span className="size-3.5 animate-spin rounded-full border-2 border-current border-r-transparent" aria-hidden />}
      {children}
    </button>
  );
}

export function LinkButton({ href, children, variant = "primary" }: { href: string; children: ReactNode; variant?: Variant }) {
  return (
    <Link href={href} className={cx("inline-flex items-center gap-2 rounded-md px-3.5 py-2 text-sm font-medium", variants[variant])}>
      {children}
    </Link>
  );
}

const statusStyles: Record<Status, string> = {
  draft: "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-200",
  in_review: "bg-amber-100 text-amber-900 dark:bg-amber-900/40 dark:text-amber-200",
  rejected: "bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-200",
  published: "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-200",
  archived: "bg-zinc-200 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400",
};

export const statusLabel: Record<Status, string> = {
  draft: "Draft",
  in_review: "In review",
  rejected: "Changes requested",
  published: "Published",
  archived: "Archived",
};

export function StatusBadge({ status, scheduled }: { status: Status; scheduled?: boolean }) {
  return (
    <span className={cx("inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold whitespace-nowrap", statusStyles[status])}>
      {scheduled ? "Scheduled" : statusLabel[status]}
    </span>
  );
}

export function Card({ title, actions, children, className }: { title?: ReactNode; actions?: ReactNode; children: ReactNode; className?: string }) {
  return (
    <section className={cx("rounded-[var(--radius-card)] border border-line bg-surface-raised", className)}>
      {(title || actions) && (
        <header className="flex items-center justify-between gap-3 border-b border-line px-5 py-3">
          <h2 className="text-sm font-semibold text-ink">{title}</h2>
          {actions}
        </header>
      )}
      <div className="p-5">{children}</div>
    </section>
  );
}

export function PageHeader({ title, subtitle, actions }: { title: ReactNode; subtitle?: ReactNode; actions?: ReactNode }) {
  return (
    <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-ink">{title}</h1>
        {subtitle && <p className="mt-1 text-sm text-ink-muted">{subtitle}</p>}
      </div>
      {actions && <div className="flex flex-wrap gap-2">{actions}</div>}
    </div>
  );
}

export function Alert({ tone = "info", children }: { tone?: "info" | "error" | "success" | "warn"; children: ReactNode }) {
  const tones = {
    info: "border-navy-200 bg-navy-50 text-navy-900 dark:border-navy-700 dark:bg-navy-900/40 dark:text-navy-100",
    error: "border-red-200 bg-red-50 text-red-900 dark:border-red-800 dark:bg-red-950/50 dark:text-red-200",
    success: "border-emerald-200 bg-emerald-50 text-emerald-900 dark:border-emerald-800 dark:bg-emerald-950/50 dark:text-emerald-200",
    warn: "border-amber-200 bg-amber-50 text-amber-900 dark:border-amber-800 dark:bg-amber-950/50 dark:text-amber-200",
  };
  return (
    <div role={tone === "error" ? "alert" : "status"} className={cx("rounded-md border px-4 py-3 text-sm", tones[tone])}>
      {children}
    </div>
  );
}

export const inputClass =
  "w-full rounded-md border border-line bg-surface px-3 py-2 text-sm text-ink placeholder:text-ink-muted/70 focus:border-navy-400 focus:outline-none focus:ring-2 focus:ring-navy-200 disabled:opacity-70 dark:focus:ring-navy-700";

export function FieldShell({
  label,
  htmlFor,
  required,
  error,
  help,
  children,
}: {
  label: string;
  htmlFor?: string;
  required?: boolean;
  error?: string;
  help?: string;
  children: ReactNode;
}) {
  return (
    <div className="space-y-1.5">
      <label htmlFor={htmlFor} className="block text-sm font-medium text-ink">
        {label}
        {required && <span className="ml-0.5 text-danger" aria-hidden> *</span>}
      </label>
      {children}
      {help && !error && <p className="text-xs text-ink-muted">{help}</p>}
      {error && <p className="text-xs font-medium text-danger">{error}</p>}
    </div>
  );
}

/** Native modal <dialog>, opened/closed by the `open` prop. */
export function Modal({
  open,
  onClose,
  title,
  children,
  wide,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  children: ReactNode;
  wide?: boolean;
}) {
  const ref = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const dialog = ref.current;
    if (!dialog) return;
    if (open && !dialog.open) dialog.showModal();
    if (!open && dialog.open) dialog.close();
  }, [open]);

  return (
    <dialog
      ref={ref}
      onClose={onClose}
      className={cx(
        "m-auto w-[calc(100%-2rem)] rounded-xl border border-line bg-surface-raised p-0 text-ink shadow-2xl backdrop:bg-navy-950/60 backdrop:backdrop-blur-sm",
        wide ? "max-w-4xl" : "max-w-lg",
      )}
    >
      <div className="flex items-center justify-between border-b border-line px-5 py-3">
        <h2 className="font-semibold">{title}</h2>
        <button type="button" onClick={onClose} className="rounded p-1 text-ink-muted hover:bg-surface-muted" aria-label="Close">
          ✕
        </button>
      </div>
      <div className="max-h-[75vh] overflow-y-auto p-5">{open && children}</div>
    </dialog>
  );
}

export function Pagination({ page, lastPage, onChange }: { page: number; lastPage: number; onChange: (p: number) => void }) {
  if (lastPage <= 1) return null;
  return (
    <nav className="mt-4 flex items-center justify-end gap-2 text-sm" aria-label="Pagination">
      <Button variant="secondary" disabled={page <= 1} onClick={() => onChange(page - 1)}>
        Previous
      </Button>
      <span className="text-ink-muted">
        Page {page} of {lastPage}
      </span>
      <Button variant="secondary" disabled={page >= lastPage} onClick={() => onChange(page + 1)}>
        Next
      </Button>
    </nav>
  );
}

export function Empty({ children }: { children: ReactNode }) {
  return <p className="py-10 text-center text-sm text-ink-muted">{children}</p>;
}

export function Spinner() {
  return (
    <div className="flex justify-center py-12" role="status" aria-label="Loading">
      <span className="size-6 animate-spin rounded-full border-2 border-navy-500 border-r-transparent" />
    </div>
  );
}

export { cx };
