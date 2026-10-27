"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useState } from "react";
import { useForm } from "react-hook-form";
import type { z } from "zod";

import { FormError, FormField } from "@/components/forms/form-field";
import { Button, buttonVariants } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { authClient } from "@/lib/auth-client";
import { resetPasswordSchema } from "@/modules/identity/schemas";

type Values = z.infer<typeof resetPasswordSchema>;

export function ResetPasswordForm() {
  const params = useSearchParams();
  const token = params.get("token");
  const [done, setDone] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<Values>({ resolver: zodResolver(resetPasswordSchema) });

  if (!token || params.get("error")) {
    return (
      <FormError message="This reset link is invalid or has expired. Please request a new one." />
    );
  }

  async function onSubmit({ password }: Values) {
    setFormError(null);
    const { error } = await authClient.resetPassword({
      newPassword: password,
      token: token!,
    });
    if (error) {
      setFormError(
        "This reset link is invalid or has expired. Please request a new one.",
      );
      return;
    }
    setDone(true);
  }

  if (done) {
    return (
      <div role="status" className="grid gap-4">
        <p className="text-muted-foreground">
          Your password has been changed and you’ve been signed out on other
          devices.
        </p>
        <Link href="/sign-in" className={buttonVariants({ size: "lg" })}>
          Sign in
        </Link>
      </div>
    );
  }

  return (
    <form
      method="post"
      onSubmit={handleSubmit(onSubmit)}
      noValidate
      className="grid gap-4"
    >
      <FormError message={formError} />
      <FormField
        id="password"
        label="New password"
        hint="At least 10 characters."
        error={errors.password?.message}
      >
        <Input
          id="password"
          type="password"
          autoComplete="new-password"
          aria-invalid={!!errors.password}
          {...register("password")}
        />
      </FormField>
      <FormField
        id="confirm"
        label="Confirm new password"
        error={errors.confirm?.message}
      >
        <Input
          id="confirm"
          type="password"
          autoComplete="new-password"
          aria-invalid={!!errors.confirm}
          {...register("confirm")}
        />
      </FormField>
      <Button
        type="submit"
        size="lg"
        disabled={isSubmitting}
        className="w-full"
      >
        {isSubmitting ? "Saving…" : "Save new password"}
      </Button>
    </form>
  );
}
