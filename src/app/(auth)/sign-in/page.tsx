import type { Metadata } from "next";
import Link from "next/link";

import { GoogleButton, OrDivider } from "@/components/auth/google-button";
import { googleSignInEnabled } from "@/lib/env";
import { Suspense } from "react";

import { SignInForm } from "./sign-in-form";

export const metadata: Metadata = { title: "Sign in" };

export default function SignInPage() {
  return (
    <>
      <h1 className="text-3xl font-bold">Sign in</h1>
      <p className="mt-2 text-muted-foreground">Welcome back to DigiFarm.</p>
      {googleSignInEnabled() ? (
        <div className="mt-8 grid gap-6">
          <GoogleButton />
          <OrDivider />
        </div>
      ) : null}
      <div className={googleSignInEnabled() ? "mt-6" : "mt-8"}>
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
