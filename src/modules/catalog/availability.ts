import Decimal from "decimal.js";

import type { ListingStatus } from "@/generated/prisma/enums";

/**
 * DigiFarm manages every farm's stock (ROADMAP D1/D6): whatever stock staff
 * have entered is available to buy, however long ago it was entered. After
 * this long without an update, a listing only appears on the staff reminder
 * list ("not updated in 3 days"); buyers are unaffected.
 */
export const STOCK_REMINDER_HOURS = 72;

export type UnavailableReason =
  "NOT_LISTED" | "OUT_OF_STOCK" | "NOT_YET_AVAILABLE" | "NO_LONGER_AVAILABLE";

export const UNAVAILABLE_LABELS: Record<UnavailableReason, string> = {
  NOT_LISTED: "Not on sale",
  OUT_OF_STOCK: "Out of stock",
  NOT_YET_AVAILABLE: "Coming soon",
  NO_LONGER_AVAILABLE: "Season ended",
};

export type AvailabilityInput = {
  status: ListingStatus;
  supplierApproved: boolean;
  onHand: string;
  reserved: string;
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

export function stockReminderCutoff(now: Date): Date {
  return new Date(now.getTime() - STOCK_REMINDER_HOURS * 60 * 60 * 1000);
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
  // No minimum orders for now: anything left can be ordered.
  if (!new Decimal(availableQty).greaterThan(0)) return no("OUT_OF_STOCK");
  return { available: true, availableQty };
}
