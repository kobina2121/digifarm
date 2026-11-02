import { describe, expect, it } from "vitest";

import {
  DELIVERY_FEE_OTHER_REGION_MINOR as OTHER,
  DELIVERY_FEE_SAME_REGION_MINOR as SAME,
} from "./config";
import { deliveryFeeForFarms, deliveryFeeMinor } from "./delivery-fee";

describe("delivery fee", () => {
  it("costs more when the farm is in another region", () => {
    expect(deliveryFeeMinor("ASHANTI", "ASHANTI")).toBe(SAME);
    expect(deliveryFeeMinor("ASHANTI", "VOLTA")).toBe(OTHER);
    expect(OTHER > SAME).toBe(true);
  });

  it("charges one fee per farm in the order", () => {
    expect(deliveryFeeForFarms(["ASHANTI", "VOLTA"], "ASHANTI")).toBe(
      SAME + OTHER,
    );
    expect(deliveryFeeForFarms([], "ASHANTI")).toBe(BigInt(0));
  });
});
