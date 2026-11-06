import "server-only";

import { randomBytes } from "node:crypto";

import { Prisma } from "@/generated/prisma/client";
import { audit } from "@/lib/audit";
import { type Actor, assertCan } from "@/lib/authz";
import { db, type Tx } from "@/lib/db";
import { sendEmail } from "@/lib/email";
import { env } from "@/lib/env";
import { AppError, ConflictError, NotFoundError } from "@/lib/errors";
import { logger } from "@/lib/logger";
import { Money } from "@/lib/money";
import { commitStock } from "@/modules/inventory";
import { type LedgerLine, recordLedger } from "@/modules/ledger";
import {
  paymentProvider,
  PaymentProviderError,
  type Verification,
} from "@/modules/payments";

import { buyerOrgOf } from "./cart";
import { type LockedOrder, lockOrder, transitionOrder } from "./internal";
import { canPay } from "./state-machine";

/**
 * Paying for an order (ROADMAP §2.4 "Idempotency", policy §1). An order is
 * only marked paid after Akuafo asks the provider directly, never on the
 * strength of a redirect or webhook body alone. Every step can safely run
 * more than once.
 */

/** A farm's share of a fulfilment and Akuafo's commission on it (D2). */
export function fulfilmentShares(f: {
  subtotalMinor: bigint;
  commissionBps: number;
}) {
  const subtotal = Money.ofMinor(f.subtotalMinor);
  const commission = subtotal.basisPoints(f.commissionBps);
  return {
    commissionMinor: commission.amountMinor,
    payableMinor: subtotal.subtract(commission).amountMinor,
  };
}

/** Start (or restart) payment for an unpaid order. Returns where to send the buyer. */
export async function startPayment(
  actor: Actor,
  orderId: string,
  now = new Date(),
): Promise<{ authorizationUrl: string } | { alreadyPaid: true }> {
  assertCan(actor, "order.place");
  const order = await db.order.findFirst({
    where: { id: orderId, buyerOrgId: buyerOrgOf(actor) },
    select: {
      id: true,
      number: true,
      status: true,
      holdExpiresAt: true,
      totalMinor: true,
      currency: true,
      placedBy: { select: { email: true } },
    },
  });
  if (!order) throw new NotFoundError("Order not found.");
  if (order.status !== "PENDING_PAYMENT") {
    if (order.status === "PAID") return { alreadyPaid: true };
    throw new ConflictError("This order can’t be paid for any more.");
  }
  if (!canPay(order.status, order.holdExpiresAt, now)) {
    throw new ConflictError(
      "The time to pay for this order ran out, so its stock went back on sale. You can order again from the market.",
    );
  }

  const provider = paymentProvider();
  const payment = await db.payment.upsert({
    where: { orderId: order.id },
    create: {
      orderId: order.id,
      provider: provider.name,
      amountMinor: order.totalMinor,
      currency: order.currency,
    },
    update: {},
    select: { id: true },
  });
  const reference = `${order.number}-${randomBytes(3).toString("hex").toUpperCase()}`;
  const attempt = await db.paymentAttempt.create({
    data: { paymentId: payment.id, provider: provider.name, reference },
    select: { id: true },
  });

  try {
    const { authorizationUrl } = await provider.initialize({
      reference,
      amountMinor: order.totalMinor,
      currency: order.currency,
      email: order.placedBy.email,
      callbackUrl: `${env().APP_URL}/buyer/orders/${order.id}/payment`,
      metadata: { orderId: order.id, orderNumber: order.number },
    });
    await db.paymentAttempt.update({
      where: { id: attempt.id },
      data: { authorizationUrl },
    });
    return { authorizationUrl };
  } catch (error) {
    await db.paymentAttempt.update({
      where: { id: attempt.id },
      data: {
        status: "FAILED",
        failureReason:
          error instanceof Error ? error.message.slice(0, 300) : "Unknown",
      },
    });
    if (error instanceof PaymentProviderError) {
      logger.error({ err: error.cause, orderId }, "Payment initialize failed");
      throw new AppError(error.message, "PAYMENT_PROVIDER", 502);
    }
    throw error;
  }
}

