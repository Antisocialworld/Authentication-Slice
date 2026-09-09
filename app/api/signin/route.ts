import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { DUMMY_BCRYPT_HASH, verifyPassword } from "@/lib/passwords";
import {
  RATE_LIMIT_ATTEMPTS,
  RATE_LIMIT_WINDOW_MS,
  createRateLimiter,
  getClientIp,
} from "@/lib/rate-limit";
import { createSession, setSessionCookie } from "@/lib/session";
import { issuesToFieldErrors, signinSchema } from "@/lib/validation";

// Own limiter instance: sign-in gets its own 5-per-15-minutes budget,
// separate from signup's and resend's, as PRD-001 requires per-route limits.
const limiter = createRateLimiter(RATE_LIMIT_ATTEMPTS, RATE_LIMIT_WINDOW_MS);

// One generic message for missing-user AND wrong-password: a caller can never
// learn, from this response, whether an email even has an account.
const BAD_CREDENTIALS_MESSAGE = "Incorrect email or password.";
// This one is fine to be specific: it only reveals something truthful about
// the account the caller just authenticated as, nothing about other accounts.
const UNVERIFIED_MESSAGE = "Please verify your email before signing in.";

export async function POST(request: NextRequest) {
  const ip = getClientIp(request);
  const rate = limiter.check(ip);
  if (!rate.allowed) {
    return NextResponse.json(
      { error: { message: "Too many sign-in attempts. Try again later." } },
      {
        status: 429,
        headers: { "Retry-After": String(rate.retryAfterSeconds) },
      }
    );
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { error: { message: "Invalid request body." } },
      { status: 400 }
    );
  }

  // Server-side validation is independent of the client's. The client's own
  // pass is UX, not authority.
  const parsed = signinSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      {
        error: {
          message: "Please fix the highlighted fields.",
          fieldErrors: issuesToFieldErrors(parsed.error.issues),
        },
      },
      { status: 400 }
    );
  }

  const { email, password } = parsed.data;

  const user = await prisma.user.findUnique({ where: { email } });

  // Unknown user branch runs the same bcrypt compare as the real branch so
  // responses are also indistinguishable by timing, not just by message.
  if (!user) {
    await verifyPassword(password, DUMMY_BCRYPT_HASH);
    return NextResponse.json(
      { error: { message: BAD_CREDENTIALS_MESSAGE } },
      { status: 401 }
    );
  }

  const passwordMatches = await verifyPassword(password, user.passwordHash);
  if (!passwordMatches) {
    return NextResponse.json(
      { error: { message: BAD_CREDENTIALS_MESSAGE } },
      { status: 401 }
    );
  }

  // Checked only AFTER the password matches: a wrong password on an
  // unverified account still gets the generic message, so guessing an email
  // never reveals whether it exists or is verified.
  if (!user.emailVerifiedAt) {
    return NextResponse.json(
      { error: { message: UNVERIFIED_MESSAGE } },
      { status: 403 }
    );
  }

  const session = await createSession(user.id);
  const response = NextResponse.json({
    ok: true,
    message: "Signed in.",
  });
  setSessionCookie(response, session.id);
  return response;
}