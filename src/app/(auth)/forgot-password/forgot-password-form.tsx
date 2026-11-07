"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import Link from "next/link";
import { useState } from "react";
import { useForm } from "react-hook-form";
import type { z } from "zod";

import { FormError, FormField } from "@/components/forms/form-field";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { authClient } from "@/lib/auth-client";
import { forgotPasswordSchema } from "@/modules/identity/schemas";

type Values = z.infer<typeof forgotPasswordSchema>;

export function ForgotPasswordForm() {
  const [sentTo, setSentTo] = useState<string | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<Values>({ resolver: zodResolver(forgotPasswordSchema) });

  async function onSubmit({ email }: Values) {
    setFormError(null);
    const { error } = await authClient.requestPasswordReset({
      email,
      redirectTo: "/reset-password",
    });
    if (error?.status === 429) {
      setFormError(
        "Too many requests. Please wait a few minutes and try again.",
      );
      return;
    }
    // Same message whether or not the account exists, so emails can't be probed.
    setSentTo(email);
  }

  return (
    <>
      <h1 className="text-3xl font-bold">Reset your password</h1>
      {sentTo ? (
        <p role="status" className="mt-4 text-muted-foreground">
          If an account exists for{" "}
          <strong className="text-soil">{sentTo}</strong>, we’ve sent a link to
          reset the password. It expires in 1 hour.
        </p>
      ) : (
        <>
          <p className="mt-2 text-muted-foreground">
            Enter your email and we’ll send you a link to choose a new password.
          </p>
          <form
            method="post"
            onSubmit={handleSubmit(onSubmit)}
            noValidate
            className="mt-8 grid gap-4"
          >
            <FormError message={formError} />
            <FormField id="email" label="Email" error={errors.email?.message}>
              <Input
                id="email"
                type="email"
                inputMode="email"
                autoComplete="email"
                aria-invalid={!!errors.email}
                {...register("email")}
              />
            </FormField>
            <Button
              type="submit"
              size="lg"
              disabled={isSubmitting}
              className="w-full"
            >
              {isSubmitting ? "Sending…" : "Send reset link"}
            </Button>
          </form>
        </>
      )}
      <p className="mt-6 text-center text-sm">
        <Link
          href="/sign-in"
          className="font-medium text-field-green underline-offset-4 hover:underline"
        >
          Back to sign in
        </Link>
      </p>
    </>
  );
}
