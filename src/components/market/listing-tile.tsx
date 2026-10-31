import Link from "next/link";

import type { MarketListing } from "@/modules/catalog";

import { ListingImage, VerifiedFarm } from "./listing-bits";

/** Compact card for horizontal rows (home page): photo, name, price, farm. */
export function ListingTile({ listing }: { listing: MarketListing }) {
  const title = listing.variety
    ? `${listing.productName} · ${listing.variety}`
    : listing.productName;
  return (
    <Link
      href={`/market/listings/${listing.id}`}
      className="group grid gap-2 rounded-3xl outline-offset-4"
    >
      <div className="relative overflow-hidden rounded-2xl bg-sprout-soft">
        <ListingImage
          photo={listing.photos[0]}
          alt={title}
          sizes="200px"
          className="aspect-[4/3] w-full transition-transform duration-300 group-hover:scale-[1.04]"
        />
        {listing.grade ? (
          <span className="absolute top-2 left-2 rounded-full bg-card/95 px-2 py-0.5 text-[0.7rem] font-semibold text-field-green-dark shadow-sm">
            Grade {listing.grade.code}
          </span>
        ) : null}
      </div>
      <div className="grid gap-0.5 px-0.5">
        <p className="truncate font-semibold">{title}</p>
        <p className="text-sm">
          <span className="font-semibold text-field-green">
            {listing.price}
          </span>
          <span className="text-muted-foreground"> / {listing.unit.name}</span>
        </p>
        <VerifiedFarm
          name={listing.supplier.name}
          className="text-xs text-muted-foreground"
        />
      </div>
    </Link>
  );
}
