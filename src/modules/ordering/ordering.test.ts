import { randomUUID } from "node:crypto";

import { afterEach, describe, expect, it, vi } from "vitest";

import type { Actor } from "@/lib/authz";
import { db } from "@/lib/db";
import type { GhanaRegion } from "@/generated/prisma/enums";
import {
  ConflictError,
  ForbiddenError,
  NotFoundError,
  ValidationError,
} from "@/lib/errors";
import { createBuyerOrganization } from "@/modules/buyers";
import { createListing } from "@/modules/catalog";
import {
  completeFakeTransaction,
  type PaymentProvider,
  setPaymentProviderForTests,
  type Verification,
} from "@/modules/payments";
import {
  createManagedSupplier,
  decideVerification,
  recordFarmVisit,
} from "@/modules/suppliers";
import { createUser } from "@/test/factories";
import { hasTestDatabase } from "@/test/setup";

import { getCart, setCartItem } from "./cart";
import { checkout } from "./checkout";
import { expireUnpaidOrders } from "./expiry";
import { cancelOrder, getOrderForBuyer, reorder } from "./orders";
import {
  confirmPayment,
  handlePaymentWebhook,
  startPayment,
} from "./payment-flow";

// ─── Fixtures ───────────────────────────────────────────────────────────────

async function approvedSupplier(name: string) {
  const visitor = await createUser({ platformRole: "OPS" });
  const approver = await createUser({ platformRole: "OPS" });
  const org = await createManagedSupplier(visitor, {
    legalName: name,
    supplierKind: "FARMER",
    phone: "0551234567",
    region: "ASHANTI",
    town: "Ejura",
  });
  await recordFarmVisit(
    visitor,
    org.id,
    { visitedOn: "2026-10-20", produceObserved: "Produce near harvest" },
    [],
  );
  await decideVerification(approver, org.id, { decision: "APPROVE" });
  return { org, staff: approver };
}

async function listing({
  stock = "40",
  price = "450",
  supplier = "Ejura Tomato Farm",
} = {}) {
  const { org, staff } = await approvedSupplier(supplier);
  const product = await db.product.findUniqueOrThrow({
    where: { slug: "tomato-pectomech" },
  });
  const created = await createListing(staff, {
    supplierId: org.id,
    productId: product.id,
    unitCode: "CRATE",
    price,
    availableFrom: "2026-10-01",
    initialStock: stock,
  });
  return { id: created.id, supplierId: org.id, staff };
}

async function buyer(region: GhanaRegion = "ASHANTI"): Promise<{
  actor: Actor;
  addressId: string;
}> {
  const user = await createUser({ name: "Ama Mensah" });
  const org = await createBuyerOrganization(user, {
    legalName: "Adum Kitchen",
    buyerSegment: "RESTAURANT",
    phone: "0241234567",
    address: { label: "Main kitchen", region, town: "Adum" },
  });
  const address = await db.address.findFirstOrThrow({
    where: { organizationId: org.id },
  });
  return {
    actor: {
      ...user,
      membership: {
        organizationId: org.id,
        organizationType: "BUYER",
        role: "OWNER",
      },
    },
    addressId: address.id,
  };
}

async function stockOf(listingId: string) {
  const inv = await db.inventoryRecord.findUniqueOrThrow({
    where: { listingId },
  });
  return { onHand: inv.onHand.toFixed(), reserved: inv.reserved.toFixed() };
}

async function placeOrder(
  b: { actor: Actor; addressId: string },
  listingId: string,
  quantity = "10",
) {
  await setCartItem(b.actor, { listingId, quantity });
  return checkout(b.actor, {
    addressId: b.addressId,
    idempotencyKey: randomUUID(),
  });
}

/** Pay through the development provider, as the /dev/pay page would. */
async function pay(actor: Actor, orderId: string) {
  const start = await startPayment(actor, orderId);
  if (!("authorizationUrl" in start)) throw new Error("already paid");
  const reference = start.authorizationUrl.split("/").pop()!;
  await completeFakeTransaction(reference, "success");
  return { reference, ...(await confirmPayment(reference)) };
}

async function ledger(orderId: string) {
  const rows = await db.ledgerEntry.findMany({ where: { orderId } });
  const byType: Record<string, bigint> = {};
  for (const r of rows)
    byType[r.type] = (byType[r.type] ?? BigInt(0)) + r.amountMinor;
  return byType;
}

