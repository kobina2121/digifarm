import { Phone } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { connection } from "next/server";

import {
  ORDER_TONE,
  REFUND_TONE,
  StatusBadge,
} from "@/components/status-badge";
import { formatGhanaPhone } from "@/lib/ghana";
import { orNotFound } from "@/lib/not-found";
import { getOrderForStaff } from "@/modules/ordering";

import { requireStaff } from "../../guard";
import { DeliveryPanel } from "./delivery-panel";
import { RetryRefundButton } from "./retry-refund-button";

export const metadata: Metadata = { title: "Order" };

const dateTime = new Intl.DateTimeFormat("en-GB", {
  day: "numeric",
  month: "short",
  hour: "2-digit",
  minute: "2-digit",
  timeZone: "Africa/Accra",
});

const LEDGER_LABELS: Record<string, string> = {
  PAYMENT_CAPTURED: "Payment received",
  PROVIDER_FEE: "Payment provider fee",
  SUPPLIER_PAYABLE: "Owed to farm",
  COMMISSION: "DigiFarm commission",
  DELIVERY_FEE: "Delivery fee",
  REFUND: "Refunded to buyer",
};

export default async function StaffOrderPage({
  params,
}: PageProps<"/admin/orders/[id]">) {
  await connection();
  const actor = await requireStaff();
  const { id } = await params;
  const order = await orNotFound(getOrderForStaff(actor, id));

  return (
    <div className="grid gap-6">
      <div>
        <Link
          href="/admin/orders"
          className="text-sm font-medium text-field-green underline-offset-4 hover:underline"
        >
          ← Orders
        </Link>
        <h1 className="mt-2 font-mono text-2xl font-bold">{order.number}</h1>
        <div className="mt-2 flex flex-wrap items-center gap-2">
          <StatusBadge
            tone={ORDER_TONE[order.status]}
            label={order.statusLabel}
          />
          <span className="text-sm text-muted-foreground">
            {dateTime.format(order.createdAt)} · {order.total}
          </span>
        </div>
      </div>

      <section className="flex flex-wrap items-start justify-between gap-3 rounded-2xl border border-border bg-card p-5">
        <div>
          <p className="font-semibold">{order.buyer.name}</p>
          <p className="text-sm text-muted-foreground">
            Placed by {order.placedBy} · deliver to{" "}
            {[
              order.address.label,
              order.address.street,
              order.address.town,
              order.address.regionName ?? order.address.zone?.name,
            ]
              .filter(Boolean)
              .join(", ")}
            {order.address.landmark ? ` (near ${order.address.landmark})` : ""}
          </p>
          {order.notes ? (
            <p className="mt-1 text-sm">Notes: {order.notes}</p>
          ) : null}
        </div>
        <a
          href={`tel:${order.buyer.phone}`}
          className="inline-flex h-11 items-center gap-2 rounded-lg border border-border px-4 font-medium hover:border-field-green"
        >
          <Phone className="size-4 text-field-green" aria-hidden />
          {formatGhanaPhone(order.buyer.phone)}
        </a>
      </section>

      {order.fulfilments.map((f) => (
        <section
          key={f.id}
          className="grid gap-3 rounded-2xl border border-border bg-card p-4"
        >
          <div className="flex flex-wrap items-center justify-between gap-2">
            <Link
              href={`/admin/suppliers/${f.supplierId}`}
              className="font-semibold text-soil underline-offset-4 hover:underline"
            >
              {f.supplierName}
            </Link>
            <span className="text-sm text-muted-foreground">
              {f.subtotal} · commission {f.commissionBps / 100}%
            </span>
          </div>
          <ul className="grid gap-2 text-sm">
            {f.items.map((item) => (
              <li key={item.id} className="flex justify-between gap-3">
                <span>
                  {item.productName}
                  {item.variety ? ` · ${item.variety}` : ""}
                  <span className="block text-muted-foreground">
                    {item.quantityLabel} × {item.unitPrice}
                  </span>
                </span>
                <span className="shrink-0">{item.lineTotal}</span>
              </li>
            ))}
          </ul>
          <DeliveryPanel fulfilment={f} />
        </section>
      ))}

      {order.payment ? (
        <section className="grid gap-3 rounded-2xl border border-border bg-card p-5">
          <h2 className="text-lg font-bold">Payment</h2>
          <p className="text-sm">
            {order.payment.statusLabel} via{" "}
            {order.payment.provider === "fake"
              ? "the test stand-in (no real money)"
              : "Paystack"}
            {order.payment.fee ? ` · fee ${order.payment.fee}` : ""}
          </p>
          <ul className="grid gap-1 text-sm">
            {order.payment.attempts.map((a) => (
              <li key={a.id} className="flex flex-wrap justify-between gap-2">
                <span className="font-mono text-xs">{a.reference}</span>
                <span className="text-muted-foreground">
                  {a.status.toLowerCase()}
                  {a.channel ? ` · ${a.channel.replace("_", " ")}` : ""}
                  {a.failureReason ? ` · ${a.failureReason}` : ""}
                </span>
              </li>
            ))}
          </ul>
          {order.payment.refunds.map((r) => (
            <div
              key={r.id}
              className="flex flex-wrap items-start justify-between gap-3 rounded-xl bg-muted p-3 text-sm"
            >
              <div>
                <StatusBadge
                  tone={REFUND_TONE[r.status]}
                  label={r.statusLabel}
                />
                <p className="mt-1">
                  {r.amount} · {r.reason}
                </p>
                {r.failureReason ? (
                  <p className="text-destructive">{r.failureReason}</p>
                ) : null}
              </div>
              {r.status === "FAILED" ||
              (r.status === "PENDING" && r.failureReason) ? (
                <RetryRefundButton refundId={r.id} />
              ) : null}
            </div>
          ))}
        </section>
      ) : null}

      <section className="grid gap-2">
        <h2 className="text-lg font-bold">Ledger</h2>
        {order.ledger.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            Nothing booked yet: money is recorded once payment is verified.
          </p>
        ) : (
          <ul className="grid gap-1 text-sm">
            {order.ledger.map((e) => (
              <li key={e.id} className="flex justify-between gap-3">
                <span>
                  {LEDGER_LABELS[e.type] ?? e.type}
                  {e.supplierName ? ` · ${e.supplierName}` : ""}
                  {e.memo ? (
                    <span className="text-muted-foreground"> · {e.memo}</span>
                  ) : null}
                </span>
                <span
                  className={
                    e.negative ? "shrink-0 text-destructive" : "shrink-0"
                  }
                >
                  {e.amount}
                </span>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="grid gap-2">
        <h2 className="text-lg font-bold">History</h2>
        <ol className="grid gap-1 text-sm">
          {order.history.map((h) => (
            <li key={h.id} className="flex justify-between gap-3">
              <span>
                {h.label} · {h.by}
                {h.reason ? (
                  <span className="text-muted-foreground"> · {h.reason}</span>
                ) : null}
              </span>
              <span className="shrink-0 text-muted-foreground">
                {dateTime.format(h.at)}
              </span>
            </li>
          ))}
        </ol>
      </section>
    </div>
  );
}
