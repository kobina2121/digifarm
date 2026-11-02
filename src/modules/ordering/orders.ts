import "server-only";

import Decimal from "decimal.js";

import type { Prisma } from "@/generated/prisma/client";
import type {
  OrderStatus,
  PaymentStatus,
  RefundStatus,
} from "@/generated/prisma/enums";
import { audit } from "@/lib/audit";
import { type Actor, assertCan } from "@/lib/authz";
import { db } from "@/lib/db";
import { ConflictError, NotFoundError, ValidationError } from "@/lib/errors";
import { Money } from "@/lib/money";
import { parseInput } from "@/lib/validation";
import { photoUrls } from "@/modules/catalog";
import { returnStock } from "@/modules/inventory";
import { type LedgerLine, recordLedger } from "@/modules/ledger";

import { buyerOrgOf, setCartItem } from "./cart";
import { lockOrder, releaseHolds, transitionOrder } from "./internal";
import { fulfilmentShares, processRefund } from "./payment-flow";
import { type CancelOrderInput, cancelOrderSchema } from "./schemas";
import { buyerCanCancel, canPay, ORDER_STATUS_LABELS } from "./state-machine";

const PAGE_SIZE = 20;
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function assertId(id: string) {
  if (!UUID.test(id)) throw new NotFoundError("Order not found.");
}

// ─── Cancelling ─────────────────────────────────────────────────────────────

/**
 * Buyer cancels (policy §2). Before payment the hold simply ends. After
 * payment, until pickup, the stock goes back on sale, the farm's share is
 * reversed and the full amount is refunded.
 */
export async function cancelOrder(
  actor: Actor,
  orderId: string,
  input: CancelOrderInput = {},
) {
  assertCan(actor, "order.cancel");
  assertId(orderId);
  const orgId = buyerOrgOf(actor);
  const data = parseInput(cancelOrderSchema, input);
  const reason = data.reason ?? "Cancelled by the buyer";

  const refundId = await db.$transaction(async (tx) => {
    const mine = await tx.order.findFirst({
      where: { id: orderId, buyerOrgId: orgId },
      select: { id: true },
    });
    if (!mine) throw new NotFoundError("Order not found.");
    const order = await lockOrder(tx, orderId);
    const fulfilments = await tx.fulfilment.findMany({
      where: { orderId },
      select: {
        id: true,
        status: true,
        supplierOrgId: true,
        subtotalMinor: true,
        commissionBps: true,
      },
    });
    if (!buyerCanCancel(order.status, fulfilments)) {
      throw new ConflictError(
        "This order can’t be cancelled any more. If something’s wrong with it, report a problem when it arrives.",
      );
    }
    const now = new Date();

    if (order.status === "PENDING_PAYMENT") {
      await releaseHolds(tx, orderId);
      await transitionOrder(tx, order, "CANCELLED", actor, reason, {
        cancelledAt: now,
        cancelReason: reason,
      });
      await tx.fulfilment.updateMany({
        where: { orderId },
        data: { status: "CANCELLED" },
      });
      await tx.paymentAttempt.updateMany({
        where: { payment: { orderId }, status: "INITIATED" },
        data: { status: "ABANDONED" },
      });
      await tx.payment.updateMany({
        where: { orderId, status: "PENDING" },
        data: { status: "ABANDONED" },
      });
      return null;
    }

    // Paid, nothing picked up yet: stock back on sale, full refund.
    const items = await tx.orderItem.findMany({
      where: { orderId, reservation: { status: "COMMITTED" } },
      select: {
        quantity: true,
        reservation: { select: { inventoryId: true } },
      },
      orderBy: { reservation: { inventoryId: "asc" } },
    });
    for (const item of items) {
      await returnStock(
        tx,
        item.reservation!.inventoryId,
        item.quantity.toFixed(),
        actor,
        `Order ${order.number} cancelled`,
        { type: "order", id: orderId },
      );
    }
    await tx.fulfilment.updateMany({
      where: { orderId },
      data: { status: "CANCELLED" },
    });
    await transitionOrder(tx, order, "CANCELLED", actor, reason, {
      cancelledAt: now,
      cancelReason: reason,
    });

    const delivery = await tx.order.findUniqueOrThrow({
      where: { id: orderId },
      select: { deliveryFeeMinor: true },
    });
    const reversals: LedgerLine[] = fulfilments.flatMap((f) => {
      const { commissionMinor, payableMinor } = fulfilmentShares(f);
      return [
        {
          type: "SUPPLIER_PAYABLE" as const,
          amountMinor: -payableMinor,
          orderId,
          fulfilmentId: f.id,
          supplierOrgId: f.supplierOrgId,
          memo: "Order cancelled",
        },
        {
          type: "COMMISSION" as const,
          amountMinor: -commissionMinor,
          orderId,
          fulfilmentId: f.id,
          supplierOrgId: f.supplierOrgId,
          memo: "Order cancelled",
        },
      ];
    });
    reversals.push({
      type: "DELIVERY_FEE",
      amountMinor: -delivery.deliveryFeeMinor,
      orderId,
      memo: "Order cancelled",
    });
    await recordLedger(tx, reversals);

    const payment = await tx.payment.findUniqueOrThrow({
      where: { orderId },
      select: {
        id: true,
        attempts: {
          where: { status: "SUCCEEDED" },
          orderBy: { verifiedAt: "asc" },
          take: 1,
          select: { id: true },
        },
      },
    });
    const refund = await tx.refund.create({
      data: {
        paymentId: payment.id,
        attemptId: payment.attempts[0].id,
        amountMinor: order.totalMinor,
        reason,
        requestedById: actor.userId,
      },
      select: { id: true },
    });
    await audit(tx, actor, {
      action: "refund.requested",
      entityType: "refund",
      entityId: refund.id,
      after: {
        orderId,
        amountMinor: order.totalMinor.toString(),
        reason,
      },
    });
    return refund.id;
  });

  if (refundId) await processRefund(refundId);
  return { refunded: Boolean(refundId) };
}

