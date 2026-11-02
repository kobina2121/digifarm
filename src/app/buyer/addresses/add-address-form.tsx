"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useState } from "react";
import { type FieldPath, useForm } from "react-hook-form";

import { FormError, FormField } from "@/components/forms/form-field";
import { NativeSelect } from "@/components/forms/native-select";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { GHANA_REGIONS } from "@/lib/ghana";
import {
  type DeliveryAddressInput,
  deliveryAddressSchema,
} from "@/modules/buyers/schemas";

import { addAddress } from "./actions";

export function AddAddressForm() {
  const [formError, setFormError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const {
    register,
    handleSubmit,
    reset,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<DeliveryAddressInput>({
    resolver: zodResolver(deliveryAddressSchema),
  });

  async function onSubmit(values: DeliveryAddressInput) {
    setFormError(null);
    setSaved(false);
    const result = await addAddress(values);
    if (!result.ok) {
      setFormError(result.error);
      for (const [path, message] of Object.entries(result.fieldErrors ?? {})) {
        setError(path as FieldPath<DeliveryAddressInput>, { message });
      }
      return;
    }
    reset();
    setSaved(true);
  }

  return (
    <form
      method="post"
      onSubmit={handleSubmit(onSubmit)}
      noValidate
      className="grid gap-4"
    >
      <FormError message={formError} />
      {saved ? (
        <p
          role="status"
          className="rounded-lg bg-sprout-soft px-3 py-2.5 text-sm text-soil"
        >
          Address saved.
        </p>
      ) : null}
      <FormField
        id="label"
        label="Name for this address"
        error={errors.label?.message}
      >
        <Input
          id="label"
          placeholder="e.g. East Legon branch"
          aria-invalid={!!errors.label}
          {...register("label")}
        />
      </FormField>
      <FormField id="region" label="Region" error={errors.region?.message}>
        <NativeSelect
          id="region"
          defaultValue=""
          aria-invalid={!!errors.region}
          {...register("region")}
        >
          <option value="" disabled>
            Choose a region
          </option>
          {Object.entries(GHANA_REGIONS).map(([code, name]) => (
            <option key={code} value={code}>
              {name}
            </option>
          ))}
        </NativeSelect>
      </FormField>
      <FormField id="town" label="Town or area" error={errors.town?.message}>
        <Input id="town" aria-invalid={!!errors.town} {...register("town")} />
      </FormField>
      <FormField id="street" label="Street (optional)">
        <Input id="street" {...register("street")} />
      </FormField>
      <FormField id="landmark" label="Nearby landmark (optional)">
        <Input id="landmark" {...register("landmark")} />
      </FormField>
      <FormField
        id="digitalAddress"
        label="GhanaPost GPS address (optional)"
        error={errors.digitalAddress?.message}
      >
        <Input
          id="digitalAddress"
          placeholder="GA-123-4567"
          autoCapitalize="characters"
          aria-invalid={!!errors.digitalAddress}
          {...register("digitalAddress")}
        />
      </FormField>
      <Button
        type="submit"
        disabled={isSubmitting}
        className="w-full sm:w-auto"
      >
        {isSubmitting ? "Saving…" : "Save address"}
      </Button>
    </form>
  );
}
