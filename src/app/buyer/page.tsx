import {
  Apple,
  ArrowRight,
  Bean,
  Carrot,
  ChevronRight,
  Clock,
  Leaf,
  MapPin,
  PackageCheck,
  Search,
  ShoppingCart,
  Sprout,
  Wheat,
} from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { connection } from "next/server";
import type { ReactNode } from "react";

import { HarvestArt } from "@/components/home/harvest-art";
import { ListingTile } from "@/components/market/listing-tile";
import { ORDER_TONE, StatusBadge } from "@/components/status-badge";
import { cn } from "@/lib/utils";
import { getBuyerProfile, getMyAccount } from "@/modules/buyers";
import { browseListings, listCategories } from "@/modules/catalog";
import {
  getCart,
  listOrdersForBuyer,
  type OrderSummary,
} from "@/modules/ordering";

import { requireBuyer } from "./guard";
import { HoldCountdown } from "./orders/[id]/order-actions";

export const metadata: Metadata = { title: "Home" };

const CATEGORY_ICONS: Record<string, typeof Carrot> = {
  vegetables: Carrot,
  fruits: Apple,
  grains: Wheat,
  legumes: Bean,
  "roots-tubers": Sprout,
  "spices-herbs": Leaf,
};

const dateFormat = new Intl.DateTimeFormat("en-GB", {
  day: "numeric",
  month: "short",
  timeZone: "Africa/Accra",
});

/** Accra is on UTC all year, so the UTC hour is the local hour. */
function greeting(now: Date) {
  const hour = now.getUTCHours();
  if (hour < 12) return "Good morning";
  if (hour < 17) return "Good afternoon";
  return "Good evening";
}

