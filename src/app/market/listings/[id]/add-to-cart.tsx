"use client";

import { Minus, Plus } from "lucide-react";
import Link from "next/link";
import { useState, useTransition } from "react";

import { FormError } from "@/components/forms/form-field";
import { Button, buttonVariants } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

import { addToCart } from "./actions";

/** Quantity picker for one listing. Stock is held only when the buyer checks out. */
export function AddToCart({
  listingId,
  minOrderQty,
  unitPlural,
  inCart,
}: {
  listingId: string;
  minOrderQty: string;
  unitPlural: string;
  inCart: string | null;
}) {
  const [quantity, setQuantity] = useState(minOrderQty);
  const [error, setError] = useState<string | null>(null);
  const [added, setAdded] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const step = Number(minOrderQty) >= 1 ? 1 : Number(minOrderQty);

  function nudge(by: number) {
    const next = Math.max(Number(minOrderQty), (Number(quantity) || 0) + by);
    setQuantity(String(Math.round(next * 1000) / 1000));
  }

  return (
    <form
      className="grid gap-3"
      onSubmit={(e) => {
        e.preventDefault();
        setError(null);
        setAdded(null);
        startTransition(async () => {
          const result = await addToCart(listingId, quantity);
          if (!result.ok) {
            setError(result.fieldErrors?.quantity ?? result.error);
            return;
          }
          setAdded(result.data.quantityLabel);
        });
      }}
    >
      <Label htmlFor="quantity" className="text-sm font-medium text-soil">
        How many {unitPlural}?
      </Label>
      <div className="flex items-center gap-2">
        <Button
          type="button"
          variant="outline"
          size="icon"
          className="size-11"
          aria-label="Fewer"
          onClick={() => nudge(-step)}
        >
          <Minus aria-hidden />
        </Button>
        <Input
          id="quantity"
          inputMode="decimal"
          value={quantity}
          onChange={(e) => setQuantity(e.target.value)}
          aria-invalid={!!error}
          className="h-11 w-24 bg-card text-center text-base"
        />
        <Button
          type="button"
          variant="outline"
          size="icon"
          className="size-11"
          aria-label="More"
          onClick={() => nudge(step)}
        >
          <Plus aria-hidden />
        </Button>
        <Button type="submit" disabled={pending} className="h-11 flex-1">
          {pending ? "Adding…" : "Add to cart"}
        </Button>
      </div>
      <FormError message={error} />
      {added || inCart ? (
        <p
          role="status"
          className="flex flex-wrap items-center justify-between gap-2 rounded-lg bg-sprout-soft px-3 py-2.5 text-sm text-soil"
        >
          <span>
            {added
              ? `Added. You have ${added} in your cart.`
              : `${inCart} ${unitPlural} already in your cart.`}
          </span>
          <Link
            href="/buyer/cart"
            className={buttonVariants({ size: "sm", variant: "outline" })}
          >
            View cart
          </Link>
        </p>
      ) : null}
    </form>
  );
}
