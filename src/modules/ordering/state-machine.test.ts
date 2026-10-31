import { describe, expect, it } from "vitest";

import { buyerCanCancel, canPay, canTransition } from "./state-machine";

describe("order state machine", () => {
  it("confirms an order by payment, with no farm step in between", () => {
    expect(canTransition("PENDING_PAYMENT", "PAID")).toBe(true);
    expect(canTransition("PENDING_PAYMENT", "EXPIRED")).toBe(true);
    expect(canTransition("PENDING_PAYMENT", "IN_FULFILMENT")).toBe(false);
  });

  it("never reopens a finished order", () => {
    for (const end of ["CANCELLED", "EXPIRED", "COMPLETED"] as const) {
      expect(canTransition(end, "PAID")).toBe(false);
      expect(canTransition(end, "PENDING_PAYMENT")).toBe(false);
    }
    expect(canTransition("EXPIRED", "PAID")).toBe(false);
  });

  it("lets buyers cancel until produce is picked up", () => {
    expect(buyerCanCancel("PENDING_PAYMENT", [])).toBe(true);
    expect(buyerCanCancel("PAID", [{ status: "CONFIRMED" }])).toBe(true);
    expect(
      buyerCanCancel("PAID", [
        { status: "CONFIRMED" },
        { status: "PICKED_UP" },
      ]),
    ).toBe(false);
    expect(buyerCanCancel("IN_FULFILMENT", [{ status: "CONFIRMED" }])).toBe(
      false,
    );
    expect(buyerCanCancel("CANCELLED", [])).toBe(false);
  });

  it("only offers payment while the stock is held", () => {
    const now = new Date("2026-10-31T10:00:00Z");
    const later = new Date("2026-10-31T10:20:00Z");
    const earlier = new Date("2026-10-31T09:59:00Z");
    expect(canPay("PENDING_PAYMENT", later, now)).toBe(true);
    expect(canPay("PENDING_PAYMENT", earlier, now)).toBe(false);
    expect(canPay("PAID", later, now)).toBe(false);
  });
});