afterEach(() => setPaymentProviderForTests(null));
// Each test makes many round trips to the test database.
vi.setConfig({ testTimeout: 90_000 });

// ─── Tests ──────────────────────────────────────────────────────────────────

describe.runIf(hasTestDatabase)("cart (integration)", () => {
  it("takes any quantity up to the stock left, and adds up quantities", async () => {
    const l = await listing({ stock: "12" });
    const b = await buyer();
    await expect(
      setCartItem(b.actor, { listingId: l.id, quantity: "20" }),
    ).rejects.toThrow(/Only 12 crates left/);

    await setCartItem(b.actor, { listingId: l.id, quantity: "5", mode: "add" });
    await setCartItem(b.actor, { listingId: l.id, quantity: "5", mode: "add" });
    const cart = await getCart(b.actor);
    expect(cart.groups[0].lines[0].quantity).toBe("10");
    expect(cart.total).toBe("GH₵ 4,500.00");
    expect(cart.canCheckout).toBe(true);
  });

  it("is only for buyers", async () => {
    const l = await listing();
    await expect(
      setCartItem(await createUser({ platformRole: "OPS" }), {
        listingId: l.id,
        quantity: "5",
      }),
    ).rejects.toBeInstanceOf(ForbiddenError);
  });
});

describe.runIf(hasTestDatabase)("checkout (integration)", () => {
  it("creates an order split by farm, holds the stock for 30 minutes and empties the cart", async () => {
    const tomatoes = await listing({ stock: "40", supplier: "Farm A" });
    const more = await listing({
      stock: "20",
      price: "300",
      supplier: "Farm B",
    });
    const b = await buyer();
    await setCartItem(b.actor, { listingId: tomatoes.id, quantity: "10" });
    await setCartItem(b.actor, { listingId: more.id, quantity: "5.5" });

    const now = new Date();
    const order = await checkout(
      b.actor,
      { addressId: b.addressId, idempotencyKey: randomUUID() },
      now,
    );
    expect(order.number).toMatch(/^DF-\d{4}-\d{6}$/);

    const detail = await getOrderForBuyer(b.actor, order.id);
    expect(detail.status).toBe("PENDING_PAYMENT");
    expect(detail.fulfilments).toHaveLength(2);
    // 10 × 450 + 5.5 × 300
    expect(detail.total).toBe("GH₵ 6,150.00");
    expect(detail.holdExpiresAt.getTime() - now.getTime()).toBe(30 * 60_000);
    expect(detail.canPay).toBe(true);

    expect(await stockOf(tomatoes.id)).toEqual({
      onHand: "40",
      reserved: "10",
    });
    expect(await stockOf(more.id)).toEqual({ onHand: "20", reserved: "5.5" });
    expect((await getCart(b.actor)).lineCount).toBe(0);
  });

  it("returns the same order when the same checkout is submitted twice", async () => {
    const l = await listing();
    const b = await buyer();
    await setCartItem(b.actor, { listingId: l.id, quantity: "10" });
    const key = randomUUID();
    const [first, second] = await Promise.all([
      checkout(b.actor, { addressId: b.addressId, idempotencyKey: key }),
      checkout(b.actor, { addressId: b.addressId, idempotencyKey: key }),
    ]);
    expect(second.id).toBe(first.id);
    expect(await stockOf(l.id)).toEqual({ onHand: "40", reserved: "10" });
  });

  it("delivers anywhere in Ghana, whatever region the farm is in", async () => {
    // The farm is in Ashanti; the buyer is in the Volta Region.
    const l = await listing();
    const b = await buyer("VOLTA");
    await setCartItem(b.actor, { listingId: l.id, quantity: "1" });
    const order = await checkout(b.actor, {
      addressId: b.addressId,
      idempotencyKey: randomUUID(),
    });
    const detail = await getOrderForBuyer(b.actor, order.id);
    expect(detail.address.regionName).toBe("Volta");
    expect(await stockOf(l.id)).toEqual({ onHand: "40", reserved: "1" });
  });

  it("won't deliver to another business's address", async () => {
    const l = await listing();
    const b = await buyer();
    const other = await buyer();
    await setCartItem(b.actor, { listingId: l.id, quantity: "5" });
    await expect(
      checkout(b.actor, {
        addressId: other.addressId,
        idempotencyKey: randomUUID(),
      }),
    ).rejects.toBeInstanceOf(NotFoundError);
  });

  it("never sells more than the stock when many buyers check out at once", async () => {
    // 25 crates; 12 buyers each want 5 → exactly 5 orders can be held.
    const l = await listing({ stock: "25" });
    const buyers = await Promise.all(Array.from({ length: 12 }, () => buyer()));
    for (const b of buyers) {
      await setCartItem(b.actor, { listingId: l.id, quantity: "5" });
    }
    const results = await Promise.allSettled(
      buyers.map((b) =>
        checkout(b.actor, {
          addressId: b.addressId,
          idempotencyKey: randomUUID(),
        }),
      ),
    );
    const placed = results.filter((r) => r.status === "fulfilled");
    const refused = results.filter((r) => r.status === "rejected");
    expect(placed).toHaveLength(5);
    for (const r of refused) {
      expect((r as PromiseRejectedResult).reason).toBeInstanceOf(ConflictError);
    }
    expect(await stockOf(l.id)).toEqual({ onHand: "25", reserved: "25" });
    const holds = await db.stockReservation.aggregate({
      where: { inventory: { listingId: l.id }, status: "ACTIVE" },
      _sum: { quantity: true },
    });
    expect(holds._sum.quantity?.toFixed()).toBe("25");
  }, 120_000);
});