export default async function BuyerHomePage() {
  // The greeting, stock and payment countdowns depend on the current time.
  await connection();
  const actor = await requireBuyer();
  const now = new Date();
  const [profile, account, cart, orders, categories] = await Promise.all([
    getBuyerProfile(actor),
    getMyAccount(actor),
    getCart(actor, now),
    listOrdersForBuyer(actor),
    listCategories(),
  ]);
  const address = profile.addresses[0];
  const zone = address?.zone;
  const { items: inStock } = await browseListings(
    { zone: zone?.code, inStock: "1" },
    now,
  );
  const firstName = account.name.split(/\s+/)[0];
  const business = profile.tradingName ?? profile.legalName;
  const marketHref = zone
    ? `/market?zone=${zone.code}&inStock=1`
    : "/market?inStock=1";

  return (
    <div className="mx-auto grid w-full max-w-3xl grid-cols-[minmax(0,1fr)] gap-7">
      {/* Greeting */}
      <header className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <p className="text-muted-foreground">{greeting(now)},</p>
          <h1 className="truncate text-3xl font-bold">{firstName}</h1>
          <Link
            href="/buyer/addresses"
            className="mt-1 inline-flex max-w-full items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"
          >
            <MapPin className="size-4 shrink-0 text-field-green" aria-hidden />
            <span className="truncate">
              {address
                ? `Delivering to ${[address.town, zone?.name].filter(Boolean).join(", ")}`
                : "Add a delivery address"}
            </span>
            <ChevronRight className="size-4 shrink-0" aria-hidden />
          </Link>
        </div>
        <Link
          href="/buyer/profile"
          aria-label={`Profile: ${business}`}
          className="flex size-12 shrink-0 items-center justify-center rounded-full bg-field-green text-lg font-bold text-white"
        >
          {firstName.slice(0, 1).toUpperCase()}
        </Link>
      </header>

      {/* Search */}
      <form method="get" action="/market" role="search">
        {zone ? <input type="hidden" name="zone" value={zone.code} /> : null}
        <label htmlFor="home-search" className="sr-only">
          Search produce
        </label>
        <div className="relative">
          <Search
            className="pointer-events-none absolute top-1/2 left-5 size-5 -translate-y-1/2 text-muted-foreground"
            aria-hidden
          />
          <input
            id="home-search"
            name="q"
            type="search"
            enterKeyHint="search"
            placeholder="Search tomatoes, yam, maize…"
            className="h-14 w-full rounded-full border border-border bg-card pr-5 pl-13 text-base shadow-sm outline-none placeholder:text-muted-foreground focus-visible:border-field-green focus-visible:ring-3 focus-visible:ring-field-green/25"
          />
        </div>
      </form>

      <AttentionCard
        orders={orders.items}
        cartLines={cart.lineCount}
        cartTotal={cart.total}
        now={now}
      />

      {/* Hero */}
      <section className="relative overflow-hidden rounded-3xl bg-field-green text-white">
        <div className="relative z-10 grid max-w-[66%] gap-3 p-6 sm:max-w-[55%] sm:p-8">
          <p className="eyebrow text-white/75">
            {zone ? zone.name : "Farm to buyer · Ghana"}
          </p>
          <h2 className="text-2xl leading-tight font-bold sm:text-3xl">
            Fresh from farms we’ve visited
          </h2>
          <p className="text-sm text-white/80">
            Every farm is checked in person and its produce graded A, B or C.
          </p>
          <Link
            href={marketHref}
            className="mt-1 inline-flex h-11 w-fit items-center gap-2 rounded-full bg-white px-5 text-sm font-semibold text-[#11502d] transition-transform hover:scale-[1.02]"
          >
            Shop now
            <ArrowRight className="size-4" aria-hidden />
          </Link>
        </div>
        <HarvestArt className="pointer-events-none absolute right-0 bottom-0 h-auto w-[46%] max-w-80" />
      </section>

      {/* Categories */}
      <section aria-labelledby="home-categories" className="grid gap-3">
        <SectionHeading
          id="home-categories"
          title="Shop by category"
          href="/market"
          linkLabel="All produce"
        />
        <ul className="grid grid-cols-3 gap-3 sm:grid-cols-6">
          {categories.map((c) => {
            const Icon = CATEGORY_ICONS[c.slug] ?? Sprout;
            return (
              <li key={c.slug}>
                <Link
                  href={`/market?category=${c.slug}${zone ? `&zone=${zone.code}` : ""}`}
                  className="group flex h-full flex-col items-center gap-2 rounded-2xl bg-card p-3 text-center transition-colors hover:bg-sprout-soft"
                >
                  <span className="flex size-12 items-center justify-center rounded-full bg-sprout-soft text-field-green-dark transition-colors group-hover:bg-card">
                    <Icon className="size-6" aria-hidden />
                  </span>
                  <span className="text-xs leading-tight font-medium">
                    {c.name}
                  </span>
                </Link>
              </li>
            );
          })}
        </ul>
      </section>

      {/* In stock near you */}
      <section
        aria-labelledby="home-in-stock"
        className="grid grid-cols-[minmax(0,1fr)] gap-3"
      >
        <SectionHeading
          id="home-in-stock"
          title={zone ? `In stock in ${zone.name}` : "In stock now"}
          href={marketHref}
          linkLabel="See all"
        />
        {inStock.length ? (
          <ul className="-mx-4 flex snap-x snap-mandatory [scrollbar-width:none] gap-4 overflow-x-auto px-4 pb-1 md:-mx-8 md:px-8 [&::-webkit-scrollbar]:hidden">
            {inStock.slice(0, 10).map((listing) => (
              <li
                key={listing.id}
                className="w-[44%] shrink-0 snap-start sm:w-[30%] lg:w-[23%]"
              >
                <ListingTile listing={listing} />
              </li>
            ))}
          </ul>
        ) : (
          <div className="flex items-center gap-4 rounded-3xl bg-card p-5">
            <span className="flex size-12 shrink-0 items-center justify-center rounded-full bg-sprout-soft text-field-green-dark">
              <Sprout className="size-6" aria-hidden />
            </span>
            <div className="min-w-0 text-sm">
              <p className="font-semibold">
                Nothing in stock in {zone?.name ?? "your area"} today
              </p>
              <p className="text-muted-foreground">
                New harvests are added every week.{" "}
                <Link
                  href="/market"
                  className="font-semibold text-field-green-dark underline-offset-4 hover:underline"
                >
                  Browse all produce
                </Link>
              </p>
            </div>
          </div>
        )}
      </section>

      {/* Recent orders */}
      {orders.items.length ? (
        <section aria-labelledby="home-orders" className="grid gap-3">
          <SectionHeading
            id="home-orders"
            title="Recent orders"
            href="/buyer/orders"
            linkLabel="See all"
          />
          <ul className="divide-y divide-border overflow-hidden rounded-3xl bg-card">
            {orders.items.slice(0, 3).map((o) => (
              <li key={o.id}>
                <Link
                  href={`/buyer/orders/${o.id}`}
                  className="flex items-center gap-3 px-4 py-3.5 transition-colors hover:bg-muted"
                >
                  <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-sprout-soft text-field-green-dark">
                    <PackageCheck className="size-5" aria-hidden />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block font-mono text-sm font-semibold">
                      {o.number}
                    </span>
                    <span className="block truncate text-sm text-muted-foreground">
                      {dateFormat.format(o.createdAt)} · {o.total}
                    </span>
                  </span>
                  <StatusBadge
                    tone={ORDER_TONE[o.status]}
                    label={o.statusLabel}
                  />
                </Link>
              </li>
            ))}
          </ul>
        </section>
      ) : null}
    </div>
  );
}

