import { MapPin } from "lucide-react";
import Link from "next/link";
import type { ReactNode } from "react";

import { cn } from "@/lib/utils";
import { type MarketListing, UNAVAILABLE_LABELS } from "@/modules/catalog";

import { ListingImage } from "./listing-bits";

/**
 * Compact product card for two-up grids: photo, grade chip, name, area and
 * price. Tapping it opens the listing with everything else (farm, minimum
 * order, harvest date, grade wording). `action` (the + button) sits in the
 * bottom-right corner, outside the link.
 */
export function ListingCard({
  listing,
  action,
}: {
  listing: MarketListing;
  action?: ReactNode;
}) {
  const title = listing.variety
    ? `${listing.productName} · ${listing.variety}`
    : listing.productName;
  const a = listing.availability;
  return (
    <div className="relative h-full">
      <Link
        href={`/market/listings/${listing.id}`}
        className="group flex h-full flex-col gap-2.5 rounded-3xl bg-card p-3 shadow-[0_1px_3px_rgb(31_42_31/0.06)] outline-offset-4 transition-shadow hover:shadow-[0_6px_20px_rgb(31_42_31/0.1)]"
      >
        <div className="relative overflow-hidden rounded-2xl bg-sprout-soft">
          <ListingImage
            photo={listing.photos[0]}
            alt={title}
            sizes="(min-width: 1024px) 240px, (min-width: 640px) 33vw, 50vw"
            className={cn(
              "aspect-square w-full transition-transform duration-300 group-hover:scale-[1.04]",
              !a.available && "opacity-60 grayscale-[40%]",
            )}
          />
          {!a.available ? (
            <span className="absolute inset-x-2 bottom-2 rounded-full bg-ink/85 py-1 text-center text-xs font-semibold text-white">
              {UNAVAILABLE_LABELS[a.reason]}
            </span>
          ) : null}
        </div>

        <div className="flex flex-wrap gap-1">
          {listing.grade ? (
            <span className="rounded-md bg-sprout-soft px-1.5 py-0.5 text-[0.7rem] font-semibold text-field-green-dark">
              Grade {listing.grade.code}
            </span>
          ) : null}
          <span className="rounded-md bg-muted px-1.5 py-0.5 text-[0.7rem] font-semibold text-muted-foreground">
            Min {listing.minOrderLabel}
          </span>
        </div>

        <div className="grid gap-0.5">
          <h3 className="line-clamp-2 text-base leading-snug font-semibold">
            {title}
          </h3>
          <p className="flex items-center gap-1 text-xs text-muted-foreground">
            <MapPin className="size-3.5 shrink-0" aria-hidden />
            <span className="truncate">{listing.zone.name}</span>
          </p>
        </div>

        {/* Room on the right for the + button. */}
        <p className="mt-auto pr-12">
          <span className="block text-lg leading-tight font-bold whitespace-nowrap">
            {/* Whole cedis read cleaner on a small card: GH₵ 450, not GH₵ 450.00. */}
            {listing.price.replace(/\.00$/, "")}
          </span>
          <span className="text-xs text-muted-foreground">
            per {listing.unit.name}
          </span>
        </p>
      </Link>
      {action ? (
        <div className="absolute right-3 bottom-3">{action}</div>
      ) : null}
    </div>
  );
}
