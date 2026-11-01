import { Check } from "lucide-react";
import type { CSSProperties } from "react";

import type { OrderStatus } from "@/generated/prisma/enums";
import { cn } from "@/lib/utils";

const STEPS = ["Placed", "Paid", "Picked up", "Delivered"] as const;

/** How far along an order is, or null when it stopped (cancelled, expired). */
export function progressStep(status: OrderStatus): number | null {
  switch (status) {
    case "PENDING_PAYMENT":
      return 0;
    case "PAID":
      return 1;
    case "IN_FULFILMENT":
    case "PARTIALLY_DELIVERED":
      return 2;
    case "DELIVERED":
    case "COMPLETED":
      return 3;
    case "CANCELLED":
    case "EXPIRED":
      return null;
  }
}

export function isActiveOrder(status: OrderStatus) {
  return progressStep(status) !== null && status !== "COMPLETED";
}

/** Placed → Paid → Picked up → Delivered, with the current step highlighted. */
export function OrderProgress({
  status,
  size = "sm",
}: {
  status: OrderStatus;
  size?: "sm" | "lg";
}) {
  const step = progressStep(status);
  if (step === null) return null;
  return (
    <ol
      className="grid grid-cols-4"
      aria-label={`Order progress: ${STEPS[step]}`}
    >
      {STEPS.map((label, i) => {
        const done = i <= step;
        const current = i === step;
        return (
          <li
            key={label}
            className="relative flex flex-col items-center gap-1.5"
          >
            {i > 0 ? (
              <span
                aria-hidden
                className={cn(
                  "absolute top-[calc(var(--dot)/2-1px)] right-1/2 h-0.5 w-full",
                  done ? "bg-field-green" : "bg-border",
                )}
                style={
                  {
                    "--dot": size === "lg" ? "2rem" : "1.25rem",
                  } as CSSProperties
                }
              />
            ) : null}
            <span
              className={cn(
                "relative z-10 flex items-center justify-center rounded-full",
                size === "lg" ? "size-8" : "size-5",
                done
                  ? "bg-field-green text-white"
                  : "border-2 border-border bg-card",
                current && "ring-4 ring-field-green/20",
              )}
            >
              {done ? (
                <Check
                  className={size === "lg" ? "size-4" : "size-3"}
                  aria-hidden
                />
              ) : null}
            </span>
            <span
              className={cn(
                "text-center leading-tight",
                size === "lg" ? "text-xs" : "text-[0.65rem]",
                done
                  ? "font-semibold text-foreground"
                  : "text-muted-foreground",
              )}
            >
              {label}
            </span>
          </li>
        );
      })}
    </ol>
  );
}
