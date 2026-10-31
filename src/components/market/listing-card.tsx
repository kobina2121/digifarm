import { MapPin, Package, Scale } from "lucide-react";
import Link from "next/link";

import { cn } from "@/lib/utils";
import { type MarketListing, UNAVAILABLE_LABELS } from "@/modules/catalog";

import { ListingImage, VerifiedFarm } from "./listing-bits";

/**
 * Photo-led card: a large rounded photo, then the name, the price line and a
 * row of facts. Only real listing data: no ratings or delivery times we don't have.
 */
export function ListingCard({ listing }: { listing: MarketListing }) {
  const title = listing.variety
    ? `${listing.productName} · ${listing.variety}`
    : listing.productName;
  const a = listing.availability;
  return (
    <Link
      href={`/market/listings/${listing.id}`}
      className="group flex h-full flex-col gap-3 rounded-3xl outline-offset-4"
    >
      <div className="relative overflow-hidden rounded-3xl bg-sprout-soft">
        <ListingImage
          photo={listing.photos[0]}
          alt={title}
          sizes="(min-width: 1024px) 320px, (min-width: 640px) 50vw, 100vw"
          className="aspect-[16/10] w-full transition-transform duration-300 group-hover:scale-[1.03]"
        />
        <span
          className={cn(
            "absolute top-3 left-3 rounded-full px-2.5 py-1 text-xs font-semibold shadow-sm",
            a.available
              ? "bg-card/95 text-field-green-dark"
              : "bg-ink/85 text-white",
          )}
        >
          {a.available ? "In stock" : UNAVAILABLE_LABELS[a.reason]}
        </span>
      </div>

      <div className="grid gap-1.5 px-1">
        <h3 className="text-xl leading-tight font-semibold">{title}</h3>
        <p className="flex min-w-0 flex-wrap items-center gap-x-1.5 text-muted-foreground">
          <span className="font-semibold text-field-green">
            {listing.price}
          </span>
          <span aria-hidden>·</span>
          <span>per {listing.unit.name}</span>
          <span aria-hidden>·</span>
          <VerifiedFarm name={listing.supplier.name} className="min-w-0" />
        </p>
        <ul className="flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-soil">
          {listing.grade ? (
            <li className="inline-flex items-center gap-1">
              <Scale className="size-4 text-field-green" aria-hidden />
              Grade {listing.grade.code}
            </li>
          ) : null}
          <li className="inline-flex items-center gap-1">
            <Package className="size-4 text-field-green" aria-hidden />
            Min {listing.minOrderLabel}
          </li>
          <li className="inline-flex items-center gap-1">
            <MapPin className="size-4 text-field-green" aria-hidden />
            {listing.zone.name}
          </li>
        </ul>
      </div>
    </Link>
  );
}
