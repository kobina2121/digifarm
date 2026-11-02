"use client";

import { Check, ChevronsRight, Minus, Plus } from "lucide-react";
import Link from "next/link";
import {
  createContext,
  type ReactNode,
  use,
  useEffect,
  useState,
  useTransition,
} from "react";

import { cn } from "@/lib/utils";

import { addToCart } from "./actions";

/** Who's looking decides what the bar offers. */
export type PurchaseMode =
  | { kind: "buyer"; inCart: string | null }
  | { kind: "visitor"; signInHref: string }
  | { kind: "onboard" }
  | { kind: "staff" }
  | { kind: "unavailable"; label: string };

type Purchase = {
  listingId: string;
  priceLabel: string;
  priceMinor: string;
  unitName: string;
  unitPlural: string;
  mode: PurchaseMode;
};

const Ctx = createContext<
  (Purchase & { quantity: string; setQuantity: (q: string) => void }) | null
>(null);

function usePurchase() {
  const value = use(Ctx);
  if (!value) throw new Error("Wrap in <PurchaseProvider>");
  return value;
}

const cedis = new Intl.NumberFormat("en-GH", {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

function unitLabel(p: Purchase, qty: string) {
  return `${qty} ${qty === "1" ? p.unitName : p.unitPlural}`;
}

/** Holds the chosen quantity so the stepper and the price bar agree. */
export function PurchaseProvider({
  children,
  ...purchase
}: Purchase & { children: ReactNode }) {
  const [quantity, setQuantity] = useState("1");
  return <Ctx value={{ ...purchase, quantity, setQuantity }}>{children}</Ctx>;
}

/** − 1 crate + : round green buttons beside the product name. */
export function QuantityStepper() {
  const p = usePurchase();
  if (p.mode.kind !== "buyer") return null;
  // No minimum orders for now: one unit at a time, starting from one.
  const min = 1;
  const step = 1;
  const current = Number(p.quantity) || min;
  const set = (n: number) =>
    p.setQuantity(String(Math.round(Math.max(min, n) * 1000) / 1000));

  return (
    <div className="flex shrink-0 items-center gap-2">
      <button
        type="button"
        aria-label={`One ${p.unitName} fewer`}
        disabled={current - step < min}
        onClick={() => set(current - step)}
        className="flex size-10 items-center justify-center rounded-full bg-field-green text-white shadow-sm transition-opacity disabled:opacity-35"
      >
        <Minus className="size-4" aria-hidden />
      </button>
      <label className="grid justify-items-center">
        <span className="sr-only">Quantity ({p.unitPlural})</span>
        <input
          inputMode="decimal"
          value={p.quantity}
          onChange={(e) => p.setQuantity(e.target.value)}
          className="w-12 bg-transparent text-center text-lg leading-none font-bold tabular-nums outline-none"
        />
        <span className="text-[0.7rem] text-muted-foreground">
          {Number(p.quantity) === 1 ? p.unitName : p.unitPlural}
        </span>
      </label>
      <button
        type="button"
        aria-label={`One ${p.unitName} more`}
        onClick={() => set(current + step)}
        className="flex size-10 items-center justify-center rounded-full bg-field-green text-white shadow-sm"
      >
        <Plus className="size-4" aria-hidden />
      </button>
    </div>
  );
}

const WHITE_PILL =
  "flex h-12 shrink-0 items-center justify-center gap-2 rounded-full bg-white px-5 text-sm font-semibold text-[#11502d] transition-transform active:scale-[0.98] disabled:opacity-70";

/**
 * Green price bar with "Add to cart". Floats just above the tab bar on
 * phones and sits at the end of the details on larger screens.
 */
export function BuyBar() {
  const p = usePurchase();
  const [pending, startTransition] = useTransition();
  const [notice, setNotice] = useState<
    { ok: true; text: string } | { ok: false; text: string } | null
  >(null);

  useEffect(() => {
    if (!notice?.ok) return;
    const timer = setTimeout(() => setNotice(null), 4500);
    return () => clearTimeout(timer);
  }, [notice]);

  if (p.mode.kind === "staff") return null;

  const qty = Number(p.quantity);
  const total =
    Number.isFinite(qty) && qty > 0
      ? `GH₵ ${cedis.format(Math.round(Number(p.priceMinor) * qty) / 100)}`
      : null;
  const inCart =
    p.mode.kind === "buyer" && p.mode.inCart
      ? `${unitLabel(p, p.mode.inCart)} already in your cart`
      : null;
  const message =
    notice ?? (inCart ? { ok: true as const, text: inCart } : null);

  let action: ReactNode;
  switch (p.mode.kind) {
    case "buyer":
      action = (
        <button
          type="button"
          disabled={pending}
          className={WHITE_PILL}
          onClick={() => {
            setNotice(null);
            startTransition(async () => {
              const result = await addToCart(p.listingId, p.quantity);
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
          {notice?.ok ? <Check className="size-4" aria-hidden /> : null}
          {pending ? "Adding…" : "Add to cart"}
          {!pending && !notice?.ok ? (
            <ChevronsRight className="size-4 opacity-50" aria-hidden />
          ) : null}
        </button>
      );
      break;
    case "visitor":
      action = (
        <Link href={p.mode.signInHref} className={WHITE_PILL}>
          Sign in to order
          <ChevronsRight className="size-4 opacity-50" aria-hidden />
        </Link>
      );
      break;
    case "onboard":
      action = (
        <Link href="/onboarding" className={WHITE_PILL}>
          Finish setting up
        </Link>
      );
      break;
    case "unavailable":
      action = (
        <span className={cn(WHITE_PILL, "opacity-80")}>{p.mode.label}</span>
      );
      break;
  }

  return (
    <div className="fixed inset-x-0 bottom-[calc(max(0.75rem,env(safe-area-inset-bottom))+4.75rem)] z-30 px-4 md:static md:z-auto md:px-0">
      <div className="mx-auto grid max-w-md gap-2 md:max-w-none">
        {message ? (
          <p
            role="status"
            className={cn(
              "flex items-center justify-between gap-3 rounded-full py-2 pr-2 pl-4 text-sm font-medium shadow-md",
              message.ok ? "bg-ink text-white" : "bg-destructive text-white",
            )}
          >
            <span className="min-w-0 truncate">{message.text}</span>
            {message.ok ? (
              <Link
                href="/buyer/cart"
                className="shrink-0 rounded-full bg-white/15 px-3 py-1 text-xs font-semibold"
              >
                View cart
              </Link>
            ) : null}
          </p>
        ) : null}
        <div className="flex items-center justify-between gap-3 rounded-[1.75rem] bg-field-green py-3 pr-3 pl-5 text-white shadow-[0_12px_32px_rgb(31_42_31/0.28)] md:shadow-none">
          <div className="min-w-0">
            <p className="text-xs text-white/70">Price</p>
            <p className="truncate text-xl leading-tight font-bold">
              {p.priceLabel}
              <span className="text-sm font-medium text-white/80">
                /{p.unitName}
              </span>
            </p>
            {p.mode.kind === "buyer" && total ? (
              <p className="truncate text-xs text-white/70">
                {unitLabel(p, p.quantity)} · {total}
              </p>
            ) : null}
          </div>
          {action}
        </div>
      </div>
    </div>
  );
}
