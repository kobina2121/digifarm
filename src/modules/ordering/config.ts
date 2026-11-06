/**
 * Order rules from the cancellation, refund and dispute policy
 * (docs/policies/cancellations-refunds-disputes.md, ROADMAP D10). Change the
 * numbers here; the code reads them from nowhere else.
 */

/** How long stock is held while the buyer approves the payment. */
export const PAYMENT_HOLD_MINUTES = 30;

/**
 * Akuafo's commission on each farm's share, in basis points (100 = 1%).
 * Commission-only revenue was decided in D2; the rate hasn't been set yet.
 */
export const COMMISSION_BPS = 0;

/**
 * Delivery is charged per farm in the order (D5). PLACEHOLDER AMOUNTS until
 * the founder sets them; only ever charged in test mode so far.
 */
export const DELIVERY_FEE_SAME_REGION_MINOR = BigInt(3000); // GH₵ 30
export const DELIVERY_FEE_OTHER_REGION_MINOR = BigInt(8000); // GH₵ 80

/** How long after delivery a customer can report a problem (policy §4). */
export const PROBLEM_REPORT_HOURS = 24;

/** Keeps carts and orders a sensible size for one delivery. */
export const MAX_CART_LINES = 30;
