import "server-only";

import { type Actor, assertCan } from "@/lib/authz";
import { db } from "@/lib/db";
import { Money } from "@/lib/money";
import { paymentProvider } from "@/modules/payments";

export type ReconciliationIssue = {
  reference: string;
  problem:
    | "PAID_AT_PROVIDER_ONLY" // provider took money DigiFarm hasn't recorded
    | "PAID_IN_DIGIFARM_ONLY" // DigiFarm thinks it's paid; the provider doesn't
    | "AMOUNT_DIFFERS";
  providerAmount: string | null;
  digifarmAmount: string | null;
  orderId: string | null;
  orderNumber: string | null;
};

/**
 * Compare successful payments at the provider with DigiFarm's records for a
 * period (ROADMAP Phase 3). Runs daily from the scheduled job and on demand
 * from the admin page. Read-only: it reports, staff decide.
 */
export async function reconcilePayments(
  actor: Actor | null,
  { from, to }: { from: Date; to: Date },
) {
  if (actor) assertCan(actor, "payment.reconcile");
  const provider = paymentProvider();
  const [theirs, ours] = await Promise.all([
    provider.listTransactions({ from, to }),
    db.paymentAttempt.findMany({
      where: {
        provider: provider.name,
        status: "SUCCEEDED",
        createdAt: { gte: from, lte: to },
      },
      select: {
        reference: true,
        payment: {
          select: {
            amountMinor: true,
            order: { select: { id: true, number: true } },
          },
        },
      },
    }),
  ]);

  const oursByRef = new Map(ours.map((a) => [a.reference, a]));
  const theirsPaid = theirs.filter((t) => t.status === "success");
  const theirsByRef = new Map(theirsPaid.map((t) => [t.reference, t]));
  const issues: ReconciliationIssue[] = [];
  const fmt = (m: bigint) => Money.ofMinor(m).format();

  // References DigiFarm hasn't marked paid may still exist as unpaid attempts.
  const unknownRefs = theirsPaid
    .map((t) => t.reference)
    .filter((r) => !oursByRef.has(r));
  const unpaidAttempts = await db.paymentAttempt.findMany({
    where: { provider: provider.name, reference: { in: unknownRefs } },
    select: {
      reference: true,
      payment: { select: { order: { select: { id: true, number: true } } } },
    },
  });
  const unpaidByRef = new Map(unpaidAttempts.map((a) => [a.reference, a]));

  for (const t of theirsPaid) {
    const mine = oursByRef.get(t.reference);
    if (!mine) {
      const attempt = unpaidByRef.get(t.reference);
      issues.push({
        reference: t.reference,
        problem: "PAID_AT_PROVIDER_ONLY",
        providerAmount: fmt(t.amountMinor),
        digifarmAmount: null,
        orderId: attempt?.payment.order.id ?? null,
        orderNumber: attempt?.payment.order.number ?? null,
      });
    } else if (mine.payment.amountMinor !== t.amountMinor) {
      issues.push({
        reference: t.reference,
        problem: "AMOUNT_DIFFERS",
        providerAmount: fmt(t.amountMinor),
        digifarmAmount: fmt(mine.payment.amountMinor),
        orderId: mine.payment.order.id,
        orderNumber: mine.payment.order.number,
      });
    }
  }
  for (const a of ours) {
    if (!theirsByRef.has(a.reference)) {
      issues.push({
        reference: a.reference,
        problem: "PAID_IN_DIGIFARM_ONLY",
        providerAmount: null,
        digifarmAmount: fmt(a.payment.amountMinor),
        orderId: a.payment.order.id,
        orderNumber: a.payment.order.number,
      });
    }
  }

  const sum = (xs: bigint[]) => xs.reduce((s, x) => s + x, BigInt(0));
  return {
    provider: provider.name,
    from,
    to,
    providerCount: theirsPaid.length,
    providerTotal: fmt(sum(theirsPaid.map((t) => t.amountMinor))),
    digifarmCount: ours.length,
    digifarmTotal: fmt(sum(ours.map((a) => a.payment.amountMinor))),
    issues,
  };
}
