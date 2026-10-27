import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";

import { SignInForm } from "./sign-in-form";

export const metadata: Metadata = { title: "Sign in" };

export default function SignInPage() {
  return (
    <>
      <h1 className="text-3xl font-bold">Sign in</h1>
      <p className="mt-2 text-muted-foreground">Welcome back to DigiFarm.</p>
      <div className="mt-8">
        {/* The form reads ?next= from the URL, which is request-time data. */}
        <Suspense>
          <SignInForm />
        </Suspense>
      </div>
      <p className="mt-6 text-center text-sm text-muted-foreground">
        New to DigiFarm?{" "}
        <Link
          href="/sign-up"
          className="font-medium text-field-green underline-offset-4 hover:underline"
        >
          Create a buyer account
        </Link>
      </p>
    </>
  );
}
