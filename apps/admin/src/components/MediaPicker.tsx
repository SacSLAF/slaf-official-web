"use client";

import useSWR from "swr";
import { useState } from "react";
import { api, fetcher } from "@/lib/client";
import type { MediaItem, Paginated } from "@/lib/types";
import { Alert, Button, Empty, Modal, Spinner, cx } from "./ui";

export function MediaUpload({ onUploaded, collection }: { onUploaded: (m: MediaItem) => void; collection?: string }) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function upload(file: File) {
    const form = new FormData();
    form.append("file", file);
    if (collection) form.append("collection", collection);
    setBusy(true);
    setError(null);
    try {
      const res = await api<{ data: MediaItem }>("media", { body: form });
      onUploaded(res.data);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-2">
      <label
        className={cx(
          "flex cursor-pointer flex-col items-center justify-center rounded-lg border-2 border-dashed border-line px-4 py-6 text-center text-sm text-ink-muted hover:border-navy-400",
          busy && "pointer-events-none opacity-60",
        )}
      >
        <span className="font-medium text-ink">{busy ? "Uploading…" : "Upload an image"}</span>
        <span className="text-xs">JPEG, PNG or WebP, up to 15 MB. Metadata (EXIF/GPS) is stripped automatically.</span>
        <input
          type="file"
          accept="image/jpeg,image/png,image/webp"
          className="sr-only"
          onChange={(e) => e.target.files?.[0] && upload(e.target.files[0])}
        />
      </label>
      {error && <Alert tone="error">{error}</Alert>}
    </div>
  );
}

export function ImageField({
  value,
  preview,
  onChange,
  disabled,
}: {
  value: number | null;
  preview?: MediaItem | null;
  onChange: (id: number | null, item?: MediaItem | null) => void;
  disabled?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const { data, isLoading, mutate } = useSWR<Paginated<MediaItem>>(open ? "media" : null, fetcher);

  return (
    <div className="flex items-start gap-4">
      <div className="flex aspect-video w-48 items-center justify-center overflow-hidden rounded-md border border-line bg-surface-muted">
        {value && preview ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={preview.url} alt="" className="h-full w-full object-cover" />
        ) : (
          <span className="text-xs text-ink-muted">No image</span>
        )}
      </div>
      {!disabled && (
        <div className="flex flex-col gap-2">
          <Button type="button" variant="secondary" onClick={() => setOpen(true)}>
            {value ? "Change image" : "Choose image"}
          </Button>
          {value && (
            <Button type="button" variant="ghost" onClick={() => onChange(null, null)}>
              Remove
            </Button>
          )}
        </div>
      )}

      <Modal open={open} onClose={() => setOpen(false)} title="Media library" wide>
        <MediaUpload
          onUploaded={(m) => {
            mutate();
            onChange(m.id, m);
            setOpen(false);
          }}
        />
        <div className="mt-5">
          {isLoading ? (
            <Spinner />
          ) : !data?.data.length ? (
            <Empty>No images uploaded yet.</Empty>
          ) : (
            <ul className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              {data.data.map((m) => (
                <li key={m.id}>
                  <button
                    type="button"
                    onClick={() => {
                      onChange(m.id, m);
                      setOpen(false);
                    }}
                    className={cx(
                      "block aspect-video w-full overflow-hidden rounded-md border-2",
                      m.id === value ? "border-gold-500" : "border-transparent hover:border-navy-300",
                    )}
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={m.url} alt="" className="h-full w-full object-cover" />
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      </Modal>
    </div>
  );
}