describe.runIf(hasTestDatabase)("payment (integration)", () => {
  it("confirms the order only after the provider verifies it, and books the money", async () => {
    const l = await listing();
    const b = await buyer();
    const order = await placeOrder(b, l.id);

    const start = await startPayment(b.actor, order.id);
    if (!("authorizationUrl" in start)) throw new Error("expected a checkout");
    const reference = start.authorizationUrl.split("/").pop()!;

    // Coming back before paying changes nothing.
    expect((await confirmPayment(reference)).outcome).toBe("pending");
    expect((await getOrderForBuyer(b.actor, order.id)).status).toBe(
      "PENDING_PAYMENT",
    );

    await completeFakeTransaction(reference, "success");
    expect((await confirmPayment(reference)).outcome).toBe("paid");
    // Running it again (redirect + webhook) is a no-op.
    expect((await confirmPayment(reference)).outcome).toBe("paid");

    const detail = await getOrderForBuyer(b.actor, order.id);
    expect(detail.status).toBe("PAID");
    expect(detail.fulfilments.every((f) => f.status === "CONFIRMED")).toBe(
      true,
    );
    expect(detail.payment?.status).toBe("SUCCEEDED");
    expect(await stockOf(l.id)).toEqual({ onHand: "30", reserved: "0" });

    const books = await ledger(order.id);
    expect(books.PAYMENT_CAPTURED).toBe(BigInt(450000));
    expect(books.SUPPLIER_PAYABLE).toBe(BigInt(450000)); // commission rate is 0 for now
    expect(books.PROVIDER_FEE).toBeLessThan(BigInt(0));
    const sold = await db.inventoryMovement.findFirstOrThrow({
      where: { refId: order.id, type: "COMMIT" },
    });
    expect(sold.quantity.toFixed()).toBe("-10");
  });

  it("never confirms a payment whose amount doesn't match", async () => {
    const l = await listing();
    const b = await buyer();
    const order = await placeOrder(b, l.id);
    const start = await startPayment(b.actor, order.id);
    const reference = (start as { authorizationUrl: string }).authorizationUrl
      .split("/")
      .pop()!;
    setPaymentProviderForTests(
      scripted({ status: "success", amountMinor: BigInt(100) }),
    );
    expect((await confirmPayment(reference)).outcome).toBe("mismatch");
    expect((await getOrderForBuyer(b.actor, order.id)).status).toBe(
      "PENDING_PAYMENT",
    );
  });

  it("lets the buyer try again after a declined payment", async () => {
    const l = await listing();
    const b = await buyer();
    const order = await placeOrder(b, l.id);
    const first = await startPayment(b.actor, order.id);
    const ref = (first as { authorizationUrl: string }).authorizationUrl
      .split("/")
      .pop()!;
    await completeFakeTransaction(ref, "failed");
    expect((await confirmPayment(ref)).outcome).toBe("failed");
    expect((await pay(b.actor, order.id)).outcome).toBe("paid");
  });

  it("refunds a payment that arrives after the hold ended", async () => {
    const l = await listing();
    const b = await buyer();
    const order = await placeOrder(b, l.id);
    const start = await startPayment(b.actor, order.id);
    const reference = (start as { authorizationUrl: string }).authorizationUrl
      .split("/")
      .pop()!;

    // The hold runs out while the provider still says "pending".
    const later = new Date(Date.now() + 31 * 60_000);
    expect(await expireUnpaidOrders(later, { listingIds: [l.id] })).toEqual({
      expired: 1,
      paid: 0,
    });
    expect(await stockOf(l.id)).toEqual({ onHand: "40", reserved: "0" });
    await expect(startPayment(b.actor, order.id, later)).rejects.toBeInstanceOf(
      ConflictError,
    );

    // Then the buyer approves on their phone anyway.
    await completeFakeTransaction(reference, "success");
    expect((await confirmPayment(reference)).outcome).toBe("refunding");
    const detail = await getOrderForBuyer(b.actor, order.id);
    expect(detail.status).toBe("EXPIRED");
    expect(detail.payment?.status).toBe("REFUNDED");
    expect(detail.payment?.refunds[0].status).toBe("SUCCEEDED");
    expect(await stockOf(l.id)).toEqual({ onHand: "40", reserved: "0" });
    const books = await ledger(order.id);
    expect(books.PAYMENT_CAPTURED! + books.REFUND!).toBe(BigInt(0));
  });

  it("confirms instead of expiring when the payment went through at the last moment", async () => {
    const l = await listing();
    const b = await buyer();
    const order = await placeOrder(b, l.id);
    const start = await startPayment(b.actor, order.id);
    const reference = (start as { authorizationUrl: string }).authorizationUrl
      .split("/")
      .pop()!;
    await completeFakeTransaction(reference, "success");
    const later = new Date(Date.now() + 31 * 60_000);
    expect(await expireUnpaidOrders(later, { listingIds: [l.id] })).toEqual({
      expired: 0,
      paid: 1,
    });
    expect((await getOrderForBuyer(b.actor, order.id)).status).toBe("PAID");
  });
});

