import { ChevronLeft, ShoppingCart, TriangleAlert } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { connection } from "next/server";

import { ListingImage, VerifiedFarm } from "@/components/market/listing-bits";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { type CartLine, getCart } from "@/modules/ordering";

import { requireBuyer } from "../guard";
import { QuantityStepper, RemoveLineButton } from "./cart-line-editor";

export const metadata: Metadata = { title: "Cart" };

export default async function CartPage() {
  await connection();
  const actor = await requireBuyer();
  const cart = await getCart(actor);

  return (
    <div className="mx-auto grid w-full max-w-xl gap-6">
      <header className="grid grid-cols-[2.75rem_1fr_2.75rem] items-center">
        <Link
          href="/market"
          aria-label="Back to the market"
          className="flex size-11 items-center justify-center rounded-full hover:bg-muted"
        >
          <ChevronLeft className="size-6" aria-hidden />
        </Link>
        <h1 className="text-center text-xl font-semibold">Cart</h1>
        <span className="relative flex size-11 items-center justify-center rounded-full bg-sprout-soft text-field-green">
          <ShoppingCart className="size-5" aria-hidden />
          {cart.lineCount ? (
            <span className="absolute -top-0.5 -right-0.5 flex size-5 items-center justify-center rounded-full bg-field-green text-[0.7rem] font-bold text-white">
              {cart.lineCount}
              <span className="sr-only">
                {cart.lineCount === 1 ? " product" : " products"} in your cart
              </span>
            </span>
          ) : null}
        </span>
      </header>

      {cart.lineCount === 0 ? (
        <div className="grid justify-items-center gap-3 rounded-3xl bg-card p-8 text-center">
          <span className="flex size-16 items-center justify-center rounded-full bg-sprout-soft text-field-green">
            <ShoppingCart className="size-7" aria-hidden />
          </span>
          <p className="text-lg font-semibold">Your cart is empty</p>
          <p className="text-sm text-muted-foreground">
            Find produce from approved farms and add it here.
          </p>
          <Link
            href="/market"
            className={cn(buttonVariants({ size: "lg" }), "rounded-full px-8")}
          >
            Browse the market
          </Link>
        </div>
      ) : (
        <>
          {cart.zoneCodes.length > 1 ? (
            <p className="flex items-start gap-2 rounded-2xl bg-harvest-gold-soft px-4 py-3 text-sm text-soil">
              <TriangleAlert className="mt-0.5 size-4 shrink-0" aria-hidden />
              Your cart has produce for both Accra and Kumasi. One order is
              delivered to one area, so check out each area separately.
            </p>
          ) : null}

          {cart.groups.map((group) => (
            <section
              key={group.supplierId}
              aria-label={group.supplierName}
              className="grid gap-4"
            >
              <p className="flex flex-wrap items-baseline justify-between gap-x-3 px-1 text-sm">
                <VerifiedFarm
                  name={group.supplierName}
                  className="font-semibold text-soil"
                />
                <span className="text-muted-foreground">
                  Delivered in {group.zoneName}
                </span>
              </p>
              <ul className="grid gap-5">
                {group.lines.map((line) => (
                  <Line key={line.listingId} line={line} />
                ))}
              </ul>
            </section>
          ))}

          {cart.unavailable.length ? (
            <section className="grid gap-4 rounded-3xl bg-muted p-4">
              <h2 className="font-semibold">No longer on sale</h2>
              <ul className="grid gap-4">
                {cart.unavailable.map((line) => (
                  <Line key={line.listingId} line={line} />
                ))}
              </ul>
            </section>
          ) : null}

          <section className="grid gap-5 pt-2">
            <dl className="grid gap-3">
              <div className="flex justify-between text-muted-foreground">
                <dt>Sub total</dt>
                <dd className="font-semibold text-soil">{cart.subtotal}</dd>
              </div>
              <div className="flex justify-between text-muted-foreground">
                <dt>Delivery</dt>
                <dd className="font-semibold text-soil">{cart.deliveryFee}</dd>
              </div>
              <div className="flex justify-between border-t-2 border-dashed border-border pt-3 text-lg">
                <dt className="font-medium">Total</dt>
                <dd className="font-bold">{cart.total}</dd>
              </div>
            </dl>
            {cart.canCheckout && cart.zoneCodes.length === 1 ? (
              <Link
                href="/buyer/checkout"
                className={cn(
                  buttonVariants({ size: "lg" }),
                  "h-14 rounded-full text-base font-semibold tracking-wide uppercase",
                )}
              >
                Checkout
              </Link>
            ) : (
              <p className="text-center text-sm text-muted-foreground">
                Sort out the items marked above to check out.
              </p>
            )}
          </section>
        </>
      )}
    </div>
  );
}

function Line({ line }: { line: CartLine }) {
  const l = line.listing;
  return (
    <li className="flex gap-4">
      <div className="relative shrink-0">
        <ListingImage
          photo={l?.photos[0]}
          alt=""
          sizes="120px"
          className="size-28 rounded-2xl sm:size-32"
        />
        <RemoveLineButton
          listingId={line.listingId}
          productName={line.productName}
          className="absolute top-0 right-0"
        />
      </div>
      <div className="grid min-w-0 flex-1 content-start gap-1.5">
        <Link
          href={`/market/listings/${line.listingId}`}
          className={cn(
            "text-lg leading-snug font-medium underline-offset-4 hover:underline",
            !l && "pointer-events-none",
          )}
        >
          {line.productName}
          {line.variety ? (
            <span className="block text-base font-normal text-muted-foreground">
              {line.variety}
            </span>
          ) : null}
        </Link>
        {l ? (
          <>
            <p className="flex flex-wrap gap-1.5">
              <span className="rounded-full bg-sprout-soft px-2.5 py-0.5 text-xs font-medium text-field-green-dark">
                {l.price} / {l.unit.name}
              </span>
              {l.grade ? (
                <span className="rounded-full bg-muted px-2.5 py-0.5 text-xs font-medium text-soil">
                  Grade {l.grade.code}
                </span>
              ) : null}
            </p>
            <p className="text-lg font-bold text-field-green">
              {line.lineTotal}
            </p>
            <div className="-ml-3">
              <QuantityStepper
                listingId={line.listingId}
                productName={line.productName}
                quantity={line.quantity}
                minOrderQty={l.minOrderQty}
                unitName={l.unit.name}
                unitPlural={l.unit.plural}
              />
            </div>
            <p className="text-xs text-muted-foreground">
              {line.quantityLabel} · min {l.minOrderLabel}
            </p>
          </>
        ) : null}
        {line.problem ? (
          <p className="text-sm font-medium text-destructive">{line.problem}</p>
        ) : null}
      </div>
    </li>
  );
}
