// Verification constants are plain values, safe to import from both server
// and client code. The TTL is the lifespan of one code; the resend cooldown
// is the minimum gap the server accepts between two codes for the same user.
//
// Both expiry windows are 5 minutes — a deliberate tightening over the
// original 15, and a single decision shared by both credentials. Security
// case: each code and each reset link is a bearer credential travelling
// through a secondary channel (email), so every minute it stays alive is a
// minute a leaked or forwarded message is usable; at five minutes that
// exposure is a third of what it was. Usability case: both are cheap to
// re-request (resend the code, ask for a new link) and email delivery takes
// seconds, so a user who runs out of time is one click from a fresh
// credential rather than locked out. Keeping the code and token windows
// identical means there is exactly one "5 minutes" rule for the user to
// learn, and the two constants name the same decision rather than two
// drifting ones.
//
// The expiry texts below are the single source for every user-facing
// statement — screen and email alike. The sentence is composed from the
// TTL constant, so no displayed copy can ever show a different number than
// the window actually enforced.

export const VERIFICATION_CODE_TTL_MS = 5 * 60 * 1000;
export const VERIFICATION_RESEND_COOLDOWN_MS = 60 * 1000;
export const VERIFICATION_RESEND_COOLDOWN_SECONDS = Math.ceil(
  VERIFICATION_RESEND_COOLDOWN_MS / 1000
);

export const PASSWORD_RESET_TOKEN_TTL_MS = 5 * 60 * 1000;

// User-facing expiry statements, derived from the constants above.
export const VERIFICATION_CODE_EXPIRY_TEXT = `This code expires ${Math.round(
  VERIFICATION_CODE_TTL_MS / 60_000
)} minutes after being sent.`;
export const PASSWORD_RESET_TOKEN_EXPIRY_TEXT = `This link expires ${Math.round(
  PASSWORD_RESET_TOKEN_TTL_MS / 60_000
)} minutes after being sent.`;