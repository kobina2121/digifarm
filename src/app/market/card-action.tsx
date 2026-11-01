import { type Actor, isStaff } from "@/lib/authz";
import type { MarketListing } from "@/modules/catalog";

import { AddButton, SignInToAdd } from "./add-button";

/** What the card's + does for this viewer: add (buyers), sign in (visitors), nothing otherwise. */
export function cardAction(listing: MarketListing, actor: Actor | null) {
  if (!listing.availability.available) return null;
  if (!actor) {
    return (
      <SignInToAdd listingId={listing.id} productName={listing.productName} />
    );
  }
  if (isStaff(actor) || actor.membership?.organizationType !== "BUYER") {
    return null;
  }
  return (
    <AddButton
      listingId={listing.id}
      productName={listing.productName}
      minOrderQty={listing.minOrderQty}
      minOrderLabel={listing.minOrderLabel}
    />
  );
}