export type PaymentOutcome =
  | "paid" // order confirmed
  | "pending" // provider is still waiting for the buyer
  | "failed" // declined or abandoned; the buyer can try again while the hold lasts
  | "refunding" // money arrived but the order couldn't take it (late or duplicate)
  | "mismatch"; // amount or currency differs: never confirmed, flagged for staff

/**
 * Ask the provider what happened to a payment attempt and act on it. Called
 * when the buyer returns from checkout, from webhooks and before expiring an
 * order. Safe to call any number of times.
 */
export async function confirmPayment(
  reference: string,
): Promise<{ outcome: PaymentOutcome; orderId: string }> {
  const provider = paymentProvider();
  const attempt = await db.paymentAttempt.findUnique({
    where: { provider_reference: { provider: provider.name, reference } },
    select: {
      id: true,
      status: true,
      payment: { select: { id: true, orderId: true } },
    },
  });
  if (!attempt) throw new NotFoundError("Payment not found.");
  const orderId = attempt.payment.orderId;
  if (attempt.status === "SUCCEEDED") {
    const order = await db.order.findUniqueOrThrow({
      where: { id: orderId },
      select: { status: true },
    });
    return {
      outcome: order.status === "PAID" ? "paid" : "refunding",
      orderId,
    };
  }

  const v = await provider.verify(reference);
  if (v.status === "pending") return { outcome: "pending", orderId };
  if (v.status !== "success") {
    await db.paymentAttempt.updateMany({
      where: { id: attempt.id, status: "INITIATED" },
      data: {
        status: v.status === "abandoned" ? "ABANDONED" : "FAILED",
        rawStatus: v.rawStatus,
        failureReason: v.failureReason,
        verifiedAt: new Date(),
      },
    });
    return { outcome: "failed", orderId };
  }

  const { outcome, refundId } = await db.$transaction(
    (tx) => applySuccessfulCharge(tx, attempt.id, v),
    { timeout: 20_000 },
  );
  if (refundId) await processRefund(refundId);
  if (outcome === "paid") await notifyOrderPaid(orderId);
  return { outcome, orderId };
}

