import type { Metadata } from "next";
import { requireSession } from "@/lib/auth";

export const metadata: Metadata = {
  title: "Dashboard",
};

export default async function DashboardPage() {
  // Server-side session guard: no valid session → redirect to /signin before
  // this component ever renders, so no dashboard content reaches the browser.
  const { user } = await requireSession();

  return (
    <main className="flex flex-1 items-center justify-center px-4 py-12">
      <section className="w-full max-w-sm">
        <h1 className="text-2xl font-semibold">{user.name}</h1>
        <form method="POST" action="/api/signout" className="mt-4">
          <button
            type="submit"
            className="mt-2 rounded-md bg-indigo-600 px-3 py-2 text-sm font-medium text-white hover:bg-indigo-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:ring-offset-2"
          >
            Sign out
          </button>
        </form>
      </section>
    </main>
  );
}