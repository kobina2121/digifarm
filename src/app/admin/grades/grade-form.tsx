"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useState } from "react";
import { useForm } from "react-hook-form";

import { FormError, FormField } from "@/components/forms/form-field";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  type GradeUpdateInput,
  gradeUpdateSchema,
} from "@/modules/catalog/schemas";

import { updateGradeAction } from "../listings/actions";

export function GradeForm({
  gradeId,
  defaults,
}: {
  gradeId: string;
  defaults: GradeUpdateInput;
}) {
  const [formError, setFormError] = useState<string | null>(null);
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting, isDirty },
  } = useForm<GradeUpdateInput>({
    resolver: zodResolver(gradeUpdateSchema),
    defaultValues: defaults,
  });

  async function onSubmit(values: GradeUpdateInput) {
    setFormError(null);
    const result = await updateGradeAction(gradeId, values);
    if (!result.ok) {
      setFormError(result.error);
      return;
    }
    reset(values);
  }

  return (
    <form
      method="post"
      onSubmit={handleSubmit(onSubmit)}
      noValidate
      className="grid gap-3"
    >
      <FormError message={formError} />
      <FormField
        id={`${gradeId}-title`}
        label="Name"
        error={errors.title?.message}
      >
        <Input id={`${gradeId}-title`} {...register("title")} />
      </FormField>
      <FormField
        id={`${gradeId}-description`}
        label="What it looks like"
        error={errors.description?.message}
      >
        <Textarea
          id={`${gradeId}-description`}
          rows={3}
          className="bg-card text-base md:text-sm"
          {...register("description")}
        />
      </FormField>
      {isDirty ? (
        <Button type="submit" size="sm" disabled={isSubmitting}>
          {isSubmitting ? "Saving…" : "Save"}
        </Button>
      ) : null}
    </form>
  );
}
