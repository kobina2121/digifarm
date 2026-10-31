import { CalendarDays, MapPin, Scale, ShoppingBasket } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { connection } from "next/server";

import {
  AvailabilityBadge,
  GradeBadge,
  ListingImage,
  VerifiedFarm,
} from "@/components/market/listing-bits";
import { ListingCard } from "@/components/market/listing-card";
import { GHANA_REGIONS } from "@/lib/ghana";
import { orNotFound } from "@/lib/not-found";
import { getMarketListing, STOCK_FRESH_HOURS } from "@/modules/catalog";

export const metadata: Metadata = { title: "Produce" };

const dateFormat = new Intl.DateTimeFormat("en-GB", {
  day: "numeric",
  month: "short",
  year: "numeric",
  timeZone: "UTC",
});

export default async function MarketListingPage({
  params,
}: PageProps<"/market/listings/[id]">) {
  // Availability depends on the current time, so this always renders per request.
  await connection();
  const { id } = await params;
  const { listing, otherOffers } = await orNotFound(getMarketListing(id));
  const title = listing.variety
    ? `${listing.productName} · ${listing.variety}`
    : listing.productName;
  const [cover, ...more] = listing.photos;
  const location = [
    listing.supplier.district,
    GHANA_REGIONS[listing.supplier.region],
  ]
    .filter(Boolean)
    .join(", ");

  return (
    <div className="grid gap-6">
      <Link
        href={`/market?category=${listing.category.slug}`}
        className="text-sm font-medium text-field-green underline-offset-4 hover:underline"
      >
        ← {listing.category.name}
      </Link>

      <div className="grid gap-6 md:grid-cols-2">
        <div className="grid gap-2">
          <ListingImage
            photo={cover}
            alt={title}
            sizes="(min-width: 768px) 480px, 100vw"
            eager
            className="aspect-[4/3] w-full rounded-2xl"
          />
          {more.length ? (
            <ul className="grid grid-cols-4 gap-2">
              {more.map((photo, i) => (
                <li key={photo.src}>
                  <ListingImage
                    photo={photo}
                    alt={`${title}, photo ${i + 2}`}
                    sizes="120px"
                    className="aspect-square w-full rounded-lg"
                  />
                </li>
              ))}
            </ul>
          ) : null}
        </div>

        <div className="grid content-start gap-4">
          <div>
            <p className="eyebrow text-field-green">{listing.category.name}</p>
            <h1 className="mt-1 text-3xl font-bold">{listing.productName}</h1>
            {listing.variety ? (
              <p className="text-lg text-muted-foreground">{listing.variety}</p>
            ) : null}
          </div>

          <div>
            <p>
              <span className="text-3xl font-bold">{listing.price}</span>
              <span className="text-muted-foreground">
                {" "}
                per {listing.unit.name}
              </span>
            </p>
            <p className="mt-1 text-sm text-muted-foreground">
              Minimum order {listing.minOrderLabel}
              {listing.netWeightPerUnitKg
                ? ` · about ${listing.netWeightPerUnitKg} kg per ${listing.unit.name}`
                : ""}
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <AvailabilityBadge availability={listing.availability} />
            <GradeBadge grade={listing.grade} />
          </div>

          <div className="rounded-2xl border border-border bg-card p-4">
            <div className="flex items-start gap-3">
              <ShoppingBasket
                className="mt-0.5 size-5 shrink-0 text-field-green"
                aria-hidden
              />
              <p className="text-sm">
                {listing.availability.available
                  ? "Ordering opens soon. Once it does, you’ll pay here and our team confirms your quantities with the farm."
                  : listing.availability.reason === "STOCK_NOT_CONFIRMED"
                    ? `Our team checks stock with the farm at least every ${STOCK_FRESH_HOURS / 24} days. This one is being rechecked.`
                    : "This can’t be ordered right now. Check back soon, or compare other farms below."}
              </p>
            </div>
          </div>

          {listing.description ? (
            <p className="whitespace-pre-line">{listing.description}</p>
          ) : null}

          <dl className="grid gap-3 text-sm">
            <div className="flex items-start gap-3">
              <MapPin
                className="mt-0.5 size-4 shrink-0 text-field-green"
                aria-hidden
              />
              <div>
                <dt className="sr-only">Sold in</dt>
                <dd>
                  Delivered in {listing.zone.name}
                  <span className="block text-muted-foreground">
                    Grown in {location}
                  </span>
                </dd>
              </div>
            </div>
            {listing.harvestDate ? (
              <div className="flex items-start gap-3">
                <CalendarDays
                  className="mt-0.5 size-4 shrink-0 text-field-green"
                  aria-hidden
                />
                <div>
                  <dt className="sr-only">Harvest date</dt>
                  <dd>Harvested {dateFormat.format(listing.harvestDate)}</dd>
                </div>
              </div>
            ) : null}
            {listing.grade ? (
              <div className="flex items-start gap-3">
                <Scale
                  className="mt-0.5 size-4 shrink-0 text-field-green"
                  aria-hidden
                />
                <div>
                  <dt className="font-medium">
                    Grade {listing.grade.code} · {listing.grade.title}
                  </dt>
                  <dd className="text-muted-foreground">
                    {listing.grade.description}
                  </dd>
                </div>
              </div>
            ) : null}
          </dl>

          <Link
            href={`/market/suppliers/${listing.supplier.id}`}
            className="rounded-2xl border border-border bg-card p-4 transition-colors hover:border-field-green"
          >
            <span className="eyebrow text-muted-foreground">Grown by</span>
            <VerifiedFarm
              name={listing.supplier.name}
              className="mt-1 text-lg font-semibold"
            />
            <span className="block text-sm text-muted-foreground">
              Visited and approved by DigiFarm
            </span>
          </Link>
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
                <ListingCard listing={offer} />
              </li>
            ))}
          </ul>
        </section>
      ) : null}
    </div>
  );
}
