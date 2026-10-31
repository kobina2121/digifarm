"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useState } from "react";
import { type FieldPath, useForm } from "react-hook-form";

import { FormError, FormField } from "@/components/forms/form-field";
import { NativeSelect } from "@/components/forms/native-select";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  type UpdateListingInput,
  updateListingSchema,
} from "@/modules/catalog/schemas";

import { updateListingAction } from "../actions";

export function EditListingForm({
  listingId,
  defaults,
  unit,
}: {
  listingId: string;
  defaults: UpdateListingInput;
  unit: { name: string; plural: string };
}) {
  const [formError, setFormError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const {
    register,
    handleSubmit,
    setError,
    formState: { errors, isSubmitting, isDirty },
    reset,
  } = useForm<UpdateListingInput>({
    resolver: zodResolver(updateListingSchema),
    defaultValues: defaults,
  });

  async function onSubmit(values: UpdateListingInput) {
    setFormError(null);
    setSaved(false);
    const result = await updateListingAction(listingId, values);
    if (!result.ok) {
      setFormError(result.error);
      for (const [path, message] of Object.entries(result.fieldErrors ?? {})) {
        setError(path as FieldPath<UpdateListingInput>, { message });
      }
      return;
    }
    reset(values);
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
      <div className="grid grid-cols-2 gap-3">
        <FormField
          id="edit-price"
          label={`Price per ${unit.name} (GH₵)`}
          error={errors.price?.message}
        >
          <Input
            id="edit-price"
            inputMode="decimal"
            aria-invalid={!!errors.price}
            {...register("price")}
          />
        </FormField>
        <FormField
          id="edit-minOrderQty"
          label={`Minimum order (${unit.plural})`}
          error={errors.minOrderQty?.message}
        >
          <Input
            id="edit-minOrderQty"
            inputMode="decimal"
            aria-invalid={!!errors.minOrderQty}
            {...register("minOrderQty")}
          />
        </FormField>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <FormField id="edit-gradeCode" label="DigiFarm grade">
          <NativeSelect id="edit-gradeCode" {...register("gradeCode")}>
            <option value="">Not graded</option>
            <option value="A">Grade A</option>
            <option value="B">Grade B</option>
            <option value="C">Grade C</option>
          </NativeSelect>
        </FormField>
        <FormField id="edit-zoneCode" label="Sold in">
          <NativeSelect id="edit-zoneCode" {...register("zoneCode")}>
            <option value="ACCRA">Greater Accra</option>
            <option value="KUMASI">Kumasi</option>
          </NativeSelect>
        </FormField>
      </div>
      <FormField
        id="edit-netWeightPerUnitKg"
        label="Weight per unit in kg (optional)"
        error={errors.netWeightPerUnitKg?.message}
      >
        <Input
          id="edit-netWeightPerUnitKg"
          inputMode="decimal"
          {...register("netWeightPerUnitKg")}
        />
      </FormField>
      <div className="grid grid-cols-2 gap-3">
        <FormField
          id="edit-availableFrom"
          label="Available from"
          error={errors.availableFrom?.message}
        >
          <Input
            id="edit-availableFrom"
            type="date"
            {...register("availableFrom")}
          />
        </FormField>
        <FormField
          id="edit-availableUntil"
          label="Until (optional)"
          error={errors.availableUntil?.message}
        >
          <Input
            id="edit-availableUntil"
            type="date"
            {...register("availableUntil")}
          />
        </FormField>
      </div>
      <FormField id="edit-harvestDate" label="Harvest date (optional)">
        <Input id="edit-harvestDate" type="date" {...register("harvestDate")} />
      </FormField>
      <FormField
        id="edit-description"
        label="Notes for buyers (optional)"
        error={errors.description?.message}
      >
        <Textarea
          id="edit-description"
          rows={3}
          className="bg-card text-base md:text-sm"
          {...register("description")}
        />
      </FormField>
      <div className="flex flex-wrap items-center gap-3">
        <Button type="submit" disabled={isSubmitting || !isDirty}>
          {isSubmitting ? "Saving…" : "Save changes"}
        </Button>
        {saved && !isDirty ? (
          <p role="status" className="text-sm text-field-green">
            Saved.
          </p>
        ) : null}
      </div>
    </form>
  );
}
