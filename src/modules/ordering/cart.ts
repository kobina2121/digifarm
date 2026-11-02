import "server-only";

import Decimal from "decimal.js";

import type { GhanaRegion } from "@/generated/prisma/enums";
import { type Actor, assertCan } from "@/lib/authz";
import { db, type Tx } from "@/lib/db";
import { NotFoundError, ValidationError } from "@/lib/errors";
import { GHANA_REGIONS } from "@/lib/ghana";
import { Money } from "@/lib/money";
import { Quantity } from "@/lib/quantity";
import { parseInput } from "@/lib/validation";
import {
  type OrderableListing,
  orderableListings,
  UNAVAILABLE_LABELS,
} from "@/modules/catalog";

import { MAX_CART_LINES } from "./config";
import { deliveryFeeForFarms } from "./delivery-fee";
import { type CartItemInput, cartItemSchema } from "./schemas";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export function buyerOrgOf(actor: Actor): string {
  const orgId = actor.membership?.organizationId;
  if (!orgId) throw new NotFoundError("Set up your business first.");
  return orgId;
}

export function unitLabel(
  unit: { name: string; plural: string },
  qty: string,
): string {
  return `${qty} ${qty === "1" ? unit.name : unit.plural}`;
}

/**
 * Why a line can't be bought as it stands, or null if it can. Checkout runs
 * the same checks again inside its transaction.
 */
export function lineProblem(
  listing: OrderableListing | undefined,
  quantity: string,
): string | null {
  if (!listing) return "No longer on sale. Remove it to continue.";
  const a = listing.availability;
  if (!a.available) return UNAVAILABLE_LABELS[a.reason];
  const qty = new Decimal(quantity);
  if (qty.greaterThan(a.availableQty))
    return `Only ${unitLabel(listing.unit, a.availableQty)} left.`;
  return null;
}

export type CartLine = {
  listingId: string;
  productName: string;
  variety: string | null;
  quantity: string;
  quantityLabel: string;
  listing: OrderableListing | null;
  lineTotalMinor: bigint | null;
  lineTotal: string | null;
  problem: string | null;
};

export type CartGroup = {
  supplierId: string;
  supplierName: string;
  /** Where the farm is: DigiFarm delivers anywhere in Ghana. */
  farmRegion: string;
  farmRegionCode: GhanaRegion;
  lines: CartLine[];
};

export type CartView = {
  groups: CartGroup[];
  unavailable: CartLine[];
  lineCount: number;
  subtotal: string;
  /** To the buyer's default address; checkout recalculates for the one chosen. */
  deliveryFee: string;
  /** Region the fee is for; null until the buyer has an address. */
  deliveryRegion: string | null;
  total: string;
  /** Delivery fee and total if the order goes to this region. */
  quote: (region: GhanaRegion) => { deliveryFee: string; total: string };
  canCheckout: boolean;
};

