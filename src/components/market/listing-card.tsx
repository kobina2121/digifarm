import { MapPin } from "lucide-react";
import Link from "next/link";
import type { ReactNode } from "react";

import { GHANA_REGIONS } from "@/lib/ghana";
import { cn } from "@/lib/utils";
import { type MarketListing, UNAVAILABLE_LABELS } from "@/modules/catalog";

import { ListingImage } from "./listing-bits";

/**
 * Compact product card for two-up grids: photo, name, where the farm is and
 * the price per unit. Tapping it opens the listing with the rest (farm,
 * description). `action` (the + button) sits in the bottom-right corner and
 * `corner` (the save heart) in the top-right, both outside the link.
 */
export function ListingCard({
  listing,
  action,
  corner,
}: {
  listing: MarketListing;
  action?: ReactNode;
  corner?: ReactNode;
}) {
  const title = listing.variety
    ? `${listing.productName} · ${listing.variety}`
    : listing.productName;
  const a = listing.availability;
  return (
    <div className="relative h-full">
      <Link
        href={`/market/listings/${listing.id}`}
        className="group flex h-full flex-col overflow-hidden rounded-3xl bg-card shadow-[0_1px_3px_rgb(31_42_31/0.06)] outline-offset-4 transition-shadow hover:shadow-[0_6px_20px_rgb(31_42_31/0.1)]"
      >
        {/* The whole photo, never cropped, as wide as the card: it scales with
            the card at any screen size or zoom. */}
        <div className="relative bg-white">
          <ListingImage
            photo={listing.photos[0]}
            alt={title}
            sizes="(min-width: 1024px) 240px, (min-width: 640px) 33vw, 50vw"
            className={cn(
              "aspect-[4/3] w-full object-contain transition-transform duration-300 group-hover:scale-[1.03]",
              !a.available && "opacity-60 grayscale-[40%]",
            )}
          />
          {!a.available ? (
            <span className="absolute inset-x-2 bottom-2 rounded-full bg-ink/85 py-1 text-center text-xs font-semibold text-white">
              {UNAVAILABLE_LABELS[a.reason]}
            </span>
          ) : null}
        </div>

        <div className="flex flex-1 flex-col gap-2.5 p-3">
          <div className="grid gap-0.5">
            <h3 className="line-clamp-2 text-base leading-snug font-semibold">
              {title}
            </h3>
            <p className="flex items-center gap-1 text-xs text-muted-foreground">
              <MapPin className="size-3.5 shrink-0" aria-hidden />
              <span className="truncate">
                {GHANA_REGIONS[listing.supplier.region]}
              </span>
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
        </div>
      </Link>
      {action ? (
        <div className="absolute right-3 bottom-3">{action}</div>
      ) : null}
      {corner ? <div className="absolute top-2 right-2">{corner}</div> : null}
    </div>
  );
}
