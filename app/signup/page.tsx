import type { Metadata } from "next";
import Link from "next/link";
import { SignupForm } from "@/components/signup-form";

export const metadata: Metadata = {
  title: "Create account",
};

export default function SignupPage() {
  return (
    <main className="flex flex-1 items-center justify-center px-4 py-12">
      <section className="w-full max-w-sm">
        <h1 className="text-2xl font-semibold">Create account</h1>
        <p className="mt-1 text-sm text-gray-600">
          Sign up to build the authentication slice.
        </p>
        <SignupForm />
        <p className="mt-4 text-sm text-gray-500">
          Already have an account?{" "}
          <Link href="/signin" className="text-indigo-600 underline-offset-2 hover:underline">
            Sign in
          </Link>
        </p>
      </section>
    </main>
  );
}