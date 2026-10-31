import { ExternalLink, Phone } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";

import {
  AvailabilityBadge,
  GradeBadge,
} from "@/components/market/listing-bits";
import {
  LISTING_STATUS_LABELS,
  LISTING_TONE,
  StatusBadge,
} from "@/components/status-badge";
import { formatGhanaPhone } from "@/lib/ghana";
import { orNotFound } from "@/lib/not-found";
import { getListingForStaff, MAX_PHOTOS_PER_LISTING } from "@/modules/catalog";

import { requireStaff } from "../../guard";
import { formatStockAge } from "../format";
import { ConfirmStockForm } from "./confirm-stock-form";
import { EditListingForm } from "./edit-listing-form";
import { PhotoManager } from "./photo-manager";
import { StatusPanel } from "./status-panel";

export const metadata: Metadata = { title: "Listing" };

const dateTime = new Intl.DateTimeFormat("en-GB", {
  day: "numeric",
  month: "short",
  hour: "2-digit",
  minute: "2-digit",
});

const MOVEMENT_LABELS = {
  ADJUST: "Stock updated",
  RESERVE: "Held for an order",
  RELEASE: "Hold released",
  COMMIT: "Sold",
  RETURN: "Returned",
} as const;

export default async function ListingPage({
  params,
}: PageProps<"/admin/listings/[id]">) {
  const actor = await requireStaff();
  const { id } = await params;
  const listing = await orNotFound(getListingForStaff(actor, id));
  const now = new Date();
  const archived = listing.status === "ARCHIVED";
  const plural = (qty: string) =>
    qty === "1" ? listing.unit.name : listing.unit.plural;

  return (
    <div className="grid gap-6">
      <div>
        <Link
          href="/admin/listings"
          className="text-sm font-medium text-field-green underline-offset-4 hover:underline"
        >
          ← Listings
        </Link>
        <div className="mt-2 flex flex-wrap items-center gap-2">
          <h1 className="text-3xl font-bold">
            {listing.productName}
            {listing.variety ? (
              <span className="font-normal text-muted-foreground">
                {" "}
                · {listing.variety}
              </span>
            ) : null}
          </h1>
        </div>
        <div className="mt-2 flex flex-wrap items-center gap-2">
          <StatusBadge
            tone={LISTING_TONE[listing.status]}
            label={LISTING_STATUS_LABELS[listing.status]}
          />
          {listing.status === "ACTIVE" ? (
            <AvailabilityBadge availability={listing.availability} />
          ) : null}
          <GradeBadge grade={listing.grade} />
        </div>
        <p className="mt-2 text-muted-foreground">
          <Link
            href={`/admin/suppliers/${listing.supplier.id}`}
            className="font-medium text-soil underline-offset-4 hover:underline"
          >
            {listing.supplier.name}
          </Link>{" "}
          · {listing.price} / {listing.unit.name} · min. {listing.minOrderLabel}{" "}
          · {listing.zone.name}
        </p>
        {listing.statusReason && listing.status !== "ACTIVE" ? (
          <p className="mt-1 text-sm text-muted-foreground">
            Reason: “{listing.statusReason}”
          </p>
        ) : null}
        {listing.status === "ACTIVE" ? (
          <Link
            href={`/market/listings/${listing.id}`}
            className="mt-2 inline-flex items-center gap-1 text-sm font-medium text-field-green underline-offset-4 hover:underline"
          >
            See it as buyers do
            <ExternalLink className="size-3.5" aria-hidden />
          </Link>
        ) : null}
      </div>

      {!archived ? (
        <section className="grid gap-4 rounded-2xl border border-border bg-card p-5">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <h2 className="text-lg font-bold">Stock</h2>
              <p className="text-sm text-muted-foreground">
                {listing.onHand} {plural(listing.onHand)} in stock
                {listing.reserved !== "0"
                  ? ` (${listing.reserved} held for orders)`
                  : ""}{" "}
                · {formatStockAge(listing.stockConfirmedAt, now)}
                {listing.stockConfirmedBy
                  ? ` by ${listing.stockConfirmedBy}`
                  : ""}
              </p>
            </div>
            <a
              href={`tel:${listing.supplierPhone}`}
              className="inline-flex h-11 items-center gap-2 rounded-lg border border-border px-4 font-medium hover:border-field-green"
            >
              <Phone className="size-4 text-field-green" aria-hidden />
              {formatGhanaPhone(listing.supplierPhone)}
            </a>
          </div>
          <ConfirmStockForm
            listingId={listing.id}
            onHand={listing.onHand}
            unitPlural={listing.unit.plural}
          />
        </section>
      ) : null}

      <StatusPanel listingId={listing.id} allowed={listing.allowedActions} />

      <section className="grid gap-3 rounded-2xl border border-border bg-card p-5">
        <div>
          <h2 className="text-lg font-bold">Photos</h2>
          <p className="text-sm text-muted-foreground">
            Clear photos of the actual produce. Up to {MAX_PHOTOS_PER_LISTING};
            the first one is shown in the market.
          </p>
        </div>
        <PhotoManager
          listingId={listing.id}
          photos={listing.photoItems}
          canAdd={!archived}
        />
      </section>

      {!archived ? (
        <section className="rounded-2xl border border-border bg-card p-5">
          <h2 className="text-lg font-bold">Details</h2>
          <p className="text-sm text-muted-foreground">
            Changes are visible to buyers straight away and are logged.
          </p>
          <div className="mt-4">
            <EditListingForm
              listingId={listing.id}
              defaults={listing.form}
              unit={listing.unit}
            />
          </div>
        </section>
      ) : null}

      <section className="grid gap-3">
        <h2 className="text-xl font-bold">Stock history</h2>
        {listing.movements.length === 0 ? (
          <p className="rounded-2xl border border-dashed border-border bg-card p-5 text-sm text-muted-foreground">
            No stock changes yet.
          </p>
        ) : (
          <ol className="grid gap-2">
            {listing.movements.map((m) => (
              <li
                key={m.id}
                className="flex items-start justify-between gap-3 rounded-2xl border border-border bg-card p-4"
              >
                <div className="min-w-0">
                  <p className="font-medium">{MOVEMENT_LABELS[m.type]}</p>
                  <p className="text-sm text-muted-foreground">
                    {dateTime.format(m.createdAt)} · {m.by}
                    {m.reason ? ` · ${m.reason}` : ""}
                  </p>
                </div>
                <p className="shrink-0 text-right">
                  <span
                    className={
                      m.quantity.startsWith("-")
                        ? "font-semibold text-destructive"
                        : "font-semibold text-field-green"
                    }
                  >
                    {m.quantity.startsWith("-") ? m.quantity : `+${m.quantity}`}
                  </span>
                  <span className="block text-xs text-muted-foreground">
                    {m.onHandAfter} left
                  </span>
                </p>
              </li>
            ))}
          </ol>
        )}
        <p className="text-sm text-muted-foreground">
          Listed by {listing.createdBy} on {dateTime.format(listing.createdAt)}.
        </p>
      </section>
    </div>
  );
}
