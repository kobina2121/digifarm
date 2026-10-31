import type { Metadata } from "next";
import Link from "next/link";

import { listingFormOptions } from "@/modules/catalog";

import { requireStaff } from "../../guard";
import { NewListingForm } from "./new-listing-form";

export const metadata: Metadata = { title: "New listing" };

export default async function NewListingPage({
  searchParams,
}: PageProps<"/admin/listings/new">) {
  const actor = await requireStaff();
  const { supplier } = await searchParams;
  const options = await listingFormOptions(actor);
  const preselected = options.suppliers.find((s) => s.id === supplier)?.id;

  return (
    <div className="mx-auto grid w-full max-w-xl gap-6">
      <div>
        <Link
          href="/admin/listings"
          className="text-sm font-medium text-field-green underline-offset-4 hover:underline"
        >
          ← Listings
        </Link>
        <h1 className="mt-2 text-3xl font-bold">New listing</h1>
        <p className="mt-1 text-muted-foreground">
          Call the farmer first: the price and stock you enter here are what
          buyers see.
        </p>
      </div>
      {options.suppliers.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-border bg-card p-6 text-center">
          <p className="font-medium">No approved suppliers yet</p>
          <p className="mt-1 text-sm text-muted-foreground">
            A farm needs a recorded visit and approval before its produce can be
            listed.
          </p>
          <Link
            href="/admin/suppliers"
            className="mt-3 inline-block text-sm font-medium text-field-green underline-offset-4 hover:underline"
          >
            Go to suppliers
          </Link>
        </div>
      ) : (
        <NewListingForm options={options} supplierId={preselected} />
      )}
    </div>
  );
}