// ─── Ordering again ─────────────────────────────────────────────────────────

/** Put a past order's products back in the cart, where they're still on sale. */
export async function reorder(actor: Actor, orderId: string) {
  assertCan(actor, "cart.manage");
  assertId(orderId);
  const order = await db.order.findFirst({
    where: { id: orderId, buyerOrgId: buyerOrgOf(actor) },
    select: {
      items: {
        select: { listingId: true, productName: true, quantity: true },
      },
    },
  });
  if (!order) throw new NotFoundError("Order not found.");

  let added = 0;
  const skipped: { productName: string; reason: string }[] = [];
  for (const item of order.items) {
    if (!item.listingId) {
      skipped.push({ productName: item.productName, reason: "No longer sold" });
      continue;
    }
    try {
      await setCartItem(actor, {
        listingId: item.listingId,
        quantity: item.quantity.toFixed(),
        mode: "set",
      });
      added++;
    } catch (error) {
      if (!(error instanceof ValidationError || error instanceof NotFoundError))
        throw error;
      skipped.push({ productName: item.productName, reason: error.message });
    }
  }
  return { added, skipped };
}

// ─── Reading orders ─────────────────────────────────────────────────────────

const PAYMENT_STATUS_LABELS: Record<PaymentStatus, string> = {
  PENDING: "Not paid yet",
  SUCCEEDED: "Paid",
  FAILED: "Payment failed",
  ABANDONED: "Not paid",
  PARTIALLY_REFUNDED: "Partly refunded",
  REFUNDED: "Refunded",
};

const REFUND_STATUS_LABELS: Record<RefundStatus, string> = {
  PENDING: "Refund being arranged",
  PROCESSING: "Refund on its way",
  SUCCEEDED: "Refunded",
  FAILED: "Refund failed: DigiFarm will contact you",
};

