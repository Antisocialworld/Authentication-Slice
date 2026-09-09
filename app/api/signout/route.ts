import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { SESSION_COOKIE_NAME, clearSessionCookie } from "@/lib/session";

// Only POST is defined, so this route answers 405 to GET — a sign-out must not
// be triggerable by a plain link/GET (which an attacker could plant), and
// sameSite=lax already stops cross-site POSTs from carrying the session cookie.
export async function POST(request: NextRequest) {
  const sessionId = request.cookies.get(SESSION_COOKIE_NAME)?.value;

  if (sessionId) {
    // Deleting the row is what makes "sign out ends the session properly"
    // true: a replayed cookie is then useless even if a stale copy survives in
    // the browser. deleteMany is tolerant of the row already being gone
    // (double sign-out, a session cleaned up some other way).
    await prisma.session.deleteMany({ where: { id: sessionId } });
  }

  // 303 so the browser turns the POST into a GET of /signin instead of
  // re-POSTing the sign-out to the sign-in page.
  const response = NextResponse.redirect(new URL("/signin", request.url), 303);
  clearSessionCookie(response);
  return response;
}