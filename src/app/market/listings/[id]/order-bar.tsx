"use client";

import { Check, Minus, Plus, ShoppingCart } from "lucide-react";
import Link from "next/link";
import { useEffect, useState, useTransition } from "react";

import { cn } from "@/lib/utils";

import { addToCart } from "./actions";

const cedis = new Intl.NumberFormat("en-GH", {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

/** Round half-up to the nearest pesewa, like the server does. */
function totalLabel(priceMinor: string, quantity: string) {
  const qty = Number(quantity);
  if (!Number.isFinite(qty) || qty <= 0) return null;
  const minor = Math.round(Number(priceMinor) * qty);
  return `GH₵ ${cedis.format(minor / 100)}`;
}

/**
 * Quantity stepper and "Add to cart" with the running total. Sticks above
 * the tab bar on phones; sits in the page on larger screens. Stock is held
 * only at checkout.
 */
export function OrderBar({
  listingId,
  priceMinor,
  minOrderQty,
  unitName,
  unitPlural,
  inCart,
}: {
  listingId: string;
  priceMinor: string;
  minOrderQty: string;
  unitName: string;
  unitPlural: string;
  inCart: string | null;
}) {
  const [quantity, setQuantity] = useState(minOrderQty);
  const [pending, startTransition] = useTransition();
  const [notice, setNotice] = useState<
    { ok: true; text: string } | { ok: false; text: string } | null
  >(null);
  const min = Number(minOrderQty);
  const step = min >= 1 ? 1 : min;
  const current = Number(quantity) || min;
  const total = totalLabel(priceMinor, quantity);

  useEffect(() => {
    if (!notice?.ok) return;
    const timer = setTimeout(() => setNotice(null), 4000);
    return () => clearTimeout(timer);
  }, [notice]);

  function nudge(by: number) {
    const next = Math.max(min, current + by);
    setQuantity(String(Math.round(next * 1000) / 1000));
  }

  const status =
    notice ??
    (inCart
      ? {
          ok: true as const,
          text: `${inCart} ${inCart === "1" ? unitName : unitPlural} already in your cart`,
        }
      : null);

  return (
    <div className="grid gap-2">
      {status ? (
        <p
          role="status"
          className={cn(
            "flex items-center justify-between gap-3 rounded-full py-2 pr-2 pl-4 text-sm font-medium shadow-sm",
            status.ok
              ? "bg-sprout-soft text-field-green-dark"
              : "bg-destructive/10 text-destructive",
          )}
        >
          <span className="min-w-0 truncate">{status.text}</span>
          {status.ok ? (
            <Link
              href="/buyer/cart"
              className="inline-flex shrink-0 items-center gap-1 rounded-full bg-card px-3 py-1 text-xs font-semibold text-foreground"
            >
              <ShoppingCart className="size-3.5" aria-hidden />
              View cart
            </Link>
          ) : null}
        </p>
      ) : null}
      <form
        className="flex items-center gap-2 rounded-full bg-card p-1.5 shadow-[0_8px_30px_rgb(31_42_31/0.16)] md:shadow-none md:ring-1 md:ring-border"
        onSubmit={(e) => {
          e.preventDefault();
          setNotice(null);
          startTransition(async () => {
            const result = await addToCart(listingId, quantity);
            setNotice(
              result.ok
                ? {
                    ok: true,
                    text: `${result.data.quantityLabel} in your cart`,
                  }
                : {
                    ok: false,
                    text: result.fieldErrors?.quantity ?? result.error,
                  },
            );
          });
        }}
      >
        <div className="flex items-center">
          <button
            type="button"
            aria-label={`One ${unitName} fewer`}
            disabled={current - step < min}
            onClick={() => nudge(-step)}
            className="flex size-11 items-center justify-center rounded-full text-soil hover:bg-muted disabled:opacity-35"
          >
            <Minus className="size-4" aria-hidden />
          </button>
          <label htmlFor="order-qty" className="sr-only">
            Quantity ({unitPlural})
          </label>
          <input
            id="order-qty"
            inputMode="decimal"
            value={quantity}
            onChange={(e) => setQuantity(e.target.value)}
            className="h-11 w-12 bg-transparent text-center text-lg font-bold tabular-nums outline-none"
          />
          <button
            type="button"
            aria-label={`One ${unitName} more`}
            onClick={() => nudge(step)}
            className="flex size-11 items-center justify-center rounded-full text-soil hover:bg-muted"
          >
            <Plus className="size-4" aria-hidden />
          </button>
        </div>
        <button
          type="submit"
          disabled={pending}
          className="flex h-12 min-w-0 flex-1 items-center justify-center gap-2 rounded-full bg-field-green-dark px-4 text-sm font-semibold text-white transition-opacity disabled:opacity-70 dark:bg-field-green"
        >
          {notice?.ok ? (
            <Check className="size-4 shrink-0" aria-hidden />
          ) : null}
          <span className="flex min-w-0 flex-col items-center leading-tight">
            <span className="truncate">
              {pending ? "Adding…" : "Add to cart"}
            </span>
            {total && !pending ? (
              <span className="truncate text-xs font-medium text-white/80">
                {total}
              </span>
            ) : null}
          </span>
        </button>
      </form>
    </div>
  );
}
