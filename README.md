# Authentication Slice

Account creation, email verification, sign-in, password reset and a protected dashboard, built as one small,
fully documented flow. It is deliberately not an app: no landing page, profile editing, social sign-in or two-factor.

**Stack:** Next.js 16, React 19, Prisma 7 with SQLite, bcryptjs for password hashing, Zod 4 for validation
(the same schema runs in the browser and on the server), Nodemailer for optional Gmail email.

## What it does
- **Sign up** with name, email and password. Validation runs in the form and again on the server.
- **Verify email** with a one-time six-digit code stored in the database, with a resend route.
- **Sign in** with database-backed sessions (the cookie holds only a session ID, so sign-out ends the session at once).
- **Forgot and reset password** with an emailed link.
- **Protected dashboard** (name and a sign-out button) that redirects when you are signed out.
- **Rate limits** on sign-up, sign-in, password-reset request and verification resend.

## Run it
1. `npm install`
2. Copy `.env.example` to `.env`. The only required value is `DATABASE_URL`; the working value for the local SQLite file is `file:./dev.db`.
   Email is optional: set `GMAIL_USER` and `GMAIL_APP_PASSWORD` (by hand, never commit them) to send real mail. Without them, codes and reset links print in the server console.
3. `npx prisma generate`
4. `npx prisma migrate dev`
5. `npm run dev`, then open http://localhost:3000/signup

## Read the reasoning
[`DOCUMENTATION.md`](./DOCUMENTATION.md) explains the flow step by step, the data model, every concept (hashing, sessions,
rate limiting, expiry, idempotency, database constraints), the real problems hit while building, and what this slice does not handle.

## Known limits (from the documentation)
In-memory rate limiter (resets on restart), verification codes and reset tokens stored in plain text, and SQLite instead of a
production database. Each is explained, with the production replacement, in section 7 of `DOCUMENTATION.md`.

## What I would do next
Hash codes and tokens at rest, move the limiter to the database, and add a screenshot or short clip of the flow here.

License: MIT
