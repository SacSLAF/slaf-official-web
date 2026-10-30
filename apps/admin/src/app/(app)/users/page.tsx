"use client";

import { useState, type FormEvent } from "react";
import useSWR from "swr";
import { Alert, Button, Card, FieldShell, Modal, PageHeader, Pagination, Spinner, cx, inputClass } from "@/components/ui";
import { api, fetcher, formatDate } from "@/lib/client";
import type { Paginated } from "@/lib/types";

type User = {
  id: number;
  name: string;
  email: string;
  service_number: string | null;
  rank: string | null;
  designation: string | null;
  is_active: boolean;
  must_change_password: boolean;
  roles: string[];
  bases: { id: number; name: string }[];
  mfa_enabled: boolean;
  locked: boolean;
  last_login_at: string | null;
  last_login_ip: string | null;
};

const ROLE_LABEL: Record<string, string> = {
  "super-admin": "Super Administrator (DECE)",
  "media-editor": "Media Directorate Editor",
  "media-approver": "Media Directorate Approver",
  "establishment-officer": "Establishment / Base Officer",
  "establishment-approver": "Establishment Approver",
  "tender-officer": "Tender Board Officer",
  "tender-approver": "Tender Board Approver",
  auditor: "Auditor (read-only)",
};

export default function UsersPage() {
  const [page, setPage] = useState(1);
  const [q, setQ] = useState("");
  const [editing, setEditing] = useState<User | "new" | null>(null);
  const [secret, setSecret] = useState<{ email: string; password: string } | null>(null);
  const { data, isLoading, mutate } = useSWR<Paginated<User>>(`users?page=${page}&q=${encodeURIComponent(q)}`, fetcher, { keepPreviousData: true });

  async function action(user: User, path: string, confirmText: string) {
    if (!window.confirm(confirmText)) return;
    const res = await api<{ temporary_password?: string }>(`users/${user.id}/${path}`, { method: "POST" });
    if (res.temporary_password) setSecret({ email: user.email, password: res.temporary_password });
    mutate();
  }

  return (
    <>
      <PageHeader
        title="Users & roles"
        subtitle="Accounts are created with a one-time password. Users must change it and enrol MFA at first sign-in."
        actions={<Button onClick={() => setEditing("new")}>Add user</Button>}
      />

      {secret && (
        <div className="mb-4">
          <Alert tone="warn">
            Temporary password for <strong>{secret.email}</strong>: <code className="rounded bg-white/60 px-1.5 py-0.5 font-mono">{secret.password}</code>
            <br />
            Deliver it through an approved channel. It is shown only once.{" "}
            <button className="underline" onClick={() => setSecret(null)}>
              Dismiss
            </button>
          </Alert>
        </div>
      )}

      <Card>
        <input type="search" placeholder="Search name, email or service number…" value={q} onChange={(e) => setQ(e.target.value)} className={cx(inputClass, "mb-4 max-w-sm")} aria-label="Search users" />
        {isLoading && !data ? (
          <Spinner />
        ) : (
          <div className="-mx-5 overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="border-y border-line bg-surface-muted text-left text-xs uppercase tracking-wide text-ink-muted">
                <tr>
                  <th className="px-5 py-2.5 font-medium">Name</th>
                  <th className="px-3 py-2.5 font-medium">Roles</th>
                  <th className="px-3 py-2.5 font-medium">Security</th>
                  <th className="px-3 py-2.5 font-medium">Last sign-in</th>
                  <th className="px-5 py-2.5" />
                </tr>
              </thead>
              <tbody className="divide-y divide-line">
                {data?.data.map((u) => (
                  <tr key={u.id} className={cx(!u.is_active && "opacity-60")}>
                    <td className="px-5 py-3">
                      <div className="font-medium">
                        {u.rank} {u.name}
                      </div>
                      <div className="text-xs text-ink-muted">
                        {u.email}
                        {u.service_number && ` · ${u.service_number}`}
                      </div>
                    </td>
                    <td className="px-3 py-3 text-xs">
                      {u.roles.map((r) => ROLE_LABEL[r] ?? r).join(", ")}
                      {u.bases.length > 0 && <div className="text-ink-muted">Scope: {u.bases.map((b) => b.name).join(", ")}</div>}
                    </td>
                    <td className="px-3 py-3">
                      <div className="flex flex-wrap gap-1 text-[11px] font-semibold">
                        {!u.is_active && <Tag tone="muted">Disabled</Tag>}
                        {u.locked && <Tag tone="danger">Locked</Tag>}
                        <Tag tone={u.mfa_enabled ? "ok" : "warn"}>{u.mfa_enabled ? "MFA" : "No MFA"}</Tag>
                        {u.must_change_password && <Tag tone="warn">Temp password</Tag>}
                      </div>
                    </td>
                    <td className="px-3 py-3 text-xs text-ink-muted">
                      {formatDate(u.last_login_at)}
                      {u.last_login_ip && <div className="font-mono">{u.last_login_ip}</div>}
                    </td>
                    <td className="px-5 py-3">
                      <div className="flex flex-wrap justify-end gap-1">
                        <Button variant="secondary" onClick={() => setEditing(u)}>
                          Edit
                        </Button>
                        {u.locked && (
                          <Button variant="ghost" onClick={() => action(u, "unlock", `Unlock ${u.email}?`)}>
                            Unlock
                          </Button>
                        )}
                        <Button variant="ghost" onClick={() => action(u, "reset-mfa", `Reset MFA for ${u.email}? They will be signed out and must enrol again.`)}>
                          Reset MFA
                        </Button>
                        <Button variant="ghost" onClick={() => action(u, "reset-password", `Issue a new temporary password for ${u.email}? They will be signed out.`)}>
                          Reset password
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        {data && <Pagination page={data.meta.current_page} lastPage={data.meta.last_page} onChange={setPage} />}
      </Card>

      <Modal open={!!editing} onClose={() => setEditing(null)} title={editing === "new" ? "Add user" : "Edit user"}>
        {editing && (
          <UserForm
            user={editing === "new" ? null : editing}
            onSaved={(temp, email) => {
              setEditing(null);
              if (temp) setSecret({ email, password: temp });
              mutate();
            }}
          />
        )}
      </Modal>
    </>
  );
}

function Tag({ tone, children }: { tone: "ok" | "warn" | "danger" | "muted"; children: React.ReactNode }) {
  const tones = {
    ok: "bg-emerald-100 text-emerald-800",
    warn: "bg-amber-100 text-amber-900",
    danger: "bg-red-100 text-red-800",
    muted: "bg-zinc-200 text-zinc-700",
  };
  return <span className={cx("rounded-full px-2 py-0.5", tones[tone])}>{children}</span>;
}

function UserForm({ user, onSaved }: { user: User | null; onSaved: (tempPassword: string | null, email: string) => void }) {
  const { data: roles } = useSWR<{ data: { name: string }[] }>("roles", fetcher);
  const { data: bases } = useSWR<Paginated<{ id: number; title: string }>>("content/bases?per_page=100", fetcher);
  const [selectedRoles, setRoles] = useState<string[]>(user?.roles ?? []);
  const [selectedBases, setBases] = useState<number[]>(user?.bases.map((b) => b.id) ?? []);
  const [errors, setErrors] = useState<Record<string, string[]>>({});
  const [message, setMessage] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const toggle = <T,>(list: T[], v: T) => (list.includes(v) ? list.filter((x) => x !== v) : [...list, v]);

  async function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    const body = {
      name: f.get("name"),
      email: f.get("email"),
      service_number: f.get("service_number") || null,
      rank: f.get("rank") || null,
      designation: f.get("designation") || null,
      is_active: f.get("is_active") === "on",
      roles: selectedRoles,
      base_ids: selectedBases,
    };
    setBusy(true);
    setErrors({});
    setMessage(null);
    try {
      const res = await api<{ temporary_password?: string }>(user ? `users/${user.id}` : "users", { method: user ? "PUT" : "POST", body });
      onSaved(res.temporary_password ?? null, String(body.email));
    } catch (err) {
      const e2 = err as { errors?: Record<string, string[]>; message: string };
      setErrors(e2.errors ?? {});
      setMessage(e2.message);
    } finally {
      setBusy(false);
    }
  }

  const err = (k: string) => errors[k]?.[0];

  return (
    <form onSubmit={submit} className="space-y-4">
      {message && <Alert tone="error">{message}</Alert>}
      <div className="grid gap-4 sm:grid-cols-2">
        <FieldShell label="Full name" htmlFor="u-name" required error={err("name")}>
          <input id="u-name" name="name" defaultValue={user?.name} required className={inputClass} />
        </FieldShell>
        <FieldShell label="Rank" htmlFor="u-rank" error={err("rank")}>
          <input id="u-rank" name="rank" defaultValue={user?.rank ?? ""} className={inputClass} />
        </FieldShell>
        <FieldShell label="Official email" htmlFor="u-email" required error={err("email")}>
          <input id="u-email" name="email" type="email" defaultValue={user?.email} required className={inputClass} />
        </FieldShell>
        <FieldShell label="Service number" htmlFor="u-sn" error={err("service_number")}>
          <input id="u-sn" name="service_number" defaultValue={user?.service_number ?? ""} className={inputClass} />
        </FieldShell>
        <div className="sm:col-span-2">
          <FieldShell label="Designation" htmlFor="u-des" error={err("designation")}>
            <input id="u-des" name="designation" defaultValue={user?.designation ?? ""} className={inputClass} />
          </FieldShell>
        </div>
      </div>

      <fieldset>
        <legend className="mb-2 text-sm font-medium">Roles {err("roles") && <span className="text-xs text-danger">— {err("roles")}</span>}</legend>
        <div className="grid gap-1.5 sm:grid-cols-2">
          {roles?.data.map((r) => (
            <label key={r.name} className="flex items-center gap-2 text-sm">
              <input type="checkbox" checked={selectedRoles.includes(r.name)} onChange={() => setRoles(toggle(selectedRoles, r.name))} className="accent-navy-700" />
              {ROLE_LABEL[r.name] ?? r.name}
            </label>
          ))}
        </div>
      </fieldset>

      {selectedRoles.some((r) => r.startsWith("establishment")) && (
        <fieldset>
          <legend className="mb-2 text-sm font-medium">Assigned bases (scope)</legend>
          <div className="grid max-h-40 gap-1.5 overflow-y-auto sm:grid-cols-2">
            {bases?.data.map((b) => (
              <label key={b.id} className="flex items-center gap-2 text-sm">
                <input type="checkbox" checked={selectedBases.includes(b.id)} onChange={() => setBases(toggle(selectedBases, b.id))} className="accent-navy-700" />
                {b.title}
              </label>
            ))}
          </div>
        </fieldset>
      )}

      {user && (
        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" name="is_active" defaultChecked={user.is_active} className="accent-navy-700" />
          Account active (unchecking signs the user out everywhere)
        </label>
      )}
      {!user && <input type="hidden" name="is_active" value="on" />}

      <div className="flex justify-end gap-2 pt-2">
        <Button type="submit" loading={busy}>
          {user ? "Save changes" : "Create account"}
        </Button>
      </div>
    </form>
  );
}
