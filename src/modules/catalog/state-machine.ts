import type { ListingStatus } from "@/generated/prisma/enums";

import type { LISTING_ACTIONS } from "./schemas";

export type ListingAction = (typeof LISTING_ACTIONS)[number];

const TRANSITIONS: Record<
  ListingAction,
  { from: ListingStatus[]; to: ListingStatus }
> = {
  PUBLISH: { from: ["DRAFT"], to: "ACTIVE" },
  PAUSE: { from: ["ACTIVE"], to: "PAUSED" },
  RESUME: { from: ["PAUSED"], to: "ACTIVE" },
  // Archived listings stay in order history but can never be sold again.
  ARCHIVE: { from: ["DRAFT", "ACTIVE", "PAUSED"], to: "ARCHIVED" },
};

export function nextListingStatus(
  current: ListingStatus,
  action: ListingAction,
): ListingStatus | null {
  const rule = TRANSITIONS[action];
  return rule.from.includes(current) ? rule.to : null;
}

export function allowedListingActions(current: ListingStatus): ListingAction[] {
  return (Object.keys(TRANSITIONS) as ListingAction[]).filter((a) =>
    TRANSITIONS[a].from.includes(current),
  );
}
