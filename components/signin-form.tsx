"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { PasswordInput } from "@/components/password-input";
import { issuesToFieldErrors, signinSchema } from "@/lib/validation";

type FieldErrors = Record<string, string>;

export function SigninForm() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  const inputClass = (hasError: boolean) =>
    `w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 ${
      hasError ? "border-red-500" : ""
    }`;

  // Same enabling rule as signup: button is a form-is-filled check, not a
  // validity check. Validity stays with signinSchema on submit (and server).
  const allFieldsFilled =
    email.trim().length > 0 && password.length > 0;

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setFormError(null);
    setFieldErrors({});

    // Same schema the server re-validates against → instant feedback, no drift.
    const parsed = signinSchema.safeParse({ email, password });
    if (!parsed.success) {
      setFieldErrors(issuesToFieldErrors(parsed.error.issues));
      return;
    }

    setPending(true);
    try {
      const res = await fetch("/api/signin", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(parsed.data),
      });
      const data = await res.json().catch(() => null);

      if (res.ok && data?.ok) {
        router.push("/dashboard");
        return;
      }
      if (res.status === 429) {
        setFormError(
          data?.error?.message ?? "Too many sign-in attempts. Try again later."
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
          autoFocus
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

      <div className="flex flex-col gap-1">
        <label htmlFor="password" className="text-sm font-medium">
          Password
        </label>
        <PasswordInput
          id="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          autoComplete="current-password"
          hasError={Boolean(fieldErrors.password)}
          inputClass={inputClass(Boolean(fieldErrors.password))}
          describedBy={fieldErrors.password ? "password-error" : undefined}
        />
        {fieldErrors.password ? (
          <p id="password-error" className="text-sm text-red-600">
            {fieldErrors.password}
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
        {pending ? "Signing in…" : "Sign in"}
      </button>
    </form>
  );
}