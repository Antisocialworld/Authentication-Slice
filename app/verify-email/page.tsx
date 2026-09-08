import type { Metadata } from "next";
import { VerifyEmailForm } from "@/components/verify-email-form";

export const metadata: Metadata = {
  title: "Verify email",
};

export default async function VerifyEmailPage({
  searchParams,
}: {
  searchParams: Promise<{ email?: string }>;
}) {
  const { email } = await searchParams;

  return (
    <main className="flex flex-1 items-center justify-center px-4 py-12">
      <section className="w-full max-w-sm">
        <h1 className="text-2xl font-semibold">Verify your email</h1>
        <p className="mt-1 text-sm text-gray-600">
          Enter the 6-digit code we sent to {email ?? "your email"}.
        </p>
        <VerifyEmailForm initialEmail={email ?? ""} />
      </section>
    </main>
  );
}