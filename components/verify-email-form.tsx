"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { issuesToFieldErrors, verifyEmailSchema } from "@/lib/validation";
import {
  VERIFICATION_CODE_EXPIRY_TEXT,
  VERIFICATION_RESEND_COOLDOWN_SECONDS,
} from "@/lib/verification-constants";

type FieldErrors = Record<string, string>;

export function VerifyEmailForm({ initialEmail }: { initialEmail: string }) {
  const [email] = useState(initialEmail);
  const [code, setCode] = useState("");
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [verified, setVerified] = useState(false);
  const [pending, setPending] = useState(false);
  const [resendPending, setResendPending] = useState(false);
  const [secondsUntilResend, setSecondsUntilResend] = useState(0);

  useEffect(() => {
    if (secondsUntilResend <= 0) return;
    const id = setInterval(() => {
      setSecondsUntilResend((s) => Math.max(0, s - 1));
    }, 1000);
    return () => clearInterval(id);
  }, [secondsUntilResend]);

  const inputClass = (hasError: boolean) =>
    `w-full rounded-md border border-gray-300 px-3 py-2 text-sm tabular-nums tracking-[0.3em] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 ${
      hasError ? "border-red-500" : ""
    }`;

  async function submitCode(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setFormError(null);
    setFieldErrors({});

    const parsed = verifyEmailSchema.safeParse({ email, code });
    if (!parsed.success) {
      setFieldErrors(issuesToFieldErrors(parsed.error.issues));
      return;
    }

    setPending(true);
    try {
      const res = await fetch("/api/verify-email", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(parsed.data),
      });
      const data = await res.json().catch(() => null);

      if (res.ok && data?.ok) {
        setVerified(true);
        return;
      }
      if (data?.error) {
        setFieldErrors(data.error.fieldErrors ?? {});
        setFormError(data.error.message ?? "That code did not work.");
        return;
      }
      setFormError("Something went wrong. Please try again.");
    } catch {
      setFormError("Network error. Please try again.");
    } finally {
      setPending(false);
    }
  }

  async function resend() {
    setFormError(null);
    setFieldErrors({});

    const parsed = verifyEmailSchema.pick({ email: true }).safeParse({ email });
    if (!parsed.success) {
      setFieldErrors(issuesToFieldErrors(parsed.error.issues));
      return;
    }

    setResendPending(true);
    try {
      const res = await fetch("/api/verify-email/resend", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(parsed.data),
      });
      const data = await res.json().catch(() => null);

      if (res.ok && data?.ok) {
        setSecondsUntilResend(VERIFICATION_RESEND_COOLDOWN_SECONDS);
        return;
      }
      // Server tells us exactly how long to wait; the UI countdown is
      // convenience only, the server still enforces the cooldown itself.
      const retryAfter =
        data?.error?.retryAfterSeconds ?? VERIFICATION_RESEND_COOLDOWN_SECONDS;
      setSecondsUntilResend(retryAfter);
      setFormError(
        data?.error?.message ?? "Could not resend the code. Try again later."
      );
    } catch {
      setFormError("Network error. Please try again.");
    } finally {
      setResendPending(false);
    }
  }

  if (verified) {
    return (
      <div className="mt-6 flex flex-col gap-2">
        <p className="text-sm font-medium text-green-700">Email verified.</p>
        <p className="text-sm text-gray-600">
          Your email is verified.{" "}
          <Link href="/signin" className="text-indigo-600 underline-offset-2 hover:underline">
            Sign in now
          </Link>
          .
        </p>
      </div>
    );
  }

  return (
    <form onSubmit={submitCode} className="mt-6 flex flex-col gap-4" noValidate>
      <div className="flex flex-col gap-1">
        <label htmlFor="code" className="text-sm font-medium">
          Verification code
        </label>
        {/* Static statement of the expiry rule, not a countdown (PRD-001 warns
            against a UI timer that isn't the enforcement); the server's
            expiresAt check is the real authority. */}
        <p className="mt-1 text-sm text-gray-500">
          {VERIFICATION_CODE_EXPIRY_TEXT}
        </p>
        <input
          id="code"
          type="text"
          inputMode="numeric"
          autoComplete="one-time-code"
          maxLength={6}
          value={code}
          onChange={(e) =>
            setCode(e.target.value.replace(/[^0-9]/g, "").slice(0, 6))
          }
          aria-invalid={Boolean(fieldErrors.code)}
          aria-describedby={fieldErrors.code ? "code-error" : undefined}
          className={inputClass(Boolean(fieldErrors.code))}
        />
        {fieldErrors.code ? (
          <p id="code-error" className="text-sm text-red-600">
            {fieldErrors.code}
          </p>
        ) : null}
      </div>

      {fieldErrors.email ? (
        <p className="text-sm text-red-600">{fieldErrors.email}</p>
      ) : null}

      {formError ? (
        <p role="alert" className="text-sm text-red-600">
          {formError}
        </p>
      ) : null}

      <button
        type="submit"
        disabled={pending}
        className="mt-2 rounded-md bg-indigo-600 px-3 py-2 text-sm font-medium text-white hover:bg-indigo-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:ring-offset-2 disabled:opacity-60"
      >
        {pending ? "Verifying…" : "Verify email"}
      </button>

      <button
        type="button"
        onClick={resend}
        disabled={resendPending || secondsUntilResend > 0}
        className="rounded-md px-3 py-2 text-sm font-medium text-indigo-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:ring-offset-2 disabled:opacity-60"
      >
        {secondsUntilResend > 0
          ? `Resend code in ${secondsUntilResend}s`
          : resendPending
            ? "Resending…"
            : "Resend code"}
      </button>
    </form>
  );
}