import type { FulfilmentStatus, OrderStatus } from "@/generated/prisma/enums";

/**
 * Order lifecycle (ROADMAP §3.4, D1 revised). Payment confirms the order, so
 * there is no "waiting for the farm" state. Delivery states are used from
 * Phase 4.
 */
const ORDER_TRANSITIONS: Record<OrderStatus, OrderStatus[]> = {
  PENDING_PAYMENT: ["PAID", "EXPIRED", "CANCELLED"],
  PAID: ["IN_FULFILMENT", "CANCELLED"],
  IN_FULFILMENT: ["PARTIALLY_DELIVERED", "DELIVERED", "CANCELLED"],
  PARTIALLY_DELIVERED: ["DELIVERED", "COMPLETED"],
  DELIVERED: ["COMPLETED"],
  COMPLETED: [],
  CANCELLED: [],
  EXPIRED: [],
};

export function canTransition(from: OrderStatus, to: OrderStatus): boolean {
  return ORDER_TRANSITIONS[from].includes(to);
}

/**
 * Buyers can cancel before paying, and after paying until any produce has
 * been picked up from a farm (policy §2, free during the pilot).
 */
export function buyerCanCancel(
  status: OrderStatus,
  fulfilments: { status: FulfilmentStatus }[],
): boolean {
  if (status === "PENDING_PAYMENT") return true;
  if (status !== "PAID") return false;
  return fulfilments.every((f) => f.status === "CONFIRMED");
}

/** Whether "Pay now" makes sense: unpaid and the stock is still held. */
export function canPay(
  status: OrderStatus,
  holdExpiresAt: Date,
  now: Date,
): boolean {
  return status === "PENDING_PAYMENT" && holdExpiresAt > now;
}

export const ORDER_STATUS_LABELS: Record<OrderStatus, string> = {
  PENDING_PAYMENT: "Waiting for payment",
  PAID: "Paid",
  IN_FULFILMENT: "Being prepared",
  PARTIALLY_DELIVERED: "Partly delivered",
  DELIVERED: "Delivered",
  COMPLETED: "Completed",
  CANCELLED: "Cancelled",
  EXPIRED: "Payment time ran out",
};
