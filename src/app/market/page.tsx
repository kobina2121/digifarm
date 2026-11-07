import { Search } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { connection } from "next/server";

import { ListingCard } from "@/components/market/listing-card";
import { TopBand } from "@/components/shell/top-band";
import { buttonVariants } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { isStaff } from "@/lib/authz";
import { getActor } from "@/lib/session";
import { cn } from "@/lib/utils";
import {
  type BrowseFilters,
  browseListings,
  listCategories,
} from "@/modules/catalog";

import { MarketFilters } from "./market-filters";

import { cardAction, cardSave, savedAmong } from "./card-action";
import { MarketEmpty } from "./market-empty";

export const metadata: Metadata = {
  title: "Market",
  description:
    "Fresh produce from farms Akuafo has visited and approved, delivered anywhere in Ghana.",
};

/** Filters as URL parameters, without the page cursor. */
function filterParams(
  f: BrowseFilters,
  overrides: Record<string, string | undefined> = {},
) {
  const values: Record<string, string | undefined> = {
    q: f.q,
    category: f.category,
    region: f.region,
    minPrice: f.minPrice,
    maxPrice: f.maxPrice,
    inStock: f.inStock ? "1" : undefined,
    sort: f.sort === "newest" ? undefined : f.sort,
    ...overrides,
  };
  const params = new URLSearchParams();
  for (const [k, v] of Object.entries(values)) if (v) params.set(k, v);
  return params;
}

/** The empty-market heading for a search or filter that found nothing. */
function noMatchesTitle(
  f: BrowseFilters,
  categories: { slug: string; name: string }[],
) {
  if (f.q) return `No results for “${f.q}”`;
  const category = categories.find((c) => c.slug === f.category);
  if (category) return `No ${category.name.toLowerCase()} right now`;
  return "Nothing matches these filters";
}

function href(params: URLSearchParams) {
  const s = params.toString();
  return s ? `/market?${s}` : "/market";
}

export default async function MarketPage({
  searchParams,
}: PageProps<"/market">) {
  // Availability depends on the current time, so this always renders per request.
  await connection();
  const actor = await getActor();
  const raw = await searchParams;
  const flat = Object.fromEntries(
    Object.entries(raw).map(([k, v]) => [k, Array.isArray(v) ? v[0] : v]),
  );
  const [{ filters, items, nextCursor }, categories] = await Promise.all([
    browseListings(flat),
    listCategories(),
  ]);
  const saved = await savedAmong(actor, items);
  const activeFilters = [
    filters.region,
    filters.minPrice,
    filters.maxPrice,
    filters.inStock || undefined,
    filters.sort === "newest" ? undefined : filters.sort,
  ].filter(Boolean).length;

  return (
    <div className="grid gap-5">
      <TopBand>
        <h1 className="text-3xl font-bold">Market</h1>
        <p className="mt-1 text-white/80">
          Produce from farms Akuafo has visited and approved.
        </p>
      </TopBand>

      <div className="flex gap-2">
        <form method="get" action="/market" role="search" className="flex-1">
          {[...filterParams(filters, { q: undefined })].map(([k, v]) => (
            <input key={k} type="hidden" name={k} value={v} />
          ))}
          <label htmlFor="market-search" className="sr-only">
            Search produce
          </label>
          <div className="relative">
            <Search
              className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground"
              aria-hidden
            />
            <Input
              id="market-search"
              name="q"
              type="search"
              defaultValue={filters.q}
              placeholder="Tomatoes, yam, maize…"
              enterKeyHint="search"
              className="h-11 bg-card pl-9 text-base md:text-sm"
            />
          </div>
        </form>
        <MarketFilters
          values={{
            q: filters.q ?? "",
            category: filters.category ?? "",
            region: filters.region ?? "",
            minPrice: filters.minPrice ?? "",
            maxPrice: filters.maxPrice ?? "",
            inStock: filters.inStock,
            sort: filters.sort,
          }}
          activeCount={activeFilters}
        />
      </div>

      <nav
        aria-label="Categories"
        className="-mx-4 [scrollbar-width:none] overflow-x-auto px-4 [&::-webkit-scrollbar]:hidden"
      >
        <ul className="flex gap-2">
          {[undefined, ...categories].map((c) => {
            const active = (c?.slug ?? undefined) === filters.category;
            return (
              <li key={c?.slug ?? "all"}>
                <Link
                  href={href(filterParams(filters, { category: c?.slug }))}
                  aria-current={active ? "page" : undefined}
                  className={cn(
                    "inline-flex h-9 items-center rounded-full border px-3.5 text-sm font-medium whitespace-nowrap",
                    active
                      ? "border-field-green bg-field-green text-white"
                      : "border-border bg-card text-soil",
                  )}
                >
                  {c?.name ?? "All produce"}
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>

      {items.length === 0 ? (
        <MarketEmpty
          viewer={!actor ? "visitor" : isStaff(actor) ? "staff" : "buyer"}
          searched={
            filterParams(filters).toString()
              ? { title: noMatchesTitle(filters, categories) }
              : undefined
          }
        />
      ) : (
        <section aria-labelledby="results" className="grid gap-4">
          <h2 id="results" className="text-xl font-semibold">
            {items.length}
            {nextCursor ? "+" : ""}{" "}
            {items.length === 1 && !nextCursor ? "result" : "results"} found
          </h2>
          <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
            {items.map((listing) => (
              <li key={listing.id}>
                <ListingCard
                  listing={listing}
                  action={cardAction(listing, actor)}
                  corner={cardSave(listing, actor, saved)}
                />
              </li>
            ))}
          </ul>
        </section>
      )}

      {nextCursor ? (
        <Link
          href={href(filterParams(filters, { cursor: nextCursor }))}
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
