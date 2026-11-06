import { FlaskConical } from "lucide-react";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { connection } from "next/server";

import { Button } from "@/components/ui/button";
import { env } from "@/lib/env";
import { Money } from "@/lib/money";
import { getFakeTransaction } from "@/modules/payments";

export const metadata: Metadata = { title: "Test payment" };

/**
 * DEVELOPMENT ONLY: stands in for Paystack's checkout when
 * PAYMENT_PROVIDER=fake. No money moves. Returns 404 otherwise.
 */
export default async function FakePaymentPage({
  params,
}: PageProps<"/dev/pay/[reference]">) {
  await connection();
  if (env().PAYMENT_PROVIDER !== "fake") notFound();
  const { reference } = await params;
  const tx = await getFakeTransaction(reference);
  if (!tx) notFound();
  const action = `/dev/pay/${encodeURIComponent(reference)}/complete`;

  return (
    <main className="mx-auto grid min-h-dvh max-w-md content-center gap-6 px-4 py-10">
      <div className="grid gap-2 rounded-2xl border-2 border-dashed border-harvest-gold bg-harvest-gold-soft p-4 text-sm text-soil">
        <p className="flex items-center gap-2 font-bold">
          <FlaskConical className="size-4" aria-hidden />
          TEST PAYMENT: no real money
        </p>
        <p>
          This page stands in for Paystack while Akuafo runs without payment
          keys. Choose what the buyer does.
        </p>
      </div>
      <div className="rounded-2xl border border-border bg-card p-5">
        <p className="text-sm text-muted-foreground">Amount</p>
        <p className="text-3xl font-bold">
          {Money.ofMinor(tx.amountMinor).format()}
        </p>
        <p className="mt-1 font-mono text-xs text-muted-foreground">
          {tx.reference}
        </p>
      </div>
      {tx.status === "pending" ? (
        <form method="post" action={action} className="grid gap-2">
          <Button type="submit" name="outcome" value="success" size="lg">
            Approve payment
          </Button>
          <Button type="submit" name="outcome" value="failed" variant="outline">
            Decline
          </Button>
          <Button
            type="submit"
            name="outcome"
            value="abandoned"
            variant="ghost"
          >
            Close without paying
          </Button>
        </form>
      ) : (
        <form method="post" action={action}>
          <p className="mb-3 text-sm">
            This test payment is already {tx.status}.
          </p>
          <Button
            type="submit"
            name="outcome"
            value="success"
            variant="outline"
          >
            Back to Akuafo
          </Button>
        </form>
      )}
    </main>
  );
}
