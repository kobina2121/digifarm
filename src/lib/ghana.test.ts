import { describe, expect, it } from "vitest";

import {
  digitalAddressSchema,
  formatGhanaPhone,
  ghanaPhoneSchema,
} from "./ghana";

describe("ghanaPhoneSchema", () => {
  it.each([
    ["024 123 4567", "+233241234567"],
    ["0241234567", "+233241234567"],
    ["+233 24 123 4567", "+233241234567"],
    ["233501234567", "+233501234567"],
    ["030-123-4567", "+233301234567"],
  ])("normalises %s", (input, expected) => {
    expect(ghanaPhoneSchema.parse(input)).toBe(expected);
  });

  it.each(["12345", "0141234567", "+44 7700 900123", "02412345678"])(
    "rejects %s",
    (input) => {
      expect(ghanaPhoneSchema.safeParse(input).success).toBe(false);
    },
  );

  it("formats for display", () => {
    expect(formatGhanaPhone("+233241234567")).toBe("024 123 4567");
  });
});

describe("digitalAddressSchema", () => {
  it("accepts and upper-cases GhanaPost GPS codes", () => {
    expect(digitalAddressSchema.parse("ga-123-4567")).toBe("GA-123-4567");
    expect(digitalAddressSchema.parse("AK-0391-2210")).toBe("AK-0391-2210");
  });

  it("rejects other formats", () => {
    expect(digitalAddressSchema.safeParse("Osu, Accra").success).toBe(false);
  });
});
