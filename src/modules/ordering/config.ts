/**
 * Order rules from the cancellation, refund and dispute policy
 * (docs/policies/cancellations-refunds-disputes.md, ROADMAP D10). Change the
 * numbers here; the code reads them from nowhere else.
 */

/** How long stock is held while the buyer approves the payment. */
export const PAYMENT_HOLD_MINUTES = 30;

/**
 * DigiFarm's commission on each farm's share, in basis points (100 = 1%).
 * Commission-only revenue was decided in D2; the rate hasn't been set yet.
 */
export const COMMISSION_BPS = 0;

/** Delivery is charged per order. The delivery model (D5) isn't decided yet. */
export const DELIVERY_FEE_MINOR = BigInt(0);

/** Keeps carts and orders a sensible size for one delivery. */
export const MAX_CART_LINES = 30;
