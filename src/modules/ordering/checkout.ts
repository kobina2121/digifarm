import "server-only";

import Decimal from "decimal.js";

import { Prisma } from "@/generated/prisma/client";
import { audit } from "@/lib/audit";
import { type Actor, assertCan } from "@/lib/authz";
import { db, type Tx } from "@/lib/db";
import { ConflictError, NotFoundError, ValidationError } from "@/lib/errors";
import { Money } from "@/lib/money";
import { Quantity } from "@/lib/quantity";
import { parseInput } from "@/lib/validation";
import { orderableListings } from "@/modules/catalog";
import { reserveStock } from "@/modules/inventory";

import { buyerOrgOf, clearCart, lineProblem, unitLabel } from "./cart";
import {
  COMMISSION_BPS,
  DELIVERY_FEE_MINOR,
  PAYMENT_HOLD_MINUTES,
} from "./config";
import { expireUnpaidOrders } from "./expiry";
import { type CheckoutInput, checkoutSchema } from "./schemas";

async function nextOrderNumber(tx: Tx, now: Date): Promise<string> {
  const [row] = await tx.$queryRaw<{ n: string }[]>`
    SELECT nextval('order_number_seq')::text AS n`;
  return `DF-${now.getUTCFullYear()}-${row.n.padStart(6, "0")}`;
}

function isUniqueViolation(error: unknown) {
  return (
    error instanceof Prisma.PrismaClientKnownRequestError &&
    error.code === "P2002"
  );
}

/**
 * Turn the cart into an order and hold its stock for {@link PAYMENT_HOLD_MINUTES}
 * minutes while the buyer pays (ROADMAP §2.4, policy §1). All-or-nothing: if
 * any line can't be held, nothing is held and the cart is left as it was.
 * Repeating a checkout with the same idempotency key returns the same order.
 */
export async function checkout(
  actor: Actor,
  input: CheckoutInput,
  now = new Date(),
): Promise<{ id: string; number: string }> {
  assertCan(actor, "order.place");
  const orgId = buyerOrgOf(actor);
  const data = parseInput(checkoutSchema, input);

  const existing = await db.order.findUnique({
    where: { idempotencyKey: data.idempotencyKey },
    select: { id: true, number: true, buyerOrgId: true },
  });
  if (existing) {
    if (existing.buyerOrgId !== orgId)
      throw new ConflictError("Please try again.");
    return { id: existing.id, number: existing.number };
  }

  // Holds that ran out on these listings go back on sale before we try.
  const cartListingIds = (
    await db.cartItem.findMany({
      where: { cart: { buyerOrgId: orgId } },
      select: { listingId: true },
    })
  ).map((i) => i.listingId);
  await expireUnpaidOrders(now, { listingIds: cartListingIds });

  try {
    return await db.$transaction(
      (tx) => placeOrder(tx, actor, orgId, data, now),
      { maxWait: 15_000, timeout: 30_000 },
    );
  } catch (error) {
    if (isUniqueViolation(error)) {
      const order = await db.order.findUnique({
        where: { idempotencyKey: data.idempotencyKey },
        select: { id: true, number: true },
      });
      if (order) return order;
    }
    throw error;
  }
}