describe.runIf(hasTestDatabase)(
  "cancelling and ordering again (integration)",
  () => {
    it("ends the hold when an unpaid order is cancelled", async () => {
      const l = await listing();
      const b = await buyer();
      const order = await placeOrder(b, l.id);
      await cancelOrder(b.actor, order.id);
      expect((await getOrderForBuyer(b.actor, order.id)).status).toBe(
        "CANCELLED",
      );
      expect(await stockOf(l.id)).toEqual({ onHand: "40", reserved: "0" });
    });

    it("refunds in full and puts the stock back when a paid order is cancelled before pickup", async () => {
      const l = await listing();
      const b = await buyer();
      const order = await placeOrder(b, l.id);
      await pay(b.actor, order.id);
      expect(await stockOf(l.id)).toEqual({ onHand: "30", reserved: "0" });

      expect(
        await cancelOrder(b.actor, order.id, { reason: "Menu changed" }),
      ).toEqual({ refunded: true });
      const detail = await getOrderForBuyer(b.actor, order.id);
      expect(detail.status).toBe("CANCELLED");
      expect(detail.payment?.status).toBe("REFUNDED");
      expect(detail.canCancel).toBe(false);
      expect(await stockOf(l.id)).toEqual({ onHand: "40", reserved: "0" });

      const books = await ledger(order.id);
      expect(books.SUPPLIER_PAYABLE).toBe(BigInt(0));
      expect(books.REFUND).toBe(BigInt(-450000));

      await expect(cancelOrder(b.actor, order.id)).rejects.toBeInstanceOf(
        ConflictError,
      );
    });

    it("can't be cancelled once produce has been picked up", async () => {
      const l = await listing();
      const b = await buyer();
      const order = await placeOrder(b, l.id);
      await pay(b.actor, order.id);
      await db.fulfilment.updateMany({
        where: { orderId: order.id },
        data: { status: "PICKED_UP" },
      });
      await expect(cancelOrder(b.actor, order.id)).rejects.toBeInstanceOf(
        ConflictError,
      );
    });

    it("keeps each business's orders to itself", async () => {
      const l = await listing();
      const b = await buyer();
      const other = await buyer();
      const order = await placeOrder(b, l.id);
      await expect(
        getOrderForBuyer(other.actor, order.id),
      ).rejects.toBeInstanceOf(NotFoundError);
      await expect(cancelOrder(other.actor, order.id)).rejects.toBeInstanceOf(
        NotFoundError,
      );
      await expect(startPayment(other.actor, order.id)).rejects.toBeInstanceOf(
        NotFoundError,
      );
    });

    it("puts a past order back in the cart, skipping what's sold out", async () => {
      const l = await listing({ stock: "10" });
      const b = await buyer();
      const order = await placeOrder(b, l.id, "10");
      await pay(b.actor, order.id);
      const result = await reorder(b.actor, order.id);
      expect(result.added).toBe(0);
      expect(result.skipped[0].reason).toBe("Out of stock");

      await db.$executeRaw`UPDATE "inventory_record" SET "onHand" = 50 WHERE "listingId" = ${l.id}::uuid`;
      expect((await reorder(b.actor, order.id)).added).toBe(1);
    });
  },
);

