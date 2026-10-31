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
) {
  await tx.inventoryMovement.create({
    data: {
      inventoryId,
      type,
      quantity: quantity.toFixed(),
      onHandAfter: onHandAfter.toFixed(),
      reason,
      actorUserId: actor?.userId ?? null,
    },
  });
}

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
