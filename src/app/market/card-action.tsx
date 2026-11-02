import { SaveButton, SignInToSave } from "@/components/market/save-button";
import { type Actor, isStaff } from "@/lib/authz";
import { type MarketListing, savedListingIds } from "@/modules/catalog";

import { AddButton, SignInToAdd } from "./add-button";

function isBuyer(actor: Actor | null): actor is Actor {
  return Boolean(
    actor &&
    !isStaff(actor) &&
    actor.emailVerified &&
    actor.membership?.organizationType === "BUYER",
  );
}

/** Which of these listings the viewer has saved; empty for anyone but a buyer. */
export async function savedAmong(
  actor: Actor | null,
  listings: MarketListing[],
): Promise<Set<string>> {
  if (!isBuyer(actor)) return new Set();
  return savedListingIds(
    actor,
    listings.map((l) => l.id),
  );
}

/** The card's heart: save (buyers), sign in (visitors), nothing otherwise. */
export function cardSave(
  listing: MarketListing,
  actor: Actor | null,
  saved: Set<string>,
) {
  if (!actor) {
    return (
      <SignInToSave listingId={listing.id} productName={listing.productName} />
    );
  }
  if (!isBuyer(actor)) return null;
  return (
    <SaveButton
      listingId={listing.id}
      productName={listing.productName}
      saved={saved.has(listing.id)}
    />
  );
}

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
