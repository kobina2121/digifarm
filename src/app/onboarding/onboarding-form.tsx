"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { type FieldPath, useForm, useWatch } from "react-hook-form";

import { FormError, FormField } from "@/components/forms/form-field";
import { NativeSelect } from "@/components/forms/native-select";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import {
  BUYER_KINDS,
  BUYER_SEGMENTS,
  type BuyerOnboardingInput,
  buyerOnboardingSchema,
  SERVICED_ZONES,
} from "@/modules/buyers/schemas";

import { onboardBuyer } from "./actions";

export function OnboardingForm() {
  const router = useRouter();
  const [formError, setFormError] = useState<string | null>(null);
  const {
    register,
    handleSubmit,
    setError,
    control,
    formState: { errors, isSubmitting },
  } = useForm<BuyerOnboardingInput>({
    resolver: zodResolver(buyerOnboardingSchema),
    defaultValues: {
      accountType: "INDIVIDUAL",
      address: { label: "Home" },
    },
  });
  const zone = useWatch({ control, name: "address.zoneCode" });
  const accountType = useWatch({ control, name: "accountType" });
  const business = accountType === "BUSINESS";

  async function onSubmit(values: BuyerOnboardingInput) {
    setFormError(null);
    const result = await onboardBuyer(values);
    if (!result.ok) {
      setFormError(result.error);
      for (const [path, message] of Object.entries(result.fieldErrors ?? {})) {
        setError(path as FieldPath<BuyerOnboardingInput>, { message });
      }
      return;
    }
    router.replace("/buyer");
    router.refresh();
  }

  return (
    <form
      method="post"
      onSubmit={handleSubmit(onSubmit)}
      noValidate
      className="grid gap-8"
    >
      <FormError message={formError} />

      <fieldset className="grid gap-3">
        <legend className="mb-2 font-heading text-lg font-bold">
          Who are you buying for?
        </legend>
        <div
          role="radiogroup"
          aria-label="Account type"
          className="grid grid-cols-2 gap-3"
        >
          {Object.entries(BUYER_KINDS).map(([value, label]) => (
            <label
              key={value}
              className={cn(
                "flex min-h-14 cursor-pointer items-center justify-center rounded-xl border bg-card px-3 text-center font-medium transition-colors",
                accountType === value
                  ? "border-field-green bg-sprout-soft text-soil ring-2 ring-field-green/30"
                  : "border-input",
              )}
            >
              <input
                type="radio"
                value={value}
                className="sr-only"
                {...register("accountType")}
              />
              {label}
            </label>
          ))}
        </div>
        <p className="text-sm text-muted-foreground">
          {business
            ? "For restaurants, hotels, shops and other businesses."
            : "For you and your household. You can add business details later."}
        </p>
      </fieldset>

      <fieldset className="grid gap-4">
        <legend className="mb-2 font-heading text-lg font-bold">
          {business ? "Your business" : "Your contact"}
        </legend>
        {business ? (
          <>
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
              error={errors.tradingName?.message}
            >
              <Input
                id="tradingName"
                aria-invalid={!!errors.tradingName}
                {...register("tradingName")}
              />
            </FormField>
            <FormField
              id="buyerSegment"
              label="Type of business"
              error={errors.buyerSegment?.message}
            >
              <NativeSelect
                id="buyerSegment"
                defaultValue=""
                aria-invalid={!!errors.buyerSegment}
                {...register("buyerSegment")}
              >
                <option value="" disabled>
                  Choose one
                </option>
                {Object.entries(BUYER_SEGMENTS).map(([value, label]) => (
                  <option key={value} value={value}>
                    {label}
                  </option>
                ))}
              </NativeSelect>
            </FormField>
          </>
        ) : null}
        <FormField
          id="phone"
          label={business ? "Business phone" : "Phone number"}
          hint="We'll call this number about deliveries."
          error={errors.phone?.message}
        >
          <Input
            id="phone"
            type="tel"
            inputMode="tel"
            autoComplete="tel"
            placeholder="024 123 4567"
            aria-invalid={!!errors.phone}
            {...register("phone")}
          />
        </FormField>
      </fieldset>

      <fieldset className="grid gap-4">
        <legend className="mb-2 font-heading text-lg font-bold">
          Where should we deliver?
        </legend>
        <div
          role="radiogroup"
          aria-label="Delivery area"
          className="grid grid-cols-2 gap-3"
        >
          {Object.entries(SERVICED_ZONES).map(([code, name]) => (
            <label
              key={code}
              className={cn(
                "flex min-h-14 cursor-pointer items-center justify-center rounded-xl border bg-card px-3 text-center font-medium transition-colors",
                zone === code
                  ? "border-field-green bg-sprout-soft text-soil ring-2 ring-field-green/30"
                  : "border-input",
              )}
            >
              <input
                type="radio"
                value={code}
                className="sr-only"
                {...register("address.zoneCode")}
              />
              {name}
            </label>
          ))}
        </div>
        {errors.address?.zoneCode ? (
          <p role="alert" className="-mt-2 text-sm text-destructive">
            {errors.address.zoneCode.message}
          </p>
        ) : (
          <p className="-mt-2 text-sm text-muted-foreground">
            We currently deliver in Greater Accra and Kumasi.
          </p>
        )}
        <FormField
          id="address.label"
          label="Name for this address"
          error={errors.address?.label?.message}
        >
          <Input
            id="address.label"
            aria-invalid={!!errors.address?.label}
            {...register("address.label")}
          />
        </FormField>
        <FormField
          id="address.town"
          label="Town or area"
          error={errors.address?.town?.message}
        >
          <Input
            id="address.town"
            placeholder="e.g. Osu, Adum"
            aria-invalid={!!errors.address?.town}
            {...register("address.town")}
          />
        </FormField>
        <FormField
          id="address.street"
          label="Street (optional)"
          error={errors.address?.street?.message}
        >
          <Input
            id="address.street"
            autoComplete="address-line1"
            {...register("address.street")}
          />
        </FormField>
        <FormField
          id="address.landmark"
          label="Nearby landmark (optional)"
          hint="Helps the driver find you, e.g. opposite the Shell station."
          error={errors.address?.landmark?.message}
        >
          <Input id="address.landmark" {...register("address.landmark")} />
        </FormField>
        <FormField
          id="address.digitalAddress"
          label="GhanaPost GPS address (optional)"
          error={errors.address?.digitalAddress?.message}
        >
          <Input
            id="address.digitalAddress"
            placeholder="GA-123-4567"
            autoCapitalize="characters"
            aria-invalid={!!errors.address?.digitalAddress}
            {...register("address.digitalAddress")}
          />
        </FormField>
      </fieldset>

      <Button
        type="submit"
        size="lg"
        disabled={isSubmitting}
        className="w-full"
      >
        {isSubmitting ? "Saving…" : "Finish setup"}
      </Button>
    </form>
  );
}
