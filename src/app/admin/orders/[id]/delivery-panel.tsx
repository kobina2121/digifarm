"use client";

import { useState, useTransition } from "react";

import { FormError, FormField } from "@/components/forms/form-field";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import type { ActionResult } from "@/lib/action-result";
import { formatGhanaPhone } from "@/lib/ghana";
import type { OrderDetail } from "@/modules/ordering";

import {
  assignCarrierAction,
  markDeliveredAction,
  markDeliveryFailedAction,
  markPickedUpAction,
} from "../actions";

type Fulfilment = OrderDetail["fulfilments"][number];

const dateTime = new Intl.DateTimeFormat("en-GB", {
  day: "numeric",
  month: "short",
  hour: "2-digit",
  minute: "2-digit",
  timeZone: "Africa/Accra",
});

/**
 * One farm's delivery, step by step: who's carrying it, picked up, then
 * delivered with proof or couldn't be delivered.
 */
export function DeliveryPanel({ fulfilment: f }: { fulfilment: Fulfilment }) {
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [editingCarrier, setEditingCarrier] = useState(false);
  const [failing, setFailing] = useState(false);

  function run(action: () => Promise<ActionResult>, done?: () => void) {
    setError(null);
    setFieldErrors({});
    startTransition(async () => {
      const result = await action();
      if (!result.ok) {
        setError(result.error);
        setFieldErrors(result.fieldErrors ?? {});
        return;
      }
      done?.();
    });
  }

  if (f.status === "PENDING" || f.status === "CANCELLED") return null;

  const showCarrierForm =
    f.status !== "DELIVERED" && (editingCarrier || !f.carrier);

  return (
    <div className="grid gap-3 border-t border-border pt-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h3 className="font-semibold">Delivery · {f.statusLabel}</h3>
        <span className="text-sm text-muted-foreground">
          Fee {f.deliveryFee}
        </span>
      </div>
      <FormError message={error} />

      {f.carrier && !showCarrierForm ? (
        <div className="flex flex-wrap items-center justify-between gap-2 text-sm">
          <p>
            With <span className="font-medium">{f.carrier.name}</span>
            {f.carrier.phone ? (
              <>
                {" · "}
                <a
                  href={`tel:${f.carrier.phone}`}
                  className="underline underline-offset-4"
                >
                  {formatGhanaPhone(f.carrier.phone)}
                </a>
              </>
            ) : null}
            {f.carrier.details ? (
              <span className="block text-muted-foreground">
                {f.carrier.details}
              </span>
            ) : null}
          </p>
          {f.status !== "DELIVERED" ? (
            <Button
              type="button"
              variant="ghost"
              onClick={() => setEditingCarrier(true)}
            >
              Change
            </Button>
          ) : null}
        </div>
      ) : null}

      {showCarrierForm ? (
        <form
          className="grid gap-3"
          onSubmit={(e) => {
            e.preventDefault();
            const form = new FormData(e.currentTarget);
            run(
              () =>
                assignCarrierAction(f.id, {
                  carrierName: String(form.get("carrierName") ?? ""),
                  carrierPhone: String(form.get("carrierPhone") ?? ""),
                  carrierDetails: String(form.get("carrierDetails") ?? ""),
                }),
              () => setEditingCarrier(false),
            );
          }}
        >
          <div className="grid gap-3 sm:grid-cols-2">
            <FormField
              id={`carrierName-${f.id}`}
              label="Rider or driver"
              error={fieldErrors.carrierName}
            >
              <Input
                id={`carrierName-${f.id}`}
                name="carrierName"
                defaultValue={f.carrier?.name}
              />
            </FormField>
            <FormField
              id={`carrierPhone-${f.id}`}
              label="Their phone"
              error={fieldErrors.carrierPhone}
            >
              <Input
                id={`carrierPhone-${f.id}`}
                name="carrierPhone"
                type="tel"
                defaultValue={
                  f.carrier?.phone ? formatGhanaPhone(f.carrier.phone) : ""
                }
              />
            </FormField>
          </div>
          <FormField
            id={`carrierDetails-${f.id}`}
            label="Details (optional)"
            hint="e.g. VIP bus, waybill 1234"
            error={fieldErrors.carrierDetails}
          >
            <Input
              id={`carrierDetails-${f.id}`}
              name="carrierDetails"
              defaultValue={f.carrier?.details ?? ""}
            />
          </FormField>
          <Button
            type="submit"
            disabled={pending}
            className="justify-self-start"
          >
            {pending ? "Saving…" : "Save"}
          </Button>
        </form>
      ) : null}

      {f.deliveryFailedAt && f.status === "DELIVERY_FAILED" ? (
        <p className="rounded-lg bg-harvest-gold-soft px-3 py-2 text-sm">
          Couldn’t be delivered on {dateTime.format(f.deliveryFailedAt)}:{" "}
          {f.deliveryFailReason}
        </p>
      ) : null}

      {(f.status === "CONFIRMED" || f.status === "DELIVERY_FAILED") &&
      f.carrier &&
      !showCarrierForm ? (
        <Button
          type="button"
          disabled={pending}
          className="justify-self-start"
          onClick={() => run(() => markPickedUpAction(f.id))}
        >
          {pending
            ? "Saving…"
            : f.status === "DELIVERY_FAILED"
              ? "Sent out again"
              : "Picked up from the farm"}
        </Button>
      ) : null}

      {f.status === "PICKED_UP" && !failing && !showCarrierForm ? (
        <form
          className="grid gap-3"
          encType="multipart/form-data"
          onSubmit={(e) => {
            e.preventDefault();
            const form = new FormData(e.currentTarget);
            run(() => markDeliveredAction(f.id, form));
          }}
        >
          <p className="text-sm text-muted-foreground">
            Picked up {f.pickedUpAt ? dateTime.format(f.pickedUpAt) : ""}
          </p>
          <FormField
            id={`receiverName-${f.id}`}
            label="Who received it"
            error={fieldErrors.receiverName}
          >
            <Input id={`receiverName-${f.id}`} name="receiverName" />
          </FormField>
          <FormField
            id={`photo-${f.id}`}
            label="Photo of the delivery (optional)"
          >
            <input
              id={`photo-${f.id}`}
              name="photo"
              type="file"
              accept="image/jpeg,image/png,image/webp"
              capture="environment"
              className="text-sm"
            />
          </FormField>
          <div className="flex flex-wrap gap-2">
            <Button type="submit" disabled={pending}>
              {pending ? "Saving…" : "Delivered"}
            </Button>
            <Button
              type="button"
              variant="ghost"
              onClick={() => setFailing(true)}
            >
              Couldn’t deliver
            </Button>
          </div>
        </form>
      ) : null}

      {f.status === "PICKED_UP" && failing ? (
        <form
          className="grid gap-3"
          onSubmit={(e) => {
            e.preventDefault();
            const form = new FormData(e.currentTarget);
            run(
              () =>
                markDeliveryFailedAction(f.id, {
                  reason: String(form.get("reason") ?? ""),
                }),
              () => setFailing(false),
            );
          }}
        >
          <FormField
            id={`reason-${f.id}`}
            label="What went wrong"
            error={fieldErrors.reason}
          >
            <Input id={`reason-${f.id}`} name="reason" />
          </FormField>
          <div className="flex flex-wrap gap-2">
            <Button type="submit" variant="destructive" disabled={pending}>
              {pending ? "Saving…" : "Record failed delivery"}
            </Button>
            <Button
              type="button"
              variant="ghost"
              onClick={() => setFailing(false)}
            >
              Back
            </Button>
          </div>
        </form>
      ) : null}

      {f.status === "DELIVERED" ? (
        <p className="text-sm">
          Delivered {f.deliveredAt ? dateTime.format(f.deliveredAt) : ""} to{" "}
          <span className="font-medium">{f.receiverName}</span>
          {f.hasProofPhoto ? (
            <>
              {" · "}
              <a
                href={`/api/files/delivery-proofs/${f.id}`}
                target="_blank"
                rel="noreferrer"
                className="underline underline-offset-4"
              >
                See photo
              </a>
            </>
          ) : null}
        </p>
      ) : null}
    </div>
  );
}
