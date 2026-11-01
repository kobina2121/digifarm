import { ChevronRight, Sprout } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { connection } from "next/server";

import { DeliveryArt } from "@/components/illustrations/commerce-art";
import { ListingImage } from "@/components/market/listing-bits";
import { ORDER_TONE, StatusBadge } from "@/components/status-badge";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { listOrdersForBuyer, type OrderSummary } from "@/modules/ordering";

import { requireBuyer } from "../guard";
import { isActiveOrder, OrderProgress } from "./order-progress";

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
  const active = items.filter((o) => isActiveOrder(o.status));
  const past = items.filter((o) => !isActiveOrder(o.status));

  return (
    <div className="mx-auto grid w-full max-w-2xl gap-6">
      <section className="relative overflow-hidden rounded-3xl bg-field-green p-6 pr-40 text-white sm:pr-56">
        <p className="eyebrow text-white/75">Orders</p>
        <h1 className="mt-1 text-2xl leading-tight font-bold sm:text-3xl">
          {items.length ? "Track your orders" : "No orders yet"}
        </h1>
        <p className="mt-1 text-sm text-white/80">
          {items.length
            ? active.length
              ? `${active.length} in progress · paid orders are confirmed straight away`
              : "Nothing in progress right now. Order again from your past orders."
            : "Your orders will appear here once you check out."}
        </p>
        <DeliveryArt className="pointer-events-none absolute -right-3 bottom-2 h-auto w-40 sm:w-52" />
      </section>

      {items.length === 0 ? (
        <div className="grid justify-items-center gap-3 rounded-3xl bg-card p-8 text-center">
          <span className="flex size-14 items-center justify-center rounded-full bg-sprout-soft text-field-green-dark">
            <Sprout className="size-6" aria-hidden />
          </span>
          <p className="text-lg font-semibold">Start with the market</p>
          <p className="max-w-xs text-sm text-muted-foreground">
            Add produce to your cart, pay by mobile money or card, and follow
            your order here.
          </p>
          <Link
            href="/market"
            className={cn(buttonVariants({ size: "lg" }), "rounded-full px-8")}
          >
            Browse the market
          </Link>
        </div>
      ) : (
        <>
          {active.length ? (
            <OrderGroup title="In progress" orders={active} showProgress />
          ) : null}
          {past.length ? (
            <OrderGroup title="Past orders" orders={past} />
          ) : null}
        </>
      )}

      {nextCursor ? (
        <Link
          href={`/buyer/orders?cursor=${nextCursor}`}
          className={cn(
            buttonVariants({ variant: "outline", size: "lg" }),
            "justify-self-center rounded-full px-8",
          )}
        >
          Show more
        </Link>
      ) : null}
    </div>
  );
}

function OrderGroup({
  title,
  orders,
  showProgress = false,
}: {
  title: string;
  orders: OrderSummary[];
  showProgress?: boolean;
}) {
  return (
    <section className="grid gap-3">
      <h2 className="px-1 text-lg font-bold">{title}</h2>
      <ul className="grid gap-3">
        {orders.map((o) => (
          <li key={o.id}>
            <OrderCard order={o} showProgress={showProgress} />
          </li>
        ))}
      </ul>
    </section>
  );
}

function OrderCard({
  order: o,
  showProgress,
}: {
  order: OrderSummary;
  showProgress: boolean;
}) {
  const names = o.previews.map((p) => p.productName);
  const extra = o.itemCount - names.length;
  return (
    <Link
      href={`/buyer/orders/${o.id}`}
      className="grid gap-4 rounded-3xl bg-card p-4 shadow-[0_1px_3px_rgb(31_42_31/0.06)] transition-shadow hover:shadow-[0_6px_20px_rgb(31_42_31/0.1)]"
    >
      <div className="flex items-start gap-3">
        <Thumbnails order={o} />
        <div className="min-w-0 flex-1">
          <p className="truncate font-semibold">
            {names.join(", ")}
            {extra > 0 ? ` +${extra}` : ""}
          </p>
          <p className="truncate text-sm text-muted-foreground">
            {o.supplierNames.join(", ")}
          </p>
          <p className="mt-0.5 font-mono text-xs text-muted-foreground">
            {o.number} · {dateFormat.format(o.createdAt)}
          </p>
        </div>
        <ChevronRight
          className="mt-1 size-5 shrink-0 text-muted-foreground"
          aria-hidden
        />
      </div>

      {showProgress ? <OrderProgress status={o.status} /> : null}

      <div className="flex items-center justify-between gap-3 border-t border-border pt-3">
        <StatusBadge tone={ORDER_TONE[o.status]} label={o.statusLabel} />
        <p className="text-lg font-bold">{o.total}</p>
      </div>
    </Link>
  );
}

/** Up to three overlapping product photos, then "+N". */
function Thumbnails({ order: o }: { order: OrderSummary }) {
  const shown = o.previews.slice(0, 3);
  const more = o.itemCount - shown.length;
  return (
    <div className="flex shrink-0 -space-x-4">
      {shown.map((p) => (
        <span
          key={p.id}
          className="size-14 overflow-hidden rounded-2xl border-2 border-card bg-sprout-soft"
        >
          <ListingImage
            photo={p.photo ?? undefined}
            alt=""
            sizes="56px"
            className="size-full"
          />
        </span>
      ))}
      {more > 0 ? (
        <span className="flex size-14 items-center justify-center rounded-2xl border-2 border-card bg-muted text-sm font-semibold text-muted-foreground">
          +{more}
        </span>
      ) : null}
    </div>
  );
}