async function applySuccessfulCharge(
  tx: Tx,
  attemptId: string,
  v: Verification,
): Promise<{ outcome: PaymentOutcome; refundId: string | null }> {
  const { payment, ...attempt } = await tx.paymentAttempt.findUniqueOrThrow({
    where: { id: attemptId },
    select: {
      id: true,
      status: true,
      reference: true,
      payment: {
        select: {
          id: true,
          orderId: true,
          amountMinor: true,
          currency: true,
          status: true,
        },
      },
    },
  });
  const order = await lockOrder(tx, payment.orderId);
  // Re-read under the lock: another request may have handled this already.
  const fresh = await tx.paymentAttempt.findUniqueOrThrow({
    where: { id: attempt.id },
    select: { status: true },
  });
  if (fresh.status === "SUCCEEDED") {
    return {
      outcome: order.status === "PAID" ? "paid" : "refunding",
      refundId: null,
    };
  }

  if (
    v.amountMinor !== payment.amountMinor ||
    v.currency !== payment.currency
  ) {
    await tx.paymentAttempt.update({
      where: { id: attempt.id },
      data: {
        status: "FAILED",
        rawStatus: v.rawStatus,
        failureReason: `Amount mismatch: provider reported ${v.amountMinor} ${v.currency}, expected ${payment.amountMinor} ${payment.currency}`,
        providerTransactionId: v.providerTransactionId,
        verifiedAt: new Date(),
      },
    });
    logger.error(
      { orderId: order.id, reference: attempt.reference },
      "Payment amount mismatch: order not confirmed",
    );
    return { outcome: "mismatch", refundId: null };
  }

  const paidAt = v.paidAt ?? new Date();
  await tx.paymentAttempt.update({
    where: { id: attempt.id },
    data: {
      status: "SUCCEEDED",
      rawStatus: v.rawStatus,
      providerTransactionId: v.providerTransactionId,
      channel: v.channel,
      verifiedAt: new Date(),
    },
  });
  const firstCharge = payment.status !== "SUCCEEDED";
  if (firstCharge) {
    await tx.payment.update({
      where: { id: payment.id },
      data: { status: "SUCCEEDED", feeMinor: v.feeMinor, paidAt },
    });
  }
  await recordLedger(tx, [
    {
      type: "PAYMENT_CAPTURED",
      amountMinor: v.amountMinor,
      orderId: order.id,
      paymentId: payment.id,
      memo: attempt.reference,
    },
    {
      type: "PROVIDER_FEE",
      amountMinor: -(v.feeMinor ?? BigInt(0)),
      orderId: order.id,
      paymentId: payment.id,
      memo: attempt.reference,
    },
  ]);

  if (firstCharge && order.status === "PENDING_PAYMENT") {
    await markPaid(tx, order, paidAt);
    return { outcome: "paid", refundId: null };
  }

  // Paid after the hold ended or the order was cancelled, or paid twice:
  // nothing to sell against this charge, so it goes straight back (policy §1).
  const reason = !firstCharge
    ? "Duplicate payment for an order that was already paid"
    : "Payment arrived after the order’s hold ended";
  const refund = await tx.refund.create({
    data: {
      paymentId: payment.id,
      attemptId: attempt.id,
      amountMinor: v.amountMinor,
      reason,
    },
    select: { id: true },
  });
  await audit(tx, null, {
    action: "refund.requested",
    entityType: "refund",
    entityId: refund.id,
    after: { orderId: order.id, amountMinor: v.amountMinor.toString(), reason },
    onBehalfOfOrgId: order.buyerOrgId,
  });
  return { outcome: "refunding", refundId: refund.id };
}

/** Paid = confirmed (D1): take the held stock out and confirm every farm's part. */
async function markPaid(tx: Tx, order: LockedOrder, paidAt: Date) {
  const holds = await tx.stockReservation.findMany({
    where: { orderItem: { orderId: order.id }, status: "ACTIVE" },
    orderBy: { inventoryId: "asc" },
    select: { id: true, inventoryId: true, quantity: true },
  });
  for (const hold of holds) {
    await commitStock(
      tx,
      hold.inventoryId,
      hold.quantity.toFixed(),
      `Sold: order ${order.number}`,
      { type: "order", id: order.id },
    );
  }
  await tx.stockReservation.updateMany({
    where: { id: { in: holds.map((h) => h.id) } },
    data: { status: "COMMITTED" },
  });
  await tx.fulfilment.updateMany({
    where: { orderId: order.id, status: "PENDING" },
    data: { status: "CONFIRMED" },
  });
  await transitionOrder(tx, order, "PAID", null, "Payment verified", {
    paidAt,
  });

  const fulfilments = await tx.fulfilment.findMany({
    where: { orderId: order.id },
    select: {
      id: true,
      supplierOrgId: true,
      subtotalMinor: true,
      commissionBps: true,
    },
  });
  const full = await tx.order.findUniqueOrThrow({
    where: { id: order.id },
    select: { deliveryFeeMinor: true },
  });
  const lines: LedgerLine[] = [];
  for (const f of fulfilments) {
    const { commissionMinor, payableMinor } = fulfilmentShares(f);
    lines.push(
      {
        type: "SUPPLIER_PAYABLE",
        amountMinor: payableMinor,
        orderId: order.id,
        fulfilmentId: f.id,
        supplierOrgId: f.supplierOrgId,
      },
      {
        type: "COMMISSION",
        amountMinor: commissionMinor,
        orderId: order.id,
        fulfilmentId: f.id,
        supplierOrgId: f.supplierOrgId,
      },
    );
  }
  lines.push({
    type: "DELIVERY_FEE",
    amountMinor: full.deliveryFeeMinor,
    orderId: order.id,
  });
  await recordLedger(tx, lines);
}

