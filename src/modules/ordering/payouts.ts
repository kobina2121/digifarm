import "server-only";

import { audit } from "@/lib/audit";
import { type Actor, assertCan } from "@/lib/authz";
import { db } from "@/lib/db";
import { ConflictError, NotFoundError } from "@/lib/errors";
import { Money } from "@/lib/money";
import { parseInput } from "@/lib/validation";
import { recordLedger } from "@/modules/ledger";

import { PROBLEM_REPORT_HOURS } from "./config";
import { lockOrder } from "./internal";
import { fulfilmentShares } from "./payment-flow";
import { type RecordPayoutInput, recordPayoutSchema } from "./schemas";

const RECENT_PAID = 50;
const MAX_DUE = 200;

/** Deliveries waiting for their farm to be paid, and recent payments. */
export async function listPayouts(actor: Actor, now = new Date()) {
  assertCan(actor, "payout.record");
  const [due, paid] = await Promise.all([
    db.fulfilment.findMany({
      where: { status: "DELIVERED", payout: null },
      orderBy: { deliveredAt: "asc" },
      take: MAX_DUE,
      select: {
        id: true,
        supplierOrgId: true,
        supplierName: true,
        subtotalMinor: true,
        commissionBps: true,
        deliveredAt: true,
        supplier: { select: { phone: true } },
        order: { select: { id: true, number: true } },
      },
    }),
    db.supplierPayout.findMany({
      orderBy: { createdAt: "desc" },
      take: RECENT_PAID,
      select: {
        id: true,
        amountMinor: true,
        method: true,
        paidTo: true,
        reference: true,
        createdAt: true,
        supplier: { select: { legalName: true, tradingName: true } },
        recordedBy: { select: { name: true } },
        fulfilment: {
          select: { order: { select: { id: true, number: true } } },
        },
      },
    }),
  ]);
  const reportWindowMs = PROBLEM_REPORT_HOURS * 60 * 60 * 1000;
  const dueRows = due.map((f) => {
    const payableMinor = fulfilmentShares(f).payableMinor;
    return {
      fulfilmentId: f.id,
      supplierId: f.supplierOrgId,
      supplierName: f.supplierName,
      supplierPhone: f.supplier.phone,
      orderId: f.order.id,
      orderNumber: f.order.number,
      payableMinor,
      amount: Money.ofMinor(payableMinor).format(),
      deliveredAt: f.deliveredAt,
      // Paying inside this window means a reported problem can't be held back (D9).
      canStillReportProblem:
        f.deliveredAt !== null &&
        now.getTime() - f.deliveredAt.getTime() < reportWindowMs,
    };
  });
  return {
    due: dueRows,
    totalDue: Money.ofMinor(
      dueRows.reduce((sum, r) => sum + r.payableMinor, BigInt(0)),
    ).format(),
    paid: paid.map((p) => ({
      id: p.id,
      amount: Money.ofMinor(p.amountMinor).format(),
      method: p.method,
      paidTo: p.paidTo,
      reference: p.reference,
      paidAt: p.createdAt,
      supplierName: p.supplier.tradingName ?? p.supplier.legalName,
      recordedBy: p.recordedBy.name,
      orderId: p.fulfilment.order.id,
      orderNumber: p.fulfilment.order.number,
    })),
  };
}

export async function countPayoutsDue(actor: Actor): Promise<number> {
  assertCan(actor, "payout.record");
  return db.fulfilment.count({
    where: { status: "DELIVERED", payout: null },
  });
}

/**
 * Record money staff have sent to a farm for one delivery. The amount comes
 * from what the order owes the farm, never from what's typed. Recording twice
 * is refused, so a farm can't be marked paid twice.
 */
export async function recordPayout(
  actor: Actor,
  fulfilmentId: string,
  input: RecordPayoutInput,
) {
  assertCan(actor, "payout.record");
  const data = parseInput(recordPayoutSchema, input);
  return db.$transaction(async (tx) => {
    const found = await tx.fulfilment.findUnique({
      where: { id: fulfilmentId },
      select: { orderId: true },
    });
    if (!found) throw new NotFoundError("Delivery not found.");
    const order = await lockOrder(tx, found.orderId);
    const fulfilment = await tx.fulfilment.findUniqueOrThrow({
      where: { id: fulfilmentId },
      select: {
        status: true,
        supplierOrgId: true,
        subtotalMinor: true,
        commissionBps: true,
        payout: { select: { id: true } },
      },
    });
    if (fulfilment.payout) {
      throw new ConflictError(
        "This farm has already been paid for this delivery.",
      );
    }
    if (fulfilment.status !== "DELIVERED") {
      throw new ConflictError("A farm is paid once its delivery has arrived.");
    }

    const { payableMinor } = fulfilmentShares(fulfilment);
    const payout = await tx.supplierPayout.create({
      data: {
        fulfilmentId,
        supplierOrgId: fulfilment.supplierOrgId,
        amountMinor: payableMinor,
        method: data.method,
        paidTo: data.paidTo,
        reference: data.reference,
        recordedById: actor.userId,
      },
      select: { id: true },
    });
    await recordLedger(tx, [
      {
        type: "SUPPLIER_PAYOUT",
        amountMinor: -payableMinor,
        orderId: order.id,
        fulfilmentId,
        supplierOrgId: fulfilment.supplierOrgId,
        memo: data.reference,
      },
    ]);
    await audit(tx, actor, {
      action: "payout.recorded",
      entityType: "fulfilment",
      entityId: fulfilmentId,
      after: {
        amountMinor: payableMinor.toString(),
        method: data.method,
        reference: data.reference,
      },
    });
    return payout;
  });
}
