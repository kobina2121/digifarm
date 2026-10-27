"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { type FieldPath, useForm } from "react-hook-form";

import { FormError, FormField } from "@/components/forms/form-field";
import { NativeSelect } from "@/components/forms/native-select";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { GHANA_REGIONS } from "@/lib/ghana";
import {
  type CreateSupplierInput,
  createSupplierSchema,
  SUPPLIER_KINDS,
} from "@/modules/suppliers/schemas";

import { createSupplier } from "../actions";

export function NewSupplierForm() {
  const router = useRouter();
  const [formError, setFormError] = useState<string | null>(null);
  const {
    register,
    handleSubmit,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<CreateSupplierInput>({
    resolver: zodResolver(createSupplierSchema),
  });

  async function onSubmit(values: CreateSupplierInput) {
    setFormError(null);
    const result = await createSupplier(values);
    if (!result.ok) {
      setFormError(result.error);
      for (const [path, message] of Object.entries(result.fieldErrors ?? {})) {
        setError(path as FieldPath<CreateSupplierInput>, { message });
      }
      return;
    }
    router.push(`/admin/suppliers/${result.data.id}`);
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
        label="Farm or business name"
        error={errors.legalName?.message}
      >
        <Input
          id="legalName"
          aria-invalid={!!errors.legalName}
          {...register("legalName")}
        />
      </FormField>
      <FormField id="tradingName" label="Also known as (optional)">
        <Input id="tradingName" {...register("tradingName")} />
      </FormField>
      <FormField
        id="supplierKind"
        label="Type of supplier"
        error={errors.supplierKind?.message}
      >
        <NativeSelect
          id="supplierKind"
          defaultValue=""
          aria-invalid={!!errors.supplierKind}
          {...register("supplierKind")}
        >
          <option value="" disabled>
            Choose one
          </option>
          {Object.entries(SUPPLIER_KINDS).map(([value, label]) => (
            <option key={value} value={value}>
              {label}
            </option>
          ))}
        </NativeSelect>
      </FormField>
      <FormField
        id="phone"
        label="Phone number"
        hint="The number staff call to confirm stock."
        error={errors.phone?.message}
      >
        <Input
          id="phone"
          type="tel"
          inputMode="tel"
          placeholder="055 123 4567"
          aria-invalid={!!errors.phone}
          {...register("phone")}
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
          {Object.entries(GHANA_REGIONS).map(([value, label]) => (
            <option key={value} value={value}>
              {label}
            </option>
          ))}
        </NativeSelect>
      </FormField>
      <FormField id="district" label="District (optional)">
        <Input id="district" {...register("district")} />
      </FormField>
      <FormField id="town" label="Town or village" error={errors.town?.message}>
        <Input id="town" aria-invalid={!!errors.town} {...register("town")} />
      </FormField>
      <FormField id="landmark" label="How to find the farm (optional)">
        <Input
          id="landmark"
          placeholder="e.g. 2 km past the Ejura market, left at the borehole"
          {...register("landmark")}
        />
      </FormField>
      <FormField
        id="digitalAddress"
        label="GhanaPost GPS address (optional)"
        error={errors.digitalAddress?.message}
      >
        <Input
          id="digitalAddress"
          placeholder="AE-123-4567"
          autoCapitalize="characters"
          aria-invalid={!!errors.digitalAddress}
          {...register("digitalAddress")}
        />
      </FormField>
      <Button
        type="submit"
        size="lg"
        disabled={isSubmitting}
        className="mt-2 w-full sm:w-auto"
      >
        {isSubmitting ? "Saving…" : "Add supplier"}
      </Button>
    </form>
  );
}
