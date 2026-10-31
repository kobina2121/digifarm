import Decimal from "decimal.js";

import type { ListingStatus } from "@/generated/prisma/enums";

/**
 * Stock is what staff last confirmed with the farmer by phone (ROADMAP D1/D6).
 * After this long without a fresh confirmation a listing stops being orderable
 * on its own — no background job needed.
 */
export const STOCK_FRESH_HOURS = 72;

export type UnavailableReason =
  | "NOT_LISTED"
  | "STOCK_NOT_CONFIRMED"
  | "OUT_OF_STOCK"
  | "NOT_YET_AVAILABLE"
  | "NO_LONGER_AVAILABLE";

export const UNAVAILABLE_LABELS: Record<UnavailableReason, string> = {
  NOT_LISTED: "Not on sale",
  STOCK_NOT_CONFIRMED: "Stock being confirmed",
  OUT_OF_STOCK: "Out of stock",
  NOT_YET_AVAILABLE: "Coming soon",
  NO_LONGER_AVAILABLE: "Season ended",
};

export type AvailabilityInput = {
  status: ListingStatus;
  supplierApproved: boolean;
  stockConfirmedAt: Date | null;
  onHand: string;
  reserved: string;
  minOrderQty: string;
  availableFrom: Date;
  availableUntil: Date | null;
};

export type Availability =
  | { available: true; availableQty: string }
  | { available: false; reason: UnavailableReason; availableQty: string };

/** Start of the day in UTC — listing dates are calendar dates. */
function day(d: Date): number {
  return Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate());
}

export function stockFreshCutoff(now: Date): Date {
  return new Date(now.getTime() - STOCK_FRESH_HOURS * 60 * 60 * 1000);
}

/** Whether a buyer could order this listing right now, and if not, why. */
export function availabilityOf(
  l: AvailabilityInput,
  now = new Date(),
): Availability {
  const availableQty = Decimal.max(
    0,
    new Decimal(l.onHand).minus(l.reserved),
  ).toFixed();
  const no = (reason: UnavailableReason): Availability => ({
    available: false,
    reason,
    availableQty,
  });

  if (l.status !== "ACTIVE" || !l.supplierApproved) return no("NOT_LISTED");
  if (day(l.availableFrom) > day(now)) return no("NOT_YET_AVAILABLE");
  if (l.availableUntil && day(l.availableUntil) < day(now))
    return no("NO_LONGER_AVAILABLE");
  if (!l.stockConfirmedAt || l.stockConfirmedAt < stockFreshCutoff(now))
    return no("STOCK_NOT_CONFIRMED");
  if (new Decimal(availableQty).lessThan(l.minOrderQty))
    return no("OUT_OF_STOCK");
  return { available: true, availableQty };
}
