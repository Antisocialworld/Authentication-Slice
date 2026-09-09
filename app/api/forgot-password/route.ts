import { NextRequest, NextResponse } from "next/server";
import { deliverPasswordResetLink } from "@/lib/email";
import { prisma } from "@/lib/prisma";
import {
  RATE_LIMIT_ATTEMPTS,
  RATE_LIMIT_WINDOW_MS,
  createRateLimiter,
  getClientIp,
} from "@/lib/rate-limit";
import { generatePasswordResetToken } from "@/lib/reset-token";
import { forgotPasswordSchema, issuesToFieldErrors } from "@/lib/validation";
import { PASSWORD_RESET_TOKEN_TTL_MS } from "@/lib/verification-constants";

// Own limiter instance: the forgot-password request needs its own budget,
// separate from signup / signin / resend, per PRD-001's per-route limits
// (requirement 3 lists "password reset request").
const limiter = createRateLimiter(RATE_LIMIT_ATTEMPTS, RATE_LIMIT_WINDOW_MS);

// Same reply whether the email has an account or not, so this endpoint can
// never be used to enumerate which emails are signed up.
const GENERIC_MESSAGE =
  "If an account exists for that email, a password reset link has been sent.";

export async function POST(request: NextRequest) {
  const ip = getClientIp(request);
  const rate = limiter.check(ip);
  if (!rate.allowed) {
    return NextResponse.json(
      { error: { message: "Too many requests. Try again later." } },
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

  const parsed = forgotPasswordSchema.safeParse(body);
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

  const { email } = parsed.data;

  const user = await prisma.user.findUnique({ where: { email } });

  // Unknown OR unverified email gets the identical generic success reply. Only
  // a real, verified account can be reset (an unverified account's owner has
  // never proven they control the address), but neither case reveals anything.
  if (!user || !user.emailVerifiedAt) {
    return NextResponse.json({ ok: true, message: GENERIC_MESSAGE });
  }

  const token = generatePasswordResetToken();
  const expiresAt = new Date(Date.now() + PASSWORD_RESET_TOKEN_TTL_MS);

  await prisma.passwordResetToken.create({
    data: { userId: user.id, token, expiresAt },
  });

  const resetLink = `http://localhost:3000/reset-password?token=${token}`;
  deliverPasswordResetLink(email, resetLink);

  return NextResponse.json({ ok: true, message: GENERIC_MESSAGE });
}
