import { ChevronRight, Plus, Search } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";

import { ListingImage } from "@/components/market/listing-bits";
import {
  LISTING_STATUS_LABELS,
  LISTING_TONE,
  StatusBadge,
} from "@/components/status-badge";
import { buttonVariants } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import {
  listListingsForStaff,
  STAFF_LISTING_VIEWS,
  type StaffListingView,
} from "@/modules/catalog";

import { requireStaff } from "../guard";
import { formatStockAge } from "./format";

export const metadata: Metadata = { title: "Listings" };

const VIEW_LABELS: Record<StaffListingView, string> = {
  stale: "Not updated in 3 days",
  ACTIVE: "On sale",
  DRAFT: "Drafts",
  PAUSED: "Paused",
  ARCHIVED: "Archived",
};

export default async function ListingsPage({
  searchParams,
}: PageProps<"/admin/listings">) {
  const actor = await requireStaff();
  const params = await searchParams;
  const view = STAFF_LISTING_VIEWS.find((v) => v === params.view);
  const q =
    typeof params.q === "string" ? params.q.trim().slice(0, 80) : undefined;
  const cursor = typeof params.cursor === "string" ? params.cursor : undefined;
  const { items, nextCursor } = await listListingsForStaff(actor, {
    view,
    q: q || undefined,
    cursor,
  });
  const now = new Date();
  const link = (extra: Record<string, string | undefined>) => {
    const query = new URLSearchParams();
    for (const [k, v] of Object.entries({ view, q, ...extra }))
      if (v) query.set(k, v);
    const s = query.toString();
    return s ? `/admin/listings?${s}` : "/admin/listings";
  };

  return (
    <div className="grid gap-5">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-3xl font-bold">Listings</h1>
          <p className="mt-1 text-muted-foreground">
            Produce on sale for the farms Akuafo manages.
          </p>
        </div>
        <Link href="/admin/listings/new" className={buttonVariants()}>
          <Plus aria-hidden />
          New listing
        </Link>
      </div>

      <form method="get" action="/admin/listings" role="search">
        {view ? <input type="hidden" name="view" value={view} /> : null}
        <label htmlFor="listing-search" className="sr-only">
          Search listings
        </label>
        <div className="relative">
          <Search
            className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground"
            aria-hidden
          />
          <Input
            id="listing-search"
            name="q"
            type="search"
            defaultValue={q}
            placeholder="Product or farm"
            className="h-11 bg-card pl-9 text-base md:text-sm"
          />
        </div>
      </form>

      <nav aria-label="Filter listings" className="-mx-4 overflow-x-auto px-4">
        <ul className="flex gap-2">
          {[undefined, ...STAFF_LISTING_VIEWS].map((v) => (
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
                {v ? VIEW_LABELS[v] : "All"}
              </Link>
            </li>
          ))}
        </ul>
      </nav>

      {view === "stale" ? (
        <p className="rounded-lg bg-harvest-gold-soft px-3 py-2.5 text-sm text-soil">
          A reminder: these listings’ stock hasn’t been updated in 3 days.
          Buyers can still order them. Oldest update first.
        </p>
      ) : null}

      {items.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-border bg-card p-8 text-center">
          <p className="font-medium">
            {view === "stale"
              ? "Every listing’s stock was updated in the last 3 days"
              : "No listings here"}
          </p>
          <p className="mt-1 text-sm text-muted-foreground">
            Listings can be added for approved suppliers.
          </p>
        </div>
      ) : (
        <ul className="grid gap-2">
          {items.map((l) => (
            <li key={l.id}>
              <Link
                href={`/admin/listings/${l.id}`}
                className="flex items-center gap-3 rounded-2xl border border-border bg-card p-3 transition-colors hover:border-field-green"
              >
                <ListingImage
                  photo={l.photos[0]}
                  alt=""
                  sizes="56px"
                  className="size-14 shrink-0 rounded-xl"
                />
                <div className="min-w-0 flex-1">
                  <p className="truncate font-medium">
                    {l.productName}
                    {l.variety ? ` · ${l.variety}` : ""}
                  </p>
                  <p className="truncate text-sm text-muted-foreground">
                    {l.supplier.name} · {l.price} / {l.unit.name}
                  </p>
                  <p className="truncate text-xs text-muted-foreground">
                    {l.onHand} {l.onHand === "1" ? l.unit.name : l.unit.plural}{" "}
                    · {formatStockAge(l.stockConfirmedAt, now)}
                  </p>
                </div>
                <StatusBadge
                  tone={LISTING_TONE[l.status]}
                  label={LISTING_STATUS_LABELS[l.status]}
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
