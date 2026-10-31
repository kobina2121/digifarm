import { describe, expect, it } from "vitest";

import { type AvailabilityInput, availabilityOf } from "./availability";

const now = new Date("2026-10-30T10:00:00Z");
const base: AvailabilityInput = {
  status: "ACTIVE",
  supplierApproved: true,
  onHand: "100",
  reserved: "0",
  minOrderQty: "10",
  availableFrom: new Date("2026-10-01"),
  availableUntil: null,
};

describe("listing availability", () => {
  it("is available when listed, approved, in season and stocked", () => {
    expect(availabilityOf(base, now)).toEqual({
      available: true,
      availableQty: "100",
    });
  });

  it("is not listed when paused, draft or the supplier isn't approved", () => {
    expect(availabilityOf({ ...base, status: "PAUSED" }, now)).toMatchObject({
      reason: "NOT_LISTED",
    });
    expect(availabilityOf({ ...base, status: "DRAFT" }, now)).toMatchObject({
      reason: "NOT_LISTED",
    });
    expect(
      availabilityOf({ ...base, supplierApproved: false }, now),
    ).toMatchObject({ reason: "NOT_LISTED" });
  });

  it("is out of stock when less than the minimum order is left after reservations", () => {
    expect(
      availabilityOf({ ...base, onHand: "15", reserved: "6" }, now),
    ).toEqual({
      available: false,
      reason: "OUT_OF_STOCK",
      availableQty: "9",
    });
    expect(
      availabilityOf({ ...base, onHand: "10.5", reserved: "0.5" }, now)
        .available,
    ).toBe(true);
  });

  it("respects the availability dates", () => {
    expect(
      availabilityOf({ ...base, availableFrom: new Date("2026-11-02") }, now),
    ).toMatchObject({
      reason: "NOT_YET_AVAILABLE",
    });
    expect(
      availabilityOf({ ...base, availableUntil: new Date("2026-10-29") }, now),
    ).toMatchObject({
      reason: "NO_LONGER_AVAILABLE",
    });
    expect(
      availabilityOf({ ...base, availableUntil: new Date("2026-10-30") }, now)
        .available,
    ).toBe(true);
  });
});
