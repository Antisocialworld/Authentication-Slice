import { randomBytes } from "node:crypto";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// Database-backed sessions, decided over a signed JWT: the cookie holds ONLY
// the session id, and the session's real body lives in the Session table.
// Sign-out deletes the row, which ends the session immediately and cannot be
// undone by replaying a previously-issued token — that guarantee is impossible
// with a JWT unless it is backed by a revocation list.

export const SESSION_COOKIE_NAME = "session_id";
export const SESSION_TTL_MS = 7 * 24 * 60 * 60 * 1000; // 7 days
export const SESSION_MAX_AGE_SECONDS = Math.floor(SESSION_TTL_MS / 1000);

// 32 random bytes (256 bits of entropy) hex-encoded. Unguessable and
// unenumerable; no sequential counter that an attacker could iterate.
export function generateSessionId(): string {
  return randomBytes(32).toString("hex");
}

export function sessionExpiresAt(now: number = Date.now()): Date {
  return new Date(now + SESSION_TTL_MS);
}

export async function createSession(userId: string): Promise<{ id: string }> {
  return prisma.session.create({
    data: {
      id: generateSessionId(),
      userId,
      expiresAt: sessionExpiresAt(),
    },
  });
}

// SKILL-001 cookie flags:
// - httpOnly: the session id stays invisible to client-side JS, so an XSS
//   read cannot lift the cookie directly.
// - secure: HTTPS only. Gated on production because dev runs plain http on
//   localhost; forcing Secure there would break cookie round-trips for no
//   real security gain on a loopback interface.
// - sameSite: "lax" — cross-site POSTs won't carry the cookie (CSRF), while
//   top-level same-site navigation still does.
// - maxAge: cookie lifetime matches the session row's own expiry, so the
//   browser and the database agree about when the session is over.
export function setSessionCookie(
  response: NextResponse,
  sessionId: string
): void {
  response.cookies.set({
    name: SESSION_COOKIE_NAME,
    value: sessionId,
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: SESSION_MAX_AGE_SECONDS,
  });
}

// Inverse of setSessionCookie: same name and attributes, but a maxAge of 0 so
// the browser drops the cookie. Called alongside deleting the session row, so
// the server-side session and the browser cookie die together.
export function clearSessionCookie(response: NextResponse): void {
  response.cookies.set({
    name: SESSION_COOKIE_NAME,
    value: "",
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 0,
  });
}