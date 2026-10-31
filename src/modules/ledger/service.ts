import "server-only";

import type { LedgerEntryType } from "@/generated/prisma/enums";
import type { Tx } from "@/lib/db";

/**
 * The financial journal (ROADMAP §2.4). Entries are append-only (a database
 * trigger refuses edits) and always written in the same transaction as the
 * change they record. Signs: money in and amounts owed are positive; money
 * out and reversals are negative.
 */
export type LedgerLine = {
  type: LedgerEntryType;
  amountMinor: bigint;
  orderId?: string;
  fulfilmentId?: string;
  supplierOrgId?: string;
  paymentId?: string;
  refundId?: string;
  memo?: string;
};

export async function recordLedger(tx: Tx, lines: LedgerLine[]) {
  const data = lines.filter((l) => l.amountMinor !== BigInt(0));
  if (data.length) await tx.ledgerEntry.createMany({ data });
}
