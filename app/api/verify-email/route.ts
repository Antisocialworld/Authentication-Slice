import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import {
  issuesToFieldErrors,
  verifyEmailSchema,
} from "@/lib/validation";

// Deliberately NOT rate-limited here: PRD-001 limits signup, signin, password
// reset request, and verification resend — the code-entry attempt is not on
// that list, so it stays open to keep to the brief.
export async function POST(request: NextRequest) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { error: { message: "Invalid request body." } },
      { status: 400 }
    );
  }

  const parsed = verifyEmailSchema.safeParse(body);
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

  const { email, code } = parsed.data;

  const user = await prisma.user.findUnique({ where: { email } });
  if (!user) {
    // Same generic message as a wrong/expired code: don't let this endpoint
    // distinguish "no account" from "bad code".
    return NextResponse.json(
      { error: { message: "That code is invalid or has expired." } },
      { status: 400 }
    );
  }

  if (user.emailVerifiedAt) {
    return NextResponse.json({
      ok: true,
      alreadyVerified: true,
      message: "Your email is already verified.",
    });
  }

  const latest = await prisma.verificationCode.findFirst({
    where: { userId: user.id },
    orderBy: { createdAt: "desc" },
  });

  const expired =
    !latest ||
    latest.usedAt !== null ||
    latest.expiresAt <= new Date() ||
    latest.code !== code;

  if (expired) {
    // Expiry is enforced in the database (expiresAt), not only in the UI.
    // The specific reason is useful for debugging and is logged, not shown.
    if (latest) {
      console.log(
        `[verify-email] rejected for ${email}: ${
          latest.usedAt !== null
            ? "code already used"
            : latest.expiresAt <= new Date()
              ? "code expired"
              : latest.code !== code
                ? "code mismatch"
                : "unknown"
        }`
      );
    } else {
      console.log(`[verify-email] rejected for ${email}: no code on record`);
    }
    return NextResponse.json(
      { error: { message: "That code is invalid or has expired." } },
      { status: 400 }
    );
  }

  // Mark the code used at the same moment emailVerifiedAt is set: a code can
  // verify a user exactly once, and replaying it after verification is refused.
  await prisma.$transaction([
    prisma.verificationCode.update({
      where: { id: latest.id },
      data: { usedAt: new Date() },
    }),
    prisma.user.update({
      where: { id: user.id },
      data: { emailVerifiedAt: new Date() },
    }),
  ]);

  return NextResponse.json({
    ok: true,
    message: "Email verified.",
  });
}