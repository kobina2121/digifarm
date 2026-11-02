import { Heart } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { connection } from "next/server";

import { cardAction, cardSave } from "@/app/market/card-action";
import { ListingCard } from "@/components/market/listing-card";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { listSavedListings } from "@/modules/catalog";

import { requireBuyer } from "../guard";

export const metadata: Metadata = { title: "Saved" };

/** Produce the buyer has hearted, most recent first. Unhearting removes it. */
export default async function SavedPage() {
  // Availability depends on the current time, so this always renders per request.
  await connection();
  const actor = await requireBuyer();
  const items = await listSavedListings(actor);
  const saved = new Set(items.map((l) => l.id));

  return (
    <div className="mx-auto grid w-full max-w-5xl gap-5">
      <div>
        <h1 className="text-3xl font-bold">Saved</h1>
        <p className="mt-1 text-muted-foreground">
          Produce you’ve saved for later. Tap the heart to remove it.
        </p>
      </div>

      {items.length === 0 ? (
        <div className="grid justify-items-center gap-3 rounded-3xl bg-card p-8 text-center">
          <span className="flex size-14 items-center justify-center rounded-full bg-sprout-soft text-field-green-dark">
            <Heart className="size-6" aria-hidden />
          </span>
          <p className="text-lg font-semibold">Nothing saved yet</p>
          <p className="max-w-xs text-sm text-muted-foreground">
            Tap the heart on any product in the market to keep it here.
          </p>
          <Link
            href="/market"
            className={cn(buttonVariants({ size: "lg" }), "rounded-full px-8")}
          >
            Browse the market
          </Link>
        </div>
      ) : (
        <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
          {items.map((listing) => (
            <li key={listing.id}>
              <ListingCard
                listing={listing}
                action={cardAction(listing, actor)}
                corner={cardSave(listing, actor, saved)}
              />
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
