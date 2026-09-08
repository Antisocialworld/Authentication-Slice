import { NextRequest, NextResponse } from "next/server";
import { Prisma } from "@/app/generated/prisma/client";
import { deliverVerificationCode } from "@/lib/email";
import { hashPassword } from "@/lib/passwords";
import { prisma } from "@/lib/prisma";
import {
  RATE_LIMIT_ATTEMPTS,
  RATE_LIMIT_WINDOW_MS,
  createRateLimiter,
  getClientIp,
} from "@/lib/rate-limit";
import {
  issuesToFieldErrors,
  signupSchema,
} from "@/lib/validation";
import { generateVerificationCode } from "@/lib/verification";
import { VERIFICATION_CODE_TTL_MS } from "@/lib/verification-constants";

// Own limiter instance: this route has its own budget, separate from the
// resend route's limiter.
const limiter = createRateLimiter(RATE_LIMIT_ATTEMPTS, RATE_LIMIT_WINDOW_MS);

export async function POST(request: NextRequest) {
  const ip = getClientIp(request);
  const rate = limiter.check(ip);
  if (!rate.allowed) {
    return NextResponse.json(
      { error: { message: "Too many signup attempts. Try again later." } },
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
  const parsed = signupSchema.safeParse(body);
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

  const { name, email, password } = parsed.data;
  const passwordHash = await hashPassword(password);
  const code = generateVerificationCode();
  const expiresAt = new Date(Date.now() + VERIFICATION_CODE_TTL_MS);

  try {
    // One transaction: the user row and its first verification code either
    // both land, or neither does. A user with no code would be unrecoverable.
    await prisma.$transaction(async (tx) => {
      const user = await tx.user.create({
        data: { name, email, passwordHash },
      });
      await tx.verificationCode.create({
        data: { userId: user.id, code, expiresAt },
      });
    });
  } catch (error) {
    // Idempotency: the unique email constraint is the backstop. A second,
    // simultaneous signup with the same email fails at the database level
    // (P2002) rather than in app code, so it can never race into a duplicate
    // account. Respond success so a double-submission looks the same; do NOT
    // tell the caller whether the account pre-existed.
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      return NextResponse.json({
        ok: true,
        message: "Account created. Check your email for a verification code.",
      });
    }
    console.error("[signup] unexpected error", error);
    return NextResponse.json(
      { error: { message: "Something went wrong. Please try again." } },
      { status: 500 }
    );
  }

  deliverVerificationCode(email, code);

  return NextResponse.json(
    {
      ok: true,
      message: "Account created. Check your email for a verification code.",
    },
    { status: 201 }
  );
}