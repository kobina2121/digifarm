import { MailCheck } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";

import { ResendVerification } from "./resend-verification";

export const metadata: Metadata = { title: "Confirm your email" };

export default function VerifyEmailPage() {
  return (
    <div className="text-center">
      <span className="mx-auto flex size-14 items-center justify-center rounded-2xl bg-sprout-soft">
        <MailCheck className="size-7 text-field-green" aria-hidden />
      </span>
      <h1 className="mt-6 text-3xl font-bold">Check your email</h1>
      <p className="mt-3 text-muted-foreground">
        We’ve sent you a link to confirm your email address. Open it on this
        device to continue setting up your business.
      </p>
      <div className="mt-8">
        <Suspense>
          <ResendVerification />
        </Suspense>
      </div>
      <p className="mt-6 text-sm text-muted-foreground">
        Already confirmed?{" "}
        <Link
          href="/sign-in"
          className="font-medium text-field-green underline-offset-4 hover:underline"
        >
          Sign in
        </Link>
      </p>
    </div>
  );
}
