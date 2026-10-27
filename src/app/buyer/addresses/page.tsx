import { MapPin } from "lucide-react";
import type { Metadata } from "next";

import { Badge } from "@/components/ui/badge";
import { getBuyerProfile } from "@/modules/buyers";

import { requireBuyer } from "../guard";
import { AddAddressForm } from "./add-address-form";
import { RemoveAddressButton } from "./remove-address-button";

export const metadata: Metadata = { title: "Delivery addresses" };

export default async function AddressesPage() {
  const actor = await requireBuyer();
  const { addresses } = await getBuyerProfile(actor);
  const canEdit = actor.membership?.role !== "MEMBER";

  return (
    <div className="grid gap-6">
      <div>
        <h1 className="text-3xl font-bold">Delivery addresses</h1>
        <p className="mt-1 text-muted-foreground">
          Where we bring your orders in Greater Accra and Kumasi.
        </p>
      </div>

      <ul className="grid gap-3">
        {addresses.map((address) => (
          <li
            key={address.id}
            className="flex items-start gap-3 rounded-2xl border border-border bg-card p-4"
          >
            <MapPin
              className="mt-1 size-5 shrink-0 text-field-green"
              aria-hidden
            />
            <div className="min-w-0 flex-1">
              <p className="flex flex-wrap items-center gap-2 font-medium">
                {address.label}
                {address.isDefault ? (
                  <Badge variant="secondary">Default</Badge>
                ) : null}
              </p>
              <p className="text-sm text-muted-foreground">
                {[
                  address.street,
                  address.town,
                  address.district,
                  address.zone?.name,
                ]
                  .filter(Boolean)
                  .join(", ")}
              </p>
              {address.landmark ? (
                <p className="text-sm text-muted-foreground">
                  Near {address.landmark}
                </p>
              ) : null}
              {address.digitalAddress ? (
                <p className="font-mono text-xs text-muted-foreground">
                  {address.digitalAddress}
                </p>
              ) : null}
            </div>
            {canEdit && addresses.length > 1 ? (
              <RemoveAddressButton id={address.id} label={address.label} />
            ) : null}
          </li>
        ))}
      </ul>

      {canEdit ? (
        <section className="rounded-2xl border border-border bg-card p-5">
          <h2 className="text-lg font-bold">Add an address</h2>
          <div className="mt-4">
            <AddAddressForm />
          </div>
        </section>
      ) : null}
    </div>
  );
}
