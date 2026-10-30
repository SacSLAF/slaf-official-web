"use client";

import Link from "next/link";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import { Suspense } from "react";
import useSWR from "swr";
import { ContentForm } from "@/components/ContentForm";
import { Revisions } from "@/components/Revisions";
import { TenderDocuments } from "@/components/TenderDocuments";
import { WorkflowPanel } from "@/components/WorkflowPanel";
import { Alert, Button, Card, PageHeader, Spinner } from "@/components/ui";
import { api, fetcher, useContentTypes } from "@/lib/client";
import type { ContentItem } from "@/lib/types";

function EditContent() {
  const { type, id } = useParams<{ type: string; id: string }>();
  const router = useRouter();
  const params = useSearchParams();
  const { types } = useContentTypes();
  const def = types?.find((t) => t.type === type);
  const { data, error, mutate } = useSWR<{ data: ContentItem }>(`content/${type}/${id}`, fetcher);

  if (error) return <Alert tone="error">{error.message}</Alert>;
  if (!data || !def) return <Spinner />;

  const item = data.data;
  const editable = item.can.update;
  const refresh = () => mutate();

  return (
    <>
      <nav className="mb-2 text-sm text-ink-muted">
        <Link href={`/content/${type}`} className="hover:underline">
          {def.label}
        </Link>{" "}
        /
      </nav>
      <PageHeader
        title={item.title}
        actions={
          item.can.delete && (
            <Button
              variant="ghost"
              onClick={async () => {
                if (!window.confirm("Delete this item? It can be recovered by a database administrator only.")) return;
                await api(`content/${type}/${id}`, { method: "DELETE" });
                router.replace(`/content/${type}`);
              }}
            >
              Delete
            </Button>
          )
        }
      />

      {params.get("created") && <div className="mb-4"><Alert tone="success">Draft created. Submit it for review when it is ready.</Alert></div>}
      {!editable && item.status === "published" && (
        <div className="mb-4">
          <Alert tone="info">Published content is locked. An approver can withdraw it to draft if it needs to change.</Alert>
        </div>
      )}
      {!editable && item.status === "in_review" && (
        <div className="mb-4">
          <Alert tone="info">Locked while in review.</Alert>
        </div>
      )}

      <div className="grid gap-6 xl:grid-cols-[1fr_20rem]">
        <div className="min-w-0 space-y-6">
          <Card>
            <ContentForm
              key={item.updated_at}
              def={def}
              initial={item.values}
              initialImage={item.image}
              disabled={!editable}
              onSubmit={async (values) => {
                const res = await api<{ data: ContentItem }>(`content/${type}/${id}`, { method: "PUT", body: values });
                mutate({ data: res.data }, { revalidate: false });
              }}
            />
          </Card>

          {type === "tenders" && (
            <Card title="Bidding documents">
              <TenderDocuments tenderId={item.id} documents={item.documents ?? []} editable={editable} onChange={refresh} />
            </Card>
          )}
        </div>

        <aside className="space-y-6">
          <Card title="Workflow">
            <WorkflowPanel item={item} onChange={(next) => mutate({ data: next }, { revalidate: false })} />
          </Card>
          <Card title="History">
            <Revisions key={item.updated_at + item.status} def={def} type={type} id={item.id} />
          </Card>
        </aside>
      </div>
    </>
  );
}

export default function EditContentPage() {
  return (
    <Suspense fallback={<Spinner />}>
      <EditContent />
    </Suspense>
  );
}
