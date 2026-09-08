import { z } from "zod";

// Email is trimmed/lowercased then validated. Server re-validates this exact
// schema on every request; the forms import the same schema for client-side
// feedback, so the two can never drift apart.

const email = z
  .string()
  .trim()
  .toLowerCase()
  .pipe(z.email({ error: "Enter a valid email address" }));

// Password rules — single source of truth: signupSchema mandates them (and the
// server enforces them), and the signup form's live requirements list is built
// from this same array, so client list and server rules can never drift.
//
// The "number OR one of # @ > ^" rule is deliberately ONE combined check
// ([0-9#@>^]) and one list line, matching the brief's wording rather than
// splitting it into two lines.
export const PASSWORD_REQUIREMENTS = [
  {
    id: "min-8",
    label: "Minimum of 8 characters",
    meets: (value: string) => value.length >= 8,
  },
  {
    id: "has-upper",
    label: "Must contain an uppercase letter",
    meets: (value: string) => /[A-Z]/.test(value),
  },
  {
    id: "has-lower",
    label: "Must contain a lowercase letter",
    meets: (value: string) => /[a-z]/.test(value),
  },
  {
    id: "number-or-special",
    label: "Must contain a number or one of these special characters: # @ > ^",
    meets: (value: string) => /[0-9#@>^]/.test(value),
  },
] as const satisfies ReadonlyArray<{
  id: string;
  label: string;
  meets: (value: string) => boolean;
}>;

export type PasswordRequirement = (typeof PASSWORD_REQUIREMENTS)[number];

// Requirements currently NOT satisfied by `value`. The signup form renders this
// list live; when it is empty the list is hidden again.
export function passwordUnmetRequirements(
  value: string
): PasswordRequirement[] {
  return PASSWORD_REQUIREMENTS.filter((r) => !r.meets(value));
}

// Real-time keystroke heuristic for the email field — UX only. Once the user
// has typed something shaped like name@domain we stop nagging, even before a
// TLD is complete. It never supersedes z.email() in signupSchema, which stays
// the authority on submit and on the server.
export function looksLikeAddressWithDomain(value: string): boolean {
  return /^[^\s@]+@[^\s@]+$/.test(value);
}

export const signupSchema = z.object({
  name: z
    .string()
    .trim()
    // Distinct from the structure message below: a blank name gets this
    // "field is empty" message, never the "each part too short" one.
    .min(1, { error: "Full name is required." })
    .refine(
      (value) => {
        // trim() already ran; split collapses internal runs of whitespace, so
        // extra spaces/tabs between words are tolerated. Rule: at least two
        // words (middle names fine) and every word at least 2 chars — "J Doe"
        // fails even though the string is long enough.
        const words = value.split(/\s+/);
        return words.length >= 2 && words.every((word) => word.length >= 2);
      },
      {
        error:
          "Enter your full name (first and last) — each part must be at least 2 characters",
      }
    )
    .max(100, { error: "Full name must be 100 characters or fewer" }),
  email,
  // max 72 on purpose: bcrypt only uses the first 72 bytes, so anything past
  // that would be silently ignored — a silent truncation we refuse to allow.
  password: z
    .string()
    .max(72, { error: "Password must be 72 characters or fewer" })
    .superRefine((value, ctx) => {
      for (const requirement of PASSWORD_REQUIREMENTS) {
        if (!requirement.meets(value)) {
          ctx.addIssue({
            code: "custom",
            message: requirement.label,
            path: ["password"],
          });
          break;
        }
      }
    }),
});

export const signinSchema = z.object({
  email,
  // No password-policy rules here on purpose: sign-in compares against a
  // stored hash, it does not judge the password's strength. Requiring any
  // policy at sign-in would reject accounts whose (already-valid) password
  // predates a later policy tightening.
  password: z.string().min(1, { error: "Password is required" }),
});

export const verifyEmailSchema = z.object({
  email,
  code: z.string().regex(/^\d{6}$/, { error: "Enter the 6-digit code" }),
});

export const resendCodeSchema = z.object({
  email,
});

export const forgotPasswordSchema = z.object({
  email,
});

// Same password policy as signup, so a user choosing a new password is held
// to exactly the same rules the account was created under. The token is a
// required opaque string; it is resolved against the DB by the server.
export const resetPasswordSchema = z.object({
  token: z.string().min(1, { error: "Reset link is missing." }),
  password: z
    .string()
    .max(72, { error: "Password must be 72 characters or fewer" })
    .superRefine((value, ctx) => {
      for (const requirement of PASSWORD_REQUIREMENTS) {
        if (!requirement.meets(value)) {
          ctx.addIssue({
            code: "custom",
            message: requirement.label,
            path: ["password"],
          });
          break;
        }
      }
    }),
});

export type SignupInput = z.infer<typeof signupSchema>;
export type SigninInput = z.infer<typeof signinSchema>;
export type VerifyEmailInput = z.infer<typeof verifyEmailSchema>;
export type ResendCodeInput = z.infer<typeof resendCodeSchema>;
export type ForgotPasswordInput = z.infer<typeof forgotPasswordSchema>;
export type ResetPasswordInput = z.infer<typeof resetPasswordSchema>;

// Shape issues back to the client as { path, message } pairs the form can
// render per-field, mirroring what the client-side validation shows.
export function issuesToFieldErrors(
  issues: z.ZodIssue[]
): Record<string, string> {
  const errors: Record<string, string> = {};
  for (const issue of issues) {
    const key = issue.path.join(".") || "form";
    if (!errors[key]) {
      errors[key] = issue.message;
    }
  }
  return errors;
}