/** The buyer's cart, re-checked against current prices and stock. */
export async function getCart(
  actor: Actor,
  now = new Date(),
): Promise<CartView> {
  assertCan(actor, "cart.manage");
  const orgId = buyerOrgOf(actor);
  const items = await db.cartItem.findMany({
    where: { cart: { buyerOrgId: orgId } },
    orderBy: { createdAt: "asc" },
    select: {
      listingId: true,
      quantity: true,
      listing: {
        select: { product: { select: { name: true, variety: true } } },
      },
    },
  });
  const listings = await orderableListings(
    items.map((i) => i.listingId),
    now,
  );

  const groups = new Map<string, CartGroup>();
  const unavailable: CartLine[] = [];
  let subtotal = Money.zero();
  let ok = items.length > 0;

  for (const item of items) {
    const quantity = item.quantity.toFixed();
    const listing = listings.get(item.listingId);
    const problem = lineProblem(listing, quantity);
    if (problem) ok = false;
    const total = listing
      ? Money.ofMinor(listing.unitPriceMinor).timesQuantity(
          Quantity.parse(quantity),
        )
      : null;
    const line: CartLine = {
      listingId: item.listingId,
      productName: item.listing.product.name,
      variety: item.listing.product.variety,
      quantity,
      quantityLabel: listing ? unitLabel(listing.unit, quantity) : quantity,
      listing: listing ?? null,
      lineTotalMinor: total?.amountMinor ?? null,
      lineTotal: total?.format() ?? null,
      problem,
    };
    if (!listing) {
      unavailable.push(line);
      continue;
    }
    if (total && !problem) subtotal = subtotal.add(total);
    const group = groups.get(listing.supplierId) ?? {
      supplierId: listing.supplierId,
      supplierName: listing.supplier.name,
      farmRegion: GHANA_REGIONS[listing.supplier.region],
      farmRegionCode: listing.supplier.region,
      lines: [],
    };
    group.lines.push(line);
    groups.set(listing.supplierId, group);
  }

  const farmRegions = [...groups.values()].map((g) => g.farmRegionCode);
  const quote = (region: GhanaRegion) => {
    const fee = Money.ofMinor(deliveryFeeForFarms(farmRegions, region));
    return { deliveryFee: fee.format(), total: subtotal.add(fee).format() };
  };
  const address = await db.address.findFirst({
    where: { organizationId: orgId, kind: "DELIVERY", deletedAt: null },
    orderBy: [{ isDefault: "desc" }, { createdAt: "asc" }],
    select: { region: true },
  });
  return {
    groups: [...groups.values()],
    unavailable,
    lineCount: items.length,
    subtotal: subtotal.format(),
    deliveryRegion: address ? GHANA_REGIONS[address.region] : null,
    ...(address
      ? quote(address.region)
      : { deliveryFee: "Added at checkout", total: subtotal.format() }),
    quote,
    canCheckout: ok,
  };
}

export async function cartLineCount(actor: Actor): Promise<number> {
  assertCan(actor, "cart.manage");
  return db.cartItem.count({
    where: { cart: { buyerOrgId: buyerOrgOf(actor) } },
  });
}

/** Add to (or set) a cart line. Stock is checked here and held only at checkout. */
export async function setCartItem(
  actor: Actor,
  input: CartItemInput,
  now = new Date(),
) {
  assertCan(actor, "cart.manage");
  const orgId = buyerOrgOf(actor);
  const data = parseInput(cartItemSchema, input);
  const listing = (await orderableListings([data.listingId], now)).get(
    data.listingId,
  );
  if (!listing) throw new NotFoundError("This listing isn’t on sale.");

  return db.$transaction(async (tx) => {
    const cart = await tx.cart.upsert({
      where: { buyerOrgId: orgId },
      create: { buyerOrgId: orgId },
      update: {},
      select: { id: true },
    });
    const existing = await tx.cartItem.findUnique({
      where: { cartId_listingId: { cartId: cart.id, listingId: listing.id } },
      select: { quantity: true },
    });
    const quantity =
      data.mode === "add" && existing
        ? new Decimal(existing.quantity.toFixed()).plus(data.quantity).toFixed()
        : new Decimal(data.quantity).toFixed();

    const problem = lineProblem(listing, quantity);
    if (problem) {
      throw new ValidationError(problem, {
        fieldErrors: { quantity: problem },
      });
    }
    if (!existing) {
      const lines = await tx.cartItem.count({ where: { cartId: cart.id } });
      if (lines >= MAX_CART_LINES) {
        throw new ValidationError(
          `A cart can hold up to ${MAX_CART_LINES} products. Check out or remove something first.`,
        );
      }
    }
    await tx.cartItem.upsert({
      where: { cartId_listingId: { cartId: cart.id, listingId: listing.id } },
      create: { cartId: cart.id, listingId: listing.id, quantity },
      update: { quantity },
    });
    return { quantity, quantityLabel: unitLabel(listing.unit, quantity) };
  });
}

export async function removeCartItem(actor: Actor, listingId: string) {
  assertCan(actor, "cart.manage");
  if (!UUID.test(listingId)) return;
  await db.cartItem.deleteMany({
    where: { listingId, cart: { buyerOrgId: buyerOrgOf(actor) } },
  });
}

export async function clearCart(tx: Tx, buyerOrgId: string) {
  await tx.cartItem.deleteMany({ where: { cart: { buyerOrgId } } });
}
