"use client";

import { useState, useTransition } from "react";

import { Button } from "@/components/ui/button";

import { retryRefundAction } from "../actions";

export function RetryRefundButton({ refundId }: { refundId: string }) {
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  return (
    <div className="grid gap-1">
      <Button
        size="sm"
        variant="outline"
        disabled={pending}
        onClick={() => {
          setError(null);
          startTransition(async () => {
            const result = await retryRefundAction(refundId);
            if (!result.ok) setError(result.error);
            else if (result.data.status === "PENDING")
              setError("Still couldn’t reach the payment service.");
          });
        }}
      >
        {pending ? "Sending…" : "Send refund again"}
      </Button>
      {error ? (
        <p role="alert" className="text-xs text-destructive">
          {error}
        </p>
      ) : null}
    </div>
  );
}