async function notifyOrderPaid(orderId: string) {
  try {
    const order = await db.order.findUniqueOrThrow({
      where: { id: orderId },
      select: {
        id: true,
        number: true,
        totalMinor: true,
        placedBy: { select: { email: true, name: true } },
        items: {
          select: {
            productName: true,
            quantity: true,
            unitName: true,
            unitPlural: true,
          },
        },
      },
    });
    const lines = order.items.map((i) => {
      const qty = i.quantity.toFixed();
      return `- ${i.productName}: ${qty} ${qty === "1" ? i.unitName : i.unitPlural}`;
    });
    await sendEmail({
      to: order.placedBy.email,
      subject: `Order ${order.number} confirmed`,
      text: [
        `Hi ${order.placedBy.name},`,
        "",
        `We’ve received your payment of ${Money.ofMinor(order.totalMinor).format()}, so order ${order.number} is confirmed.`,
        "",
        ...lines,
        "",
        `Track it here: ${env().APP_URL}/buyer/orders/${order.id}`,
        "",
        "You can cancel for a full refund until the produce is picked up from the farm.",
        "",
        "Akuafo",
      ].join("\n"),
    });
  } catch (error) {
    logger.error({ err: error, orderId }, "Couldn't send the order email");
  }
}

// ─── Refunds ────────────────────────────────────────────────────────────────

/**
 * Send a recorded refund to the provider. If the provider can't be reached it
 * stays PENDING with the reason, and staff can retry from the order page.
 */
export async function processRefund(refundId: string) {
  const refund = await db.refund.findUnique({
    where: { id: refundId },
    select: {
      id: true,
      status: true,
      amountMinor: true,
      attempt: { select: { reference: true } },
    },
  });
  if (!refund || refund.status !== "PENDING") return refund?.status ?? null;
  try {
    const result = await paymentProvider().refund({
      transactionReference: refund.attempt.reference,
      amountMinor: refund.amountMinor,
    });
    if (result.status === "processed") {
      await completeRefund(refund.id, result.providerReference);
      return "SUCCEEDED";
    }
    await db.refund.update({
      where: { id: refund.id },
      data: {
        status: result.status === "failed" ? "FAILED" : "PROCESSING",
        providerReference: result.providerReference,
        failureReason: null,
      },
    });
    return result.status === "failed" ? "FAILED" : "PROCESSING";
  } catch (error) {
    logger.error({ err: error, refundId }, "Refund request failed");
    await db.refund.update({
      where: { id: refund.id },
      data: {
        failureReason:
          error instanceof Error ? error.message.slice(0, 300) : "Unknown",
      },
    });
    return "PENDING";
  }
}

/** The money has gone back to the buyer: book it and update the payment. */
export async function completeRefund(
  refundId: string,
  providerReference?: string,
) {
  await db.$transaction(async (tx) => {
    const done = await tx.refund.updateMany({
      where: { id: refundId, status: { in: ["PENDING", "PROCESSING"] } },
      data: {
        status: "SUCCEEDED",
        failureReason: null,
        ...(providerReference ? { providerReference } : {}),
      },
    });
    if (done.count === 0) return; // already booked
    const refund = await tx.refund.findUniqueOrThrow({
      where: { id: refundId },
      select: {
        amountMinor: true,
        paymentId: true,
        payment: { select: { orderId: true, amountMinor: true } },
      },
    });
    await recordLedger(tx, [
      {
        type: "REFUND",
        amountMinor: -refund.amountMinor,
        orderId: refund.payment.orderId,
        paymentId: refund.paymentId,
        refundId,
      },
    ]);
    await tx.payment.update({
      where: { id: refund.paymentId },
      data: { status: await paymentStatusAfterRefunds(tx, refund.paymentId) },
    });
    await audit(tx, null, {
      action: "refund.succeeded",
      entityType: "refund",
      entityId: refundId,
      after: { amountMinor: refund.amountMinor.toString() },
    });
  });
}

