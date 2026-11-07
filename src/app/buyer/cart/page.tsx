import { ShieldCheck, ShoppingCart, Tractor, Truck } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { connection } from "next/server";

import { BasketArt } from "@/components/illustrations/commerce-art";
import { ListingImage, VerifiedFarm } from "@/components/market/listing-bits";
import { buttonVariants } from "@/components/ui/button";
import { BandTitleBar, TopBand } from "@/components/shell/top-band";
import { cn } from "@/lib/utils";
import {
  type CartLine,
  getCart,
  PAYMENT_HOLD_MINUTES,
} from "@/modules/ordering";

import { requireBuyer } from "../guard";
import { QuantityStepper, RemoveLineButton } from "./cart-line-editor";

export const metadata: Metadata = { title: "Cart" };

export default async function CartPage() {
  await connection();
  const actor = await requireBuyer();
  const cart = await getCart(actor);

  return (
    <div className="mx-auto grid w-full max-w-xl gap-6">
      <TopBand scenery="line" className="pt-2">
        <BandTitleBar
          back={{ href: "/market", label: "Back to the market" }}
          title="Cart"
          end={
            <span className="relative flex size-11 items-center justify-center rounded-full bg-white/15 text-white">
              <ShoppingCart className="size-5" aria-hidden />
              {cart.lineCount ? (
                <span className="absolute -top-0.5 -right-0.5 flex size-5 items-center justify-center rounded-full bg-harvest-gold text-[0.7rem] font-bold text-soil">
                  {cart.lineCount}
                  <span className="sr-only">
                    {cart.lineCount === 1 ? " product" : " products"} in your
                    cart
                  </span>
                </span>
              ) : null}
            </span>
          }
        />
      </TopBand>

      {cart.lineCount === 0 ? (
        <div className="grid justify-items-center gap-3 overflow-hidden rounded-3xl bg-card px-6 pt-4 pb-8 text-center">
          <div className="w-full max-w-64 rounded-full bg-sprout-soft p-6">
            <BasketArt className="h-auto w-full" />
          </div>
          <p className="mt-2 text-xl font-bold">Your basket is empty</p>
          <p className="max-w-xs text-sm text-muted-foreground">
            Fill it with fresh produce from farms Akuafo has visited and
            approved.
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
          <section className="relative overflow-hidden rounded-3xl bg-sprout-soft p-5 pr-36">
            <p className="eyebrow text-field-green-dark">Your basket</p>
            <p className="mt-1 text-2xl font-bold">{cart.total}</p>
            <p className="mt-1 text-sm text-muted-foreground">
              {cart.lineCount} {cart.lineCount === 1 ? "product" : "products"}{" "}
              from {cart.groups.length}{" "}
              {cart.groups.length === 1 ? "farm" : "farms"} · delivered anywhere
              in Ghana
            </p>
            <BasketArt className="pointer-events-none absolute -right-2 -bottom-3 h-auto w-36" />
          </section>

          {cart.groups.map((group) => (
            <section
              key={group.supplierId}
              aria-label={group.supplierName}
              className="grid gap-4 rounded-3xl bg-card p-4"
            >
              <div className="flex items-center gap-3 border-b border-border pb-3">
                <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-sprout-soft text-field-green-dark">
                  <Tractor className="size-4.5" aria-hidden />
                </span>
                <p className="min-w-0 text-sm">
                  <VerifiedFarm
                    name={group.supplierName}
                    className="font-semibold text-soil"
                  />
                  <span className="block text-muted-foreground">
                    Farm in {group.farmRegion}
                  </span>
                </p>
              </div>
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

          <section className="grid gap-5 rounded-3xl bg-card p-5">
            <dl className="grid gap-3">
              <div className="flex justify-between text-muted-foreground">
                <dt>Sub total</dt>
                <dd className="font-semibold text-soil">{cart.subtotal}</dd>
              </div>
              <div className="flex justify-between text-muted-foreground">
                <dt>
                  Delivery
                  {cart.deliveryRegion ? ` to ${cart.deliveryRegion}` : ""}
                </dt>
                <dd className="font-semibold text-soil">{cart.deliveryFee}</dd>
              </div>
              <div className="flex justify-between border-t-2 border-dashed border-border pt-3 text-lg">
                <dt className="font-medium">Total</dt>
                <dd className="font-bold">{cart.total}</dd>
              </div>
            </dl>
            {cart.canCheckout ? (
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
            <ul className="grid gap-2 text-sm text-muted-foreground">
              <li className="flex items-center gap-2">
                <Truck
                  className="size-4 shrink-0 text-field-green-dark"
                  aria-hidden
                />
                Stock is held for {PAYMENT_HOLD_MINUTES} minutes while you pay,
                then delivered to you.
              </li>
              <li className="flex items-center gap-2">
                <ShieldCheck
                  className="size-4 shrink-0 text-field-green-dark"
                  aria-hidden
                />
                Mobile money or card. Cancel free until pickup.
              </li>
            </ul>
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
            </p>
            <p className="text-lg font-bold text-field-green">
              {line.lineTotal}
            </p>
            <div className="-ml-3">
              <QuantityStepper
                listingId={line.listingId}
                productName={line.productName}
                quantity={line.quantity}
                unitName={l.unit.name}
                unitPlural={l.unit.plural}
              />
            </div>
            <p className="text-xs text-muted-foreground">
              {line.quantityLabel}
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
