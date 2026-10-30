"use client";

import { useState } from "react";
import { api, formatDate, fromLocalInput } from "@/lib/client";
import type { ContentItem } from "@/lib/types";
import { Alert, Button, FieldShell, Modal, StatusBadge, inputClass } from "./ui";

type Action = "submit" | "approve" | "reject" | "withdraw" | "archive" | "restore";

const COPY: Record<Action, { label: string; title: string; body: string; variant: "primary" | "success" | "danger" | "secondary" }> = {
  submit: { label: "Submit for review", title: "Submit for review", body: "The item will be locked for editing until a reviewer approves it or requests changes.", variant: "primary" },
  approve: { label: "Approve & publish", title: "Approve and publish", body: "This makes the content public on airforce.lk in all available languages.", variant: "success" },
  reject: { label: "Request changes", title: "Request changes", body: "Explain what needs to change. The author will see your comment.", variant: "danger" },
  withdraw: { label: "Withdraw to draft", title: "Withdraw from the public site", body: "The item is taken offline immediately and returned to draft for editing.", variant: "secondary" },
  archive: { label: "Archive", title: "Archive", body: "The item is taken offline and kept for the record.", variant: "secondary" },
  restore: { label: "Restore to draft", title: "Restore to draft", body: "The item returns to draft. It must be reviewed again before publishing.", variant: "secondary" },
};

export function WorkflowPanel({ item, onChange }: { item: ContentItem; onChange: (item: ContentItem) => void }) {
  const [action, setAction] = useState<Action | null>(null);
  const [comment, setComment] = useState("");
  const [publishAt, setPublishAt] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const available = (Object.keys(COPY) as Action[]).filter((a) => item.can[a]);
  const isMakerBlocked = item.status === "in_review" && !item.can.approve && !item.can.submit;

  async function confirm() {
    if (!action) return;
    setBusy(true);
    setError(null);
    try {
      const res = await api<{ data: ContentItem }>(`content/${item.type}/${item.id}/${action}`, {
        body: { comment: comment || null, publish_at: action === "approve" ? fromLocalInput(publishAt) : null },
      });
      onChange(res.data);
      setAction(null);
      setComment("");
      setPublishAt("");
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  const scheduled = item.status === "published" && item.published_at && new Date(item.published_at) > new Date();

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <span className="text-sm text-ink-muted">Status</span>
        <StatusBadge status={item.status} scheduled={!!scheduled} />
      </div>

      <dl className="space-y-2 text-sm">
        <Row label="Created by" value={item.created_by?.name} />
        {item.submitted_by && <Row label="Submitted" value={`${item.submitted_by.name}, ${formatDate(item.submitted_at)}`} />}
        {item.reviewed_by && <Row label="Reviewed" value={`${item.reviewed_by.name}, ${formatDate(item.reviewed_at)}`} />}
        {item.published_at && <Row label={scheduled ? "Goes live" : "Published"} value={formatDate(item.published_at)} />}
      </dl>

      {item.review_comment && (
        <Alert tone={item.status === "rejected" ? "warn" : "info"}>
          <div className="text-xs font-semibold uppercase tracking-wide">Reviewer comment</div>
          <p className="mt-1 whitespace-pre-line">{item.review_comment}</p>
        </Alert>
      )}

      {isMakerBlocked && item.status === "in_review" && (
        <p className="text-xs text-ink-muted">Awaiting review. Maker-checker rules prevent the author or editors of this item from approving it.</p>
      )}

      {available.length > 0 && (
        <div className="flex flex-col gap-2 border-t border-line pt-4">
          {available.map((a) => (
            <Button key={a} variant={COPY[a].variant} onClick={() => setAction(a)}>
              {COPY[a].label}
            </Button>
          ))}
        </div>
      )}

      <Modal open={!!action} onClose={() => setAction(null)} title={action ? COPY[action].title : ""}>
        {action && (
          <div className="space-y-4">
            <p className="text-sm text-ink-muted">{COPY[action].body}</p>
            {error && <Alert tone="error">{error}</Alert>}
            {action === "approve" && (
              <FieldShell label="Publish at (optional)" htmlFor="publish_at" help="Leave empty to publish immediately.">
                <input id="publish_at" type="datetime-local" value={publishAt} onChange={(e) => setPublishAt(e.target.value)} className={inputClass} />
              </FieldShell>
            )}
            {action !== "restore" && (
              <FieldShell label={action === "reject" ? "Comment for the author" : "Comment (optional)"} htmlFor="comment" required={action === "reject"}>
                <textarea id="comment" rows={3} maxLength={2000} value={comment} onChange={(e) => setComment(e.target.value)} className={inputClass} />
              </FieldShell>
            )}
            <div className="flex justify-end gap-2">
              <Button variant="secondary" onClick={() => setAction(null)}>
                Cancel
              </Button>
              <Button variant={COPY[action].variant} loading={busy} onClick={confirm} disabled={action === "reject" && !comment.trim()}>
                {COPY[action].label}
              </Button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}

function Row({ label, value }: { label: string; value?: string | null }) {
  return (
    <div className="flex justify-between gap-4">
      <dt className="text-ink-muted">{label}</dt>
      <dd className="text-right font-medium text-ink">{value ?? "—"}</dd>
    </div>
  );
}
