import type { Metadata } from "next";
import Link from "next/link";
import { connection } from "next/server";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { can } from "@/lib/authz";
import { reconcilePayments } from "@/modules/ordering";

import { requireStaff } from "../guard";

export const metadata: Metadata = { title: "Payment reconciliation" };

const PROBLEMS = {
  PAID_AT_PROVIDER_ONLY: "Paid at the provider, not recorded in DigiFarm",
  PAID_IN_DIGIFARM_ONLY: "Recorded as paid in DigiFarm, not at the provider",
  AMOUNT_DIFFERS: "Amounts differ",
} as const;

function day(value: unknown): string {
  if (typeof value === "string" && /^\d{4}-\d{2}-\d{2}$/.test(value))
    return value;
  return new Date().toISOString().slice(0, 10);
}

export default async function PaymentsPage({
  searchParams,
}: PageProps<"/admin/payments">) {
  await connection();
  const actor = await requireStaff();
  if (!can(actor, "payment.reconcile")) {
    return (
      <p className="rounded-2xl border border-border bg-card p-5">
        Payment reconciliation is for admins.
      </p>
    );
  }
  const { date } = await searchParams;
  const selected = day(date);
  const from = new Date(`${selected}T00:00:00Z`);
  const to = new Date(from.getTime() + 24 * 60 * 60 * 1000 - 1);
  let report: Awaited<ReturnType<typeof reconcilePayments>> | null = null;
  let error: string | null = null;
  try {
    report = await reconcilePayments(actor, { from, to });
  } catch {
    error = "Couldn’t reach the payment provider. Try again in a moment.";
  }

  return (
    <div className="grid gap-6">
      <div>
        <Link
          href="/admin/orders"
          className="text-sm font-medium text-field-green underline-offset-4 hover:underline"
        >
          ← Orders
        </Link>
        <h1 className="mt-2 text-3xl font-bold">Payment reconciliation</h1>
        <p className="mt-1 text-muted-foreground">
          Successful payments at the provider compared with DigiFarm’s records,
          for one day (Accra time is UTC). Also runs daily as a scheduled job.
        </p>
      </div>

      <form method="get" className="flex items-end gap-2">
        <div className="grid gap-1.5">
          <label htmlFor="date" className="text-sm font-medium text-soil">
            Day
          </label>
          <Input
            id="date"
            name="date"
            type="date"
            defaultValue={selected}
            className="h-11 bg-card text-base md:text-sm"
          />
        </div>
        <Button type="submit" variant="outline">
          Check
        </Button>
      </form>

      {error ? (
        <p role="alert" className="text-destructive">
          {error}
        </p>
      ) : null}

      {report ? (
        <>
          <section className="grid gap-3 sm:grid-cols-2">
            <div className="rounded-2xl border border-border bg-card p-5">
              <p className="eyebrow text-muted-foreground">
                {report.provider === "fake" ? "Test stand-in" : "Paystack"}
              </p>
              <p className="mt-1 text-2xl font-bold">{report.providerTotal}</p>
              <p className="text-sm text-muted-foreground">
                {report.providerCount}{" "}
                {report.providerCount === 1 ? "payment" : "payments"}
              </p>
            </div>
            <div className="rounded-2xl border border-border bg-card p-5">
              <p className="eyebrow text-muted-foreground">DigiFarm</p>
              <p className="mt-1 text-2xl font-bold">{report.digifarmTotal}</p>
              <p className="text-sm text-muted-foreground">
                {report.digifarmCount}{" "}
                {report.digifarmCount === 1 ? "payment" : "payments"}
              </p>
            </div>
          </section>
          {report.issues.length === 0 ? (
            <p className="rounded-lg bg-sprout-soft px-3 py-2.5 text-sm">
              Everything matches for this day.
            </p>
          ) : (
            <ul className="grid gap-2">
              {report.issues.map((i) => (
                <li
                  key={`${i.reference}-${i.problem}`}
                  className="rounded-2xl border border-destructive/30 bg-card p-4 text-sm"
                >
                  <p className="font-medium text-destructive">
                    {PROBLEMS[i.problem]}
                  </p>
                  <p className="font-mono text-xs">{i.reference}</p>
                  <p className="text-muted-foreground">
                    Provider: {i.providerAmount ?? "–"} · DigiFarm:{" "}
                    {i.digifarmAmount ?? "–"}
                  </p>
                  {i.orderId ? (
                    <Link
                      href={`/admin/orders/${i.orderId}`}
                      className="font-medium text-field-green underline-offset-4 hover:underline"
                    >
                      Order {i.orderNumber}
                    </Link>
                  ) : null}
                </li>
              ))}
            </ul>
          )}
        </>
      ) : null}
    </div>
  );
}
