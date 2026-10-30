"use client";

import { useState, type FormEvent } from "react";
import { api, formatDate } from "@/lib/client";
import type { TenderDocument } from "@/lib/types";
import { Alert, Button, Empty, FieldShell, inputClass } from "./ui";

const size = (b: number) => (b > 1048576 ? `${(b / 1048576).toFixed(1)} MB` : `${Math.ceil(b / 1024)} KB`);

export function TenderDocuments({
  tenderId,
  documents,
  editable,
  onChange,
}: {
  tenderId: number;
  documents: TenderDocument[];
  editable: boolean;
  onChange: () => void;
}) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function upload(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = e.currentTarget;
    setBusy(true);
    setError(null);
    try {
      await api(`tenders/${tenderId}/documents`, { body: new FormData(form) });
      form.reset();
      onChange();
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusy(false);
    }
  }

  async function remove(doc: TenderDocument) {
    if (!window.confirm(`Remove "${doc.file_name}"?`)) return;
    await api(`tenders/${tenderId}/documents/${doc.id}`, { method: "DELETE" });
    onChange();
  }

  return (
    <div className="space-y-4">
      {documents.length === 0 ? (
        <Empty>No bidding documents attached.</Empty>
      ) : (
        <ul className="divide-y divide-line rounded-md border border-line">
          {documents.map((d) => (
            <li key={d.id} className="flex flex-wrap items-center justify-between gap-3 px-4 py-3 text-sm">
              <div className="min-w-0">
                <a href={`/api/bff/tenders/${tenderId}/documents/${d.id}`} className="font-medium text-link hover:underline">
                  {d.title.en}
                </a>
                <div className="text-xs text-ink-muted">
                  {d.file_name} · {size(d.size)} · {d.download_count} downloads · {formatDate(d.created_at)}
                </div>
                <div className="font-mono text-[10px] break-all text-ink-muted" title="SHA-256 checksum published with the notice">
                  SHA-256 {d.sha256}
                </div>
              </div>
              {editable && (
                <Button variant="ghost" onClick={() => remove(d)}>
                  Remove
                </Button>
              )}
            </li>
          ))}
        </ul>
      )}

      {editable && (
        <form onSubmit={upload} className="space-y-3 rounded-md border border-dashed border-line p-4">
          {error && <Alert tone="error">{error}</Alert>}
          <div className="grid gap-3 sm:grid-cols-3">
            <FieldShell label="Title (English)" htmlFor="doc-en" required>
              <input id="doc-en" name="title[en]" required className={inputClass} />
            </FieldShell>
            <FieldShell label="Title (සිංහල)" htmlFor="doc-si">
              <input id="doc-si" name="title[si]" lang="si" className={inputClass} />
            </FieldShell>
            <FieldShell label="Title (தமிழ்)" htmlFor="doc-ta">
              <input id="doc-ta" name="title[ta]" lang="ta" className={inputClass} />
            </FieldShell>
          </div>
          <FieldShell label="File" htmlFor="doc-file" help="PDF, Word, Excel or ZIP up to 25 MB. Stored privately; a SHA-256 checksum is published.">
            <input id="doc-file" name="file" type="file" required accept=".pdf,.doc,.docx,.xls,.xlsx,.zip" className="text-sm" />
          </FieldShell>
          <Button type="submit" loading={busy}>
            Attach document
          </Button>
        </form>
      )}
    </div>
  );
}