const orderSummarySelect = {
  id: true,
  number: true,
  status: true,
  totalMinor: true,
  createdAt: true,
  holdExpiresAt: true,
  buyer: { select: { legalName: true, tradingName: true } },
  fulfilments: { select: { supplierName: true } },
  items: {
    orderBy: { createdAt: "asc" },
    take: 4,
    select: {
      id: true,
      productName: true,
      listing: {
        select: {
          images: {
            orderBy: { sortOrder: "asc" },
            take: 1,
            select: { storageKey: true, width: true, height: true },
          },
        },
      },
    },
  },
  _count: { select: { items: true } },
} satisfies Prisma.OrderSelect;

function toSummary(
  o: Prisma.OrderGetPayload<{ select: typeof orderSummarySelect }>,
) {
  return {
    id: o.id,
    number: o.number,
    status: o.status,
    statusLabel: ORDER_STATUS_LABELS[o.status],
    total: Money.ofMinor(o.totalMinor).format(),
    createdAt: o.createdAt,
    holdExpiresAt: o.holdExpiresAt,
    buyerName: o.buyer.tradingName ?? o.buyer.legalName,
    supplierNames: o.fulfilments.map((f) => f.supplierName),
    itemCount: o._count.items,
    /** Up to four products, with a photo where the listing still has one. */
    previews: o.items.map((i) => ({
      id: i.id,
      productName: i.productName,
      photo: i.listing?.images[0] ? photoUrls(i.listing.images[0]) : null,
    })),
  };
}

export type OrderSummary = ReturnType<typeof toSummary>;

async function page(
  where: Prisma.OrderWhereInput,
  cursor: string | undefined,
): Promise<{ items: OrderSummary[]; nextCursor: string | null }> {
  const rows = await db.order.findMany({
    where,
    orderBy: [{ createdAt: "desc" }, { id: "desc" }],
    take: PAGE_SIZE + 1,
    ...(cursor && UUID.test(cursor) ? { cursor: { id: cursor }, skip: 1 } : {}),
    select: orderSummarySelect,
  });
  const more = rows.length > PAGE_SIZE;
  const items = rows.slice(0, PAGE_SIZE).map(toSummary);
  return { items, nextCursor: more ? items[items.length - 1].id : null };
}

export async function listOrdersForBuyer(
  actor: Actor,
  { cursor }: { cursor?: string } = {},
) {
  assertCan(actor, "order.read");
  return page({ buyerOrgId: buyerOrgOf(actor) }, cursor);
}

/** For the buyer's profile: how many orders, and how many are still under way. */
export async function countOrdersForBuyer(actor: Actor) {
  assertCan(actor, "order.read");
  const buyerOrgId = buyerOrgOf(actor);
  const [total, active] = await Promise.all([
    db.order.count({
      where: { buyerOrgId, status: { notIn: ["EXPIRED"] } },
    }),
    db.order.count({
      where: {
        buyerOrgId,
        status: {
          in: [
            "PENDING_PAYMENT",
            "PAID",
            "IN_FULFILMENT",
            "PARTIALLY_DELIVERED",
            "DELIVERED",
          ],
        },
      },
    }),
  ]);
  return { total, active };
}

export const STAFF_ORDER_VIEWS = [
  "PENDING_PAYMENT",
  "PAID",
  "CANCELLED",
  "EXPIRED",
] as const satisfies OrderStatus[];
export type StaffOrderView = (typeof STAFF_ORDER_VIEWS)[number];

export async function listOrdersForStaff(
  actor: Actor,
  {
    view,
    q,
    cursor,
  }: { view?: StaffOrderView; q?: string; cursor?: string } = {},
) {
  assertCan(actor, "order.manage");
  const where: Prisma.OrderWhereInput = {
    ...(view ? { status: view } : {}),
    ...(q
      ? {
          OR: [
            { number: { contains: q, mode: "insensitive" } },
            { buyer: { legalName: { contains: q, mode: "insensitive" } } },
            { buyer: { tradingName: { contains: q, mode: "insensitive" } } },
          ],
        }
      : {}),
  };
  return page(where, cursor);
}

