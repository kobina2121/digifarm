import { Heart, MapPin, Search } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { connection } from "next/server";

import { cardAction, cardSave } from "@/app/market/card-action";
import { SavedArt } from "@/components/illustrations/commerce-art";
import { ListingImage } from "@/components/market/listing-bits";
import { buttonVariants } from "@/components/ui/button";
import type { Actor } from "@/lib/authz";
import { GHANA_REGIONS } from "@/lib/ghana";
import { cn } from "@/lib/utils";
import {
  listSavedListings,
  type MarketListing,
  UNAVAILABLE_LABELS,
} from "@/modules/catalog";

import { requireBuyer } from "../guard";

export const metadata: Metadata = { title: "Saved" };

/**
 * Produce the buyer has hearted, most recent first: what can be ordered now,
 * then what can't. Unhearting removes it.
 */
export default async function SavedPage() {
  // Availability depends on the current time, so this always renders per request.
  await connection();
  const actor = await requireBuyer();
  const items = await listSavedListings(actor);
  const saved = new Set(items.map((l) => l.id));
  const ready = items.filter((l) => l.availability.available);
  const later = items.filter((l) => !l.availability.available);

  return (
    <div className="mx-auto grid w-full max-w-3xl grid-cols-[minmax(0,1fr)] gap-6">
      <section className="relative overflow-hidden rounded-3xl bg-field-green p-6 pr-40 text-white sm:pr-56">
        <p className="eyebrow text-white/75">Saved</p>
        <h1 className="mt-1 text-2xl leading-tight font-bold sm:text-3xl">
          {items.length ? "Your favourites" : "Nothing saved yet"}
        </h1>
        <p className="mt-1 text-sm text-white/80">
          {items.length
            ? `${items.length} ${items.length === 1 ? "product" : "products"} · ${ready.length} ready to order`
            : "Keep the produce you buy often in one place."}
        </p>
        <SavedArt className="pointer-events-none absolute right-2 -bottom-2 h-auto w-36 sm:w-48" />
      </section>

      {items.length === 0 ? (
        <div className="grid justify-items-center gap-4 rounded-3xl bg-card p-8 text-center">
          <span className="flex size-16 items-center justify-center rounded-full bg-sprout-soft">
            <Heart
              className="size-7 fill-[#e5484d] text-[#e5484d]"
              aria-hidden
            />
          </span>
          <div className="grid gap-1">
            <p className="text-lg font-semibold">Tap the heart to save</p>
            <p className="max-w-xs text-sm text-muted-foreground">
              Every product in the market has a heart. Saved produce shows up
              here, ready to add to your cart.
            </p>
          </div>
          <Link
            href="/market"
            className={cn(
              buttonVariants({ size: "lg" }),
              "gap-2 rounded-full px-8",
            )}
          >
            <Search className="size-4" aria-hidden />
            Browse the market
          </Link>
        </div>
      ) : (
        <>
          {ready.length ? (
            <SavedSection
              title="Ready to order"
              items={ready}
              actor={actor}
              saved={saved}
            />
          ) : null}
          {later.length ? (
            <SavedSection
              title="Not available right now"
              hint="They’ll be ready to order again as soon as the farm has stock."
              items={later}
              actor={actor}
              saved={saved}
            />
          ) : null}
        </>
      )}
    </div>
  );
}

function SavedSection({
  title,
  hint,
  items,
  actor,
  saved,
}: {
  title: string;
  hint?: string;
  items: MarketListing[];
  actor: Actor;
  saved: Set<string>;
}) {
  return (
    <section className="grid grid-cols-[minmax(0,1fr)] gap-3">
      <div className="px-1">
        <h2 className="text-lg font-bold">
          {title}{" "}
          <span className="font-medium text-muted-foreground">
            · {items.length}
          </span>
        </h2>
        {hint ? <p className="text-sm text-muted-foreground">{hint}</p> : null}
      </div>
      <ul className="grid grid-cols-[minmax(0,1fr)] gap-3 sm:grid-cols-2">
        {items.map((listing) => (
          <SavedRow
            key={listing.id}
            listing={listing}
            actor={actor}
            saved={saved}
          />
        ))}
      </ul>
    </section>
  );
}

/** Photo on the left, details on the right; heart and + sit outside the link. */
function SavedRow({
  listing,
  actor,
  saved,
}: {
  listing: MarketListing;
  actor: Actor;
  saved: Set<string>;
}) {
  const title = listing.variety
    ? `${listing.productName} · ${listing.variety}`
    : listing.productName;
  const a = listing.availability;
  return (
    <li className="relative">
      <Link
        href={`/market/listings/${listing.id}`}
        className="flex h-full gap-3 rounded-3xl bg-card p-3 pr-16 shadow-[0_1px_3px_rgb(31_42_31/0.06)] outline-offset-4 transition-shadow hover:shadow-[0_6px_20px_rgb(31_42_31/0.1)]"
      >
        <div className="relative size-24 shrink-0 overflow-hidden rounded-2xl bg-white">
          <ListingImage
            photo={listing.photos[0]}
            alt={title}
            sizes="96px"
            className={cn(
              "size-full object-contain",
              !a.available && "opacity-60 grayscale-[40%]",
            )}
          />
        </div>
        <div className="flex min-w-0 flex-1 flex-col py-0.5">
          <p className="line-clamp-2 leading-snug font-semibold">{title}</p>
          <p className="mt-0.5 flex items-center gap-1 text-xs text-muted-foreground">
            <MapPin className="size-3.5 shrink-0" aria-hidden />
            <span className="truncate">
              {listing.supplier.name} · {GHANA_REGIONS[listing.supplier.region]}
            </span>
          </p>
          <p className="mt-auto pt-2">
            <span className="text-lg leading-none font-bold">
              {listing.price.replace(/\.00$/, "")}
            </span>
            <span className="text-xs text-muted-foreground">
              {" "}
              / {listing.unit.name}
            </span>
          </p>
          {!a.available ? (
            <span className="mt-1 self-start rounded-full bg-muted px-2 py-0.5 text-xs font-semibold text-muted-foreground">
              {UNAVAILABLE_LABELS[a.reason]}
            </span>
          ) : null}
        </div>
      </Link>
      <div className="absolute top-3 right-3">
        {cardSave(listing, actor, saved)}
      </div>
      {a.available ? (
        <div className="absolute right-3 bottom-3">
          {cardAction(listing, actor)}
        </div>
      ) : null}
    </li>
  );
}
