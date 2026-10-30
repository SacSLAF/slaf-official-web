"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useState } from "react";
import useSWR from "swr";
import { Card, Empty, LinkButton, PageHeader, Pagination, Spinner, StatusBadge, cx, inputClass, statusLabel } from "@/components/ui";
import { fetcher, formatDate, useContentTypes } from "@/lib/client";
import type { ContentItem, Paginated, Status } from "@/lib/types";

const STATUSES: ("" | Status)[] = ["", "draft", "in_review", "rejected", "published", "archived"];

export default function ContentListPage() {
  const { type } = useParams<{ type: string }>();
  const { types } = useContentTypes();
  const def = types?.find((t) => t.type === type);

  const [status, setStatus] = useState<"" | Status>("");
  const [q, setQ] = useState("");
  const [page, setPage] = useState(1);

  const query = new URLSearchParams({ page: String(page), ...(status ? { status } : {}), ...(q ? { q } : {}) });
  const { data, isLoading, error } = useSWR<Paginated<ContentItem>>(`content/${type}?${query}`, fetcher, { keepPreviousData: true });

  const listFields = def?.fields.filter((f) => f.list && !f.translatable && f.type !== "image").slice(0, 2) ?? [];

  return (
    <>
      <PageHeader
        title={def?.label ?? "Content"}
        subtitle="Drafts are only visible here. Content reaches the public site after it is approved by a reviewer."
        actions={def?.can_create && <LinkButton href={`/content/${type}/new`}>New {def.singular.toLowerCase()}</LinkButton>}
      />

      <Card>
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap gap-1" role="group" aria-label="Filter by status">
            {STATUSES.map((s) => (
              <button
                key={s || "all"}
                onClick={() => {
                  setStatus(s);
                  setPage(1);
                }}
                aria-pressed={status === s}
                className={cx(
                  "rounded-full px-3 py-1 text-sm",
                  status === s ? "bg-navy-800 text-white" : "bg-surface-muted text-ink-muted hover:text-ink",
                )}
              >
                {s ? statusLabel[s] : "All"}
              </button>
            ))}
          </div>
          <input
            type="search"
            placeholder="Search title or slug…"
            value={q}
            onChange={(e) => {
              setQ(e.target.value);
              setPage(1);
            }}
            className={cx(inputClass, "max-w-xs")}
            aria-label="Search"
          />
        </div>

        {error ? (
          <Empty>{error.message}</Empty>
        ) : isLoading && !data ? (
          <Spinner />
        ) : !data?.data.length ? (
          <Empty>Nothing here yet.</Empty>
        ) : (
          <div className="-mx-5 overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="border-y border-line bg-surface-muted text-left text-xs uppercase tracking-wide text-ink-muted">
                <tr>
                  <th className="px-5 py-2.5 font-medium">Title</th>
                  {listFields.map((f) => (
                    <th key={f.name} className="px-3 py-2.5 font-medium">
                      {f.label}
                    </th>
                  ))}
                  <th className="px-3 py-2.5 font-medium">Status</th>
                  <th className="px-3 py-2.5 font-medium">Author</th>
                  <th className="px-5 py-2.5 font-medium">Updated</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line">
                {data.data.map((item) => (
                  <tr key={item.id} className="hover:bg-surface-muted/60">
                    <td className="max-w-md px-5 py-3">
                      <Link href={`/content/${type}/${item.id}`} className="font-medium text-ink hover:text-link hover:underline">
                        {item.title}
                      </Link>
                      <div className="font-mono text-xs text-ink-muted">{String(item.values.slug ?? "")}</div>
                    </td>
                    {listFields.map((f) => {
                      const v = item.values[f.name];
                      return (
                        <td key={f.name} className="px-3 py-3 whitespace-nowrap text-ink-muted">
                          {f.type === "select"
                            ? (f.options?.[v as string] ?? "—")
                            : f.type === "datetime"
                              ? formatDate(v as string)
                              : f.type === "boolean"
                                ? v
                                  ? "Yes"
                                  : "—"
                                : String(v ?? "—")}
                        </td>
                      );
                    })}
                    <td className="px-3 py-3">
                      <StatusBadge status={item.status} scheduled={item.status === "published" && !!item.published_at && new Date(item.published_at) > new Date()} />
                    </td>
                    <td className="px-3 py-3 text-ink-muted">{item.created_by?.name ?? "—"}</td>
                    <td className="px-5 py-3 whitespace-nowrap text-ink-muted">{formatDate(item.updated_at)}</td>
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
