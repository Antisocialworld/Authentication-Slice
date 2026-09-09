import { randomInt } from "node:crypto";

// Six-digit numeric code from a cryptographically secure source. Stored
// plaintext in the database so the verification screen can show evidence and
// because a brute-forced 6-digit code is already rate-limited per IP.
export function generateVerificationCode(): string {
  return randomInt(0, 1_000_000).toString().padStart(6, "0");
}