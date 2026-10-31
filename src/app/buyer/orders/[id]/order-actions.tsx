"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState, useTransition } from "react";

import { FormError } from "@/components/forms/form-field";
import { Button, buttonVariants } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

import { cancelOrderAction, payOrder, reorderAction } from "../actions";

export function PayNowButton({
  orderId,
  total,
}: {
  orderId: string;
  total: string;
}) {
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  return (
    <div className="grid gap-2">
      <Button
        size="lg"
        disabled={pending}
        onClick={() => {
          setError(null);
          startTransition(async () => {
            const result = await payOrder(orderId);
            if (!result.ok) return setError(result.error);
            if (result.data.paymentUrl)
              window.location.assign(result.data.paymentUrl);
          });
        }}
      >
        {pending ? "Opening payment…" : `Pay ${total}`}
      </Button>
      <FormError message={error} />
    </div>
  );
}

/** "Pay within 24:13", counting down; reloads the page when the hold ends. */
export function HoldCountdown({ expiresAt }: { expiresAt: string }) {
  const router = useRouter();
  const end = new Date(expiresAt).getTime();
  const [left, setLeft] = useState<number | null>(null);
  useEffect(() => {
    const tick = () => {
      const ms = end - Date.now();
      setLeft(Math.max(0, ms));
      if (ms <= 0) {
        clearInterval(timer);
        router.refresh();
      }
    };
    const timer = setInterval(tick, 1000);
    tick();
    return () => clearInterval(timer);
  }, [end, router]);
  if (left === null) return null;
  const minutes = Math.floor(left / 60_000);
  const seconds = Math.floor((left % 60_000) / 1000);
  return (
    <span className="font-mono tabular-nums">
      {minutes}:{String(seconds).padStart(2, "0")}
    </span>
  );
}

/** While a payment is still going through, check again every few seconds. */
export function RefreshWhilePending() {
  const router = useRouter();
  useEffect(() => {
    const timer = setInterval(() => router.refresh(), 5000);
    return () => clearInterval(timer);
  }, [router]);
  return null;
}

export function CancelOrder({
  orderId,
  paid,
}: {
  orderId: string;
  paid: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  if (done) {
    return (
      <p
        role="status"
        className="rounded-lg bg-sprout-soft px-3 py-2.5 text-sm"
      >
        {done}
      </p>
    );
  }
  if (!open) {
    return (
      <Button variant="outline" onClick={() => setOpen(true)}>
        Cancel order
      </Button>
    );
  }
  return (
    <div className="grid gap-3 rounded-2xl border border-border bg-card p-4">
      <p className="text-sm">
        {paid
          ? "We’ll refund the full amount to how you paid: mobile money usually within 1–3 working days, cards within 5–10."
          : "The produce we’re holding goes back on sale."}
      </p>
      <div className="grid gap-1.5">
        <Label
          htmlFor="cancel-reason"
          className="text-sm font-medium text-soil"
        >
          Why are you cancelling? (optional)
        </Label>
        <Textarea
          id="cancel-reason"
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          rows={2}
          maxLength={300}
          className="bg-card text-base md:text-sm"
        />
      </div>
      <FormError message={error} />
      <div className="flex flex-wrap gap-2">
        <Button
          variant="destructive"
          disabled={pending}
          onClick={() => {
            setError(null);
            startTransition(async () => {
              const result = await cancelOrderAction(orderId, { reason });
              if (!result.ok) return setError(result.error);
              setDone(
                result.data.refunded
                  ? "Order cancelled. Your refund is on its way."
                  : "Order cancelled.",
              );
            });
          }}
        >
          {pending ? "Cancelling…" : "Yes, cancel order"}
        </Button>
        <Button variant="ghost" onClick={() => setOpen(false)}>
          Keep order
        </Button>
      </div>
    </div>
  );
}

export function OrderAgain({ orderId }: { orderId: string }) {
  const [result, setResult] = useState<{
    added: number;
    skipped: { productName: string; reason: string }[];
  } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  return (
    <div className="grid gap-2">
      <Button
        variant="outline"
        disabled={pending}
        onClick={() => {
          setError(null);
          startTransition(async () => {
            const r = await reorderAction(orderId);
            if (!r.ok) return setError(r.error);
            setResult(r.data);
          });
        }}
      >
        {pending ? "Adding…" : "Order again"}
      </Button>
      <FormError message={error} />
      {result ? (
        <div
          role="status"
          className="grid gap-2 rounded-lg bg-muted p-3 text-sm"
        >
          <p>
            {result.added
              ? `${result.added} ${result.added === 1 ? "product" : "products"} added to your cart.`
              : "Nothing could be added right now."}
          </p>
          {result.skipped.length ? (
            <ul className="list-disc pl-5 text-muted-foreground">
              {result.skipped.map((s) => (
                <li key={s.productName}>
                  {s.productName}: {s.reason}
                </li>
              ))}
            </ul>
          ) : null}
          {result.added ? (
            <Link href="/buyer/cart" className={buttonVariants({ size: "sm" })}>
              View cart
            </Link>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
