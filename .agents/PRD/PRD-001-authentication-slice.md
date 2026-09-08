# PRD 001 — Authentication Slice

## What This Is

A complete authentication flow: create account, sign in, forgot password, reset password, email verification, and a placeholder dashboard showing only the signed-in user's name and a sign-out button. Nothing else exists in this repository.

## Stack

Next.js. Postgres via Prisma. Database-backed sessions (a sessions table; the cookie holds only the session ID). Hosted Postgres provider, chosen at setup time.

## Screens (exactly these, nothing more)

- Create account
- Sign in
- Forgot password (request form)
- Reset password (form reached from the emailed link)
- Email verification (code entry + resend control)
- Placeholder dashboard: signed-in user's name + sign-out button, nothing else

## Behaviour (build and verify in this order)

1. A new user creates an account, verifies their email, reaches the dashboard.
2. A returning user signs in.
3. A user who forgets their password resets it and signs in with the new one.
4. A signed-out user typing the dashboard URL directly is redirected to sign in.
5. Sign out properly ends the session.

## Do Not Build

No landing page. No marketing page. No dashboard features beyond name + sign-out. No profile editing. No settings. No social sign in. No two-factor.

## Engineering Requirements (all eleven, all must be present)

1. Password hashing with an adaptive algorithm (bcrypt or Argon2, never SHA-256/512 or MD5).
2. Server-side validation declared as a schema, not scattered through handlers; client-side validation mirrors it for feedback.
3. Rate limiting on: signin, signup, password reset request, verification code resend.
4. Session management with a correctly configured session cookie.
5. Email verification codes that expire in the database, not only in the UI.
6. A resend cooldown enforced server-side.
7. Password reset tokens that are single-use and time-limited.
8. A unique constraint on email at the database level.
9. An idempotent signup endpoint (a double submission creates one account).
10. Protected route handling (dashboard unreachable without a session).
11. Input groups with labels programmatically bound to inputs, and visible focus states.

## Concepts to Document in Section 5 (each needs all four questions)

Password hashing. Rate limiting. Client-side vs server-side validation. Session management (why sessions over tokens). Token and code expiry (why it must live in the database). Idempotency. Database constraints as a last line of defence. Protected routes.

## Evidence to Capture as We Go

- Screenshot of the users table showing a stored hash.
- The exact curl command that hits signup directly, and the server's response.
- Evidence of a rate limit actually triggering (status code shown).
- Screenshot of a verification code in the database, and the same record after expiry.

## Traps to Actively Avoid

- Validating only on the client and calling it done.
- Building the dashboard before the auth is solid.
- Verification codes with no server-side expiry (UI countdown as theatre).
- Committing `.env`.
- Rate limiting signin but forgetting the resend route.

## Defence Questions (answer these out loud before submitting)

1. Why that hashing algorithm, and what happens if the cost factor is set to 4?
2. Show the exact line where the session is created, and what's inside the cookie.
3. Signup request sent twice in the same second — walk through what happens in the database.
4. Which validation rules cannot be enforced on the client, and why?
