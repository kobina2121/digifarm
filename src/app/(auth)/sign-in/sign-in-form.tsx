"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";
import { useForm } from "react-hook-form";

import { FormError, FormField } from "@/components/forms/form-field";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { authClient } from "@/lib/auth-client";
import { type SignInInput, signInSchema } from "@/modules/identity/schemas";

/** Only allow same-site relative paths, so `?next=` can't redirect off-site. */
function safeNext(next: string | null): string {
  return next && next.startsWith("/") && !next.startsWith("//")
    ? next
    : "/home";
}

export function SignInForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [formError, setFormError] = useState<string | null>(null);
  const [unverifiedEmail, setUnverifiedEmail] = useState<string | null>(null);
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<SignInInput>({ resolver: zodResolver(signInSchema) });

  async function onSubmit(values: SignInInput) {
    setFormError(null);
    setUnverifiedEmail(null);
    // callbackURL is where the re-sent confirmation link lands if the email is unverified.
    const { error } = await authClient.signIn.email({
      ...values,
      callbackURL: "/home",
    });
    if (error) {
      if (error.status === 403) {
        setUnverifiedEmail(values.email);
      } else if (error.status === 429) {
        setFormError("Too many attempts. Please wait a minute and try again.");
      } else {
        setFormError("That email and password don't match. Please try again.");
      }
      return;
    }
    router.replace(safeNext(searchParams.get("next")));
    router.refresh();
  }

  return (
    <form
      method="post"
      onSubmit={handleSubmit(onSubmit)}
      noValidate
      className="grid gap-4"
    >
      <FormError message={formError} />
      {unverifiedEmail ? (
        <div
          role="alert"
          className="rounded-lg border border-harvest-gold bg-harvest-gold-soft px-3 py-2.5 text-sm text-soil"
        >
          Please confirm your email first. We’ve just sent a new link to{" "}
          <strong>{unverifiedEmail}</strong>.
        </div>
      ) : null}
      <FormField id="email" label="Email" error={errors.email?.message}>
        <Input
          id="email"
          type="email"
          inputMode="email"
          autoComplete="email"
          aria-invalid={!!errors.email}
          aria-describedby={errors.email ? "email-error" : undefined}
          {...register("email")}
        />
      </FormField>
      <FormField
        id="password"
        label="Password"
        error={errors.password?.message}
      >
        <Input
          id="password"
          type="password"
          autoComplete="current-password"
          aria-invalid={!!errors.password}
          aria-describedby={errors.password ? "password-error" : undefined}
          {...register("password")}
        />
      </FormField>
      <Link
        href="/forgot-password"
        className="-mt-1 justify-self-end text-sm font-medium text-field-green underline-offset-4 hover:underline"
      >
        Forgot password?
      </Link>
      <Button
        type="submit"
        size="lg"
        disabled={isSubmitting}
        className="w-full"
      >
        {isSubmitting ? "Signing in…" : "Sign in"}
      </Button>
    </form>
  );
}
