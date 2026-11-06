"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";

import { FormError } from "@/components/forms/form-field";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

import { placeOrderAndPay } from "./actions";

type AddressOption = {
  id: string;
  label: string;
  detail: string;
  deliveryFee: string;
  total: string;
};

export function CheckoutForm({
  addresses,
  holdMinutes,
}: {
  addresses: AddressOption[];
  holdMinutes: number;
}) {
  const router = useRouter();
  // Akuafo delivers anywhere in Ghana, so any saved address will do.
  const [addressId, setAddressId] = useState(addresses[0]?.id ?? "");
  const chosen = addresses.find((a) => a.id === addressId);
  const [notes, setNotes] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  // One key per visit to this page: a double tap or a retry can't place two orders.
  const [idempotencyKey] = useState(() => crypto.randomUUID());

  return (
    <form
      className="grid gap-5"
      onSubmit={(e) => {
        e.preventDefault();
        setError(null);
        startTransition(async () => {
          const result = await placeOrderAndPay({
            addressId,
            idempotencyKey,
            notes,
          });
          if (!result.ok) {
            setError(result.error);
            return;
          }
          const { orderId, paymentUrl, paymentError } = result.data;
          if (paymentUrl) {
            // Paystack's checkout is another site, so this is a full navigation.
            window.location.assign(paymentUrl);
            return;
          }
          router.push(
            `/buyer/orders/${orderId}${paymentError ? "?payment=unavailable" : ""}`,
          );
        });
      }}
    >
      <fieldset className="grid gap-2">
        <legend className="mb-1 text-sm font-medium text-soil">
          Deliver to
        </legend>
        {addresses.map((a) => {
          return (
            <label
              key={a.id}
              className="flex cursor-pointer items-start gap-3 rounded-xl border border-border bg-card p-3 has-checked:border-field-green has-checked:bg-sprout-soft/40"
            >
              <input
                type="radio"
                name="address"
                value={a.id}
                checked={addressId === a.id}
                onChange={() => setAddressId(a.id)}
                className="mt-1 size-4 accent-field-green"
              />
              <span className="min-w-0">
                <span className="block font-medium">{a.label}</span>
                <span className="block text-sm text-muted-foreground">
                  {a.detail}
                </span>
                <span className="mt-0.5 block text-sm">
                  Delivery {a.deliveryFee}
                </span>
              </span>
            </label>
          );
        })}
        {addresses.length === 0 ? (
          <p className="text-sm">
            You haven’t saved a delivery address yet.{" "}
            <Link
              href="/buyer/addresses"
              className="font-medium text-field-green underline-offset-4 hover:underline"
            >
              Add an address
            </Link>
          </p>
        ) : null}
      </fieldset>

      <div className="grid gap-1.5">
        <Label htmlFor="notes" className="text-sm font-medium text-soil">
          Notes for delivery (optional)
        </Label>
        <Textarea
          id="notes"
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          rows={2}
          maxLength={500}
          placeholder="e.g. Deliver to the back gate before 10am"
          className="bg-card text-base md:text-sm"
        />
      </div>

      <FormError message={error} />

      {chosen ? (
        <dl className="grid gap-1 rounded-2xl bg-card p-4 text-sm">
          <div className="flex justify-between">
            <dt>Delivery</dt>
            <dd>{chosen.deliveryFee}</dd>
          </div>
          <div className="flex justify-between text-lg font-bold">
            <dt>Total</dt>
            <dd>{chosen.total}</dd>
          </div>
        </dl>
      ) : null}

      <div className="grid gap-2">
        <Button
          type="submit"
          size="lg"
          disabled={pending || !addressId}
          className="h-14 w-full rounded-full text-base font-semibold"
        >
          {pending ? "Placing your order…" : `Pay ${chosen?.total ?? ""}`}
        </Button>
        <p className="text-center text-xs text-muted-foreground">
          Mobile money or card. We hold your produce for {holdMinutes} minutes
          while you pay; once payment goes through, your order is confirmed. You
          can cancel for a full refund until it’s picked up from the farm.
        </p>
      </div>
    </form>
  );
}
