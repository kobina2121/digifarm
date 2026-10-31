"use client";

import { Check } from "lucide-react";
import { useState, useTransition } from "react";

import { FormError, FormField } from "@/components/forms/form-field";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

import { confirmStockAction } from "../actions";

/** After phoning the farmer: enter what they have now and confirm. */
export function ConfirmStockForm({
  listingId,
  onHand,
  unitPlural,
}: {
  listingId: string;
  onHand: string;
  unitPlural: string;
}) {
  const [pending, startTransition] = useTransition();
  const [qty, setQty] = useState(onHand);
  const [note, setNote] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [done, setDone] = useState(false);

  function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setFieldErrors({});
    setDone(false);
    startTransition(async () => {
      const result = await confirmStockAction(listingId, {
        onHand: qty,
        note,
      });
      if (!result.ok) {
        setError(result.error);
        setFieldErrors(result.fieldErrors ?? {});
        return;
      }
      setNote("");
      setDone(true);
    });
  }

  return (
    <form method="post" onSubmit={onSubmit} noValidate className="grid gap-3">
      <FormError message={error} />
      <div className="grid gap-3 sm:grid-cols-[10rem_1fr]">
        <FormField
          id="stock-onHand"
          label={`Stock now (${unitPlural})`}
          error={fieldErrors.onHand}
        >
          <Input
            id="stock-onHand"
            inputMode="decimal"
            value={qty}
            onChange={(e) => setQty(e.target.value)}
            aria-invalid={!!fieldErrors.onHand}
          />
        </FormField>
        <FormField id="stock-note" label="Note (optional)">
          <Input
            id="stock-note"
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="e.g. Spoke to Kofi, harvesting Friday"
          />
        </FormField>
      </div>
      <div className="flex flex-wrap items-center gap-3">
        <Button type="submit" disabled={pending}>
          <Check aria-hidden />
          {pending ? "Saving…" : "Confirm stock"}
        </Button>
        {done ? (
          <p role="status" className="text-sm text-field-green">
            Stock confirmed. Buyers can order this for the next 3 days.
          </p>
        ) : null}
      </div>
    </form>
  );
}
