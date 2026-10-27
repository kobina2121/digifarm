import { ArrowRight } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";

import {
  countSuppliersByStatus,
  VERIFICATION_LABELS,
} from "@/modules/suppliers";

import { requireStaff } from "./guard";

export const metadata: Metadata = { title: "Staff overview" };

export default async function AdminOverviewPage() {
  const actor = await requireStaff();
  const counts = await countSuppliersByStatus(actor);
  const awaiting = counts.VISITED;

  return (
    <div className="grid gap-6">
      <div>
        <p className="eyebrow text-field-green">
          {actor.platformRole === "ADMIN" ? "Admin" : "Operations"}
        </p>
        <h1 className="mt-1 text-3xl font-bold">Overview</h1>
      </div>

      <Link
        href="/admin/suppliers?status=VISITED"
        className="flex items-center justify-between gap-4 rounded-2xl bg-field-green p-5 text-white"
      >
        <span>
          <span className="block text-4xl font-bold">{awaiting}</span>
          <span className="text-white/85">
            {awaiting === 1 ? "farm is" : "farms are"} visited and waiting for
            an approval decision
          </span>
        </span>
        <ArrowRight className="size-6 shrink-0" aria-hidden />
      </Link>

      <section>
        <h2 className="text-lg font-bold">Suppliers by status</h2>
        <ul className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-5">
          {(
            Object.keys(
              VERIFICATION_LABELS,
            ) as (keyof typeof VERIFICATION_LABELS)[]
          ).map((status) => (
            <li key={status}>
              <Link
                href={`/admin/suppliers?status=${status}`}
                className="block rounded-2xl border border-border bg-card p-4 transition-colors hover:border-field-green"
              >
                <span className="block font-heading text-2xl font-bold">
                  {counts[status]}
                </span>
                <span className="text-sm text-muted-foreground">
                  {VERIFICATION_LABELS[status]}
                </span>
              </Link>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
