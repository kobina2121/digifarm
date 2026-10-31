"use client";

import { Minus, Plus, Trash2 } from "lucide-react";
import { useState, useTransition } from "react";

import { cn } from "@/lib/utils";

import { removeCartLine, updateCartLine } from "./actions";

function round(n: number) {
  return String(Math.round(n * 1000) / 1000);
}

/**
 * − 5 + stepper. Each tap saves straight away; the number can also be typed
 * (e.g. 2.5 tonnes) and is saved on Enter or when the field loses focus.
 */
export function QuantityStepper({
  listingId,
  productName,
  quantity,
  minOrderQty,
  unitName,
  unitPlural,
}: {
  listingId: string;
  productName: string;
  quantity: string;
  minOrderQty: string;
  unitName: string;
  unitPlural: string;
}) {
  const [value, setValue] = useState(quantity);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const min = Number(minOrderQty);
  const step = min >= 1 ? 1 : min;

  function save(next: string) {
    setValue(next);
    if (next === quantity) return;
    setError(null);
    startTransition(async () => {
      const result = await updateCartLine(listingId, next);
      if (!result.ok) {
        setError(result.error);
        setValue(quantity);
      }
    });
  }

  const current = Number(value) || min;
  return (
    <div className="grid gap-1">
      <div
        className={cn(
          "inline-flex w-fit items-center gap-1",
          pending && "opacity-60",
        )}
      >
        <button
          type="button"
          aria-label={`One ${unitName} fewer`}
          disabled={pending || current - step < min}
          onClick={() => save(round(current - step))}
          className="flex size-11 items-center justify-center rounded-full text-soil transition-colors hover:bg-muted disabled:opacity-35"
        >
          <Minus className="size-4" aria-hidden />
        </button>
        <label htmlFor={`qty-${listingId}`} className="sr-only">
          Quantity of {productName} ({unitPlural})
        </label>
        <input
          id={`qty-${listingId}`}
          inputMode="decimal"
          value={value}
          disabled={pending}
          onChange={(e) => setValue(e.target.value)}
          onBlur={() => save(value.trim())}
          onKeyDown={(e) => {
            if (e.key === "Enter") e.currentTarget.blur();
          }}
          className="h-11 w-12 bg-transparent text-center text-lg font-semibold tabular-nums outline-none focus:rounded-lg focus:ring-2 focus:ring-field-green/40"
        />
        <button
          type="button"
          aria-label={`One ${unitName} more`}
          disabled={pending}
          onClick={() => save(round(current + step))}
          className="flex size-11 items-center justify-center rounded-full"
        >
          <span className="flex size-8 items-center justify-center rounded-full bg-foreground text-background">
            <Plus className="size-4" aria-hidden />
          </span>
        </button>
      </div>
      {error ? (
        <p role="alert" className="text-sm text-destructive">
          {error}
        </p>
      ) : null}
    </div>
  );
}

/** Round bin button that sits on the product photo. */
export function RemoveLineButton({
  listingId,
  productName,
  className,
}: {
  listingId: string;
  productName: string;
  className?: string;
}) {
  const [pending, startTransition] = useTransition();
  return (
    <button
      type="button"
      aria-label={`Remove ${productName}`}
      disabled={pending}
      onClick={() =>
        startTransition(async () => {
          await removeCartLine(listingId);
        })
      }
      className={cn(
        "flex size-11 items-center justify-center rounded-full",
        className,
      )}
    >
      <span className="flex size-8 items-center justify-center rounded-full bg-card/85 text-foreground shadow-sm backdrop-blur">
        <Trash2 className="size-4" aria-hidden />
      </span>
    </button>
  );
}