/** What's left of the money the buyer paid, against what the order cost. */
async function paymentStatusAfterRefunds(tx: Tx, paymentId: string) {
  const payment = await tx.payment.findUniqueOrThrow({
    where: { id: paymentId },
    select: {
      amountMinor: true,
      attempts: { where: { status: "SUCCEEDED" }, select: { id: true } },
      refunds: {
        where: { status: "SUCCEEDED" },
        select: { amountMinor: true },
      },
    },
  });
  const captured = payment.amountMinor * BigInt(payment.attempts.length);
  const refunded = payment.refunds.reduce(
    (sum, r) => sum + r.amountMinor,
    BigInt(0),
  );
  const net = captured - refunded;
  if (net <= BigInt(0)) return "REFUNDED" as const;
  if (net < payment.amountMinor) return "PARTIALLY_REFUNDED" as const;
  return "SUCCEEDED" as const;
}

export async function failRefund(refundId: string, reason: string) {
  await db.refund.updateMany({
    where: { id: refundId, status: { in: ["PENDING", "PROCESSING"] } },
    data: { status: "FAILED", failureReason: reason },
  });
}

/** Staff: send a refund that couldn't reach the provider, or that failed, again. */
export async function retryRefund(actor: Actor, refundId: string) {
  assertCan(actor, "order.manage");
  const updated = await db.refund.updateMany({
    where: { id: refundId, status: { in: ["PENDING", "FAILED"] } },
    data: { status: "PENDING", failureReason: null },
  });
  if (!updated.count)
    throw new ConflictError("This refund is already on its way.");
  await db.$transaction((tx) =>
    audit(tx, actor, {
      action: "refund.retried",
      entityType: "refund",
      entityId: refundId,
    }),
  );
  return processRefund(refundId);
}

// ─── Webhooks ───────────────────────────────────────────────────────────────

function isUniqueViolation(error: unknown) {
  return (
    error instanceof Prisma.PrismaClientKnownRequestError &&
    error.code === "P2002"
  );
}

/**
 * Handle a provider webhook. The signature is checked first; each event is
 * processed once however often it's delivered. Throws on a bad signature
 * (respond 401) or a processing error (respond 500 so the provider retries).
 */
export async function handlePaymentWebhook(rawBody: string, headers: Headers) {
  const provider = paymentProvider();
  const event = provider.parseWebhook(rawBody, headers);
  const key = { provider: provider.name, eventId: event.eventId };

  let row = await db.providerEvent.findUnique({
    where: { provider_eventId: key },
    select: { id: true, processedAt: true },
  });
  if (!row) {
    try {
      row = await db.providerEvent.create({
        data: {
          ...key,
          eventType: event.kind === "ignored" ? event.type : event.kind,
          payload: JSON.parse(rawBody),
        },
        select: { id: true, processedAt: true },
      });
    } catch (error) {
      if (!isUniqueViolation(error)) throw error;
      row = await db.providerEvent.findUniqueOrThrow({
        where: { provider_eventId: key },
        select: { id: true, processedAt: true },
      });
    }
  }
  if (row.processedAt) return { duplicate: true };

  try {
    switch (event.kind) {
      case "charge.success":
        await confirmPayment(event.reference);
        break;
      case "refund.processed":
      case "refund.failed": {
        const refund = await db.refund.findFirst({
          where: { providerReference: event.refundReference },
          select: { id: true },
        });
        if (!refund) {
          logger.warn(
            { event: event.eventId },
            "Webhook for an unknown refund",
          );
        } else if (event.kind === "refund.processed") {
          await completeRefund(refund.id);
        } else {
          await failRefund(
            refund.id,
            "The provider couldn’t complete the refund",
          );
        }
        break;
      }
      case "ignored":
        break;
    }
    await db.providerEvent.update({
      where: { id: row.id },
      data: { processedAt: new Date(), error: null },
    });
    return { duplicate: false };
  } catch (error) {
    await db.providerEvent.update({
      where: { id: row.id },
      data: {
        error: error instanceof Error ? error.message.slice(0, 500) : "Unknown",
      },
    });
    throw error;
  }
}
