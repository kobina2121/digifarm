import type { Metadata } from "next";
import Link from "next/link";

import { requireStaff } from "../../guard";
import { NewSupplierForm } from "./new-supplier-form";

export const metadata: Metadata = { title: "Add supplier" };

export default async function NewSupplierPage() {
  await requireStaff();
  return (
    <div className="grid max-w-xl gap-6">
      <div>
        <Link
          href="/admin/suppliers"
          className="text-sm font-medium text-field-green underline-offset-4 hover:underline"
        >
          ← Suppliers
        </Link>
        <h1 className="mt-2 text-3xl font-bold">Add a supplier</h1>
        <p className="mt-1 text-muted-foreground">
          Create the farm’s profile after first contact. It stays unapproved
          until a visit is recorded and a second staff member approves it.
        </p>
      </div>
      <NewSupplierForm />
    </div>
  );
}
