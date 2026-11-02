"use client";

import { useState, useTransition } from "react";

import { FormError, FormField } from "@/components/forms/form-field";
import { NativeSelect } from "@/components/forms/native-select";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

import { recordPayoutAction } from "./actions";

/** Staff send the money first, then record it here with its reference. */
export function PayoutForm({
  fulfilmentId,
  amount,
  defaultPaidTo,
}: {
  fulfilmentId: string;
  amount: string;
  defaultPaidTo: string;
}) {
  const [open, setOpen] = useState(false);
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  if (!open) {
    return (
      <Button type="button" onClick={() => setOpen(true)}>
        Record payment
      </Button>
    );
  }

  return (
    <form
      className="grid w-full gap-3 border-t border-border pt-3"
      onSubmit={(e) => {
        e.preventDefault();
        const form = new FormData(e.currentTarget);
        setError(null);
        setFieldErrors({});
        startTransition(async () => {
          const result = await recordPayoutAction(fulfilmentId, {
            method: String(form.get("method")) as "MOBILE_MONEY",
            paidTo: String(form.get("paidTo") ?? ""),
            reference: String(form.get("reference") ?? ""),
          });
          if (!result.ok) {
            setError(result.error);
            setFieldErrors(result.fieldErrors ?? {});
          }
        });
      }}
    >
      <FormError message={error} />
      <div className="grid gap-3 sm:grid-cols-3">
        <FormField id={`method-${fulfilmentId}`} label="Sent by">
          <NativeSelect id={`method-${fulfilmentId}`} name="method">
            <option value="MOBILE_MONEY">Mobile money</option>
            <option value="BANK_TRANSFER">Bank transfer</option>
            <option value="CASH">Cash</option>
          </NativeSelect>
        </FormField>
        <FormField
          id={`paidTo-${fulfilmentId}`}
          label="Sent to"
          error={fieldErrors.paidTo}
        >
          <Input
            id={`paidTo-${fulfilmentId}`}
            name="paidTo"
            defaultValue={defaultPaidTo}
          />
        </FormField>
        <FormField
          id={`reference-${fulfilmentId}`}
          label="Transaction ID"
          error={fieldErrors.reference}
        >
          <Input id={`reference-${fulfilmentId}`} name="reference" />
        </FormField>
      </div>
      <div className="flex flex-wrap gap-2">
        <Button type="submit" disabled={pending}>
          {pending ? "Saving…" : `I’ve sent ${amount}`}
        </Button>
        <Button type="button" variant="ghost" onClick={() => setOpen(false)}>
          Cancel
        </Button>
      </div>
    </form>
  );
}