/** Orders where staff need to step in: refunds that haven't gone through. */
export async function countRefundsNeedingAttention(actor: Actor) {
  assertCan(actor, "order.manage");
  return db.refund.count({
    where: {
      OR: [
        { status: "FAILED" },
        { status: "PENDING", failureReason: { not: null } },
      ],
    },
  });
}

const orderDetailSelect = {
  id: true,
  number: true,
  status: true,
  subtotalMinor: true,
  deliveryFeeMinor: true,
  totalMinor: true,
  deliveryAddressSnapshot: true,
  buyerNotes: true,
  holdExpiresAt: true,
  paidAt: true,
  cancelledAt: true,
  cancelReason: true,
  createdAt: true,
  buyerOrgId: true,
  buyer: { select: { legalName: true, tradingName: true, phone: true } },
  placedBy: { select: { name: true } },
  fulfilments: {
    orderBy: { supplierName: "asc" },
    select: {
      id: true,
      supplierOrgId: true,
      supplierName: true,
      status: true,
      subtotalMinor: true,
      commissionBps: true,
      items: {
        orderBy: { productName: "asc" },
        select: {
          id: true,
          listingId: true,
          productName: true,
          variety: true,
          gradeCode: true,
          unitName: true,
          unitPlural: true,
          quantity: true,
          unitPriceMinor: true,
          lineTotalMinor: true,
        },
      },
    },
  },
  history: {
    orderBy: { createdAt: "asc" },
    select: {
      id: true,
      from: true,
      to: true,
      reason: true,
      createdAt: true,
      actor: { select: { name: true } },
    },
  },
  payments: {
    select: {
      status: true,
      provider: true,
      feeMinor: true,
      paidAt: true,
      attempts: {
        orderBy: { createdAt: "asc" },
        select: {
          id: true,
          reference: true,
          status: true,
          channel: true,
          failureReason: true,
          createdAt: true,
        },
      },
      refunds: {
        orderBy: { createdAt: "asc" },
        select: {
          id: true,
          amountMinor: true,
          reason: true,
          status: true,
          failureReason: true,
          createdAt: true,
        },
      },
    },
  },
} satisfies Prisma.OrderSelect;

type OrderRow = Prisma.OrderGetPayload<{ select: typeof orderDetailSelect }>;

export type DeliveryAddressSnapshot = {
  label: string;
  town: string;
  street: string | null;
  landmark: string | null;
  digitalAddress: string | null;
  /** Orders placed since D4 was revised. */
  regionName?: string;
  /** Older orders were delivered to an Accra or Kumasi area. */
  zone?: { code: string; name: string };
};

