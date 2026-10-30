"use client";

import { useParams, useRouter } from "next/navigation";
import { ContentForm } from "@/components/ContentForm";
import { Alert, Card, PageHeader, Spinner } from "@/components/ui";
import { api, useContentTypes } from "@/lib/client";
import type { ContentItem } from "@/lib/types";

export default function NewContentPage() {
  const { type } = useParams<{ type: string }>();
  const router = useRouter();
  const { types, isLoading } = useContentTypes();
  const def = types?.find((t) => t.type === type);

  if (isLoading) return <Spinner />;
  if (!def?.can_create) return <Alert tone="error">You are not authorised to create this content.</Alert>;

  const defaults = Object.fromEntries(
    def.fields.filter((f) => f.type === "select" && f.required).map((f) => [f.name, Object.keys(f.options ?? {})[0]]),
  );

  return (
    <>
      <PageHeader title={`New ${def.singular.toLowerCase()}`} subtitle="Saved as a draft. Submit it for review when it is ready." />
      <Card>
        <ContentForm
          def={def}
          initial={defaults}
          onSubmit={async (values) => {
            const res = await api<{ data: ContentItem }>(`content/${type}`, { body: values });
            router.replace(`/content/${type}/${res.data.id}?created=1`);
          }}
        />
      </Card>
    </>
  );
}
