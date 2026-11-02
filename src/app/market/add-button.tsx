"use client";

import { Check, Plus } from "lucide-react";
import Link from "next/link";
import { useEffect, useState, useTransition } from "react";

import { cn } from "@/lib/utils";

import { addToCart } from "./listings/[id]/actions";

const ROUND =
  "flex size-11 items-center justify-center rounded-full shadow-md transition-transform active:scale-95";

/**
 * The card's + button: adds one unit to the cart in one tap. The
 * amount can be changed in the cart or on the product page.
 */
export function AddButton({
  listingId,
  productName,
  minOrderQty,
  minOrderLabel,
}: {
  listingId: string;
  productName: string;
  minOrderQty: string;
  minOrderLabel: string;
}) {
  const [pending, startTransition] = useTransition();
  const [notice, setNotice] = useState<
    { ok: true; text: string } | { ok: false; text: string } | null
  >(null);

  useEffect(() => {
    if (!notice) return;
    const timer = setTimeout(() => setNotice(null), 4000);
    return () => clearTimeout(timer);
  }, [notice]);

  return (
    <>
      <button
        type="button"
        aria-label={`Add ${minOrderLabel} of ${productName} to cart`}
        disabled={pending}
        onClick={() =>
          startTransition(async () => {
            const result = await addToCart(listingId, minOrderQty);
            setNotice(
              result.ok
                ? {
                    ok: true,
                    text: `${productName}: ${result.data.quantityLabel} in your cart`,
                  }
                : { ok: false, text: result.error },
            );
          })
        }
        className={cn(
          ROUND,
          "bg-field-green-dark text-white dark:bg-field-green",
          pending && "animate-pulse",
        )}
      >
        {notice?.ok ? (
          <Check className="size-5" aria-hidden />
        ) : (
          <Plus className="size-5" aria-hidden />
        )}
      </button>
      {notice ? (
        // Above the floating tab bar, centred, like a phone snackbar.
        <div
          role="status"
          className="fixed inset-x-0 bottom-28 z-40 flex justify-center px-4 md:bottom-8"
        >
          <p
            className={cn(
              "flex max-w-md items-center gap-3 rounded-full py-2.5 pr-2.5 pl-4 text-sm font-medium text-white shadow-lg",
              notice.ok ? "bg-ink" : "bg-destructive",
            )}
          >
            <span className="min-w-0 truncate">{notice.text}</span>
            {notice.ok ? (
              <Link
                href="/buyer/cart"
                className="shrink-0 rounded-full bg-white/15 px-3 py-1 font-semibold"
              >
                View cart
              </Link>
            ) : null}
          </p>
        </div>
      ) : null}
    </>
  );
}

/** Visitors: the + leads to sign-in, then back to the product. */
export function SignInToAdd({
  listingId,
  productName,
}: {
  listingId: string;
  productName: string;
}) {
  return (
    <Link
      href={`/sign-in?next=${encodeURIComponent(`/market/listings/${listingId}`)}`}
      aria-label={`Sign in to order ${productName}`}
      className={cn(
        ROUND,
        "bg-field-green-dark text-white dark:bg-field-green",
      )}
    >
      <Plus className="size-5" aria-hidden />
    </Link>
  );
}
