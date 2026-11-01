import {
  ArrowLeft,
  BadgeCheck,
  CalendarDays,
  ChevronRight,
  MapPin,
  Package,
  ShieldCheck,
  Tractor,
  Truck,
  Warehouse,
  Weight,
} from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { connection } from "next/server";
import type { ReactNode } from "react";

import { ListingCard } from "@/components/market/listing-card";
import { type Actor, isStaff } from "@/lib/authz";
import { GHANA_REGIONS } from "@/lib/ghana";
import { orNotFound } from "@/lib/not-found";
import { getActor } from "@/lib/session";
import { cn } from "@/lib/utils";
import {
  getMarketListing,
  type MarketListing,
  UNAVAILABLE_LABELS,
} from "@/modules/catalog";
import { PAYMENT_HOLD_MINUTES, quantityInCart } from "@/modules/ordering";

import { cardAction } from "../../card-action";
import { OrderBar } from "./order-bar";
import { ProductGallery } from "./product-gallery";

export const metadata: Metadata = { title: "Produce" };

const dateFormat = new Intl.DateTimeFormat("en-GB", {
  day: "numeric",
  month: "short",
  year: "numeric",
  timeZone: "UTC",
});

function unitLabel(unit: { name: string; plural: string }, qty: string) {
  return `${qty} ${qty === "1" ? unit.name : unit.plural}`;
}

