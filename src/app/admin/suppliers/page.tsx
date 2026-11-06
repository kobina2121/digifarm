import { ChevronRight, Plus } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";

import { StatusBadge, VERIFICATION_TONE } from "@/components/status-badge";
import { buttonVariants } from "@/components/ui/button";
import type { VerificationStatus } from "@/generated/prisma/enums";
import { GHANA_REGIONS } from "@/lib/ghana";
import { cn } from "@/lib/utils";
import {
  listSuppliers,
  SUPPLIER_KINDS,
  VERIFICATION_LABELS,
} from "@/modules/suppliers";

import { requireStaff } from "../guard";

export const metadata: Metadata = { title: "Suppliers" };

const FILTERS = [
  undefined,
  ...(Object.keys(VERIFICATION_LABELS) as VerificationStatus[]),
];

export default async function SuppliersPage({
  searchParams,
}: PageProps<"/admin/suppliers">) {
  const actor = await requireStaff();
  const params = await searchParams;
  const status = FILTERS.find((s) => s && s === params.status);
  const cursor = typeof params.cursor === "string" ? params.cursor : undefined;
  const { items, nextCursor } = await listSuppliers(actor, { status, cursor });

  return (
    <div className="grid gap-5">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-3xl font-bold">Suppliers</h1>
          <p className="mt-1 text-muted-foreground">
            Farms Akuafo manages, from first contact to approval.
          </p>
        </div>
        <Link href="/admin/suppliers/new" className={buttonVariants()}>
          <Plus aria-hidden />
          Add supplier
        </Link>
      </div>

      <nav aria-label="Filter by status" className="-mx-4 overflow-x-auto px-4">
        <ul className="flex gap-2">
          {FILTERS.map((s) => (
            <li key={s ?? "all"}>
              <Link
                href={s ? `/admin/suppliers?status=${s}` : "/admin/suppliers"}
                aria-current={s === status ? "page" : undefined}
                className={cn(
                  "inline-flex h-9 items-center rounded-full border px-3.5 text-sm font-medium whitespace-nowrap",
                  s === status
                    ? "border-field-green bg-field-green text-white"
                    : "border-border bg-card text-soil",
                )}
              >
                {s ? VERIFICATION_LABELS[s] : "All"}
              </Link>
            </li>
          ))}
        </ul>
      </nav>

      {items.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-border bg-card p-8 text-center">
          <p className="font-medium">No suppliers here yet</p>
          <p className="mt-1 text-sm text-muted-foreground">
            Add a farm after first contact, then record a visit to start
            verification.
          </p>
        </div>
      ) : (
        <ul className="grid gap-2">
          {items.map((s) => (
            <li key={s.id}>
              <Link
                href={`/admin/suppliers/${s.id}`}
                className="flex items-center gap-3 rounded-2xl border border-border bg-card p-4 transition-colors hover:border-field-green"
              >
                <div className="min-w-0 flex-1">
                  <p className="truncate font-medium">
                    {s.tradingName ?? s.legalName}
                  </p>
                  <p className="truncate text-sm text-muted-foreground">
                    {s.supplierKind
                      ? SUPPLIER_KINDS[s.supplierKind]
                      : "Supplier"}{" "}
                    · {GHANA_REGIONS[s.region]}
                  </p>
                </div>
                {s.verification ? (
                  <StatusBadge
                    tone={VERIFICATION_TONE[s.verification.status]}
                    label={VERIFICATION_LABELS[s.verification.status]}
                  />
                ) : null}
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
          href={`/admin/suppliers?${new URLSearchParams({ ...(status ? { status } : {}), cursor: nextCursor })}`}
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