function toDetail(o: OrderRow, now: Date) {
  const payment = o.payments[0] ?? null;
  const fmt = (m: bigint) => Money.ofMinor(m).format();
  return {
    id: o.id,
    number: o.number,
    status: o.status,
    statusLabel: ORDER_STATUS_LABELS[o.status],
    subtotal: fmt(o.subtotalMinor),
    deliveryFee: fmt(o.deliveryFeeMinor),
    total: fmt(o.totalMinor),
    address: o.deliveryAddressSnapshot as DeliveryAddressSnapshot,
    notes: o.buyerNotes,
    holdExpiresAt: o.holdExpiresAt,
    paidAt: o.paidAt,
    cancelledAt: o.cancelledAt,
    cancelReason: o.cancelReason,
    createdAt: o.createdAt,
    placedBy: o.placedBy.name,
    buyer: {
      id: o.buyerOrgId,
      name: o.buyer.tradingName ?? o.buyer.legalName,
      phone: o.buyer.phone,
    },
    fulfilments: o.fulfilments.map((f) => ({
      id: f.id,
      supplierId: f.supplierOrgId,
      supplierName: f.supplierName,
      status: f.status,
      subtotal: fmt(f.subtotalMinor),
      commissionBps: f.commissionBps,
      items: f.items.map((i) => {
        const qty = i.quantity.toFixed();
        return {
          id: i.id,
          listingId: i.listingId,
          productName: i.productName,
          variety: i.variety,
          gradeCode: i.gradeCode,
          quantityLabel: `${qty} ${qty === "1" ? i.unitName : i.unitPlural}`,
          unitPrice: `${fmt(i.unitPriceMinor)} / ${i.unitName}`,
          lineTotal: fmt(i.lineTotalMinor),
        };
      }),
    })),
    history: o.history.map((h) => ({
      id: h.id,
      label: ORDER_STATUS_LABELS[h.to],
      reason: h.reason,
      at: h.createdAt,
      by: h.actor?.name ?? "DigiFarm",
    })),
    payment: payment
      ? {
          status: payment.status,
          statusLabel: PAYMENT_STATUS_LABELS[payment.status],
          provider: payment.provider,
          fee: payment.feeMinor === null ? null : fmt(payment.feeMinor),
          paidAt: payment.paidAt,
          attempts: payment.attempts,
          refunds: payment.refunds.map((r) => ({
            id: r.id,
            amount: fmt(r.amountMinor),
            reason: r.reason,
            status: r.status,
            statusLabel: REFUND_STATUS_LABELS[r.status],
            failureReason: r.failureReason,
            createdAt: r.createdAt,
          })),
        }
      : null,
    canPay: canPay(o.status, o.holdExpiresAt, now),
    canCancel: buyerCanCancel(o.status, o.fulfilments),
    paidCancellation: o.status === "PAID",
  };
}

export type OrderDetail = ReturnType<typeof toDetail>;

export async function getOrderForBuyer(
  actor: Actor,
  orderId: string,
  now = new Date(),
): Promise<OrderDetail> {
  assertCan(actor, "order.read");
  assertId(orderId);
  const row = await db.order.findFirst({
    where: { id: orderId, buyerOrgId: buyerOrgOf(actor) },
    select: orderDetailSelect,
  });
  if (!row) throw new NotFoundError("Order not found.");
  return toDetail(row, now);
}

export async function getOrderForStaff(
  actor: Actor,
  orderId: string,
  now = new Date(),
) {
  assertCan(actor, "order.manage");
  assertId(orderId);
  const row = await db.order.findUnique({
    where: { id: orderId },
    select: orderDetailSelect,
  });
  if (!row) throw new NotFoundError("Order not found.");
  const ledger = await db.ledgerEntry.findMany({
    where: { orderId },
    orderBy: { createdAt: "asc" },
    select: {
      id: true,
      type: true,
      amountMinor: true,
      memo: true,
      createdAt: true,
      supplier: { select: { legalName: true, tradingName: true } },
    },
  });
  return {
    ...toDetail(row, now),
    ledger: ledger.map((e) => ({
      id: e.id,
      type: e.type,
      amount: Money.ofMinor(e.amountMinor).format(),
      negative: e.amountMinor < BigInt(0),
      memo: e.memo,
      supplierName: e.supplier
        ? (e.supplier.tradingName ?? e.supplier.legalName)
        : null,
      createdAt: e.createdAt,
    })),
  };
}

/** Quantity check used by the product page: how much of this the buyer already has in the cart. */
export async function quantityInCart(actor: Actor, listingId: string) {
  assertCan(actor, "cart.manage");
  if (!UUID.test(listingId)) return null;
  const item = await db.cartItem.findFirst({
    where: { listingId, cart: { buyerOrgId: buyerOrgOf(actor) } },
    select: { quantity: true },
  });
  return item ? new Decimal(item.quantity.toFixed()).toFixed() : null;
}
