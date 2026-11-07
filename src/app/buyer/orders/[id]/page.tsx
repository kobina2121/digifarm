import { Clock, MapPin, Package } from "lucide-react";
import type { Metadata } from "next";
import { formatGhanaPhone } from "@/lib/ghana";
import { connection } from "next/server";

import { VerifiedFarm } from "@/components/market/listing-bits";
import {
  ORDER_TONE,
  REFUND_TONE,
  StatusBadge,
} from "@/components/status-badge";
import { DeliveryArt } from "@/components/illustrations/commerce-art";
import { BandTitleBar, TopBand } from "@/components/shell/top-band";
import { orNotFound } from "@/lib/not-found";
import { getOrderForBuyer } from "@/modules/ordering";

import { requireBuyer } from "../../guard";
import { OrderProgress } from "../order-progress";
import {
  CancelOrder,
  HoldCountdown,
  OrderAgain,
  PayNowButton,
  RefreshWhilePending,
} from "./order-actions";

export const metadata: Metadata = { title: "Order" };

const dateTime = new Intl.DateTimeFormat("en-GB", {
  day: "numeric",
  month: "short",
  hour: "2-digit",
  minute: "2-digit",
  timeZone: "Africa/Accra",
});

const PAYMENT_MESSAGES: Record<
  string,
  { tone: "good" | "wait" | "bad"; text: string }
> = {
  paid: { tone: "good", text: "Payment received. Your order is confirmed." },
  pending: {
    tone: "wait",
    text: "We’re waiting for your payment to go through. If you’re paying by mobile money, approve it on your phone. This page updates by itself.",
  },
  failed: {
    tone: "bad",
    text: "The payment didn’t go through and you haven’t been charged. You can try again while we’re holding your produce.",
  },
  refunding: {
    tone: "wait",
    text: "Your payment arrived after we stopped holding the produce, so we’re refunding it in full.",
  },
  mismatch: {
    tone: "bad",
    text: "Something didn’t match on that payment, so we haven’t confirmed the order yet. Our team is checking and will contact you.",
  },
  unavailable: {
    tone: "bad",
    text: "We couldn’t reach the payment service just now. Your produce is still held, so please try again.",
  },
};

