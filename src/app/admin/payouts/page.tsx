import { Phone } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { connection } from "next/server";

import { formatGhanaPhone } from "@/lib/ghana";
import { listPayouts } from "@/modules/ordering";

import { requireStaff } from "../guard";
import { PayoutForm } from "./payout-form";

export const metadata: Metadata = { title: "Farmer payouts" };

const when = new Intl.DateTimeFormat("en-GB", {
  day: "numeric",
  month: "short",
  hour: "2-digit",
  minute: "2-digit",
  timeZone: "Africa/Accra",
});

const METHODS = {
  MOBILE_MONEY: "Mobile money",
  BANK_TRANSFER: "Bank transfer",
  CASH: "Cash",
} as const;

export default async function PayoutsPage() {
  await connection();
  const actor = await requireStaff();
  const { due, totalDue, paid } = await listPayouts(actor);

  return (
    <div className="grid gap-6">
      <div>
        <h1 className="text-3xl font-bold">Farmer payouts</h1>
        <p className="mt-1 text-muted-foreground">
          {due.length
            ? `${due.length} ${due.length === 1 ? "delivery" : "deliveries"} to pay · ${totalDue} in total`
            : "Every delivered order has been paid."}
        </p>
      </div>

      <section className="grid gap-3" aria-labelledby="due">
        <h2 id="due" className="text-lg font-bold">
          To pay
        </h2>
        {due.length === 0 ? (
          <p className="rounded-2xl border border-dashed border-border bg-card p-5 text-sm text-muted-foreground">
            Nothing to pay right now. Deliveries appear here once they arrive.
          </p>
        ) : (
          <ul className="grid gap-3">
            {due.map((row) => (
              <li
                key={row.fulfilmentId}
                className="grid gap-3 rounded-2xl border border-border bg-card p-4"
              >
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0">
                    <Link
                      href={`/admin/suppliers/${row.supplierId}`}
                      className="font-semibold text-soil underline-offset-4 hover:underline"
                    >
                      {row.supplierName}
                    </Link>
                    <p className="text-sm text-muted-foreground">
                      <Link
                        href={`/admin/orders/${row.orderId}`}
                        className="underline-offset-4 hover:underline"
                      >
                        {row.orderNumber}
                      </Link>
                      {row.deliveredAt
                        ? ` · delivered ${when.format(row.deliveredAt)}`
                        : ""}
                    </p>
                    <a
                      href={`tel:${row.supplierPhone}`}
                      className="mt-1 inline-flex items-center gap-1.5 text-sm"
                    >
                      <Phone
                        className="size-3.5 text-field-green"
                        aria-hidden
                      />
                      {formatGhanaPhone(row.supplierPhone)}
                    </a>
                  </div>
                  <p className="text-xl font-bold">{row.amount}</p>
                </div>
                {row.canStillReportProblem ? (
                  <p className="rounded-lg bg-harvest-gold-soft px-3 py-2 text-sm">
                    The customer can still report a problem with this delivery.
                  </p>
                ) : null}
                <PayoutForm
                  fulfilmentId={row.fulfilmentId}
                  amount={row.amount}
                  defaultPaidTo={formatGhanaPhone(row.supplierPhone)}
                />
              </li>
            ))}
          </ul>
        )}
      </section>

      {paid.length ? (
        <section className="grid gap-3" aria-labelledby="paid">
          <h2 id="paid" className="text-lg font-bold">
            Recently paid
          </h2>
          <ul className="grid gap-2">
            {paid.map((p) => (
              <li
                key={p.id}
                className="flex flex-wrap items-start justify-between gap-2 rounded-2xl border border-border bg-card p-4 text-sm"
              >
                <div className="min-w-0">
                  <p className="font-semibold">{p.supplierName}</p>
                  <p className="text-muted-foreground">
                    <Link
                      href={`/admin/orders/${p.orderId}`}
                      className="underline-offset-4 hover:underline"
                    >
                      {p.orderNumber}
                    </Link>{" "}
                    · {METHODS[p.method]} to {p.paidTo}
                  </p>
                  <p className="text-muted-foreground">
                    Ref {p.reference} · {when.format(p.paidAt)} by{" "}
                    {p.recordedBy}
                  </p>
                </div>
                <p className="font-bold">{p.amount}</p>
              </li>
            ))}
          </ul>
        </section>
      ) : null}
    </div>
  );
}
