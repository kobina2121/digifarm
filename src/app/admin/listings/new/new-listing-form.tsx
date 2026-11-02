"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { type FieldPath, useForm, useWatch } from "react-hook-form";

import { FormError, FormField } from "@/components/forms/form-field";
import { NativeSelect } from "@/components/forms/native-select";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  type CreateListingInput,
  createListingSchema,
} from "@/modules/catalog/schemas";

import { createListingAction } from "../actions";

type Options = {
  suppliers: { id: string; name: string; region: string }[];
  categories: {
    name: string;
    products: { id: string; name: string; variety: string | null }[];
  }[];
  units: { code: string; name: string; plural: string }[];
};

function today() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

export function NewListingForm({
  options,
  supplierId,
}: {
  options: Options;
  supplierId?: string;
}) {
  const router = useRouter();
  const [formError, setFormError] = useState<string | null>(null);
  const {
    register,
    handleSubmit,
    setError,
    control,
    formState: { errors, isSubmitting },
  } = useForm<CreateListingInput>({
    resolver: zodResolver(createListingSchema),
    defaultValues: {
      supplierId: supplierId ?? "",
      productId: "",
      unitCode: "",
      availableFrom: today(),
      publish: true,
    },
  });
  const unitCode = useWatch({ control, name: "unitCode" });
  const unit = options.units.find((u) => u.code === unitCode);

  async function onSubmit(values: CreateListingInput) {
    setFormError(null);
    const result = await createListingAction(values);
    if (!result.ok) {
      setFormError(result.error);
      for (const [path, message] of Object.entries(result.fieldErrors ?? {})) {
        setError(path as FieldPath<CreateListingInput>, { message });
      }
      return;
    }
    router.push(`/admin/listings/${result.data.id}`);
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
        id="supplierId"
        label="Supplier"
        error={errors.supplierId?.message}
      >
        <NativeSelect
          id="supplierId"
          aria-invalid={!!errors.supplierId}
          {...register("supplierId")}
        >
          <option value="">Choose an approved supplier</option>
          {options.suppliers.map((s) => (
            <option key={s.id} value={s.id}>
              {s.name}
            </option>
          ))}
        </NativeSelect>
      </FormField>

      <FormField
        id="productId"
        label="Product"
        error={errors.productId?.message}
      >
        <NativeSelect
          id="productId"
          aria-invalid={!!errors.productId}
          {...register("productId")}
        >
          <option value="">Choose a product</option>
          {options.categories.map((c) => (
            <optgroup key={c.name} label={c.name}>
              {c.products.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.variety ? `${p.name} — ${p.variety}` : p.name}
                </option>
              ))}
            </optgroup>
          ))}
        </NativeSelect>
      </FormField>

      <div className="grid grid-cols-2 gap-3">
        <FormField
          id="unitCode"
          label="Sold per"
          error={errors.unitCode?.message}
        >
          <NativeSelect
            id="unitCode"
            aria-invalid={!!errors.unitCode}
            {...register("unitCode")}
          >
            <option value="">Unit</option>
            {options.units.map((u) => (
              <option key={u.code} value={u.code}>
                {u.name}
              </option>
            ))}
          </NativeSelect>
        </FormField>
        <FormField
          id="price"
          label={`Price per ${unit?.name ?? "unit"} (GH₵)`}
          error={errors.price?.message}
        >
          <Input
            id="price"
            inputMode="decimal"
            placeholder="450.00"
            aria-invalid={!!errors.price}
            {...register("price")}
          />
        </FormField>
      </div>

      <FormField
        id="initialStock"
        label={`Stock now (${unit?.plural ?? "units"})`}
        error={errors.initialStock?.message}
      >
        <Input
          id="initialStock"
          inputMode="decimal"
          aria-invalid={!!errors.initialStock}
          {...register("initialStock")}
        />
      </FormField>

      <FormField
        id="netWeightPerUnitKg"
        label="Weight per unit in kg (optional)"
        hint="For bags, crates and baskets, e.g. 50 for a 50 kg bag. Shown to buyers for information only."
        error={errors.netWeightPerUnitKg?.message}
      >
        <Input
          id="netWeightPerUnitKg"
          inputMode="decimal"
          aria-invalid={!!errors.netWeightPerUnitKg}
          {...register("netWeightPerUnitKg")}
        />
      </FormField>

      <div className="grid grid-cols-2 gap-3">
        <FormField
          id="availableFrom"
          label="Available from"
          error={errors.availableFrom?.message}
        >
          <Input
            id="availableFrom"
            type="date"
            aria-invalid={!!errors.availableFrom}
            {...register("availableFrom")}
          />
        </FormField>
        <FormField
          id="availableUntil"
          label="Until (optional)"
          error={errors.availableUntil?.message}
        >
          <Input
            id="availableUntil"
            type="date"
            aria-invalid={!!errors.availableUntil}
            {...register("availableUntil")}
          />
        </FormField>
      </div>

      <FormField
        id="harvestDate"
        label="Harvest date (optional)"
        error={errors.harvestDate?.message}
      >
        <Input id="harvestDate" type="date" {...register("harvestDate")} />
      </FormField>

      <FormField
        id="description"
        label="Notes for buyers (optional)"
        error={errors.description?.message}
      >
        <Textarea
          id="description"
          rows={3}
          placeholder="e.g. Firm, deep red, picked to order"
          className="bg-card text-base md:text-sm"
          {...register("description")}
        />
      </FormField>

      <label className="flex items-start gap-3 rounded-xl border border-border bg-card p-3">
        <input
          type="checkbox"
          className="mt-0.5 size-5 accent-field-green"
          {...register("publish")}
        />
        <span>
          <span className="block font-medium">Put on sale now</span>
          <span className="text-sm text-muted-foreground">
            Leave unticked to save as a draft.
          </span>
        </span>
      </label>

      <Button
        type="submit"
        size="lg"
        disabled={isSubmitting}
        className="mt-2 w-full sm:w-auto"
      >
        {isSubmitting ? "Saving…" : "Create listing"}
      </Button>
    </form>
  );
}
