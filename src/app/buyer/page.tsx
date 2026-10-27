import { MapPin, Phone, ShoppingBasket } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";

import { formatGhanaPhone } from "@/lib/ghana";
import { BUYER_SEGMENTS, getBuyerProfile } from "@/modules/buyers";

import { requireBuyer } from "./guard";

export const metadata: Metadata = { title: "Home" };

export default async function BuyerHomePage() {
  const actor = await requireBuyer();
  const profile = await getBuyerProfile(actor);
  const defaultAddress = profile.addresses[0];

  return (
    <div className="grid gap-6">
      <div>
        <p className="eyebrow text-field-green">
          {BUYER_SEGMENTS[profile.buyerSegment ?? "OTHER"]}
        </p>
        <h1 className="mt-1 text-3xl font-bold">
          {profile.tradingName ?? profile.legalName}
        </h1>
      </div>

      <section className="rounded-2xl border border-border bg-card p-5">
        <div className="flex items-start gap-3">
          <ShoppingBasket
            className="mt-0.5 size-5 shrink-0 text-field-green"
            aria-hidden
          />
          <div>
            <h2 className="text-lg font-bold">Ordering opens soon</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              We’re adding produce from approved farms. Once listings are live
              you’ll browse, compare and order here.
            </p>
          </div>
        </div>
      </section>

      <section className="grid gap-3 sm:grid-cols-2">
        <div className="rounded-2xl border border-border bg-card p-5">
          <h2 className="eyebrow text-muted-foreground">Business phone</h2>
          <p className="mt-2 flex items-center gap-2 font-medium">
            <Phone className="size-4 text-field-green" aria-hidden />
            {formatGhanaPhone(profile.phone)}
          </p>
        </div>
        {defaultAddress ? (
          <Link
            href="/buyer/addresses"
            className="rounded-2xl border border-border bg-card p-5 transition-colors hover:border-field-green"
          >
            <h2 className="eyebrow text-muted-foreground">
              Default delivery address
            </h2>
            <p className="mt-2 flex items-start gap-2 font-medium">
              <MapPin
                className="mt-0.5 size-4 shrink-0 text-field-green"
                aria-hidden
              />
              <span>
                {defaultAddress.label}
                <span className="block text-sm font-normal text-muted-foreground">
                  {defaultAddress.town}, {defaultAddress.zone?.name}
                </span>
              </span>
            </p>
          </Link>
        ) : null}
      </section>
    </div>
  );
}
