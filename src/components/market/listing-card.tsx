import Link from "next/link";

import type { MarketListing } from "@/modules/catalog";

import {
  AvailabilityBadge,
  GradeBadge,
  ListingImage,
  VerifiedFarm,
} from "./listing-bits";

export function ListingCard({ listing }: { listing: MarketListing }) {
  const title = listing.variety
    ? `${listing.productName} · ${listing.variety}`
    : listing.productName;
  return (
    <Link
      href={`/market/listings/${listing.id}`}
      className="group flex h-full flex-col overflow-hidden rounded-2xl border border-border bg-card transition-colors hover:border-field-green"
    >
      <div className="relative">
        <ListingImage
          photo={listing.photos[0]}
          alt={title}
          sizes="(min-width: 1024px) 240px, (min-width: 640px) 33vw, 50vw"
          className="aspect-[4/3] w-full"
        />
        {/* Code only on cards; the grade's name and meaning are on the listing page. */}
        <GradeBadge
          grade={listing.grade ? { code: listing.grade.code } : null}
          className="absolute top-2 left-2 shadow-sm"
        />
      </div>
      <div className="flex flex-1 flex-col gap-1 p-3">
        <p className="leading-snug font-semibold">
          {listing.productName}
          {listing.variety ? (
            <span className="block text-sm font-normal text-muted-foreground">
              {listing.variety}
            </span>
          ) : null}
        </p>
        <p className="mt-1">
          <span className="text-lg font-bold">{listing.price}</span>
          <span className="text-sm text-muted-foreground">
            {" "}
            / {listing.unit.name}
          </span>
        </p>
        <p className="text-xs text-muted-foreground">
          Min. order {listing.minOrderLabel}
        </p>
        <div className="mt-auto grid gap-1.5 pt-2">
          <VerifiedFarm
            name={listing.supplier.name}
            className="text-xs text-soil"
          />
          {listing.availability.available ? null : (
            <AvailabilityBadge availability={listing.availability} />
          )}
        </div>
      </div>
    </Link>
  );
}
