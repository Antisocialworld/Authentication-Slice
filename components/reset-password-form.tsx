"use client";

import Link from "next/link";
import { useState } from "react";
import {
  issuesToFieldErrors,
  passwordUnmetRequirements,
  resetPasswordSchema,
} from "@/lib/validation";
import { PASSWORD_RESET_TOKEN_EXPIRY_TEXT } from "@/lib/verification-constants";

type FieldErrors = Record<string, string>;

export function ResetPasswordForm({ initialToken }: { initialToken: string }) {
  const [token] = useState(initialToken);
  const [password, setPassword] = useState("");
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [reset, setReset] = useState(false);
  const [pending, setPending] = useState(false);
  const [passwordTouched, setPasswordTouched] = useState(false);

  const unmetRequirements = passwordUnmetRequirements(password);
  const showPasswordRequirements =
    passwordTouched && unmetRequirements.length > 0;

  // Button enablement is a form-is-filled check, not a validity check; the
  // real validity gate is resetPasswordSchema on submit (and on the server).
  const allFieldsFilled = password.length > 0;

  const inputClass = (hasError: boolean) =>
    `w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 ${
      hasError ? "border-red-500" : ""
    }`;

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setFormError(null);
    setFieldErrors({});

    // Same schema the server re-validates against → instant feedback, no drift.
    const parsed = resetPasswordSchema.safeParse({ token, password });
    if (!parsed.success) {
      setFieldErrors(issuesToFieldErrors(parsed.error.issues));
      return;
    }

    setPending(true);
    try {
      const res = await fetch("/api/reset-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(parsed.data),
      });
      const data = await res.json().catch(() => null);

      if (res.ok && data?.ok) {
        setReset(true);
        return;
      }
      if (data?.error) {
        setFieldErrors(data.error.fieldErrors ?? {});
        setFormError(data.error.message ?? "That reset link did not work.");
        return;
      }
      setFormError("Something went wrong. Please try again.");
    } catch {
      setFormError("Network error. Please try again.");
    } finally {
      setPending(false);
    }
  }

  if (reset) {
    return (
      <div className="mt-6 flex flex-col gap-2">
        <p className="text-sm font-medium text-green-700">
          Password reset successfully.
        </p>
        <p className="text-sm text-gray-600">
          You are not signed in automatically.{" "}
          <Link href="/signin" className="text-indigo-600 underline-offset-2 hover:underline">
            Sign in with your new password
          </Link>
          .
        </p>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="mt-6 flex flex-col gap-4" noValidate>
      <div className="flex flex-col gap-1">
        <label htmlFor="password" className="text-sm font-medium">
          New password
        </label>
        {/* Static statement of the expiry rule, not a countdown; the server's
            expiresAt check is the real enforcement. */}
        <p className="mt-1 text-sm text-gray-500">
          {PASSWORD_RESET_TOKEN_EXPIRY_TEXT}
        </p>
        <input
          id="password"
          type="password"
          autoComplete="new-password"
          value={password}
          onChange={(e) => {
            setPasswordTouched(true);
            setPassword(e.target.value);
          }}
          aria-invalid={Boolean(fieldErrors.password)}
          aria-describedby={[
            fieldErrors.password ? "password-error" : null,
            showPasswordRequirements ? "password-requirements" : null,
          ]
            .filter(Boolean)
            .join(" ") || undefined}
          className={inputClass(Boolean(fieldErrors.password))}
        />
        {fieldErrors.password ? (
          <p id="password-error" className="text-sm text-red-600">
            {fieldErrors.password}
          </p>
        ) : null}
        {showPasswordRequirements ? (
          <ul
            id="password-requirements"
            aria-label="Password requirements"
            className="list-inside list-disc text-sm text-red-600"
          >
            {unmetRequirements.map((requirement) => (
              <li key={requirement.id}>{requirement.label}</li>
            ))}
          </ul>
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
        {pending ? "Resetting…" : "Reset password"}
      </button>
    </form>
  );
}
