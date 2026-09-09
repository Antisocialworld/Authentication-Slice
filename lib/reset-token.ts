import { randomBytes } from "node:crypto";

// A long, random, unguessable token for the password-reset flow. Not a
// six-digit code: it is carried in a URL, so it needs real entropy (32 random
// bytes) rather than the ~20 bits of a 6-digit number. base64url keeps it
// safe to embed in a query string without encoding concerns.
export function generatePasswordResetToken(): string {
  return randomBytes(32).toString("base64url");
}
