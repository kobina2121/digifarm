import type { GhanaRegion } from "@/generated/prisma/enums";

import {
  DELIVERY_FEE_OTHER_REGION_MINOR,
  DELIVERY_FEE_SAME_REGION_MINOR,
} from "./config";

/** Delivery from one farm: a higher fee when it crosses into another region. */
export function deliveryFeeMinor(
  farmRegion: GhanaRegion,
  deliveryRegion: GhanaRegion,
): bigint {
  return farmRegion === deliveryRegion
    ? DELIVERY_FEE_SAME_REGION_MINOR
    : DELIVERY_FEE_OTHER_REGION_MINOR;
}

/** Each farm is its own pickup, so an order pays one fee per farm. */
export function deliveryFeeForFarms(
  farmRegions: GhanaRegion[],
  deliveryRegion: GhanaRegion,
): bigint {
  return farmRegions.reduce(
    (sum, farmRegion) => sum + deliveryFeeMinor(farmRegion, deliveryRegion),
    BigInt(0),
  );
}
