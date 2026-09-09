"use client";

import { useState } from "react";
import { forgotPasswordSchema, issuesToFieldErrors } from "@/lib/validation";
import { PASSWORD_RESET_TOKEN_EXPIRY_TEXT } from "@/lib/verification-constants";

type FieldErrors = Record<string, string>;

export function ForgotPasswordForm() {
  const [email, setEmail] = useState("");
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [sent, setSent] = useState(false);
  const [pending, setPending] = useState(false);

  const inputClass = (hasError: boolean) =>
    `w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 ${
      hasError ? "border-red-500" : ""
    }`;

  // Button enablement is a form-is-filled check, not a validity check; the
  // real validity gate is forgotPasswordSchema on submit (and on the server).
  const allFieldsFilled = email.trim().length > 0;

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setFormError(null);
    setFieldErrors({});

    // Same schema the server re-validates against → instant feedback, no drift.
    const parsed = forgotPasswordSchema.safeParse({ email });
    if (!parsed.success) {
      setFieldErrors(issuesToFieldErrors(parsed.error.issues));
      return;
    }

    setPending(true);
    try {
      const res = await fetch("/api/forgot-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(parsed.data),
      });
      const data = await res.json().catch(() => null);

      if (res.ok && data?.ok) {
        setSent(true);
        return;
      }
      if (res.status === 429) {
        setFormError(
          data?.error?.message ?? "Too many attempts. Try again later."
        );
        return;
      }
      if (data?.error) {
        setFieldErrors(data.error.fieldErrors ?? {});
        setFormError(data.error.message ?? null);
        return;
      }
      setFormError("Something went wrong. Please try again.");
    } catch {
      setFormError("Network error. Please try again.");
    } finally {
      setPending(false);
    }
  }

  if (sent) {
    return (
      <div className="mt-6 flex flex-col gap-2">
        <p className="text-sm font-medium text-green-700">
          Check your email
        </p>
        <p className="text-sm text-gray-600">
          If an account exists for that address, a password reset link has been
          sent. {PASSWORD_RESET_TOKEN_EXPIRY_TEXT} It can only be used once.
        </p>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="mt-6 flex flex-col gap-4" noValidate>
      <div className="flex flex-col gap-1">
        <label htmlFor="email" className="text-sm font-medium">
          Email
        </label>
        <input
          id="email"
          type="email"
          autoComplete="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          aria-invalid={Boolean(fieldErrors.email)}
          aria-describedby={fieldErrors.email ? "email-error" : undefined}
          className={inputClass(Boolean(fieldErrors.email))}
        />
        {fieldErrors.email ? (
          <p id="email-error" className="text-sm text-red-600">
            {fieldErrors.email}
          </p>
        ) : null}
      </div>

      {formError ? (
        <p role="alert" className="text-sm text-red-600">
          {formError}
        </p>
      ) : null}

      <button
        type="submit"
        disabled={pending || !allFieldsFilled}
        className="mt-2 rounded-md bg-indigo-600 px-3 py-2 text-sm font-medium text-white hover:bg-indigo-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:ring-offset-2 disabled:opacity-60"
      >
        {pending ? "Sending…" : "Send reset link"}
      </button>
    </form>
  );
}
