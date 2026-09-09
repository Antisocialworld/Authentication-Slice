import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { SESSION_COOKIE_NAME } from "@/lib/session";

// Shared server-side guard for protected routes (PRD-001 behaviour 4: a
// signed-out user typing a protected URL is redirected to sign in).
//
// This runs inside the page's server component, not in client-side code, so an
// unauthorized request redirects BEFORE any dashboard content is rendered or
// shipped — there is no "flash the dashboard then bounce".
//
// Deliberately a page-level check rather than middleware/proxy: middleware is
// deprecated in this Next.js version (renamed proxy.js) and proxy executes in
// a separate, Edge-style context where the Node-only better-sqlite3 Prisma
// adapter cannot run. A server-side helper reuses the one Node runtime the
// rest of the app already uses.
export async function requireSession(): Promise<{
  sessionId: string;
  user: { id: string; name: string; email: string };
}> {
  const cookieStore = await cookies();
  const sessionId = cookieStore.get(SESSION_COOKIE_NAME)?.value;

  if (!sessionId) {
    redirect("/signin");
  }

  const session = await prisma.session.findUnique({
    where: { id: sessionId },
    include: { user: true },
  });

  // Expiry is enforced in the database, not only honored by the browser: a
  // session whose row has passed expiresAt is worthless even if the cookie is
  // still in the browser.
  if (!session || session.expiresAt <= new Date()) {
    redirect("/signin");
  }

  return { sessionId: session.id, user: session.user };
}