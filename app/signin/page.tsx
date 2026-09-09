import type { Metadata } from "next";
import Link from "next/link";
import { SigninForm } from "@/components/signin-form";

export const metadata: Metadata = {
  title: "Sign in",
};

export default function SigninPage() {
  return (
    <main className="flex flex-1 items-center justify-center px-4 py-12">
      <section className="w-full max-w-sm">
        <h1 className="text-2xl font-semibold">Sign in</h1>
        <p className="mt-1 text-sm text-gray-600">
          Welcome back. Sign in to pick up where you left off.
        </p>
        <SigninForm />
        <p className="mt-3 text-sm text-gray-500">
          <Link href="/forgot-password" className="text-indigo-600 underline-offset-2 hover:underline">
            Forgot your password?
          </Link>
        </p>
        <p className="mt-4 text-sm text-gray-500">
          New here?{" "}
          <Link href="/signup" className="text-indigo-600 underline-offset-2 hover:underline">
            Create an account
          </Link>
        </p>
      </section>
    </main>
  );
}