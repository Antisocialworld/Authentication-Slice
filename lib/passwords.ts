import bcrypt from "bcryptjs";

// bcrypt is an adaptive, deliberately slow hash. Cost factor 12 is the
// SKILL-001 default: ~100ms per hash on typical hardware. The DB stores only
// this output; the plaintext password never touches the database or the logs.
export const BCRYPT_COST = 12;

export function hashPassword(plaintext: string): Promise<string> {
  return bcrypt.hash(plaintext, BCRYPT_COST);
}

// Compare only — never decrypt. bcrypt hashes are one-way; there is no
// "decryption" to fall back on.
export function verifyPassword(
  plaintext: string,
  hash: string
): Promise<boolean> {
  return bcrypt.compare(plaintext, hash);
}

// Pre-generated bcrypt hash of a throwaway string, used ONLY on the sign-in
// "no such user" branch so that branch does the same ~100ms bcrypt work as a
// real password compare. That closes the timing side-channel that would
// otherwise reveal whether an email exists. No secret: the plaintext is a
// discarded non-word, never logged.
export const DUMMY_BCRYPT_HASH =
  "$2b$12$0uIIhk6TsoMBzL4pcUReM.ge1heDW8NVO1bZNnnrj23kA4zXhr.F2";