describe.runIf(hasTestDatabase)("webhooks (integration)", () => {
  it("rejects unsigned webhooks and processes each event once", async () => {
    const l = await listing();
    const b = await buyer();
    const order = await placeOrder(b, l.id);
    const start = await startPayment(b.actor, order.id);
    const reference = (start as { authorizationUrl: string }).authorizationUrl
      .split("/")
      .pop()!;

    const body = JSON.stringify({
      event: "charge.success",
      data: { reference },
    });
    let verifies = 0;
    setPaymentProviderForTests({
      ...scripted({ status: "success", amountMinor: BigInt(450000) }, () => {
        verifies++;
      }),
      parseWebhook(raw, headers) {
        if (headers.get("x-test-signature") !== "ok") throw new Error("bad");
        return {
          kind: "charge.success",
          eventId: `evt-${reference}`,
          reference,
        };
      },
    });

    await expect(handlePaymentWebhook(body, new Headers())).rejects.toThrow();
    const signed = new Headers({ "x-test-signature": "ok" });
    expect(await handlePaymentWebhook(body, signed)).toEqual({
      duplicate: false,
    });
    expect(await handlePaymentWebhook(body, signed)).toEqual({
      duplicate: true,
    });
    expect(verifies).toBe(1);
    expect((await getOrderForBuyer(b.actor, order.id)).status).toBe("PAID");
  });
});

describe.runIf(hasTestDatabase)("ledger (integration)", () => {
  it("is append-only", async () => {
    const l = await listing();
    const b = await buyer();
    const order = await placeOrder(b, l.id);
    await pay(b.actor, order.id);
    const entry = await db.ledgerEntry.findFirstOrThrow({
      where: { orderId: order.id },
    });
    await expect(
      db.ledgerEntry.update({
        where: { id: entry.id },
        data: { amountMinor: BigInt(1) },
      }),
    ).rejects.toThrow(/append-only/);
    await expect(
      db.ledgerEntry.delete({ where: { id: entry.id } }),
    ).rejects.toThrow(/append-only/);
  });
});

describe.runIf(hasTestDatabase)("checkout validation (integration)", () => {
  it("refuses an empty cart", async () => {
    const b = await buyer();
    await expect(
      checkout(b.actor, {
        addressId: b.addressId,
        idempotencyKey: randomUUID(),
      }),
    ).rejects.toBeInstanceOf(ValidationError);
  });
});

/** A provider whose verification always says the same thing. */
function scripted(
  v: Partial<Verification> & Pick<Verification, "status" | "amountMinor">,
  onVerify?: () => void,
): PaymentProvider {
  return {
    name: "fake",
    async initialize() {
      return { authorizationUrl: "/dev/pay/x" };
    },
    async verify() {
      onVerify?.();
      return {
        rawStatus: v.status,
        currency: "GHS",
        feeMinor: BigInt(0),
        providerTransactionId: "t1",
        channel: "mobile_money",
        paidAt: new Date(),
        failureReason: null,
        ...v,
      };
    },
    async refund() {
      return { providerReference: "r1", status: "processed" };
    },
    async listTransactions() {
      return [];
    },
    parseWebhook() {
      throw new Error("no webhooks");
    },
  };
}
