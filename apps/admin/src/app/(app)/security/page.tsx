"use client";

import { useState } from "react";
import useSWR from "swr";
import { Card, Empty, PageHeader, Pagination, Spinner, cx, inputClass } from "@/components/ui";
import { fetcher } from "@/lib/client";
import type { Paginated } from "@/lib/types";

type Event = { id: number; type: string; email: string | null; ip_address: string | null; user_agent: string | null; meta: Record<string, unknown> | null; created_at: string };

const TYPES: Record<string, string> = {
  "": "All events",
  "login.failed": "Failed sign-in",
  "login.success": "Successful sign-in",
  "login.locked": "Account locked",
  "mfa.failed": "MFA failure",
  "mfa.enrolled": "MFA enrolled",
  "mfa.recovery_used": "Recovery code used",
  "session.idle_expired": "Idle session expired",
  "admin.ip_blocked": "Blocked network",
  "password.changed": "Password changed",
  logout: "Sign out",
};

const SEVERE = new Set(["login.locked", "admin.ip_blocked", "mfa.recovery_used"]);
const WARN = new Set(["login.failed", "mfa.failed"]);

export default function SecurityPage() {
  const [type, setType] = useState("");
  const [ip, setIp] = useState("");
  const [page, setPage] = useState(1);
  const query = new URLSearchParams({ page: String(page), ...(type ? { type } : {}), ...(ip ? { ip } : {}) });
  const { data, isLoading } = useSWR<Paginated<Event>>(`security-events?${query}`, fetcher, { keepPreviousData: true, refreshInterval: 30_000 });

  return (
    <>
      <PageHeader title="Security events" subtitle="Authentication activity on the administrative system. Refreshes every 30 seconds." />
      <Card>
        <div className="mb-4 grid gap-3 sm:grid-cols-3">
          <select value={type} onChange={(e) => { setType(e.target.value); setPage(1); }} className={inputClass} aria-label="Event type">
            {Object.entries(TYPES).map(([k, v]) => (
              <option key={k} value={k}>
                {v}
              </option>
            ))}
          </select>
          <input placeholder="Filter by exact IP address" value={ip} onChange={(e) => setIp(e.target.value.trim())} className={inputClass} aria-label="IP address" />
        </div>
        {isLoading && !data ? (
          <Spinner />
        ) : !data?.data.length ? (
          <Empty>No events.</Empty>
        ) : (
          <div className="-mx-5 overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="border-y border-line bg-surface-muted text-left text-xs uppercase tracking-wide text-ink-muted">
                <tr>
                  <th className="px-5 py-2.5 font-medium">When (UTC)</th>
                  <th className="px-3 py-2.5 font-medium">Event</th>
                  <th className="px-3 py-2.5 font-medium">Account</th>
                  <th className="px-3 py-2.5 font-medium">IP</th>
                  <th className="px-5 py-2.5 font-medium">Client</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line">
                {data.data.map((e) => (
                  <tr key={e.id}>
                    <td className="px-5 py-2.5 font-mono text-xs whitespace-nowrap">{e.created_at.slice(0, 19).replace("T", " ")}</td>
                    <td className="px-3 py-2.5">
                      <span
                        className={cx(
                          "rounded-full px-2 py-0.5 text-xs font-semibold",
                          SEVERE.has(e.type) ? "bg-red-100 text-red-800" : WARN.has(e.type) ? "bg-amber-100 text-amber-900" : "bg-surface-muted text-ink-muted",
                        )}
                      >
                        {TYPES[e.type] ?? e.type}
                      </span>
                    </td>
                    <td className="px-3 py-2.5 text-xs">{e.email ?? "—"}</td>
                    <td className="px-3 py-2.5 font-mono text-xs">
                      <button className="hover:underline" onClick={() => setIp(e.ip_address ?? "")}>
                        {e.ip_address ?? "—"}
                      </button>
                    </td>
                    <td className="max-w-xs truncate px-5 py-2.5 text-xs text-ink-muted" title={e.user_agent ?? ""}>
                      {e.user_agent ?? "—"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        {data && <Pagination page={data.meta.current_page} lastPage={data.meta.last_page} onChange={setPage} />}
      </Card>
    </>
  );
}
