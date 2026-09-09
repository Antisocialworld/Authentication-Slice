import type { Metadata } from "next";
import Link from "next/link";
import { ForgotPasswordForm } from "@/components/forgot-password-form";

export const metadata: Metadata = {
  title: "Forgot password",
};

export default function ForgotPasswordPage() {
  return (
    <main className="flex flex-1 items-center justify-center px-4 py-12">
      <section className="w-full max-w-sm">
        <h1 className="text-2xl font-semibold">Forgot your password?</h1>
        <p className="mt-1 text-sm text-gray-600">
          Enter the email you signed up with and we will send you a reset link.
        </p>
        <ForgotPasswordForm />
        <p className="mt-4 text-sm text-gray-500">
          Remembered it?{" "}
          <Link href="/signin" className="text-indigo-600 underline-offset-2 hover:underline">
            Sign in
          </Link>
        </p>
      </section>
    </main>
  );
}
