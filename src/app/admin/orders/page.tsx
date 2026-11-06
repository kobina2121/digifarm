import { ChevronRight, Scale, Search } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { connection } from "next/server";

import { ORDER_TONE, StatusBadge } from "@/components/status-badge";
import { buttonVariants } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import {
  listOrdersForStaff,
  ORDER_STATUS_LABELS,
  STAFF_ORDER_VIEWS,
} from "@/modules/ordering";

import { requireStaff } from "../guard";

export const metadata: Metadata = { title: "Orders" };

const dateTime = new Intl.DateTimeFormat("en-GB", {
  day: "numeric",
  month: "short",
  hour: "2-digit",
  minute: "2-digit",
  timeZone: "Africa/Accra",
});

export default async function StaffOrdersPage({
  searchParams,
}: PageProps<"/admin/orders">) {
  await connection();
  const actor = await requireStaff();
  const params = await searchParams;
  const view = STAFF_ORDER_VIEWS.find((v) => v === params.view);
  const q =
    typeof params.q === "string" ? params.q.trim().slice(0, 80) : undefined;
  const cursor = typeof params.cursor === "string" ? params.cursor : undefined;
  const { items, nextCursor } = await listOrdersForStaff(actor, {
    view,
    q: q || undefined,
    cursor,
  });
  const link = (extra: Record<string, string | undefined>) => {
    const query = new URLSearchParams();
    for (const [k, v] of Object.entries({ view, q, ...extra }))
      if (v) query.set(k, v);
    const s = query.toString();
    return s ? `/admin/orders?${s}` : "/admin/orders";
  };

  return (
    <div className="grid gap-5">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-3xl font-bold">Orders</h1>
          <p className="mt-1 text-muted-foreground">
            Paid orders are confirmed: Akuafo’s stock is the truth.
          </p>
        </div>
        {actor.platformRole === "ADMIN" ? (
          <Link
            href="/admin/payments"
            className={buttonVariants({ variant: "outline" })}
          >
            <Scale aria-hidden />
            Reconcile payments
          </Link>
        ) : null}
      </div>

      <form method="get" action="/admin/orders" role="search">
        {view ? <input type="hidden" name="view" value={view} /> : null}
        <label htmlFor="order-search" className="sr-only">
          Search orders
        </label>
        <div className="relative">
          <Search
            className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground"
            aria-hidden
          />
          <Input
            id="order-search"
            name="q"
            type="search"
            defaultValue={q}
            placeholder="Order number or buyer"
            className="h-11 bg-card pl-9 text-base md:text-sm"
          />
        </div>
      </form>

      <nav aria-label="Filter orders" className="-mx-4 overflow-x-auto px-4">
        <ul className="flex gap-2">
          {[undefined, ...STAFF_ORDER_VIEWS].map((v) => (
            <li key={v ?? "all"}>
              <Link
                href={link({ view: v, cursor: undefined })}
                aria-current={v === view ? "page" : undefined}
                className={cn(
                  "inline-flex h-9 items-center rounded-full border px-3.5 text-sm font-medium whitespace-nowrap",
                  v === view
                    ? "border-field-green bg-field-green text-white"
                    : "border-border bg-card text-soil",
                )}
              >
                {v ? ORDER_STATUS_LABELS[v] : "All"}
              </Link>
            </li>
          ))}
        </ul>
      </nav>

      {items.length === 0 ? (
        <p className="rounded-2xl border border-dashed border-border bg-card p-8 text-center font-medium">
          No orders here
        </p>
      ) : (
        <ul className="grid gap-2">
          {items.map((o) => (
            <li key={o.id}>
              <Link
                href={`/admin/orders/${o.id}`}
                className="flex items-center gap-3 rounded-2xl border border-border bg-card p-4 transition-colors hover:border-field-green"
              >
                <div className="min-w-0 flex-1">
                  <p className="font-mono font-semibold">{o.number}</p>
                  <p className="truncate text-sm">{o.buyerName}</p>
                  <p className="truncate text-xs text-muted-foreground">
                    {dateTime.format(o.createdAt)} · {o.total} ·{" "}
                    {o.supplierNames.join(", ")}
                  </p>
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
          href={link({ cursor: nextCursor })}
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
