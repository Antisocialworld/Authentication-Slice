import { NextRequest, NextResponse } from "next/server";
import { deliverVerificationCode } from "@/lib/email";
import { prisma } from "@/lib/prisma";
import {
  RATE_LIMIT_ATTEMPTS,
  RATE_LIMIT_WINDOW_MS,
  createRateLimiter,
  getClientIp,
} from "@/lib/rate-limit";
import { issuesToFieldErrors, resendCodeSchema } from "@/lib/validation";
import { generateVerificationCode } from "@/lib/verification";
import {
  VERIFICATION_CODE_TTL_MS,
  VERIFICATION_RESEND_COOLDOWN_MS,
} from "@/lib/verification-constants";

// Separate limiter from signup: each rate-limited route has its own budget.
const limiter = createRateLimiter(RATE_LIMIT_ATTEMPTS, RATE_LIMIT_WINDOW_MS);

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

  const parsed = resendCodeSchema.safeParse(body);
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
  if (!user) {
    // Same response as success so this endpoint cannot be used to enumerate
    // which emails have accounts.
    return NextResponse.json({
      ok: true,
      message: "If an account exists, a new code has been sent.",
    });
  }

  if (user.emailVerifiedAt) {
    return NextResponse.json(
      { error: { message: "Your email is already verified." } },
      { status: 400 }
    );
  }

  const latest = await prisma.verificationCode.findFirst({
    where: { userId: user.id },
    orderBy: { createdAt: "desc" },
  });

  // Server-side resend cooldown, derived from the DB record of the last code
  // actually sent. The UI countdown is just convenience; this is the authority.
  const now = Date.now();
  if (latest) {
    const elapsedSinceLastSend = now - latest.lastSentAt.getTime();
    if (elapsedSinceLastSend < VERIFICATION_RESEND_COOLDOWN_MS) {
      const retryAfterSeconds = Math.ceil(
        (VERIFICATION_RESEND_COOLDOWN_MS - elapsedSinceLastSend) / 1000
      );
      return NextResponse.json(
        {
          error: {
            message: "Please wait before requesting another code.",
            retryAfterSeconds,
          },
        },
        {
          status: 429,
          headers: { "Retry-After": String(retryAfterSeconds) },
        }
      );
    }
  }

  const code = generateVerificationCode();
  const issuedAt = new Date();
  await prisma.verificationCode.create({
    data: {
      userId: user.id,
      code,
      expiresAt: new Date(now + VERIFICATION_CODE_TTL_MS),
      lastSentAt: issuedAt,
    },
  });

  deliverVerificationCode(email, code);

  return NextResponse.json({
    ok: true,
    message: "A new code has been sent.",
  });
}