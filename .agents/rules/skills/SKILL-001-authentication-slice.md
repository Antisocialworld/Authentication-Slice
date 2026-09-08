# Skill Reference — Authentication Slice (Next.js + Prisma + Postgres)

Technical implementation reference for PRD 001. This is how-to
guidance, not the spec. Refer to PRD-001 for what to build, this
file for how to build each requirement correctly in this stack.

## Password hashing

- Use bcrypt (via `bcrypt` or `bcryptjs`) or Argon2 (via `argon2`).
- If bcrypt: cost factor 12 is a reasonable default. Higher is
  slower and more secure; be able to justify whatever number is
  chosen.
- Hash at signup and at password reset. Compare (never decrypt) at
  signin.
- Never log, print, or store the plaintext password at any point,
  even temporarily.

## Server-side validation as a schema

- Use a schema library (Zod is the common Next.js pairing) to
  declare validation rules once, in a shared file both the API
  route and the client form can import.
- The client-side form uses the same schema for immediate feedback.
  The server-side handler re-validates independently and does not
  trust the client's validation result.

## Rate limiting

- Applies to four routes specifically: signin, signup, password
  reset request, verification resend. Each needs its own limit, not
  one shared limiter across all of them.
- A simple approach for a slice this size: an in-memory or
  database-backed counter keyed by IP or by account identifier,
  with a time window (e.g. 5 attempts per 15 minutes).
- On limit exceeded, return 429 with a clear retry indication.

## Session management

- Sessions table: id, userId, expiresAt, createdAt at minimum.
- On successful signin, create a session row, set a cookie
  containing only the session ID.
- Cookie flags: httpOnly (not readable by JS), secure (HTTPS only),
  sameSite set appropriately, and a reasonable maxAge matching
  session expiry.
- On every protected request, look up the session by ID, check it
  hasn't expired, and attach the user to the request.
- On sign out, delete the session row and clear the cookie. This is
  what makes "sign out ends the session properly" true, deleting a
  JWT client-side would not have the same guarantee.

## Email verification codes

- Store the code, the associated user/email, and an expiresAt
  timestamp in the database, not just a value shown in the UI.
- On verification attempt, check the code against the database
  value AND check expiresAt is still in the future. Reject if
  either fails, and say which reason if useful for debugging (but
  don't leak this distinction to the end user unnecessarily).
- Resend cooldown: track the last-sent timestamp per user/email,
  reject a new send request until the cooldown window has passed,
  enforced server-side regardless of what the UI countdown shows.

## Password reset tokens

- Similar shape to verification codes: a token (random, unguessable
  string), an expiresAt, and a usedAt (or a boolean "used") field.
- On reset completion, mark the token used immediately, before or
  as part of updating the password, so it cannot be replayed.
- A token that's already been used or has expired should be
  rejected the same way, both are "no longer valid."

## Unique email constraint

- Enforce at the Prisma schema level (`@unique` on the email field),
  not only checked in application code before insert. The database
  constraint is what makes a race condition (two simultaneous
  signups with the same email) actually impossible, not just
  unlikely.

## Idempotent signup

- If a duplicate signup request arrives (same email, in quick
  succession), the second one should not create a second account.
- The unique constraint above will cause the second insert to fail
  at the database level, catch that specific error and return a
  sensible response rather than a generic 500.

## Protected routes

- Middleware or a shared helper checks for a valid session before
  allowing access to the dashboard route.
- No session, or an expired session, redirects to sign in rather
  than showing an error page or a blank screen.

## Accessible inputs

- Every input has a `<label>` element correctly associated via
  `htmlFor`/`id` (or wrapping the input), not just placeholder text
  standing in for a label.
- Visible focus states: don't strip the default focus outline
  without replacing it with something equally visible.

## Testing evidence as you go

- After signup works, immediately capture the users table
  screenshot showing the hash, don't wait until the end.
- After rate limiting is wired up, deliberately trigger it and
  capture the 429 response before moving to the next requirement.
- Keep a running note of exact curl commands used for testing, they
  become Section 4/5's evidence directly.
