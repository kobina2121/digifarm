import type { Metadata } from "next";
import Link from "next/link";

import { emailEnabled } from "@/lib/env";

import { ForgotPasswordForm } from "./forgot-password-form";

export const metadata: Metadata = { title: "Reset your password" };

export default function ForgotPasswordPage() {
  if (emailEnabled()) return <ForgotPasswordForm />;
  return (
    <>
      <h1 className="text-3xl font-bold">Reset your password</h1>
      <p role="status" className="mt-4 rounded-2xl bg-card p-4 text-sm">
        Password reset by email isn’t switched on yet. If you signed up with
        Google, use “Continue with Google” to sign in.
      </p>
      <Link
        href="/sign-in"
        className="mt-6 inline-block font-medium text-field-green underline-offset-4 hover:underline"
      >
        Back to sign in
      </Link>
    </>
  );
}
