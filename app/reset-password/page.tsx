import type { Metadata } from "next";
import Link from "next/link";
import { ResetPasswordForm } from "@/components/reset-password-form";

export const metadata: Metadata = {
  title: "Reset password",
};

export default async function ResetPasswordPage({
  searchParams,
}: {
  searchParams: Promise<{ token?: string }>;
}) {
  const { token } = await searchParams;

  // Link without a token is meaningless; same generic message the route uses
  // for an invalid/expired link so the screen never reveals more than the API.
  if (!token) {
    return (
      <main className="flex flex-1 items-center justify-center px-4 py-12">
        <section className="w-full max-w-sm">
          <h1 className="text-2xl font-semibold">Reset your password</h1>
          <p className="mt-2 text-sm text-red-600">
            That reset link is invalid or has expired.
          </p>
          <p className="mt-4 text-sm text-gray-500">
            Need a new one?{" "}
            <Link href="/forgot-password" className="text-indigo-600 underline-offset-2 hover:underline">
              Request a reset link
            </Link>
            .
          </p>
        </section>
      </main>
    );
  }

  return (
    <main className="flex flex-1 items-center justify-center px-4 py-12">
      <section className="w-full max-w-sm">
        <h1 className="text-2xl font-semibold">Reset your password</h1>
        <p className="mt-1 text-sm text-gray-600">
          Choose a new password for your account.
        </p>
        <ResetPasswordForm initialToken={token} />
      </section>
    </main>
  );
}
