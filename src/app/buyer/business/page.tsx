import type { Metadata } from "next";
import Link from "next/link";

import { can } from "@/lib/authz";
import { type BusinessDetailsInput, getBuyerProfile } from "@/modules/buyers";

import { requireBuyer } from "../guard";
import { BusinessForm } from "./business-form";

export const metadata: Metadata = { title: "Business details" };

export default async function BusinessDetailsPage() {
  const actor = await requireBuyer();
  const profile = await getBuyerProfile(actor);
  const isBusiness = profile.buyerKind === "BUSINESS";

  return (
    <div className="mx-auto grid w-full max-w-xl gap-6">
      <div>
        <Link
          href="/buyer/profile"
          className="text-sm font-medium text-field-green-dark underline-offset-4 hover:underline"
        >
          ← Profile
        </Link>
        <h1 className="mt-2 text-3xl font-bold">
          {isBusiness ? "Business details" : "Buying for a business?"}
        </h1>
        <p className="mt-1 text-muted-foreground">
          {isBusiness
            ? "How your business appears on orders and invoices."
            : "Add your business details and your orders will be in its name. Your cart, orders and addresses stay as they are."}
        </p>
      </div>

      {can(actor, "buyer.profile.update") ? (
        <section className="rounded-3xl bg-card p-5">
          <BusinessForm
            isBusiness={isBusiness}
            defaults={{
              legalName: isBusiness ? profile.legalName : "",
              tradingName: profile.tradingName ?? "",
              // Empty until chosen; the form asks for it.
              buyerSegment: (profile.buyerSegment ??
                "") as BusinessDetailsInput["buyerSegment"],
            }}
          />
        </section>
      ) : (
        <p className="rounded-3xl bg-muted p-5 text-sm text-muted-foreground">
          Only the account owner or a manager can change these details.
        </p>
      )}
    </div>
  );
}
