import type { FulfilmentStatus, OrderStatus } from "@/generated/prisma/enums";

/** One farm's delivery: picked up, then delivered or sent out again. */
const FULFILMENT_TRANSITIONS: Record<FulfilmentStatus, FulfilmentStatus[]> = {
  PENDING: ["CONFIRMED", "CANCELLED"],
  CONFIRMED: ["PICKED_UP", "CANCELLED"],
  PICKED_UP: ["DELIVERED", "DELIVERY_FAILED"],
  DELIVERY_FAILED: ["PICKED_UP"],
  DELIVERED: [],
  CANCELLED: [],
};

export function canMoveFulfilment(
  from: FulfilmentStatus,
  to: FulfilmentStatus,
): boolean {
  return FULFILMENT_TRANSITIONS[from].includes(to);
}

/** The order's status once its farms' deliveries have moved on. */
export function orderStatusFromDeliveries(
  fulfilments: { status: FulfilmentStatus }[],
): "IN_FULFILMENT" | "PARTIALLY_DELIVERED" | "DELIVERED" {
  const live = fulfilments.filter((f) => f.status !== "CANCELLED");
  const delivered = live.filter((f) => f.status === "DELIVERED").length;
  if (live.length > 0 && delivered === live.length) return "DELIVERED";
  return delivered > 0 ? "PARTIALLY_DELIVERED" : "IN_FULFILMENT";
}

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
  IN_FULFILMENT: "On its way",
  PARTIALLY_DELIVERED: "Partly delivered",
  DELIVERED: "Delivered",
  COMPLETED: "Completed",
  CANCELLED: "Cancelled",
  EXPIRED: "Payment time ran out",
};

export const FULFILMENT_STATUS_LABELS: Record<FulfilmentStatus, string> = {
  PENDING: "Waiting for payment",
  CONFIRMED: "Getting ready",
  PICKED_UP: "On its way",
  DELIVERED: "Delivered",
  DELIVERY_FAILED: "Couldn’t be delivered",
  CANCELLED: "Cancelled",
};
