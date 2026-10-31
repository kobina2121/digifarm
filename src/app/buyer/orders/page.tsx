import { ChevronRight, ReceiptText } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { connection } from "next/server";

import { ORDER_TONE, StatusBadge } from "@/components/status-badge";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { listOrdersForBuyer } from "@/modules/ordering";

import { requireBuyer } from "../guard";

export const metadata: Metadata = { title: "Orders" };

const dateFormat = new Intl.DateTimeFormat("en-GB", {
  day: "numeric",
  month: "short",
  year: "numeric",
  timeZone: "Africa/Accra",
});

export default async function OrdersPage({
  searchParams,
}: PageProps<"/buyer/orders">) {
  await connection();
  const actor = await requireBuyer();
  const { cursor } = await searchParams;
  const { items, nextCursor } = await listOrdersForBuyer(actor, {
    cursor: typeof cursor === "string" ? cursor : undefined,
  });

  return (
    <div className="grid gap-5">
      <h1 className="text-3xl font-bold">Orders</h1>
      {items.length === 0 ? (
        <div className="grid justify-items-center gap-3 rounded-2xl border border-dashed border-border bg-card p-8 text-center">
          <ReceiptText className="size-8 text-field-green" aria-hidden />
          <p className="font-medium">No orders yet</p>
          <Link href="/market" className={buttonVariants()}>
            Browse the market
          </Link>
        </div>
      ) : (
        <ul className="grid gap-2">
          {items.map((o) => (
            <li key={o.id}>
              <Link
                href={`/buyer/orders/${o.id}`}
                className="flex items-center gap-3 rounded-2xl border border-border bg-card p-4 transition-colors hover:border-field-green"
              >
                <div className="min-w-0 flex-1">
                  <p className="font-mono font-semibold">{o.number}</p>
                  <p className="truncate text-sm text-muted-foreground">
                    {dateFormat.format(o.createdAt)} ·{" "}
                    {o.supplierNames.join(", ")}
                  </p>
                  <p className="text-sm font-medium">{o.total}</p>
                </div>
                <StatusBadge
                  tone={ORDER_TONE[o.status]}
                  label={o.statusLabel}
                />
                <ChevronRight
                  className="size-4 shrink-0 text-muted-foreground"
                  aria-hidden
                />
              </Link>
            </li>
          ))}
        </ul>
      )}
      {nextCursor ? (
        <Link
          href={`/buyer/orders?cursor=${nextCursor}`}
          className={cn(
            buttonVariants({ variant: "outline" }),
            "justify-self-center",
          )}
        >
          Show more
        </Link>
      ) : null}
    </div>
  );
}
