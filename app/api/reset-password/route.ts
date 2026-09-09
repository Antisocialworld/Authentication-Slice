import { NextRequest, NextResponse } from "next/server";
import { hashPassword } from "@/lib/passwords";
import { prisma } from "@/lib/prisma";
import { issuesToFieldErrors, resetPasswordSchema } from "@/lib/validation";

// Deliberately NOT rate-limited here: PRD-001 lists signin, signup, password
// reset *request*, and verification code resend — the reset-with-token step is
// not on that list. The single-use, time-limited token is the real protection:
// an attacker without a valid token cannot succeed however many times they try.
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

  const parsed = resetPasswordSchema.safeParse(body);
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

  const { token, password } = parsed.data;

  const resetToken = await prisma.passwordResetToken.findUnique({
    where: { token },
  });

  // One opaque message for "does not exist / already used / expired". Telling
  // the caller *which* one leaks information (e.g. "this token was already
  // consumed") that a replay attacker has no need to know. The specific reason
  // is useful for debugging and is logged, not shown.
  const invalid =
    !resetToken ||
    resetToken.usedAt !== null ||
    resetToken.expiresAt <= new Date();

  if (invalid) {
    if (resetToken) {
      console.log(
        `[reset-password] rejected: ${
          resetToken.usedAt !== null
            ? "token already used"
            : resetToken.expiresAt <= new Date()
              ? "token expired"
              : "token not found"
        }`
      );
    } else {
      console.log("[reset-password] rejected: token not found");
    }
    return NextResponse.json(
      { error: { message: "That reset link is invalid or has expired." } },
      { status: 400 }
    );
  }

  const passwordHash = await hashPassword(password);

  // Hash update and token-use mark in ONE transaction: either both land, or
  // neither does. If the token were marked used separately from the hash
  // update, a crash in between could leave a reset token that is still valid
  // after the password changed, letting it be replayed for a second reset.
  await prisma.$transaction([
    prisma.user.update({
      where: { id: resetToken.userId },
      data: { passwordHash },
    }),
    prisma.passwordResetToken.update({
      where: { id: resetToken.id },
      data: { usedAt: new Date() },
    }),
  ]);

  // Do NOT auto sign-in here: PRD-001's flow sends the user to sign in with
  // their new password.
  return NextResponse.json({
    ok: true,
    message: "Your password has been reset. You can sign in with your new password.",
  });
}
