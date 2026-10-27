import { describe, expect, it } from "vitest";

import { Money } from "./money";
import { Quantity } from "./quantity";

describe("Money", () => {
  it("parses cedi strings into pesewas without floating point", () => {
    expect(Money.parse("12.50").amountMinor).toBe(BigInt(1250));
    expect(Money.parse("0.1").amountMinor).toBe(BigInt(10));
    expect(Money.parse("1000000").amountMinor).toBe(BigInt(100000000));
  });

  it("rejects sub-pesewa precision and malformed input", () => {
    expect(() => Money.parse("1.005")).toThrow(RangeError);
    expect(() => Money.parse("12,50")).toThrow(RangeError);
    expect(() => Money.parse("")).toThrow(RangeError);
    expect(() => Money.ofMinor(1.5)).toThrow(RangeError);
  });

  it("adds and subtracts exactly where floats would drift", () => {
    const total = Money.parse("0.10").add(Money.parse("0.20"));
    expect(total.toMajorString()).toBe("0.30");
    expect(Money.parse("5.00").subtract(Money.parse("7.25")).format()).toBe(
      "-GH₵ 2.25",
    );
  });

  it("refuses to mix currencies", () => {
    const ghs = Money.parse("1.00");
    // Simulate a foreign-currency value without widening the public type.
    const other = Object.assign(Object.create(Object.getPrototypeOf(ghs)), {
      amountMinor: BigInt(100),
      currency: "USD",
    }) as Money;
    expect(() => ghs.add(other)).toThrow(/Currency mismatch/);
  });

  it("multiplies by decimal quantities, rounding half-up once at the line level", () => {
    // GH₵ 3.33 per kg × 2.5 kg = 832.5 pesewas → 833
    expect(
      Money.parse("3.33").timesQuantity(Quantity.parse("2.5")).amountMinor,
    ).toBe(BigInt(833));
    // GH₵ 1.01 × 0.125 = 12.625 pesewas → 13
    expect(
      Money.parse("1.01").timesQuantity(Quantity.parse("0.125")).amountMinor,
    ).toBe(BigInt(13));
    // Exact results are untouched
    expect(
      Money.parse("450.00").timesQuantity(Quantity.parse("12")).toMajorString(),
    ).toBe("5400.00");
  });

  it("computes basis-point commissions with half-up rounding", () => {
    expect(Money.parse("100.00").basisPoints(750).toMajorString()).toBe("7.50");
    // 333 pesewas × 5% = 16.65 → 17
    expect(Money.ofMinor(333).basisPoints(500).amountMinor).toBe(BigInt(17));
    expect(() => Money.parse("1.00").basisPoints(10_001)).toThrow(RangeError);
    expect(() => Money.parse("1.00").basisPoints(2.5)).toThrow(RangeError);
  });

  it("handles amounts beyond the 32-bit range", () => {
    const big = Money.parse("50000000.00"); // GH₵ 50m = 5bn pesewas
    expect(big.add(big).amountMinor).toBe(BigInt("10000000000"));
  });

  it("formats for display and serialises minor units as strings", () => {
    expect(Money.parse("1250.5").format()).toBe("GH₵ 1,250.50");
    expect(JSON.stringify({ total: Money.parse("1250.50") })).toBe(
      '{"total":{"amountMinor":"125050","currency":"GHS"}}',
    );
  });
});

describe("Quantity", () => {
  it("accepts up to three decimal places", () => {
    expect(Quantity.parse("2.5").toString()).toBe("2.5");
    expect(Quantity.parse("0.125").toString()).toBe("0.125");
    expect(() => Quantity.parse("0.1234")).toThrow(RangeError);
  });

  it("rejects negative and invalid values", () => {
    expect(() => Quantity.parse("-1")).toThrow(RangeError);
    expect(() => Quantity.parse("abc")).toThrow(RangeError);
    expect(() => Quantity.parse(Infinity)).toThrow(RangeError);
  });

  it("does not go below zero when subtracting", () => {
    expect(() => Quantity.parse("1").subtract(Quantity.parse("2"))).toThrow(
      RangeError,
    );
    expect(
      Quantity.parse("5").subtract(Quantity.parse("2.25")).toString(),
    ).toBe("2.75");
  });
});