export default async function MarketListingPage({
  params,
}: PageProps<"/market/listings/[id]">) {
  // Availability depends on the current time, so this always renders per request.
  await connection();
  const { id } = await params;
  const { listing, otherOffers } = await orNotFound(getMarketListing(id));
  const actor = await getActor();
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
    <div className="grid grid-cols-[minmax(0,1fr)] gap-8">
      <div className="grid grid-cols-[minmax(0,1fr)] items-start gap-6 lg:grid-cols-2 lg:gap-10">
        {/* Photos */}
        <div className="relative lg:sticky lg:top-6">
          <ProductGallery photos={listing.photos} title={title} />
          <Link
            href={`/market?category=${listing.category.slug}`}
            aria-label={`Back to ${listing.category.name}`}
            className="absolute top-3 left-3 flex size-11 items-center justify-center rounded-full bg-card/90 text-foreground shadow-md backdrop-blur"
          >
            <ArrowLeft className="size-5" aria-hidden />
          </Link>
          <span
            className={cn(
              "absolute top-4 right-4 rounded-full px-3 py-1 text-xs font-semibold shadow-sm",
              a.available
                ? "bg-card/95 text-field-green-dark"
                : "bg-ink/85 text-white",
            )}
          >
            {a.available ? "In stock" : UNAVAILABLE_LABELS[a.reason]}
          </span>
        </div>

        {/* Details */}
        <div className="grid min-w-0 grid-cols-[minmax(0,1fr)] gap-5">
          <div>
            <p className="eyebrow text-field-green-dark">
              {listing.category.name}
            </p>
            <h1 className="mt-1 text-3xl leading-tight font-bold">
              {listing.productName}
            </h1>
            {listing.variety ? (
              <p className="text-lg text-muted-foreground">{listing.variety}</p>
            ) : null}
          </div>

          <div className="flex items-end justify-between gap-4">
            <p>
              <span className="text-4xl font-bold tracking-tight">
                {listing.price.replace(/\.00$/, "")}
              </span>
              <span className="text-muted-foreground">
                {" "}
                per {listing.unit.name}
              </span>
            </p>
            {listing.grade ? (
              <span className="rounded-full bg-field-green px-3 py-1.5 text-sm font-semibold text-white">
                Grade {listing.grade.code}
              </span>
            ) : null}
          </div>

          <ul className="grid grid-cols-2 gap-3">
            <Fact
              icon={<Package />}
              label="Minimum order"
              value={listing.minOrderLabel}
            />
            <Fact
              icon={<Warehouse />}
              label="Available now"
              value={
                a.available
                  ? unitLabel(listing.unit, a.availableQty)
                  : UNAVAILABLE_LABELS[a.reason]
              }
            />
            <Fact
              icon={<MapPin />}
              label="Delivered in"
              value={listing.zone.name}
            />
            {listing.harvestDate ? (
              <Fact
                icon={<CalendarDays />}
                label="Harvested"
                value={dateFormat.format(listing.harvestDate)}
              />
            ) : listing.netWeightPerUnitKg ? (
              <Fact
                icon={<Weight />}
                label={`Per ${listing.unit.name}`}
                value={`About ${listing.netWeightPerUnitKg} kg`}
              />
            ) : (
              <Fact
                icon={<Weight />}
                label="Sold by"
                value={`The ${listing.unit.name}`}
              />
            )}
          </ul>

          <OrderSection listing={listing} actor={actor} />

          {listing.description ? (
            <section className="grid gap-2 rounded-3xl bg-card p-5">
              <h2 className="font-semibold">About this produce</h2>
              <p className="whitespace-pre-line text-muted-foreground">
                {listing.description}
              </p>
              {listing.harvestDate && listing.netWeightPerUnitKg ? (
                <p className="text-sm text-muted-foreground">
                  About {listing.netWeightPerUnitKg} kg per {listing.unit.name}.
                </p>
              ) : null}
            </section>
          ) : null}

          {listing.grade ? (
            <section className="flex gap-4 rounded-3xl bg-sprout-soft p-5">
              <span className="flex size-12 shrink-0 items-center justify-center rounded-full bg-field-green text-lg font-bold text-white">
                {listing.grade.code}
              </span>
              <div>
                <h2 className="font-semibold">
                  Grade {listing.grade.code} · {listing.grade.title}
                </h2>
                <p className="text-sm text-muted-foreground">
                  {listing.grade.description}
                </p>
              </div>
            </section>
          ) : null}

          <Link
            href={`/market/suppliers/${listing.supplier.id}`}
            className="flex items-center gap-4 rounded-3xl bg-card p-5 transition-shadow hover:shadow-[0_6px_20px_rgb(31_42_31/0.1)]"
          >
            <span className="flex size-12 shrink-0 items-center justify-center rounded-full bg-sprout-soft text-field-green-dark">
              <Tractor className="size-6" aria-hidden />
            </span>
            <span className="min-w-0 flex-1">
              <span className="block eyebrow text-muted-foreground">
                Grown by
              </span>
              <span className="flex items-center gap-1 font-semibold">
                <span className="truncate">{listing.supplier.name}</span>
                <BadgeCheck
                  className="size-4 shrink-0 text-field-green-dark"
                  aria-label="Verified farm"
                />
              </span>
              <span className="block truncate text-sm text-muted-foreground">
                {location} · visited and approved by DigiFarm
              </span>
            </span>
            <ChevronRight
              className="size-5 shrink-0 text-muted-foreground"
              aria-hidden
            />
          </Link>

          <ul className="grid gap-2 px-1 text-sm text-muted-foreground">
            <li className="flex items-center gap-2">
              <Truck
                className="size-4 shrink-0 text-field-green-dark"
                aria-hidden
              />
              Held for {PAYMENT_HOLD_MINUTES} minutes while you pay, then
              delivered in {listing.zone.name}.
            </li>
            <li className="flex items-center gap-2">
              <ShieldCheck
                className="size-4 shrink-0 text-field-green-dark"
                aria-hidden
              />
              Mobile money or card. Cancel free until it’s picked up.
            </li>
          </ul>
        </div>
      </div>

      {otherOffers.length ? (
        <section className="grid gap-3">
          <h2 className="text-xl font-bold">
            Other farms selling {listing.productName.toLowerCase()}
          </h2>
          <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
            {otherOffers.map((offer) => (
              <li key={offer.id}>
                <ListingCard
                  listing={offer}
                  action={cardAction(offer, actor)}
                />
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      {/* Room for the order bar that floats above the tab bar on phones. */}
      <div aria-hidden className="h-16 md:hidden" />
    </div>
  );
}

function Fact({
  icon,
  label,
  value,
}: {
  icon: ReactNode;
  label: string;
  value: string;
}) {
  return (
    <li className="flex items-center gap-3 rounded-2xl bg-card p-3">
      <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-sprout-soft text-field-green-dark [&_svg]:size-5">
        {icon}
      </span>
      <span className="min-w-0">
        <span className="block text-xs text-muted-foreground">{label}</span>
        <span className="block truncate text-sm font-semibold">{value}</span>
      </span>
    </li>
  );
}

/** Floats above the tab bar on phones; sits in the details column on wider screens. */
function Floating({ children }: { children: ReactNode }) {
  return (
    <div className="fixed inset-x-0 bottom-[calc(max(0.75rem,env(safe-area-inset-bottom))+4.75rem)] z-30 px-4 md:static md:z-auto md:px-0">
      <div className="mx-auto max-w-md md:max-w-none">{children}</div>
    </div>
  );
}

const PILL =
  "flex h-14 w-full items-center justify-center rounded-full text-sm font-semibold shadow-[0_8px_30px_rgb(31_42_31/0.16)] md:shadow-none";

async function OrderSection({
  listing,
  actor,
}: {
  listing: MarketListing;
  actor: Actor | null;
}) {
  if (!listing.availability.available) {
    return (
      <p className="rounded-3xl bg-muted p-4 text-sm text-muted-foreground">
        {UNAVAILABLE_LABELS[listing.availability.reason]}. Check back soon, or
        compare other farms below.
      </p>
    );
  }
  if (actor && isStaff(actor)) {
    return (
      <p className="rounded-3xl bg-muted p-4 text-sm text-muted-foreground">
        Buyers order this from their DigiFarm account.
      </p>
    );
  }
  if (actor?.emailVerified && actor.membership?.organizationType === "BUYER") {
    return (
      <Floating>
        <OrderBar
          listingId={listing.id}
          priceMinor={listing.priceMinor}
          minOrderQty={listing.minOrderQty}
          unitName={listing.unit.name}
          unitPlural={listing.unit.plural}
          inCart={await quantityInCart(actor, listing.id)}
        />
      </Floating>
    );
  }
  if (actor) {
    return (
      <Floating>
        <Link
          href="/onboarding"
          className={cn(
            PILL,
            "bg-field-green-dark text-white dark:bg-field-green",
          )}
        >
          Set up your business to order
        </Link>
      </Floating>
    );
  }
  return (
    <Floating>
      <Link
        href={`/sign-in?next=${encodeURIComponent(`/market/listings/${listing.id}`)}`}
        className={cn(
          PILL,
          "bg-field-green-dark text-white dark:bg-field-green",
        )}
      >
        Sign in to order
      </Link>
    </Floating>
  );
}
