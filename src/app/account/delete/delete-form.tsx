"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";

import { FormError, FormField } from "@/components/forms/form-field";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

import { deleteMyAccount } from "./actions";

export function DeleteForm({ hasPassword }: { hasPassword: boolean }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [confirmation, setConfirmation] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  return (
    <form
      method="post"
      noValidate
      className="grid gap-4"
      onSubmit={(event) => {
        event.preventDefault();
        setError(null);
        setFieldErrors({});
        startTransition(async () => {
          const result = await deleteMyAccount({
            confirmation: confirmation as "DELETE",
            password: hasPassword ? password : undefined,
          });
          if (!result.ok) {
            setError(result.error);
            setFieldErrors(result.fieldErrors ?? {});
            return;
          }
          router.replace("/account/deleted");
        });
      }}
    >
      <FormError message={error} />
      <FormField
        id="confirmation"
        label="Type DELETE to confirm"
        error={fieldErrors.confirmation}
      >
        <Input
          id="confirmation"
          autoComplete="off"
          autoCapitalize="characters"
          aria-invalid={!!fieldErrors.confirmation}
          value={confirmation}
          onChange={(e) => setConfirmation(e.target.value)}
        />
      </FormField>
      {hasPassword ? (
        <FormField
          id="password"
          label="Your password"
          error={fieldErrors.password}
        >
          <Input
            id="password"
            type="password"
            autoComplete="current-password"
            aria-invalid={!!fieldErrors.password}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
        </FormField>
      ) : null}
      <Button
        type="submit"
        size="lg"
        disabled={pending || confirmation !== "DELETE"}
        className="w-full bg-destructive text-white hover:bg-destructive/90"
      >
        {pending ? "Deleting…" : "Delete my account"}
      </Button>
    </form>
  );
}
