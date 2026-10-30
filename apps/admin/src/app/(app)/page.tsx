"use client";

import Link from "next/link";
import { useState } from "react";
import useSWR from "swr";
import { Alert, Button, Card, PageHeader, Spinner, cx } from "@/components/ui";
import { api, fetcher, formatDate, useMe } from "@/lib/client";

type Dashboard = {
  content: { type: string; label: string; counts: Record<string, number> }[];
  security?: {
    failed_logins_24h: number;
    mfa_failures_24h: number;
    lockouts_24h: number;
    blocked_ips_24h: number;
    daily: Record<string, Record<string, number>>;
  };
  recent_activity?: { id: number; user_name: string; action: string; auditable_type: string; auditable_id: number; new_values: Record<string, string> | null; created_at: string }[];
  audit_chain?: { valid: boolean; checked: number; verified_at: string; reason: string | null } | null;
  health?: Record<string, string | number | null>;
};

const ACTION_LABEL: Record<string, string> = {
  "workflow.submit": "submitted",
  "workflow.approve": "approved",
  "workflow.reject": "requested changes on",
  "workflow.withdraw": "withdrew",
  "workflow.archive": "archived",
  "workflow.restore": "restored",
};

export default function DashboardPage() {
  const { me } = useMe();
  const { data, isLoading, mutate } = useSWR<{ data: Dashboard }>("dashboard", fetcher, { refreshInterval: 60_000 });
  const [verifying, setVerifying] = useState(false);

  if (isLoading || !data) return <Spinner />;
  const d = data.data;
  const pending = d.content.reduce((n, c) => n + (c.counts.in_review ?? 0), 0);

  return (
    <>
      <PageHeader
        title={`Welcome, ${me?.rank ? `${me.rank} ` : ""}${me?.name ?? ""}`}
        subtitle={me?.last_login_at ? `Previous sign-in ${formatDate(me.last_login_at)}` : undefined}
      />

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Stat label="Awaiting review" value={pending} href="/review" tone={pending ? "warn" : undefined} />
        {d.security && (
          <>
            <Stat label="Failed sign-ins (24h)" value={d.security.failed_logins_24h} href="/security" tone={d.security.failed_logins_24h > 10 ? "danger" : undefined} />
            <Stat label="MFA failures (24h)" value={d.security.mfa_failures_24h} href="/security" />
            <Stat label="Account lockouts (24h)" value={d.security.lockouts_24h} href="/security" tone={d.security.lockouts_24h ? "danger" : undefined} />
          </>
        )}
      </div>

      <div className="mt-6 grid gap-6 xl:grid-cols-[1.4fr_1fr]">
        <Card title="Content by status">
          <div className="-mx-5 -my-5 overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-surface-muted text-left text-xs uppercase tracking-wide text-ink-muted">
                <tr>
                  <th className="px-5 py-2.5 font-medium">Type</th>
                  <th className="px-3 py-2.5 text-right font-medium">Draft</th>
                  <th className="px-3 py-2.5 text-right font-medium">In review</th>
                  <th className="px-3 py-2.5 text-right font-medium">Changes req.</th>
                  <th className="px-5 py-2.5 text-right font-medium">Published</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line tabular-nums">
                {d.content.map((c) => (
                  <tr key={c.type}>
                    <td className="px-5 py-2.5">
                      <Link href={`/content/${c.type}`} className="font-medium hover:text-link hover:underline">
                        {c.label}
                      </Link>
                    </td>
                    <td className="px-3 py-2.5 text-right">{c.counts.draft}</td>
                    <td className={cx("px-3 py-2.5 text-right", c.counts.in_review > 0 && "font-semibold text-warn")}>{c.counts.in_review}</td>
                    <td className="px-3 py-2.5 text-right">{c.counts.rejected}</td>
                    <td className="px-5 py-2.5 text-right">{c.counts.published}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>

        {d.security && (
          <Card title="Sign-in activity, last 14 days">
            <SignInChart daily={d.security.daily} />
          </Card>
        )}

        {d.recent_activity && (
          <Card title="Recent publishing decisions">
            {d.recent_activity.length === 0 ? (
              <p className="text-sm text-ink-muted">No workflow activity yet.</p>
            ) : (
              <ul className="space-y-3 text-sm">
                {d.recent_activity.map((a) => (
                  <li key={a.id} className="flex justify-between gap-4">
                    <span>
                      <span className="font-medium">{a.user_name}</span> {ACTION_LABEL[a.action] ?? a.action}{" "}
                      <span className="text-ink-muted">
                        {a.auditable_type.split("\\").pop()} #{a.auditable_id}
                      </span>
                    </span>
                    <span className="shrink-0 text-xs text-ink-muted">{formatDate(a.created_at)}</span>
                  </li>
                ))}
              </ul>
            )}
          </Card>
        )}

        {"audit_chain" in d && (
          <Card
            title="Audit trail integrity"
            actions={
              <Button
                variant="secondary"
                loading={verifying}
                onClick={async () => {
                  setVerifying(true);
                  await api("audit-logs/verify", { method: "POST" }).finally(() => setVerifying(false));
                  mutate();
                }}
              >
                Verify now
              </Button>
            }
          >
            {!d.audit_chain ? (
              <p className="text-sm text-ink-muted">Not verified yet. Verification also runs nightly at 02:00.</p>
            ) : d.audit_chain.valid ? (
              <Alert tone="success">
                Hash chain intact — {d.audit_chain.checked.toLocaleString()} entries verified {formatDate(d.audit_chain.verified_at)}.
              </Alert>
            ) : (
              <Alert tone="error">
                Integrity check FAILED: {d.audit_chain.reason} Escalate to DECE immediately.
              </Alert>
            )}
          </Card>
        )}

        {d.health && (
          <Card title="System health">
            <dl className="grid grid-cols-2 gap-x-6 gap-y-2 text-sm">
              {Object.entries(d.health).map(([k, v]) => (
                <div key={k} className="flex justify-between gap-2 border-b border-line/60 py-1">
                  <dt className="text-ink-muted capitalize">{k.replace(/_/g, " ")}</dt>
                  <dd className={cx("font-medium tabular-nums", v === "down" && "text-danger")}>{String(v ?? "—")}</dd>
                </div>
              ))}
            </dl>
          </Card>
        )}
      </div>
    </>
  );
}

function Stat({ label, value, href, tone }: { label: string; value: number; href: string; tone?: "warn" | "danger" }) {
  return (
    <Link
      href={href}
      className={cx(
        "rounded-[var(--radius-card)] border bg-surface-raised p-5 transition-colors hover:border-navy-300",
        tone === "warn" ? "border-amber-300" : tone === "danger" ? "border-red-300" : "border-line",
      )}
    >
      <div className="text-xs font-medium uppercase tracking-wide text-ink-muted">{label}</div>
      <div className={cx("mt-2 text-3xl font-semibold tabular-nums", tone === "warn" && "text-warn", tone === "danger" && "text-danger")}>{value}</div>
    </Link>
  );
}

function SignInChart({ daily }: { daily: Record<string, Record<string, number>> }) {
  const days = Array.from({ length: 14 }, (_, i) => {
    const d = new Date();
    d.setDate(d.getDate() - 13 + i);
    return d.toISOString().slice(0, 10);
  });
  const rows = days.map((day) => ({
    day,
    ok: daily[day]?.["login.success"] ?? 0,
    failed: (daily[day]?.["login.failed"] ?? 0) + (daily[day]?.["mfa.failed"] ?? 0),
  }));
  const max = Math.max(1, ...rows.map((r) => r.ok + r.failed));

  return (
    <div>
      <div className="flex h-40 items-end gap-1.5" role="img" aria-label="Successful and failed sign-ins per day">
        {rows.map((r) => (
          <div key={r.day} className="flex flex-1 flex-col justify-end gap-px" title={`${r.day}: ${r.ok} successful, ${r.failed} failed`}>
            <div className="rounded-t-sm bg-danger/80" style={{ height: `${(r.failed / max) * 100}%` }} />
            <div className={cx("bg-navy-500", r.failed === 0 && "rounded-t-sm")} style={{ height: `${(r.ok / max) * 100}%` }} />
          </div>
        ))}
      </div>
      <div className="mt-2 flex justify-between text-[11px] text-ink-muted">
        <span>{days[0].slice(5)}</span>
        <span>today</span>
      </div>
      <div className="mt-3 flex gap-4 text-xs text-ink-muted">
        <span className="flex items-center gap-1.5">
          <span className="size-2.5 rounded-sm bg-navy-500" /> Successful
        </span>
        <span className="flex items-center gap-1.5">
          <span className="size-2.5 rounded-sm bg-danger/80" /> Failed (password or MFA)
        </span>
      </div>
    </div>
  );
}
