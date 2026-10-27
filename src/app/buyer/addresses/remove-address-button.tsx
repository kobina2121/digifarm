"use client";

import { Trash2 } from "lucide-react";
import { useState, useTransition } from "react";

import { Button } from "@/components/ui/button";

import { removeAddress } from "./actions";

export function RemoveAddressButton({
  id,
  label,
}: {
  id: string;
  label: string;
}) {
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  return (
    <div className="flex flex-col items-end">
      <Button
        variant="ghost"
        size="icon"
        aria-label={`Remove ${label}`}
        disabled={pending}
        onClick={() => {
          if (!window.confirm(`Remove "${label}"?`)) return;
          startTransition(async () => {
            const result = await removeAddress(id);
            setError(result.ok ? null : result.error);
          });
        }}
      >
        <Trash2 aria-hidden />
      </Button>
      {error ? (
        <p
          role="alert"
          className="max-w-40 text-right text-xs text-destructive"
        >
          {error}
        </p>
      ) : null}
    </div>
  );
}
