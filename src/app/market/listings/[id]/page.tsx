import {
  ArrowLeft,
  BadgeCheck,
  CalendarDays,
  ChevronRight,
  MapPin,
  Package,
  ShoppingCart,
  Tractor,
  Warehouse,
} from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { connection } from "next/server";
import type { ReactNode } from "react";

import { ListingTile } from "@/components/market/listing-tile";
import { type Actor, isStaff } from "@/lib/authz";
import { GHANA_REGIONS } from "@/lib/ghana";
import { orNotFound } from "@/lib/not-found";
import { getActor } from "@/lib/session";
import {
  browseListings,
  getMarketListing,
  type MarketListing,
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

const dateFormat = new Intl.DateTimeFormat("en-GB", {
  day: "numeric",
  month: "short",
  timeZone: "UTC",
});

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

export default async function MarketListingPage({
  params,
}: PageProps<"/market/listings/[id]">) {
  // Availability depends on the current time, so this always renders per request.
  await connection();
  const { id } = await params;
  const { listing, otherOffers } = await orNotFound(getMarketListing(id));
  const actor = await getActor();
  const [mode, sameCategory, cartLines] = await Promise.all([
    purchaseMode(listing, actor),
    browseListings({ category: listing.category.slug }),
    isBuyer(actor) ? cartLineCount(actor) : null,
  ]);

  // Other farms selling the same thing first, then the rest of the category.
  const seen = new Set([listing.id]);
  const related = [...otherOffers, ...sameCategory.items]
    .filter((l) => (seen.has(l.id) ? false : (seen.add(l.id), true)))
    .slice(0, 10);

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
      minOrderQty={listing.minOrderQty}
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
          <div className="mt-2">
            <Gallery photos={listing.photos} title={title} />
          </div>
        </section>

        {/* Name and quantity */}
        <section className="flex items-start justify-between gap-4">
          <div className="min-w-0">
            <h1 className="text-2xl leading-tight font-bold">{title}</h1>
            <div className="mt-2 flex flex-wrap items-center gap-2">
              {listing.grade ? (
                <span className="rounded-full bg-field-green px-2.5 py-1 text-xs font-semibold text-white">
                  Grade {listing.grade.code} · {listing.grade.title}
                </span>
              ) : null}
              <span
                className={
                  a.available
                    ? "rounded-full bg-sprout-soft px-2.5 py-1 text-xs font-semibold text-field-green-dark"
                    : "rounded-full bg-muted px-2.5 py-1 text-xs font-semibold text-muted-foreground"
                }
              >
                {a.available ? "In stock" : UNAVAILABLE_LABELS[a.reason]}
              </span>
            </div>
          </div>
          <QuantityStepper />
        </section>

        {/* Description */}
        <section className="grid gap-2">
          <h2 className="text-lg font-bold">Description</h2>
          <SeeMore
            text={
              listing.description ??
              `${listing.productName} from ${listing.supplier.name}, a farm in ${location} that DigiFarm has visited and approved.`
            }
          />
          {listing.grade ? (
            <p className="text-sm text-muted-foreground">
              <span className="font-semibold text-foreground">
                Grade {listing.grade.code}:
              </span>{" "}
              {listing.grade.description}
            </p>
          ) : null}
        </section>

        {/* Quick facts */}
        <ul className="-mx-4 flex [scrollbar-width:none] gap-2 overflow-x-auto px-4 md:mx-0 md:flex-wrap md:px-0 [&::-webkit-scrollbar]:hidden">
          <FactChip icon={<Package />} text={`Min ${listing.minOrderLabel}`} />
          {a.available ? (
            <FactChip
              icon={<Warehouse />}
              text={`${a.availableQty} ${a.availableQty === "1" ? listing.unit.name : listing.unit.plural} available`}
            />
          ) : null}
          <FactChip
            icon={<MapPin />}
            text={`Delivered in ${listing.zone.name}`}
          />
          {listing.harvestDate ? (
            <FactChip
              icon={<CalendarDays />}
              text={`Harvested ${dateFormat.format(listing.harvestDate)}`}
            />
          ) : null}
          {listing.netWeightPerUnitKg ? (
            <FactChip
              icon={<Package />}
              text={`~${listing.netWeightPerUnitKg} kg per ${listing.unit.name}`}
            />
          ) : null}
        </ul>

        {/* Farm */}
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
            <span className="block truncate text-sm text-muted-foreground">
              {location} · visited by DigiFarm
            </span>
          </span>
          <ChevronRight
            className="size-5 shrink-0 text-muted-foreground"
            aria-hidden
          />
        </Link>

        {/* Related */}
        {related.length ? (
          <section className="grid grid-cols-[minmax(0,1fr)] gap-3">
            <h2 className="text-lg font-bold">Related items</h2>
            <ul className="-mx-4 flex snap-x [scrollbar-width:none] gap-3 overflow-x-auto px-4 pb-1 md:mx-0 md:px-0 [&::-webkit-scrollbar]:hidden">
              {related.map((item) => (
                <li
                  key={item.id}
                  className="w-36 shrink-0 snap-start rounded-3xl bg-card p-2 sm:w-40"
                >
                  <ListingTile listing={item} />
                </li>
              ))}
            </ul>
          </section>
        ) : null}

        <BuyBar />

        {/* Room for the price bar that floats above the tab bar on phones. */}
        <div aria-hidden className="h-24 md:hidden" />
      </div>
    </PurchaseProvider>
  );
}

function FactChip({ icon, text }: { icon: ReactNode; text: string }) {
  return (
    <li className="flex shrink-0 items-center gap-1.5 rounded-full bg-card px-3 py-2 text-sm font-medium whitespace-nowrap [&_svg]:size-4 [&_svg]:text-field-green-dark">
      {icon}
      {text}
    </li>
  );
}
