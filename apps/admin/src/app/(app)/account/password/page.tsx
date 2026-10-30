"use client";

import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import { Alert, Button, Card, FieldShell, PageHeader, inputClass } from "@/components/ui";
import { api, useMe } from "@/lib/client";

export default function ChangePasswordPage() {
  const router = useRouter();
  const { me, mutate } = useMe();
  const [errors, setErrors] = useState<Record<string, string[]>>({});
  const [busy, setBusy] = useState(false);

  async function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    setBusy(true);
    setErrors({});
    try {
      await api("auth/password", {
        body: { current_password: f.get("current"), password: f.get("password"), password_confirmation: f.get("confirm") },
      });
      await mutate();
      router.replace("/");
    } catch (err) {
      setErrors((err as { errors?: Record<string, string[]> }).errors ?? { password: [(err as Error).message] });
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="max-w-lg">
      <PageHeader title="Change password" />
      {me?.must_change_password && (
        <div className="mb-4">
          <Alert tone="warn">You signed in with a temporary password. Choose a new one to continue.</Alert>
        </div>
      )}
      <Card>
        <form onSubmit={submit} className="space-y-4">
          <FieldShell label="Current password" htmlFor="current" required error={errors.current_password?.[0]}>
            <input id="current" name="current" type="password" autoComplete="current-password" required className={inputClass} />
          </FieldShell>
          <FieldShell
            label="New password"
            htmlFor="password"
            required
            error={errors.password?.[0]}
            help="At least 12 characters with upper and lower case letters, a number and a symbol."
          >
            <input id="password" name="password" type="password" autoComplete="new-password" minLength={12} required className={inputClass} />
          </FieldShell>
          <FieldShell label="Confirm new password" htmlFor="confirm" required>
            <input id="confirm" name="confirm" type="password" autoComplete="new-password" required className={inputClass} />
          </FieldShell>
          <p className="text-xs text-ink-muted">All your other sessions will be signed out.</p>
          <Button type="submit" loading={busy}>
            Change password
          </Button>
        </form>
      </Card>
    </div>
  );
}
