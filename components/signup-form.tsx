"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { PasswordInput } from "@/components/password-input";
import {
  issuesToFieldErrors,
  looksLikeAddressWithDomain,
  passwordUnmetRequirements,
  signupSchema,
} from "@/lib/validation";

type FieldErrors = Record<string, string>;

export function SignupForm() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const [passwordTouched, setPasswordTouched] = useState(false);

  // Real-time email hint: shown while the field has content that doesn't yet
  // look like name@domain. Submit/server validation (signupSchema) overrides it.
  const liveEmailError =
    email.length > 0 && !looksLikeAddressWithDomain(email);
  const emailErrorMessage =
    fieldErrors.email ?? (liveEmailError ? "Enter A Valid Email Address" : null);

  const unmetRequirements = passwordUnmetRequirements(password);
  const showPasswordRequirements =
    passwordTouched && unmetRequirements.length > 0;

  // Button gating is the real validity check, powered by the same
  // signupSchema.safeParse that the submit handler and the server use. One
  // parse instance feeds both the disabled state and the submit path, so the
  // gate and submit-time validation can never disagree. Parsing three short
  // strings per keystroke is microseconds — no measurable cost.
  const parsed = signupSchema.safeParse({ name, email, password });
  const formValid = parsed.success;

  const inputClass = (hasError: boolean) =>
    `w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 ${
      hasError ? "border-red-500" : ""
    }`;

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setFormError(null);
    setFieldErrors({});

    // Reuses the `parsed` result computed for the button gate — same values,
    // same schema, so the gate and this handler literally share one parse.
    // The guard still stands so a future caller can never submit invalid data.
    if (!parsed.success) {
      setFieldErrors(issuesToFieldErrors(parsed.error.issues));
      return;
    }

    setPending(true);
    try {
      const res = await fetch("/api/signup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(parsed.data),
      });
      const data = await res.json().catch(() => null);

      if (res.ok && data?.ok) {
        router.push(
          `/verify-email?email=${encodeURIComponent(parsed.data.email)}`
        );
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

  return (
    <form onSubmit={handleSubmit} className="mt-6 flex flex-col gap-4" noValidate>
      <div className="flex flex-col gap-1">
        <label htmlFor="name" className="text-sm font-medium">
          Full Name
        </label>
        <input
          id="name"
          type="text"
          autoComplete="name"
          placeholder="Full Name"
          autoFocus
          value={name}
          onChange={(e) => setName(e.target.value)}
          aria-invalid={Boolean(fieldErrors.name)}
          aria-describedby={fieldErrors.name ? "name-error" : undefined}
          className={inputClass(Boolean(fieldErrors.name))}
        />
        {fieldErrors.name ? (
          <p id="name-error" className="text-sm text-red-600">
            {fieldErrors.name}
          </p>
        ) : null}
      </div>

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
          aria-invalid={Boolean(emailErrorMessage)}
          aria-describedby={emailErrorMessage ? "email-error" : undefined}
          className={inputClass(Boolean(emailErrorMessage))}
        />
        {emailErrorMessage ? (
          <p id="email-error" className="text-sm text-red-600">
            {emailErrorMessage}
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
          onChange={(e) => {
            setPasswordTouched(true);
            setPassword(e.target.value);
          }}
          autoComplete="new-password"
          hasError={Boolean(fieldErrors.password)}
          inputClass={inputClass(Boolean(fieldErrors.password))}
          describedBy={[
            fieldErrors.password ? "password-error" : null,
            showPasswordRequirements ? "password-requirements" : null,
          ]
            .filter(Boolean)
            .join(" ") || undefined}
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
        disabled={pending || !formValid}
        className="mt-2 rounded-md bg-indigo-600 px-3 py-2 text-sm font-medium text-white hover:bg-indigo-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:ring-offset-2 disabled:opacity-60"
      >
        {pending ? "Creating account…" : "Create account"}
      </button>
    </form>
  );
}