async function placeOrder(
  tx: Tx,
  actor: Actor,
  orgId: string,
  data: ReturnType<typeof checkoutSchema.parse>,
  now: Date,
) {
  const items = await tx.cartItem.findMany({
    where: { cart: { buyerOrgId: orgId } },
    orderBy: { listingId: "asc" },
    select: { listingId: true, quantity: true },
  });
  if (!items.length) throw new ValidationError("Your cart is empty.");

  const address = await tx.address.findFirst({
    where: {
      id: data.addressId,
      organizationId: orgId,
      kind: "DELIVERY",
      deletedAt: null,
      zone: { isActive: true },
    },
    include: { zone: true },
  });
  if (!address?.zone)
    throw new NotFoundError("Choose one of your delivery addresses.");
  const zone = address.zone;

  const listings = await orderableListings(
    items.map((i) => i.listingId),
    now,
    tx,
  );
  const lines = items.map((item) => {
    const quantity = item.quantity.toFixed();
    const listing = listings.get(item.listingId);
    const name = listing?.productName ?? "An item";
    const problem = lineProblem(listing, quantity);
    if (problem || !listing) {
      throw new ValidationError(`${name}: ${problem}`);
    }
    if (listing.zoneId !== zone.id) {
      throw new ValidationError(
        `${name} is delivered in ${listing.zone.name}, but your address is in ${zone.name}. Remove it or choose another address.`,
      );
    }
    if (!listing.inventoryId)
      throw new ValidationError(`${name}: Out of stock`);
    const lineTotal = Money.ofMinor(listing.unitPriceMinor).timesQuantity(
      Quantity.parse(quantity),
    );
    return { listing, inventoryId: listing.inventoryId, quantity, lineTotal };
  });

  // Hold stock in listing-ID order (lines are sorted) so concurrent checkouts can't deadlock.
  for (const line of lines) {
    const held = await reserveStock(tx, line.inventoryId, line.quantity);
    if (!held) {
      const inv = await tx.inventoryRecord.findUniqueOrThrow({
        where: { id: line.inventoryId },
        select: { onHand: true, reserved: true },
      });
      const left = Decimal.max(
        0,
        new Decimal(inv.onHand.toFixed()).minus(inv.reserved.toFixed()),
      ).toFixed();
      throw new ConflictError(
        `${line.listing.productName}: someone else just ordered some. Only ${unitLabel(line.listing.unit, left)} left, so update your cart and try again.`,
      );
    }
  }

  const bySupplier = new Map<string, typeof lines>();
  for (const line of lines) {
    const group = bySupplier.get(line.listing.supplierId) ?? [];
    group.push(line);
    bySupplier.set(line.listing.supplierId, group);
  }
  const subtotal = lines.reduce((sum, l) => sum.add(l.lineTotal), Money.zero());
  const deliveryFee = Money.ofMinor(DELIVERY_FEE_MINOR);
  const holdExpiresAt = new Date(now.getTime() + PAYMENT_HOLD_MINUTES * 60_000);

  const order = await tx.order.create({
    data: {
      number: await nextOrderNumber(tx, now),
      buyerOrgId: orgId,
      placedById: actor.userId,
      subtotalMinor: subtotal.amountMinor,
      deliveryFeeMinor: deliveryFee.amountMinor,
      totalMinor: subtotal.add(deliveryFee).amountMinor,
      zoneId: zone.id,
      deliveryAddressSnapshot: {
        label: address.label,
        town: address.town,
        street: address.street,
        landmark: address.landmark,
        digitalAddress: address.digitalAddress,
        district: address.district,
        region: address.region,
        zone: { code: zone.code, name: zone.name },
      },
      buyerNotes: data.notes,
      holdExpiresAt,
      idempotencyKey: data.idempotencyKey,
      history: {
        create: { to: "PENDING_PAYMENT", actorUserId: actor.userId },
      },
    },
    select: { id: true, number: true },
  });

  for (const [supplierId, group] of bySupplier) {
    const fulfilment = await tx.fulfilment.create({
      data: {
        orderId: order.id,
        supplierOrgId: supplierId,
        supplierName: group[0].listing.supplier.name,
        subtotalMinor: group.reduce((s, l) => s.add(l.lineTotal), Money.zero())
          .amountMinor,
        commissionBps: COMMISSION_BPS,
      },
      select: { id: true },
    });
    for (const line of group) {
      const l = line.listing;
      await tx.orderItem.create({
        data: {
          orderId: order.id,
          fulfilmentId: fulfilment.id,
          listingId: l.id,
          productName: l.productName,
          variety: l.variety,
          gradeCode: l.grade?.code,
          unitCode: l.unit.code,
          unitName: l.unit.name,
          unitPlural: l.unit.plural,
          quantity: line.quantity,
          unitPriceMinor: l.unitPriceMinor,
          lineTotalMinor: line.lineTotal.amountMinor,
          reservation: {
            create: {
              inventoryId: line.inventoryId,
              quantity: line.quantity,
              expiresAt: holdExpiresAt,
            },
          },
        },
      });
    }
  }

  await clearCart(tx, orgId);
  await audit(tx, actor, {
    action: "order.placed",
    entityType: "order",
    entityId: order.id,
    after: {
      number: order.number,
      total: subtotal.add(deliveryFee).toJSON(),
      lines: lines.length,
      suppliers: bySupplier.size,
    },
  });
  return order;
}
