"use client";

import useSWR from "swr";
import { fetcher, formatDate } from "@/lib/client";
import type { ContentTypeDef } from "@/lib/types";
import { Empty, Spinner } from "./ui";

type Revision = {
  id: number;
  event: string;
  status: string;
  data: Record<string, unknown>;
  comment: string | null;
  user: { name: string } | null;
  created_at: string;
};

const EVENT_LABEL: Record<string, string> = {
  create: "Created",
  update: "Edited",
  submit: "Submitted for review",
  approve: "Approved & published",
  reject: "Changes requested",
  withdraw: "Withdrawn",
  archive: "Archived",
  restore: "Restored",
};

const stripHtml = (v: unknown) =>
  typeof v === "string" ? v.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim() : v == null ? "" : JSON.stringify(v);

/** Field-level comparison of the current version against the last published one. */
function diff(def: ContentTypeDef, current: Record<string, unknown>, published: Record<string, unknown>) {
  const rows: { field: string; before: string; after: string }[] = [];
  for (const f of def.fields) {
    if (f.translatable) {
      for (const l of ["en", "si", "ta"]) {
        const a = stripHtml((published[f.name] as Record<string, string> | undefined)?.[l]);
        const b = stripHtml((current[f.name] as Record<string, string> | undefined)?.[l]);
        if (a !== b) rows.push({ field: `${f.label} (${l.toUpperCase()})`, before: a as string, after: b as string });
      }
    } else if (stripHtml(published[f.name]) !== stripHtml(current[f.name])) {
      rows.push({ field: f.label, before: stripHtml(published[f.name]) as string, after: stripHtml(current[f.name]) as string });
    }
  }
  return rows;
}

export function Revisions({ def, type, id }: { def: ContentTypeDef; type: string; id: number }) {
  const { data, isLoading } = useSWR<{ data: Revision[]; last_published: Record<string, unknown> | null }>(
    `content/${type}/${id}/revisions`,
    fetcher,
  );

  if (isLoading) return <Spinner />;
  if (!data?.data.length) return <Empty>No history yet.</Empty>;

  const latest = data.data[0];
  const changes = data.last_published ? diff(def, latest.data, data.last_published) : null;

  return (
    <div className="space-y-6">
      {changes && changes.length > 0 && latest.event !== "approve" && (
        <div>
          <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-ink-muted">Changes since last published version</h3>
          <div className="overflow-x-auto rounded-md border border-line">
            <table className="w-full text-sm">
              <thead className="bg-surface-muted text-left text-xs text-ink-muted">
                <tr>
                  <th className="px-3 py-2">Field</th>
                  <th className="px-3 py-2">Published</th>
                  <th className="px-3 py-2">Now</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line align-top">
                {changes.map((c) => (
                  <tr key={c.field}>
                    <td className="px-3 py-2 font-medium whitespace-nowrap">{c.field}</td>
                    <td className="px-3 py-2 text-red-700 line-through decoration-red-300 dark:text-red-300">{c.before.slice(0, 300) || "—"}</td>
                    <td className="px-3 py-2 text-emerald-800 dark:text-emerald-300">{c.after.slice(0, 300) || "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      <ol className="relative space-y-4 border-l border-line pl-5">
        {data.data.map((r) => (
          <li key={r.id} className="relative">
            <span className="absolute top-1.5 -left-[25px] size-2.5 rounded-full border-2 border-surface-raised bg-navy-500" />
            <div className="text-sm font-medium">{EVENT_LABEL[r.event] ?? r.event}</div>
            <div className="text-xs text-ink-muted">
              {r.user?.name ?? "System"} · {formatDate(r.created_at)}
            </div>
            {r.comment && <p className="mt-1 rounded bg-surface-muted px-2 py-1 text-xs">{r.comment}</p>}
          </li>
        ))}
      </ol>
    </div>
  );
}
