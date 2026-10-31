import "server-only";

import Decimal from "decimal.js";

import type { InventoryMovementType } from "@/generated/prisma/enums";
import type { Actor } from "@/lib/authz";
import type { Tx } from "@/lib/db";
import { ConflictError, NotFoundError } from "@/lib/errors";

/**
 * Stock bookkeeping. Callers own permission checks and the transaction; every
 * change to on-hand stock is written to the append-only movement log.
 */

type LockedRecord = { id: string; onHand: string; reserved: string };

async function lockForListing(
  tx: Tx,
  listingId: string,
): Promise<LockedRecord> {
  const [row] = await tx.$queryRaw<LockedRecord[]>`
    SELECT id, "onHand"::text AS "onHand", reserved::text AS reserved
    FROM "inventory_record" WHERE "listingId" = ${listingId}::uuid
    FOR UPDATE`;
  if (!row) throw new NotFoundError("Stock record not found.");
  return row;
}

async function record(
  tx: Tx,
  inventoryId: string,
  type: InventoryMovementType,
  quantity: Decimal,
  onHandAfter: Decimal,
  actor: Actor | null,
  reason?: string,
  ref?: StockRef,
) {
  await tx.inventoryMovement.create({
    data: {
      inventoryId,
      type,
      quantity: quantity.toFixed(),
      onHandAfter: onHandAfter.toFixed(),
      reason,
      refType: ref?.type,
      refId: ref?.id,
      actorUserId: actor?.userId ?? null,
    },
  });
}

/** What a stock change was for, e.g. an order. */
export type StockRef = { type: string; id: string };

export async function createInventory(
  tx: Tx,
  listingId: string,
  onHand: string,
  actor: Actor,
) {
  const qty = new Decimal(onHand);
  const inv = await tx.inventoryRecord.create({
    data: { listingId, onHand: qty.toFixed() },
  });
  if (!qty.isZero())
    await record(tx, inv.id, "ADJUST", qty, qty, actor, "Initial stock");
  return inv;
}

/**
 * Set on-hand stock to what the farmer just reported. Locks the row so a
 * concurrent checkout can't slip in between the read and the write.
 */
export async function setOnHand(
  tx: Tx,
  listingId: string,
  onHand: string,
  actor: Actor,
  reason?: string,
) {
  const current = await lockForListing(tx, listingId);
  const next = new Decimal(onHand);
  const reserved = new Decimal(current.reserved);
  if (next.lessThan(reserved)) {
    throw new ConflictError(
      `${reserved.toFixed()} are held for orders being paid for, so stock can't go below that.`,
    );
  }
  const delta = next.minus(current.onHand);
  if (!delta.isZero()) {
    await tx.inventoryRecord.update({
      where: { id: current.id },
      data: { onHand: next.toFixed(), version: { increment: 1 } },
    });
    await record(
      tx,
      current.id,
      "ADJUST",
      delta,
      next,
      actor,
      reason ?? "Stock updated",
    );
  }
  return {
    before: current.onHand,
    after: next.toFixed(),
    changed: !delta.isZero(),
  };
}

// ─── Holds for checkout (ROADMAP §2.4 "Inventory concurrency") ──────────────
// A hold only moves "reserved"; on-hand stock changes (and is logged) when the
// order is paid or a paid order is cancelled.

/**
 * Hold stock for a checkout in one conditional update, so two buyers can never
 * hold the same units. Returns false when there isn't enough left. Callers
 * hold several listings in listing-ID order to avoid deadlocks.
 */
export async function reserveStock(
  tx: Tx,
  inventoryId: string,
  quantity: string,
): Promise<boolean> {
  const updated = await tx.$executeRaw`
    UPDATE "inventory_record"
    SET reserved = reserved + ${quantity}::numeric,
        version = version + 1,
        "updatedAt" = now()
    WHERE id = ${inventoryId}::uuid
      AND ("onHand" - reserved) >= ${quantity}::numeric`;
  return updated === 1;
}

/** End a hold without selling: the units go back on sale. */
export async function releaseStock(
  tx: Tx,
  inventoryId: string,
  quantity: string,
) {
  await tx.$executeRaw`
    UPDATE "inventory_record"
    SET reserved = reserved - ${quantity}::numeric,
        version = version + 1,
        "updatedAt" = now()
    WHERE id = ${inventoryId}::uuid`;
}

/** A held quantity was paid for: take it out of stock. */
export async function commitStock(
  tx: Tx,
  inventoryId: string,
  quantity: string,
  reason: string,
  ref: StockRef,
) {
  const [row] = await tx.$queryRaw<{ onHand: string }[]>`
    UPDATE "inventory_record"
    SET "onHand" = "onHand" - ${quantity}::numeric,
        reserved = reserved - ${quantity}::numeric,
        version = version + 1,
        "updatedAt" = now()
    WHERE id = ${inventoryId}::uuid
    RETURNING "onHand"::text AS "onHand"`;
  if (!row) throw new NotFoundError("Stock record not found.");
  const qty = new Decimal(quantity);
  await record(
    tx,
    inventoryId,
    "COMMIT",
    qty.negated(),
    new Decimal(row.onHand),
    null,
    reason,
    ref,
  );
}

/** Sold units came back (a paid order was cancelled before pickup). */
export async function returnStock(
  tx: Tx,
  inventoryId: string,
  quantity: string,
  actor: Actor | null,
  reason: string,
  ref: StockRef,
) {
  const [row] = await tx.$queryRaw<{ onHand: string }[]>`
    UPDATE "inventory_record"
    SET "onHand" = "onHand" + ${quantity}::numeric,
        version = version + 1,
        "updatedAt" = now()
    WHERE id = ${inventoryId}::uuid
    RETURNING "onHand"::text AS "onHand"`;
  if (!row) throw new NotFoundError("Stock record not found.");
  await record(
    tx,
    inventoryId,
    "RETURN",
    new Decimal(quantity),
    new Decimal(row.onHand),
    actor,
    reason,
    ref,
  );
}
