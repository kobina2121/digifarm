"use client";

import { useState, useTransition } from "react";

import { FormError } from "@/components/forms/form-field";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

import { changeListingStatusAction } from "../actions";

type Action = "PUBLISH" | "PAUSE" | "RESUME" | "ARCHIVE";

const LABELS: Record<Action, string> = {
  PUBLISH: "Put on sale",
  PAUSE: "Pause",
  RESUME: "Put back on sale",
  ARCHIVE: "Archive",
};

export function StatusPanel({
  listingId,
  allowed,
}: {
  listingId: string;
  allowed: Action[];
}) {
  const [pending, startTransition] = useTransition();
  const [reason, setReason] = useState("");
  const [error, setError] = useState<string | null>(null);

  if (allowed.length === 0) {
    return (
      <section className="rounded-2xl border border-border bg-muted p-5 text-sm text-muted-foreground">
        This listing is archived and can’t go back on sale. Create a new listing
        instead.
      </section>
    );
  }

  const needsReason = allowed.some((a) => a === "PAUSE" || a === "ARCHIVE");

  function submit(action: Action) {
    setError(null);
    startTransition(async () => {
      const result = await changeListingStatusAction(listingId, {
        action,
        reason,
      });
      if (!result.ok) {
        setError(result.fieldErrors?.reason ?? result.error);
        return;
      }
      setReason("");
    });
  }

  return (
    <section className="grid gap-4 rounded-2xl border border-border bg-card p-5">
      <h2 className="text-lg font-bold">Sale status</h2>
      <FormError message={error} />
      {needsReason ? (
        <div className="grid gap-1.5">
          <Label htmlFor="status-reason">
            Reason (needed to pause or archive)
          </Label>
          <Textarea
            id="status-reason"
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            rows={2}
            placeholder="e.g. Farmer sold out early this week"
            className="bg-card text-base md:text-sm"
          />
        </div>
      ) : null}
      <div className="flex flex-wrap gap-2">
        {allowed.map((a) => (
          <Button
            key={a}
            variant={
              a === "PUBLISH" || a === "RESUME"
                ? "default"
                : a === "ARCHIVE"
                  ? "destructive"
                  : "outline"
            }
            disabled={pending}
            onClick={() => submit(a)}
          >
            {LABELS[a]}
          </Button>
        ))}
      </div>
    </section>
  );
}
