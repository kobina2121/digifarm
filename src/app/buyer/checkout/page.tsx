import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { connection } from "next/server";

import { GHANA_REGIONS } from "@/lib/ghana";
import { getBuyerProfile } from "@/modules/buyers";
import { getCart, PAYMENT_HOLD_MINUTES } from "@/modules/ordering";

import { requireBuyer } from "../guard";
import { CheckoutForm } from "./checkout-form";

export const metadata: Metadata = { title: "Checkout" };

export default async function CheckoutPage() {
  await connection();
  const actor = await requireBuyer();
  const [cart, profile] = await Promise.all([
    getCart(actor),
    getBuyerProfile(actor),
  ]);
  if (!cart.canCheckout) redirect("/buyer/cart");

  return (
    <div className="grid gap-6">
      <div>
        <Link
          href="/buyer/cart"
          className="text-sm font-medium text-field-green underline-offset-4 hover:underline"
        >
          ← Cart
        </Link>
        <h1 className="mt-2 text-3xl font-bold">Checkout</h1>
      </div>

      <section className="grid gap-3 rounded-3xl bg-card p-5">
        <h2 className="font-semibold">Your order</h2>
        <ul className="grid gap-2 text-sm">
          {cart.groups.flatMap((g) =>
            g.lines.map((line) => (
              <li key={line.listingId} className="flex justify-between gap-3">
                <span className="min-w-0">
                  {line.productName}
                  {line.variety ? ` · ${line.variety}` : ""}
                  <span className="block text-muted-foreground">
                    {line.quantityLabel} from {g.supplierName}
                  </span>
                </span>
                <span className="shrink-0">{line.lineTotal}</span>
              </li>
            )),
          )}
        </ul>
        <dl className="grid gap-1 border-t border-border pt-3 text-sm">
          <div className="flex justify-between">
            <dt>Produce</dt>
            <dd>{cart.subtotal}</dd>
          </div>
          <div className="flex justify-between">
            <dt>Delivery</dt>
            <dd>{cart.deliveryFee}</dd>
          </div>
          <div className="mt-1 flex justify-between border-t-2 border-dashed border-border pt-2 text-lg font-bold">
            <dt>Total</dt>
            <dd>{cart.total}</dd>
          </div>
        </dl>
      </section>

      <CheckoutForm
        addresses={profile.addresses.map((a) => ({
          id: a.id,
          label: a.label,
          detail: [a.street, a.town, GHANA_REGIONS[a.region]]
            .filter(Boolean)
            .join(", "),
        }))}
        total={cart.total}
        holdMinutes={PAYMENT_HOLD_MINUTES}
      />
    </div>
  );
}
