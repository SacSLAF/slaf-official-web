"use client";

import { Fragment, useState } from "react";
import useSWR from "swr";
import { Card, Empty, PageHeader, Pagination, Spinner, cx, inputClass } from "@/components/ui";
import { fetcher } from "@/lib/client";
import type { Paginated } from "@/lib/types";

type Log = {
  id: number;
  user_id: number | null;
  user_name: string;
  action: string;
  auditable_type: string | null;
  auditable_id: number | null;
  old_values: Record<string, unknown> | null;
  new_values: Record<string, unknown> | null;
  ip_address: string | null;
  hash: string;
  created_at: string;
};

export default function AuditPage() {
  const [filters, setFilters] = useState({ action: "", from: "", to: "" });
  const [page, setPage] = useState(1);
  const [open, setOpen] = useState<number | null>(null);

  const query = new URLSearchParams({ page: String(page), ...Object.fromEntries(Object.entries(filters).filter(([, v]) => v)) });
  const { data, isLoading } = useSWR<Paginated<Log>>(`audit-logs?${query}`, fetcher, { keepPreviousData: true });

  const exportQuery = new URLSearchParams(Object.fromEntries(Object.entries(filters).filter(([, v]) => v)));

  return (
    <>
      <PageHeader
        title="Audit trail"
        subtitle="Append-only and hash-chained. Entries cannot be edited or deleted, and any tampering is detected by the integrity check."
        actions={
          <a href={`/api/bff/audit-logs/export?${exportQuery}`} className="rounded-md border border-line bg-surface-raised px-3.5 py-2 text-sm font-medium hover:bg-surface-muted">
            Export CSV
          </a>
        }
      />
      <Card>
        <div className="mb-4 grid gap-3 sm:grid-cols-3">
          <input
            placeholder="Action prefix, e.g. workflow. or user."
            value={filters.action}
            onChange={(e) => {
              setFilters({ ...filters, action: e.target.value });
              setPage(1);
            }}
            className={inputClass}
            aria-label="Action"
          />
          <input type="date" value={filters.from} onChange={(e) => setFilters({ ...filters, from: e.target.value })} className={inputClass} aria-label="From date" />
          <input type="date" value={filters.to} onChange={(e) => setFilters({ ...filters, to: e.target.value })} className={inputClass} aria-label="To date" />
        </div>

        {isLoading && !data ? (
          <Spinner />
        ) : !data?.data.length ? (
          <Empty>No entries match.</Empty>
        ) : (
          <div className="-mx-5 overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="border-y border-line bg-surface-muted text-left text-xs uppercase tracking-wide text-ink-muted">
                <tr>
                  <th className="px-5 py-2.5 font-medium">When (UTC)</th>
                  <th className="px-3 py-2.5 font-medium">Who</th>
                  <th className="px-3 py-2.5 font-medium">Action</th>
                  <th className="px-3 py-2.5 font-medium">Subject</th>
                  <th className="px-5 py-2.5 font-medium">IP</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line">
                {data.data.map((log) => (
                  <Fragment key={log.id}>
                    <tr className={cx("cursor-pointer hover:bg-surface-muted/60", open === log.id && "bg-surface-muted/60")} onClick={() => setOpen(open === log.id ? null : log.id)}>
                      <td className="px-5 py-2.5 font-mono text-xs whitespace-nowrap">{log.created_at.slice(0, 19).replace("T", " ")}</td>
                      <td className="px-3 py-2.5">{log.user_name}</td>
                      <td className="px-3 py-2.5 font-mono text-xs">{log.action}</td>
                      <td className="px-3 py-2.5 text-xs text-ink-muted">
                        {log.auditable_type ? `${log.auditable_type.split("\\").pop()} #${log.auditable_id}` : "—"}
                      </td>
                      <td className="px-5 py-2.5 font-mono text-xs">{log.ip_address ?? "—"}</td>
                    </tr>
                    {open === log.id && (
                      <tr>
                        <td colSpan={5} className="bg-surface-muted/40 px-5 py-3">
                          <div className="grid gap-4 md:grid-cols-2">
                            <Values title="Before" values={log.old_values} />
                            <Values title="After" values={log.new_values} />
                          </div>
                          <div className="mt-2 font-mono text-[10px] break-all text-ink-muted">hash {log.hash}</div>
                        </td>
                      </tr>
                    )}
                  </Fragment>
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

function Values({ title, values }: { title: string; values: Record<string, unknown> | null }) {
  return (
    <div>
      <div className="mb-1 text-xs font-semibold uppercase tracking-wide text-ink-muted">{title}</div>
      <pre className="max-h-64 overflow-auto rounded border border-line bg-surface p-2 text-xs whitespace-pre-wrap">
        {values ? JSON.stringify(values, null, 2) : "—"}
      </pre>
    </div>
  );
}
