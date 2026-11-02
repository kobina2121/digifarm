import {
  ArrowLeft,
  BadgeCheck,
  ChevronRight,
  MapPin,
  ShoppingCart,
  Tractor,
} from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { connection } from "next/server";

import { SaveButton, SignInToSave } from "@/components/market/save-button";
import { type Actor, isStaff } from "@/lib/authz";
import { GHANA_REGIONS } from "@/lib/ghana";
import { orNotFound } from "@/lib/not-found";
import { getActor } from "@/lib/session";
import { cn } from "@/lib/utils";
import {
  getMarketListing,
  type MarketListing,
  savedListingIds,
  UNAVAILABLE_LABELS,
} from "@/modules/catalog";
import { cartLineCount, quantityInCart } from "@/modules/ordering";

import { Gallery } from "./gallery";
import {
  BuyBar,
  PurchaseProvider,
  type PurchaseMode,
  QuantityStepper,
} from "./purchase";
import { SeeMore } from "./see-more";

export const metadata: Metadata = { title: "Produce" };

function isBuyer(actor: Actor | null): actor is Actor {
  return Boolean(
    actor?.emailVerified && actor.membership?.organizationType === "BUYER",
  );
}

async function purchaseMode(
  listing: MarketListing,
  actor: Actor | null,
): Promise<PurchaseMode> {
  if (!listing.availability.available) {
    return {
      kind: "unavailable",
      label: UNAVAILABLE_LABELS[listing.availability.reason],
    };
  }
  if (actor && isStaff(actor)) return { kind: "staff" };
  if (isBuyer(actor)) {
    return { kind: "buyer", inCart: await quantityInCart(actor, listing.id) };
  }
  if (actor) return { kind: "onboard" };
  return {
    kind: "visitor",
    signInHref: `/sign-in?next=${encodeURIComponent(`/market/listings/${listing.id}`)}`,
  };
}

/**
 * Product details, kept simple: photo, name, stock, price per unit,
 * description, and the farm and where it is. Then quantity and add to cart.
 */
export default async function MarketListingPage({
  params,
}: PageProps<"/market/listings/[id]">) {
  // Availability depends on the current time, so this always renders per request.
  await connection();
  const { id } = await params;
  const { listing } = await orNotFound(getMarketListing(id));
  const actor = await getActor();
  const buyer = isBuyer(actor) && !isStaff(actor) ? actor : null;
  const [mode, cartLines, saved] = await Promise.all([
    purchaseMode(listing, actor),
    buyer ? cartLineCount(buyer) : null,
    buyer ? savedListingIds(buyer, [listing.id]) : null,
  ]);

  const title = listing.variety
    ? `${listing.productName} · ${listing.variety}`
    : listing.productName;
  const a = listing.availability;
  const location = [
    listing.supplier.district,
    GHANA_REGIONS[listing.supplier.region],
  ]
    .filter(Boolean)
    .join(", ");

  return (
    <PurchaseProvider
      listingId={listing.id}
      priceLabel={listing.price.replace(/\.00$/, "")}
      priceMinor={listing.priceMinor}
      unitName={listing.unit.name}
      unitPlural={listing.unit.plural}
      mode={mode}
    >
      <div className="mx-auto grid w-full max-w-2xl grid-cols-[minmax(0,1fr)] gap-6">
        {/* Photo stage */}
        <section className="-mx-4 -mt-6 rounded-b-[2.5rem] bg-sprout-soft px-4 pt-4 pb-6 md:mx-0 md:mt-0 md:rounded-[2.5rem]">
          <div className="grid grid-cols-[2.75rem_1fr_2.75rem] items-center">
            <Link
              href={`/market?category=${listing.category.slug}`}
              aria-label={`Back to ${listing.category.name}`}
              className="flex size-11 items-center justify-center rounded-full bg-card/80 shadow-sm backdrop-blur"
            >
              <ArrowLeft className="size-5" aria-hidden />
            </Link>
            <p className="text-center text-lg font-semibold">Details</p>
            {cartLines !== null ? (
              <Link
                href="/buyer/cart"
                aria-label={`Cart, ${cartLines} ${cartLines === 1 ? "product" : "products"}`}
                className="relative flex size-11 items-center justify-center rounded-full bg-card/80 shadow-sm backdrop-blur"
              >
                <ShoppingCart className="size-5" aria-hidden />
                {cartLines ? (
                  <span className="absolute -top-0.5 -right-0.5 flex size-5 items-center justify-center rounded-full bg-field-green text-[0.7rem] font-bold text-white">
                    {cartLines}
                  </span>
                ) : null}
              </Link>
            ) : (
              <span />
            )}
          </div>
          <div className="relative mt-2">
            <Gallery photos={listing.photos} title={title} />
            {saved ? (
              <SaveButton
                listingId={listing.id}
                productName={listing.productName}
                saved={saved.has(listing.id)}
                className="absolute top-3 right-3 size-11"
              />
            ) : !actor ? (
              <SignInToSave
                listingId={listing.id}
                productName={listing.productName}
                className="absolute top-3 right-3 size-11"
              />
            ) : null}
          </div>
        </section>

        {/* Name, stock, price per unit, quantity */}
        <section className="flex items-start justify-between gap-4">
          <div className="min-w-0">
            <h1 className="text-2xl leading-tight font-bold">{title}</h1>
            <span
              className={cn(
                "mt-2 inline-block rounded-full px-2.5 py-1 text-xs font-semibold",
                a.available
                  ? "bg-sprout-soft text-field-green-dark"
                  : "bg-muted text-muted-foreground",
              )}
            >
              {a.available ? "In stock" : UNAVAILABLE_LABELS[a.reason]}
            </span>
            <p className="mt-3">
              <span className="text-3xl font-bold tracking-tight">
                {listing.price.replace(/\.00$/, "")}
              </span>
              <span className="text-muted-foreground">
                {" "}
                per {listing.unit.name}
              </span>
            </p>
          </div>
          <QuantityStepper />
        </section>

        {/* Description */}
        {listing.description ? (
          <section className="grid gap-2">
            <h2 className="text-lg font-bold">Description</h2>
            <SeeMore text={listing.description} />
          </section>
        ) : null}

        {/* Farm and location */}
        <Link
          href={`/market/suppliers/${listing.supplier.id}`}
          className="flex items-center gap-3 rounded-3xl bg-card p-4"
        >
          <span className="flex size-11 shrink-0 items-center justify-center rounded-full bg-sprout-soft text-field-green-dark">
            <Tractor className="size-5" aria-hidden />
          </span>
          <span className="min-w-0 flex-1">
            <span className="flex items-center gap-1 font-semibold">
              <span className="truncate">{listing.supplier.name}</span>
              <BadgeCheck
                className="size-4 shrink-0 text-field-green-dark"
                aria-label="Verified farm"
              />
            </span>
            <span className="flex items-center gap-1 text-sm text-muted-foreground">
              <MapPin className="size-3.5 shrink-0" aria-hidden />
              <span className="truncate">{location}</span>
            </span>
          </span>
          <ChevronRight
            className="size-5 shrink-0 text-muted-foreground"
            aria-hidden
          />
        </Link>

        <BuyBar />

        {/* Room for the price bar that floats above the tab bar on phones. */}
        <div aria-hidden className="h-24 md:hidden" />
      </div>
    </PurchaseProvider>
  );
}
