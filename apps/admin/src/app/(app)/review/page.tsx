"use client";

import Link from "next/link";
import { useState } from "react";
import useSWR from "swr";
import { Card, Empty, PageHeader, Spinner } from "@/components/ui";
import { fetcher, formatDate, useContentTypes } from "@/lib/client";
import type { ContentItem } from "@/lib/types";

export default function ReviewQueuePage() {
  const { types } = useContentTypes();
  const { data, isLoading } = useSWR<{ data: ContentItem[] }>("review-queue", fetcher, { refreshInterval: 30_000 });
  const [now] = useState(() => Date.now());

  return (
    <>
      <PageHeader
        title="Review queue"
        subtitle="Items submitted for publication in areas you approve. You cannot approve content you created, edited or submitted."
      />
      <Card>
        {isLoading ? (
          <Spinner />
        ) : !data?.data.length ? (
          <Empty>Nothing is waiting for your review.</Empty>
        ) : (
          <ul className="-my-2 divide-y divide-line">
            {data.data.map((item) => {
              const waitingHours = item.submitted_at ? (now - new Date(item.submitted_at).getTime()) / 36e5 : 0;
              return (
                <li key={`${item.type}-${item.id}`} className="flex flex-wrap items-center justify-between gap-3 py-3">
                  <div className="min-w-0">
                    <div className="text-xs font-medium uppercase tracking-wide text-ink-muted">
                      {types?.find((t) => t.type === item.type)?.singular ?? item.type}
                    </div>
                    <Link href={`/content/${item.type}/${item.id}`} className="font-medium hover:text-link hover:underline">
                      {item.title}
                    </Link>
                    <div className="text-xs text-ink-muted">
                      Submitted by {item.submitted_by?.name ?? "—"} · {formatDate(item.submitted_at)}
                    </div>
                  </div>
                  {waitingHours > 24 && (
                    <span className="rounded-full bg-amber-100 px-2.5 py-0.5 text-xs font-semibold text-amber-900">
                      Waiting {Math.floor(waitingHours / 24)}d
                    </span>
                  )}
                </li>
              );
            })}
          </ul>
        )}
      </Card>
    </>
  );
}