function SectionHeading({
  id,
  title,
  href,
  linkLabel,
}: {
  id: string;
  title: string;
  href: string;
  linkLabel: string;
}) {
  return (
    <div className="flex items-baseline justify-between gap-3">
      <h2 id={id} className="text-xl font-bold">
        {title}
      </h2>
      <Link
        href={href}
        className="shrink-0 text-sm font-semibold text-field-green-dark underline-offset-4 hover:underline"
      >
        {linkLabel}
      </Link>
    </div>
  );
}

/**
 * The one thing that most needs the buyer right now: an order waiting for
 * payment, then a cart waiting for checkout, then the latest confirmed order.
 */
function AttentionCard({
  orders,
  cartLines,
  cartTotal,
  now,
}: {
  orders: OrderSummary[];
  cartLines: number;
  cartTotal: string;
  now: Date;
}) {
  const unpaid = orders.find(
    (o) => o.status === "PENDING_PAYMENT" && o.holdExpiresAt > now,
  );
  if (unpaid) {
    return (
      <Attention
        href={`/buyer/orders/${unpaid.id}`}
        tone="gold"
        icon={<Clock />}
        title={`Pay for ${unpaid.number}`}
        text={
          <>
            {unpaid.total} · held for you for{" "}
            <HoldCountdown expiresAt={unpaid.holdExpiresAt.toISOString()} />
          </>
        }
        cta="Pay now"
      />
    );
  }
  if (cartLines) {
    return (
      <Attention
        href="/buyer/cart"
        tone="green"
        icon={<ShoppingCart />}
        title="Ready to check out"
        text={`${cartLines} ${cartLines === 1 ? "product" : "products"} · ${cartTotal.replace(" ", "\u00a0")}`}
        cta="Checkout"
      />
    );
  }
  const latest = orders[0];
  if (latest && latest.status === "PAID") {
    return (
      <Attention
        href={`/buyer/orders/${latest.id}`}
        tone="green"
        icon={<PackageCheck />}
        title={`${latest.number} is confirmed`}
        text={`${latest.total} · ${latest.supplierNames.join(", ")}`}
        cta="View"
      />
    );
  }
  return null;
}

function Attention({
  href,
  tone,
  icon,
  title,
  text,
  cta,
}: {
  href: string;
  tone: "gold" | "green";
  icon: ReactNode;
  title: string;
  text: ReactNode;
  cta: string;
}) {
  return (
    <Link
      href={href}
      className={cn(
        "flex items-center gap-3 rounded-3xl p-4 transition-colors",
        tone === "gold"
          ? "bg-harvest-gold-soft hover:bg-harvest-gold-soft/80"
          : "bg-sprout-soft hover:bg-sprout-soft/80",
      )}
    >
      <span
        className={cn(
          "flex size-11 shrink-0 items-center justify-center rounded-full [&_svg]:size-5",
          tone === "gold"
            ? "bg-harvest-gold text-ink"
            : "bg-field-green text-white",
        )}
      >
        {icon}
      </span>
      <span className="min-w-0 flex-1">
        <span className="block font-semibold">{title}</span>
        <span className="block text-sm text-muted-foreground">{text}</span>
      </span>
      <span className="inline-flex h-9 shrink-0 items-center rounded-full bg-card px-4 text-sm font-semibold shadow-sm">
        {cta}
      </span>
    </Link>
  );
}
