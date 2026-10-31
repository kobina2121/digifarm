import { MapPin, Phone, Plus } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";

import {
  LISTING_STATUS_LABELS,
  LISTING_TONE,
  StatusBadge,
  VERIFICATION_TONE,
} from "@/components/status-badge";
import { buttonVariants } from "@/components/ui/button";
import { formatGhanaPhone, GHANA_REGIONS } from "@/lib/ghana";
import { listListingsForStaff } from "@/modules/catalog";
import {
  getSupplier,
  SUPPLIER_KINDS,
  VERIFICATION_LABELS,
} from "@/modules/suppliers";

import { requireStaff } from "../../guard";
import { DecisionPanel } from "./decision-panel";
import { VisitForm } from "./visit-form";

export const metadata: Metadata = { title: "Supplier" };

const dateFormat = new Intl.DateTimeFormat("en-GB", {
  day: "numeric",
  month: "short",
  year: "numeric",
});

export default async function SupplierPage({
  params,
}: PageProps<"/admin/suppliers/[id]">) {
  const actor = await requireStaff();
  const { id } = await params;
  const [supplier, listings] = await Promise.all([
    getSupplier(actor, id),
    listListingsForStaff(actor, { supplierId: id }),
  ]);
  const { verification } = supplier;
  const farm = supplier.addresses[0];

  return (
    <div className="grid gap-6">
      <div>
        <Link
          href="/admin/suppliers"
          className="text-sm font-medium text-field-green underline-offset-4 hover:underline"
        >
          ← Suppliers
        </Link>
        <div className="mt-2 flex flex-wrap items-center gap-3">
          <h1 className="text-3xl font-bold">
            {supplier.tradingName ?? supplier.legalName}
          </h1>
          <StatusBadge
            tone={VERIFICATION_TONE[verification.status]}
            label={VERIFICATION_LABELS[verification.status]}
          />
        </div>
        <p className="mt-1 text-muted-foreground">
          {supplier.supplierKind
            ? SUPPLIER_KINDS[supplier.supplierKind]
            : "Supplier"}{" "}
          · Added {dateFormat.format(supplier.createdAt)}
          {supplier.createdBy ? ` by ${supplier.createdBy.name}` : ""}
        </p>
      </div>

      <section className="grid gap-3 sm:grid-cols-2">
        <a
          href={`tel:${supplier.phone}`}
          className="rounded-2xl border border-border bg-card p-4 hover:border-field-green"
        >
          <span className="eyebrow text-muted-foreground">Call the farm</span>
          <span className="mt-2 flex items-center gap-2 font-medium">
            <Phone className="size-4 text-field-green" aria-hidden />
            {formatGhanaPhone(supplier.phone)}
          </span>
        </a>
        <div className="rounded-2xl border border-border bg-card p-4">
          <span className="eyebrow text-muted-foreground">Location</span>
          <span className="mt-2 flex items-start gap-2 font-medium">
            <MapPin
              className="mt-0.5 size-4 shrink-0 text-field-green"
              aria-hidden
            />
            <span>
              {[farm?.town, supplier.district, GHANA_REGIONS[supplier.region]]
                .filter(Boolean)
                .join(", ")}
              {farm?.landmark ? (
                <span className="block text-sm font-normal text-muted-foreground">
                  {farm.landmark}
                </span>
              ) : null}
              {farm?.digitalAddress ? (
                <span className="block font-mono text-xs font-normal text-muted-foreground">
                  {farm.digitalAddress}
                </span>
              ) : null}
            </span>
          </span>
        </div>
      </section>

      <DecisionPanel
        supplierId={supplier.id}
        allowed={supplier.allowedDecisions}
        actorIsVisitor={supplier.actorIsVisitor}
        lastDecision={
          verification.decidedAt
            ? {
                by: verification.decidedBy?.name ?? "Unknown",
                at: dateFormat.format(verification.decidedAt),
                notes: verification.decisionNotes,
              }
            : null
        }
      />

      <section className="grid gap-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="text-xl font-bold">Listings</h2>
          {verification.status === "APPROVED" ? (
            <Link
              href={`/admin/listings/new?supplier=${supplier.id}`}
              className={buttonVariants({ size: "sm" })}
            >
              <Plus aria-hidden />
              New listing
            </Link>
          ) : null}
        </div>
        {listings.items.length === 0 ? (
          <p className="rounded-2xl border border-dashed border-border bg-card p-5 text-sm text-muted-foreground">
            {verification.status === "APPROVED"
              ? "Nothing listed yet. Call the farm to check what they have."
              : "Produce can be listed once this supplier is approved."}
          </p>
        ) : (
          <ul className="grid gap-2">
            {listings.items.map((l) => (
              <li key={l.id}>
                <Link
                  href={`/admin/listings/${l.id}`}
                  className="flex items-center justify-between gap-3 rounded-2xl border border-border bg-card p-4 hover:border-field-green"
                >
                  <span className="min-w-0">
                    <span className="block truncate font-medium">
                      {l.productName}
                      {l.variety ? ` · ${l.variety}` : ""}
                    </span>
                    <span className="text-sm text-muted-foreground">
                      {l.price} / {l.unit.name}
                    </span>
                  </span>
                  <StatusBadge
                    tone={LISTING_TONE[l.status]}
                    label={LISTING_STATUS_LABELS[l.status]}
                  />
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="grid gap-3">
        <h2 className="text-xl font-bold">Farm visits</h2>
        {verification.visits.length === 0 ? (
          <p className="rounded-2xl border border-dashed border-border bg-card p-5 text-sm text-muted-foreground">
            No visits yet. Record one below after visiting the farm.
          </p>
        ) : (
          <ol className="grid gap-3">
            {verification.visits.map((visit) => (
              <li
                key={visit.id}
                className="rounded-2xl border border-border bg-card p-4"
              >
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <p className="font-medium">
                    {dateFormat.format(visit.visitedAt)} ·{" "}
                    {visit.visitedBy.name}
                  </p>
                  {visit.recommendedGrade ? (
                    <span className="rounded-full bg-secondary px-2.5 py-1 text-xs font-medium">
                      Grade {visit.recommendedGrade} suggested
                    </span>
                  ) : null}
                </div>
                <p className="mt-2 text-sm">{visit.produceObserved}</p>
                {visit.notes ? (
                  <p className="mt-1 text-sm text-muted-foreground">
                    {visit.notes}
                  </p>
                ) : null}
                {visit.latitude && visit.longitude ? (
                  <p className="mt-1 font-mono text-xs text-muted-foreground">
                    GPS {visit.latitude.toFixed(5)},{" "}
                    {visit.longitude.toFixed(5)}
                  </p>
                ) : null}
                {visit.photos.length ? (
                  <ul className="mt-3 grid grid-cols-3 gap-2 sm:grid-cols-6">
                    {visit.photos.map((photo, i) => (
                      <li key={photo.id}>
                        <a
                          href={`/api/files/farm-visit-photos/${photo.id}`}
                          target="_blank"
                          rel="noreferrer"
                        >
                          {/* Private, authorized images: served by our route, not the image optimizer. */}
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img
                            src={`/api/files/farm-visit-photos/${photo.id}`}
                            alt={`Farm visit photo ${i + 1}`}
                            loading="lazy"
                            className="aspect-square w-full rounded-lg object-cover"
                          />
                        </a>
                      </li>
                    ))}
                  </ul>
                ) : null}
              </li>
            ))}
          </ol>
        )}
      </section>

      <section className="rounded-2xl border border-border bg-card p-5">
        <h2 className="text-lg font-bold">Record a visit</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Take photos of the fields and stored produce while you’re there.
        </p>
        <div className="mt-4">
          <VisitForm supplierId={supplier.id} />
        </div>
      </section>
    </div>
  );
}