export default async function OrderPage({
  params,
  searchParams,
}: PageProps<"/buyer/orders/[id]">) {
  await connection();
  const actor = await requireBuyer();
  const { id } = await params;
  const { payment: paymentParam } = await searchParams;
  const order = await orNotFound(getOrderForBuyer(actor, id));
  const message =
    typeof paymentParam === "string" ? PAYMENT_MESSAGES[paymentParam] : null;
  const waiting =
    order.status === "PENDING_PAYMENT" && paymentParam === "pending";

  return (
    <div className="grid gap-6">
      <TopBand className="pt-2 pb-4">
        <BandTitleBar
          back={{ href: "/buyer/orders", label: "Back to your orders" }}
          title="Order details"
          end={
            <span className="flex size-11 items-center justify-center rounded-full bg-white/15 text-white">
              <Package className="size-5" aria-hidden />
            </span>
          }
        />
      </TopBand>

      <section className="grid gap-5 overflow-hidden rounded-3xl bg-card p-5">
        <div className="relative pr-28 sm:pr-40">
          <h2 className="font-mono text-xl font-bold whitespace-nowrap sm:text-2xl">
            {order.number}
          </h2>
          <div className="mt-2 flex flex-wrap items-center gap-2">
            <StatusBadge
              tone={ORDER_TONE[order.status]}
              label={order.statusLabel}
            />
          </div>
          <p className="mt-2 text-sm text-muted-foreground">
            Placed {dateTime.format(order.createdAt)} by {order.placedBy}
          </p>
          <DeliveryArt className="pointer-events-none absolute -top-1 -right-2 h-auto w-28 sm:w-40" />
        </div>
        <OrderProgress status={order.status} size="lg" />
      </section>

      {waiting ? <RefreshWhilePending /> : null}
      {message && !(paymentParam === "pending" && order.status === "PAID") ? (
        <p
          role="status"
          className={
            message.tone === "good"
              ? "rounded-lg bg-sprout-soft px-3 py-2.5 text-sm text-soil"
              : message.tone === "wait"
                ? "rounded-lg bg-harvest-gold-soft px-3 py-2.5 text-sm text-soil"
                : "rounded-lg border border-destructive/30 bg-destructive/5 px-3 py-2.5 text-sm text-destructive"
          }
        >
          {message.text}
        </p>
      ) : null}

      {order.canPay ? (
        <section className="grid gap-3 rounded-3xl bg-harvest-gold-soft p-5">
          <p className="flex items-center gap-2 font-medium">
            <Clock className="size-5 text-soil" aria-hidden />
            Pay within{" "}
            <HoldCountdown expiresAt={order.holdExpiresAt.toISOString()} /> to
            keep this produce
          </p>
          <PayNowButton orderId={order.id} total={order.total} />
        </section>
      ) : null}

      {order.status === "EXPIRED" ? (
        <p className="rounded-lg bg-muted px-3 py-2.5 text-sm">
          The time to pay ran out, so the produce went back on sale and you
          weren’t charged. You can order it again below.
        </p>
      ) : null}

      {order.fulfilments.map((f) => (
        <section key={f.id} className="grid gap-3 rounded-3xl bg-card p-4">
          <VerifiedFarm name={f.supplierName} className="font-semibold" />
          {f.carrier && f.status === "PICKED_UP" ? (
            <p className="rounded-xl bg-sprout-soft px-3 py-2 text-sm">
              On its way with{" "}
              <span className="font-medium">{f.carrier.name}</span>
              {f.carrier.phone ? (
                <>
                  {" · "}
                  <a
                    href={`tel:${f.carrier.phone}`}
                    className="underline underline-offset-4"
                  >
                    {formatGhanaPhone(f.carrier.phone)}
                  </a>
                </>
              ) : null}
            </p>
          ) : null}
          {f.status === "DELIVERY_FAILED" ? (
            <p className="rounded-xl bg-harvest-gold-soft px-3 py-2 text-sm">
              We couldn’t deliver this one. We’ll be in touch to arrange another
              try.
            </p>
          ) : null}
          {f.status === "DELIVERED" ? (
            <p className="rounded-xl bg-sprout-soft px-3 py-2 text-sm">
              Delivered{f.receiverName ? `, received by ${f.receiverName}` : ""}
              {f.hasProofPhoto ? (
                <>
                  {" · "}
                  <a
                    href={`/api/files/delivery-proofs/${f.id}`}
                    target="_blank"
                    rel="noreferrer"
                    className="underline underline-offset-4"
                  >
                    See photo
                  </a>
                </>
              ) : null}
            </p>
          ) : null}
          <ul className="grid gap-2 text-sm">
            {f.items.map((item) => (
              <li key={item.id} className="flex justify-between gap-3">
                <span className="min-w-0">
                  {item.productName}
                  {item.variety ? ` · ${item.variety}` : ""}
                  <span className="block text-muted-foreground">
                    {item.quantityLabel} × {item.unitPrice}
                  </span>
                </span>
                <span className="shrink-0 font-medium">{item.lineTotal}</span>
              </li>
            ))}
          </ul>
        </section>
      ))}

      <section className="grid gap-3 rounded-3xl bg-card p-5">
        <dl className="grid gap-1 text-sm">
          <div className="flex justify-between">
            <dt>Produce</dt>
            <dd>{order.subtotal}</dd>
          </div>
          <div className="flex justify-between">
            <dt>Delivery</dt>
            <dd>{order.deliveryFee}</dd>
          </div>
          <div className="mt-1 flex justify-between text-lg font-bold">
            <dt>Total</dt>
            <dd>{order.total}</dd>
          </div>
        </dl>
        {order.payment ? (
          <p className="text-sm text-muted-foreground">
            Payment: {order.payment.statusLabel}
            {order.paidAt && order.payment.status === "SUCCEEDED"
              ? ` on ${dateTime.format(order.paidAt)}`
              : ""}
          </p>
        ) : null}
        {order.payment?.refunds.map((r) => (
          <div key={r.id} className="flex flex-wrap items-center gap-2 text-sm">
            <StatusBadge tone={REFUND_TONE[r.status]} label={r.statusLabel} />
            <span>{r.amount}</span>
          </div>
        ))}
      </section>

      <section className="flex items-start gap-3 rounded-3xl bg-card p-5 text-sm">
        <MapPin
          className="mt-0.5 size-4 shrink-0 text-field-green"
          aria-hidden
        />
        <div>
          <p className="font-medium">{order.address.label}</p>
          <p className="text-muted-foreground">
            {[
              order.address.street,
              order.address.town,
              order.address.regionName ?? order.address.zone?.name,
            ]
              .filter(Boolean)
              .join(", ")}
          </p>
          {order.notes ? <p className="mt-1">Notes: {order.notes}</p> : null}
        </div>
      </section>

      <div className="grid gap-3 sm:flex sm:flex-wrap">
        {order.canCancel ? (
          <CancelOrder orderId={order.id} paid={order.paidCancellation} />
        ) : null}
        <OrderAgain orderId={order.id} />
      </div>

      <section className="grid gap-2">
        <h2 className="text-lg font-bold">History</h2>
        <ol className="grid gap-1 text-sm">
          {order.history.map((h) => (
            <li key={h.id} className="flex justify-between gap-3">
              <span>
                {h.label}
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
