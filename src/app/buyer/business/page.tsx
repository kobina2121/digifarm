import type { Metadata } from "next";

import { can } from "@/lib/authz";
import { type BusinessDetailsInput, getBuyerProfile } from "@/modules/buyers";

import { requireBuyer } from "../guard";
import { BusinessForm } from "./business-form";
import { BandTitleBar, TopBand } from "@/components/shell/top-band";

export const metadata: Metadata = { title: "Business details" };

export default async function BusinessDetailsPage() {
  const actor = await requireBuyer();
  const profile = await getBuyerProfile(actor);
  const isBusiness = profile.buyerKind === "BUSINESS";

  return (
    <div className="mx-auto grid w-full max-w-xl gap-6">
      <TopBand className="grid gap-4 pt-2">
        <BandTitleBar
          back={{ href: "/buyer/profile", label: "Back to your profile" }}
          title={isBusiness ? "Business details" : "Business"}
        />
        <p className="text-white/80">
          {isBusiness
            ? "How your business appears on orders and invoices."
            : "Add your business details and your orders will be in its name. Your cart, orders and addresses stay as they are."}
        </p>
      </TopBand>

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
