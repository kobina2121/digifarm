import type { Metadata } from "next";
import Link from "next/link";

import { SignUpForm } from "./sign-up-form";

export const metadata: Metadata = { title: "Create a buyer account" };

export default function SignUpPage() {
  return (
    <>
      <p className="eyebrow text-field-green">Buyer account</p>
      <h1 className="mt-2 text-3xl font-bold">Create your account</h1>
      <p className="mt-2 text-muted-foreground">
        For restaurants, hotels, caterers, retailers, wholesalers and food
        processors.
      </p>
      <div className="mt-8">
        <SignUpForm />
      </div>
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
        Farmers and suppliers: DigiFarm staff set up your account after a farm
        visit.
      </p>
    </>
  );
}
