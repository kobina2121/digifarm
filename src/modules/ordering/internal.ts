import "server-only";

import type { OrderStatus } from "@/generated/prisma/enums";
import { audit } from "@/lib/audit";
import type { Actor } from "@/lib/authz";
import type { Tx } from "@/lib/db";
import { ConflictError, NotFoundError } from "@/lib/errors";
import { releaseStock } from "@/modules/inventory";

import { canTransition } from "./state-machine";

/** Shared steps for checkout, payment and cancellation. Callers own the transaction. */

export type LockedOrder = {
  id: string;
  number: string;
  status: OrderStatus;
  buyerOrgId: string;
  totalMinor: bigint;
  holdExpiresAt: Date;
};

/** Lock the order row so payment, expiry and cancellation can't interleave. */
export async function lockOrder(tx: Tx, orderId: string): Promise<LockedOrder> {
  const locked = await tx.$queryRaw<{ id: string }[]>`
    SELECT id FROM "order" WHERE id = ${orderId}::uuid FOR UPDATE`;
  if (!locked.length) throw new NotFoundError("Order not found.");
  return tx.order.findUniqueOrThrow({
    where: { id: orderId },
    select: {
      id: true,
      number: true,
      status: true,
      buyerOrgId: true,
      totalMinor: true,
      holdExpiresAt: true,
    },
  });
}

/** Move an order to a new status with a history row and an audit entry. */
export async function transitionOrder(
  tx: Tx,
  order: LockedOrder,
  to: OrderStatus,
  actor: Actor | null,
  reason?: string,
  extra: { paidAt?: Date; cancelledAt?: Date; cancelReason?: string } = {},
) {
  if (!canTransition(order.status, to)) {
    throw new ConflictError(
      `This order can’t go from ${order.status} to ${to}.`,
    );
  }
  await tx.order.update({
    where: { id: order.id },
    data: { status: to, ...extra },
  });
  await tx.orderStatusHistory.create({
    data: {
      orderId: order.id,
      from: order.status,
      to,
      reason,
      actorUserId: actor?.userId ?? null,
    },
  });
  await audit(tx, actor, {
    action: `order.${to.toLowerCase()}`,
    entityType: "order",
    entityId: order.id,
    before: { status: order.status },
    after: { status: to, ...(reason ? { reason } : {}) },
    onBehalfOfOrgId: actor?.membership ? undefined : order.buyerOrgId,
  });
  order.status = to;
}

/** End every active hold on an order (expired, or cancelled before payment). */
export async function releaseHolds(tx: Tx, orderId: string) {
  const holds = await tx.stockReservation.findMany({
    where: { orderItem: { orderId }, status: "ACTIVE" },
    orderBy: { inventoryId: "asc" },
    select: { id: true, inventoryId: true, quantity: true },
  });
  for (const hold of holds) {
    await releaseStock(tx, hold.inventoryId, hold.quantity.toFixed());
  }
  if (holds.length) {
    await tx.stockReservation.updateMany({
      where: { id: { in: holds.map((h) => h.id) } },
      data: { status: "RELEASED" },
    });
  }
}
