import "server-only";

import { db } from "@/lib/db";
import { logger } from "@/lib/logger";

import { lockOrder, releaseHolds, transitionOrder } from "./internal";
import { confirmPayment } from "./payment-flow";

/**
 * End the holds of unpaid orders whose payment time ran out, putting the
 * stock back on sale (policy §1). Before giving up on an order, ask the
 * provider once more in case the payment went through at the last moment.
 * Runs from the scheduled job and, scoped to the listings involved, at the
 * start of every checkout so stock never stays stuck between job runs.
 */
export async function expireUnpaidOrders(
  now = new Date(),
  { listingIds, limit = 50 }: { listingIds?: string[]; limit?: number } = {},
): Promise<{ expired: number; paid: number }> {
  if (listingIds && !listingIds.length) return { expired: 0, paid: 0 };
  const due = await db.order.findMany({
    where: {
      status: "PENDING_PAYMENT",
      holdExpiresAt: { lte: now },
      ...(listingIds
        ? { items: { some: { listingId: { in: listingIds } } } }
        : {}),
    },
    orderBy: { holdExpiresAt: "asc" },
    take: limit,
    select: {
      id: true,
      payments: {
        select: {
          attempts: {
            where: { status: "INITIATED" },
            select: { reference: true },
          },
        },
      },
    },
  });

  let expired = 0;
  let paid = 0;
  for (const order of due) {
    const pending = order.payments.flatMap((p) => p.attempts);
    let wasPaid = false;
    for (const attempt of pending) {
      try {
        const result = await confirmPayment(attempt.reference);
        if (result.outcome === "paid") wasPaid = true;
      } catch (error) {
        logger.warn(
          { err: error, orderId: order.id },
          "Couldn't check a payment before expiring its order",
        );
      }
    }
    if (wasPaid) {
      paid++;
      continue;
    }
    const done = await db.$transaction(async (tx) => {
      const locked = await lockOrder(tx, order.id);
      if (locked.status !== "PENDING_PAYMENT" || locked.holdExpiresAt > now)
        return false;
      await releaseHolds(tx, order.id);
      await transitionOrder(
        tx,
        locked,
        "EXPIRED",
        null,
        "Payment didn’t arrive before the hold ended",
      );
      await tx.paymentAttempt.updateMany({
        where: { payment: { orderId: order.id }, status: "INITIATED" },
        data: { status: "ABANDONED" },
      });
      await tx.payment.updateMany({
        where: { orderId: order.id, status: "PENDING" },
        data: { status: "ABANDONED" },
      });
      return true;
    });
    if (done) expired++;
  }
  return { expired, paid };
}
