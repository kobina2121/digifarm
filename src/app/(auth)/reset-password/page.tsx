import type { Metadata } from "next";
import { Suspense } from "react";

import { ResetPasswordForm } from "./reset-password-form";

export const metadata: Metadata = { title: "Choose a new password" };

export default function ResetPasswordPage() {
  return (
    <>
      <h1 className="text-3xl font-bold">Choose a new password</h1>
      <div className="mt-8">
        <Suspense>
          <ResetPasswordForm />
        </Suspense>
      </div>
    </>
  );
}
