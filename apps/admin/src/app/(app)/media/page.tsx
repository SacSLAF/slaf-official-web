"use client";

import { useState } from "react";
import useSWR from "swr";
import { MediaUpload } from "@/components/MediaPicker";
import { Button, Card, Empty, PageHeader, Pagination, Spinner } from "@/components/ui";
import { api, fetcher, formatDate } from "@/lib/client";
import type { MediaItem, Paginated } from "@/lib/types";

type Row = MediaItem & { original_name: string; size: number; created_at: string };

export default function MediaPage() {
  const [page, setPage] = useState(1);
  const { data, isLoading, mutate } = useSWR<Paginated<Row>>(`media?page=${page}`, fetcher);

  return (
    <>
      <PageHeader title="Media library" subtitle="Images are converted to WebP, resized to at most 2400px and stripped of EXIF/GPS metadata on upload." />
      <Card>
        <MediaUpload onUploaded={() => mutate()} />
        <div className="mt-6">
          {isLoading ? (
            <Spinner />
          ) : !data?.data.length ? (
            <Empty>No images yet.</Empty>
          ) : (
            <ul className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-5">
              {data.data.map((m) => (
                <li key={m.id} className="overflow-hidden rounded-md border border-line">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={m.url} alt="" className="aspect-video w-full object-cover" loading="lazy" />
                  <div className="space-y-1 p-2 text-xs">
                    <div className="truncate font-medium" title={m.original_name}>
                      {m.original_name}
                    </div>
                    <div className="text-ink-muted">
                      {m.width}×{m.height} · {Math.ceil(m.size / 1024)} KB · {formatDate(m.created_at, false)}
                    </div>
                    <Button
                      variant="ghost"
                      className="!px-0 !py-0 text-xs text-danger"
                      onClick={async () => {
                        if (!window.confirm("Delete this image? Content using it will lose its image.")) return;
                        await api(`media/${m.id}`, { method: "DELETE" });
                        mutate();
                      }}
                    >
                      Delete
                    </Button>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
        {data && <Pagination page={data.meta.current_page} lastPage={data.meta.last_page} onChange={setPage} />}
      </Card>
    </>
  );
}
