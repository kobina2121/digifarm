import type { Metadata } from "next";
import Link from "next/link";

import { GoogleButton, OrDivider } from "@/components/auth/google-button";
import { emailEnabled, googleSignInEnabled } from "@/lib/env";

import { SignUpForm } from "./sign-up-form";

export const metadata: Metadata = { title: "Create a buyer account" };

export default function SignUpPage() {
  return (
    <>
      <p className="eyebrow text-field-green">Join Akuafo</p>
      <h1 className="mt-2 text-3xl font-bold">Create your account</h1>
      <p className="mt-2 text-muted-foreground">
        Buy fresh produce straight from farms we’ve visited, for your home or
        your business.
      </p>
      <div className="mt-8 grid gap-6">
        <GoogleButton available={googleSignInEnabled()} />
        {emailEnabled() ? <OrDivider /> : null}
      </div>
      {emailEnabled() ? (
        <div className="mt-6">
          <SignUpForm />
        </div>
      ) : (
        // Without email nobody could confirm an email sign-up.
        <p role="status" className="mt-6 rounded-2xl bg-card p-4 text-sm">
          Signing up with an email address opens soon. For now, continue with
          Google.
        </p>
      )}
      <p className="mt-6 text-center text-sm text-muted-foreground">
        Already have an account?{" "}
        <Link
          href="/sign-in"
          className="font-medium text-field-green underline-offset-4 hover:underline"
        >
          Sign in
        </Link>
      </p>
      <p className="mt-6 text-center text-xs text-muted-foreground">
        Farmers and suppliers: Akuafo staff set up your account after a farm
        visit.
      </p>
    </>
  );
}
