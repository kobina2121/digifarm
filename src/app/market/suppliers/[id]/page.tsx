import { BadgeCheck, MapPin } from "lucide-react";
import type { Metadata } from "next";
import { connection } from "next/server";

import { ListingCard } from "@/components/market/listing-card";
import { GHANA_REGIONS } from "@/lib/ghana";
import { orNotFound } from "@/lib/not-found";
import { getActor } from "@/lib/session";
import { getMarketSupplier } from "@/modules/catalog";
import { SUPPLIER_KINDS } from "@/modules/suppliers";

import { cardAction, cardSave, savedAmong } from "../../card-action";
import { BandTitleBar, TopBand } from "@/components/shell/top-band";

export const metadata: Metadata = { title: "Farm" };

const monthFormat = new Intl.DateTimeFormat("en-GB", {
  month: "long",
  year: "numeric",
});

export default async function MarketSupplierPage({
  params,
}: PageProps<"/market/suppliers/[id]">) {
  // Availability depends on the current time, so this always renders per request.
  await connection();
  const { id } = await params;
  const supplier = await orNotFound(getMarketSupplier(id));
  const actor = await getActor();
  const saved = await savedAmong(actor, supplier.listings);
  const location = [supplier.district, GHANA_REGIONS[supplier.region]]
    .filter(Boolean)
    .join(", ");

  return (
    <div className="grid gap-6">
      <TopBand scenery="line" className="grid gap-4 pt-2">
        <BandTitleBar
          back={{ href: "/market", label: "Back to the market" }}
          title="Farm"
        />
        <div>
          <p className="eyebrow text-sprout">
            {supplier.supplierKind
              ? SUPPLIER_KINDS[supplier.supplierKind]
              : "Supplier"}
          </p>
          <h1 className="mt-1 text-3xl font-bold">{supplier.name}</h1>
          <p className="mt-2 flex items-center gap-2 text-white/80">
            <MapPin className="size-4 text-sprout" aria-hidden />
            {location}
          </p>
        </div>
      </TopBand>

      <div className="flex items-start gap-3 rounded-2xl bg-sprout-soft p-4 text-field-green-dark">
        <BadgeCheck className="mt-0.5 size-5 shrink-0" aria-hidden />
        <p className="text-sm">
          <span className="font-semibold">Verified farm.</span> Our team visited
          this farm and approved it to sell on Akuafo
          {supplier.verifiedSince
            ? ` in ${monthFormat.format(supplier.verifiedSince)}`
            : ""}
          . Akuafo manages this farm’s stock, so what you see is what you can
          order.
        </p>
      </div>

      <section className="grid gap-3">
        <h2 className="text-xl font-bold">On sale now</h2>
        {supplier.listings.length === 0 ? (
          <p className="rounded-2xl border border-dashed border-border bg-card p-5 text-sm text-muted-foreground">
            Nothing on sale from this farm right now.
          </p>
        ) : (
          <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
            {supplier.listings.map((listing) => (
              <li key={listing.id}>
                <ListingCard
                  listing={listing}
                  action={cardAction(listing, actor)}
                  corner={cardSave(listing, actor, saved)}
                />
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
