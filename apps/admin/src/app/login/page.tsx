"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useState, type FormEvent } from "react";
import { Insignia } from "@/components/Insignia";
import { Alert, Button, FieldShell, inputClass } from "@/components/ui";

type Step = "credentials" | "mfa_challenge" | "mfa_enrol" | "recovery_codes";

async function post(url: string, body: unknown) {
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json", Accept: "application/json" },
    body: JSON.stringify(body),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    const first = data?.errors ? Object.values(data.errors as Record<string, string[]>)[0]?.[0] : null;
    throw new Error(first ?? data?.message ?? "Something went wrong.");
  }
  return data;
}

function LoginFlow() {
  const router = useRouter();
  const params = useSearchParams();
  const [step, setStep] = useState<Step>("credentials");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [enrolment, setEnrolment] = useState<{ secret: string; qr_svg: string } | null>(null);
  const [recoveryCodes, setRecoveryCodes] = useState<string[]>([]);
  const [useRecovery, setUseRecovery] = useState(false);
  const [mustChange, setMustChange] = useState(false);

  async function run(fn: () => Promise<void>) {
    setBusy(true);
    setError(null);
    try {
      await fn();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  const finish = (mustChangePassword: boolean) => router.replace(mustChangePassword ? "/account/password" : "/");

  function onCredentials(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    run(async () => {
      const data = await post("/api/auth/login", { email: form.get("email"), password: form.get("password") });
      if (data.next === "mfa_enrol") {
        setEnrolment(await post("/api/auth/mfa/setup", {}));
        setStep("mfa_enrol");
      } else {
        setStep("mfa_challenge");
      }
    });
  }

  function onChallenge(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const value = String(new FormData(e.currentTarget).get("code") ?? "");
    run(async () => {
      const data = await post("/api/auth/mfa/verify", useRecovery ? { recovery_code: value } : { code: value });
      finish(data.must_change_password);
    });
  }

  function onEnrol(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const code = String(new FormData(e.currentTarget).get("code") ?? "");
    run(async () => {
      const data = await post("/api/auth/mfa/confirm", { code });
      setRecoveryCodes(data.recovery_codes ?? []);
      setMustChange(!!data.must_change_password);
      setStep("recovery_codes");
    });
  }

  return (
    <div className="grid min-h-dvh lg:grid-cols-[1.1fr_1fr]">
      <div className="relative hidden overflow-hidden bg-gradient-to-b from-navy-900 via-navy-700 to-navy-600 lg:block">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_75%_60%,rgb(130_173_230_/0.35),transparent_65%)]" />
        <div className="absolute inset-0 opacity-[0.07] [background-image:linear-gradient(white_1px,transparent_1px),linear-gradient(90deg,white_1px,transparent_1px)] [background-size:48px_48px]" />
        <div className="relative flex h-full flex-col justify-between p-12 text-white">
          <div className="flex items-center gap-3">
            <Insignia className="size-11" />
            <span className="text-lg font-semibold text-white">Sri Lanka Air Force</span>
          </div>
          <div>
            <h1 className="max-w-md text-4xl leading-tight font-semibold">Content &amp; governance console</h1>
            <p className="mt-4 max-w-md text-navy-200">
              Authorised personnel only. Every action in this system is recorded in a tamper-evident audit trail.
            </p>
          </div>
          <p className="text-xs text-navy-300">Directorate of Electronics &amp; Computer Engineering</p>
        </div>
      </div>

      <div className="flex items-center justify-center bg-surface px-6 py-12">
        <div className="w-full max-w-sm">
          <div className="mb-8 flex items-center gap-3 lg:hidden">
            <Insignia className="size-9" />
            <span className="font-semibold">SLAF CMS</span>
          </div>

          {params.get("expired") && step === "credentials" && (
            <div className="mb-4">
              <Alert tone="warn">Your session has ended. Please sign in again.</Alert>
            </div>
          )}
          {error && (
            <div className="mb-4">
              <Alert tone="error">{error}</Alert>
            </div>
          )}

          {step === "credentials" && (
            <form onSubmit={onCredentials} className="space-y-5">
              <div>
                <h2 className="text-xl font-semibold">Sign in</h2>
                <p className="mt-1 text-sm text-ink-muted">Step 1 of 2 — official credentials</p>
              </div>
              <FieldShell label="Official email" htmlFor="email">
                <input id="email" name="email" type="email" autoComplete="username" required className={inputClass} />
              </FieldShell>
              <FieldShell label="Password" htmlFor="password">
                <input id="password" name="password" type="password" autoComplete="current-password" required className={inputClass} />
              </FieldShell>
              <Button type="submit" loading={busy} className="w-full">
                Continue
              </Button>
            </form>
          )}

          {step === "mfa_challenge" && (
            <form onSubmit={onChallenge} className="space-y-5">
              <div>
                <h2 className="text-xl font-semibold">Two-factor verification</h2>
                <p className="mt-1 text-sm text-ink-muted">
                  Step 2 of 2 — {useRecovery ? "enter one of your recovery codes" : "enter the 6-digit code from your authenticator app"}
                </p>
              </div>
              <FieldShell label={useRecovery ? "Recovery code" : "Authentication code"} htmlFor="code">
                <input
                  id="code"
                  name="code"
                  key={useRecovery ? "r" : "c"}
                  required
                  autoFocus
                  autoComplete="one-time-code"
                  inputMode={useRecovery ? "text" : "numeric"}
                  pattern={useRecovery ? undefined : "[0-9]{6}"}
                  maxLength={useRecovery ? 11 : 6}
                  className={`${inputClass} text-center font-mono text-lg tracking-[0.4em]`}
                />
              </FieldShell>
              <Button type="submit" loading={busy} className="w-full">
                Verify
              </Button>
              <button type="button" onClick={() => setUseRecovery(!useRecovery)} className="w-full text-center text-sm text-link underline-offset-2 hover:underline">
                {useRecovery ? "Use authenticator code instead" : "Lost your device? Use a recovery code"}
              </button>
            </form>
          )}

          {step === "mfa_enrol" && enrolment && (
            <form onSubmit={onEnrol} className="space-y-5">
              <div>
                <h2 className="text-xl font-semibold">Set up two-factor authentication</h2>
                <p className="mt-1 text-sm text-ink-muted">
                  MFA is mandatory for all administrative accounts. Scan this code with Google Authenticator or Microsoft Authenticator.
                </p>
              </div>
              <div className="flex justify-center rounded-lg border border-line bg-white p-4">
                {/* Rendered as an image so any markup in the SVG can never execute. */}
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={`data:image/svg+xml;base64,${btoa(enrolment.qr_svg)}`} alt="MFA enrolment QR code" width={200} height={200} />
              </div>
              <details className="text-sm">
                <summary className="cursor-pointer text-ink-muted">Can&apos;t scan? Enter the key manually</summary>
                <code className="mt-2 block rounded bg-surface-muted p-2 font-mono text-xs break-all">{enrolment.secret}</code>
              </details>
              <FieldShell label="Enter the 6-digit code shown in the app" htmlFor="code">
                <input
                  id="code"
                  name="code"
                  required
                  inputMode="numeric"
                  pattern="[0-9]{6}"
                  maxLength={6}
                  autoComplete="one-time-code"
                  className={`${inputClass} text-center font-mono text-lg tracking-[0.4em]`}
                />
              </FieldShell>
              <Button type="submit" loading={busy} className="w-full">
                Activate MFA
              </Button>
            </form>
          )}

          {step === "recovery_codes" && (
            <div className="space-y-5">
              <div>
                <h2 className="text-xl font-semibold">Save your recovery codes</h2>
                <p className="mt-1 text-sm text-ink-muted">
                  Each code works once if you lose your authenticator device. They will not be shown again — store them in a sealed envelope or
                  approved secure location.
                </p>
              </div>
              <ul className="grid grid-cols-2 gap-2 rounded-lg border border-line bg-surface-muted p-4 font-mono text-sm">
                {recoveryCodes.map((c) => (
                  <li key={c}>{c}</li>
                ))}
              </ul>
              <Button className="w-full" onClick={() => finish(mustChange)}>
                I have stored these codes securely
              </Button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense>
      <LoginFlow />
    </Suspense>
  );
}
