"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { type FieldPath, useForm } from "react-hook-form";

import { FormError, FormField } from "@/components/forms/form-field";
import { NativeSelect } from "@/components/forms/native-select";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  BUYER_SEGMENTS,
  type BusinessDetailsInput,
  businessDetailsSchema,
} from "@/modules/buyers/schemas";

import { saveBusinessDetails } from "./actions";

export function BusinessForm({
  defaults,
  isBusiness,
}: {
  defaults: BusinessDetailsInput;
  isBusiness: boolean;
}) {
  const router = useRouter();
  const [formError, setFormError] = useState<string | null>(null);
  const {
    register,
    handleSubmit,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<BusinessDetailsInput>({
    resolver: zodResolver(businessDetailsSchema),
    defaultValues: defaults,
  });

  async function onSubmit(values: BusinessDetailsInput) {
    setFormError(null);
    const result = await saveBusinessDetails(values);
    if (!result.ok) {
      setFormError(result.error);
      for (const [path, message] of Object.entries(result.fieldErrors ?? {})) {
        setError(path as FieldPath<BusinessDetailsInput>, { message });
      }
      return;
    }
    router.replace("/buyer/profile");
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
        id="legalName"
        label="Business name"
        error={errors.legalName?.message}
      >
        <Input
          id="legalName"
          autoComplete="organization"
          aria-invalid={!!errors.legalName}
          {...register("legalName")}
        />
      </FormField>
      <FormField
        id="tradingName"
        label="Trading name (optional)"
        hint="If customers know you by a different name."
      >
        <Input id="tradingName" {...register("tradingName")} />
      </FormField>
      <FormField
        id="buyerSegment"
        label="Type of business"
        error={errors.buyerSegment?.message}
      >
        <NativeSelect
          id="buyerSegment"
          aria-invalid={!!errors.buyerSegment}
          {...register("buyerSegment")}
        >
          <option value="">Choose one</option>
          {Object.entries(BUYER_SEGMENTS).map(([value, label]) => (
            <option key={value} value={value}>
              {label}
            </option>
          ))}
        </NativeSelect>
      </FormField>
      <Button
        type="submit"
        size="lg"
        disabled={isSubmitting}
        className="h-12 rounded-full"
      >
        {isSubmitting
          ? "Saving…"
          : isBusiness
            ? "Save changes"
            : "Switch to a business account"}
      </Button>
    </form>
  );
}
