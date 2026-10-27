"use client";

import { useState, useTransition } from "react";

import { FormError } from "@/components/forms/form-field";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

import { decide } from "../actions";

type Decision = "APPROVE" | "REJECT" | "SUSPEND" | "REINSTATE";

const LABELS: Record<Decision, string> = {
  APPROVE: "Approve supplier",
  REJECT: "Reject",
  SUSPEND: "Suspend supplier",
  REINSTATE: "Reinstate supplier",
};

export function DecisionPanel({
  supplierId,
  allowed,
  actorIsVisitor,
  lastDecision,
}: {
  supplierId: string;
  allowed: Decision[];
  actorIsVisitor: boolean;
  lastDecision: { by: string; at: string; notes: string | null } | null;
}) {
  const [pending, startTransition] = useTransition();
  const [notes, setNotes] = useState("");
  const [error, setError] = useState<string | null>(null);

  function submit(decision: Decision) {
    setError(null);
    startTransition(async () => {
      const result = await decide(supplierId, { decision, notes });
      if (!result.ok) {
        setError(result.fieldErrors?.notes ?? result.error);
        return;
      }
      setNotes("");
    });
  }

  if (allowed.length === 0 && !lastDecision) {
    return (
      <section className="rounded-2xl border border-border bg-muted p-5 text-sm text-muted-foreground">
        Record a farm visit before this supplier can be approved.
      </section>
    );
  }

  return (
    <section className="grid gap-4 rounded-2xl border border-border bg-card p-5">
      <h2 className="text-lg font-bold">Verification decision</h2>
      {lastDecision ? (
        <p className="text-sm text-muted-foreground">
          Last decision by{" "}
          <span className="font-medium text-soil">{lastDecision.by}</span> on{" "}
          {lastDecision.at}
          {lastDecision.notes ? `: “${lastDecision.notes}”` : "."}
        </p>
      ) : null}
      {allowed.length ? (
        <>
          <FormError message={error} />
          <div className="grid gap-1.5">
            <Label htmlFor="decision-notes">
              Notes{" "}
              {allowed.includes("APPROVE")
                ? "(required to reject)"
                : "(required)"}
            </Label>
            <Textarea
              id="decision-notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={2}
              className="bg-card text-base md:text-sm"
            />
          </div>
          {actorIsVisitor && allowed.includes("APPROVE") ? (
            <p className="rounded-lg bg-harvest-gold-soft px-3 py-2.5 text-sm text-soil">
              You recorded a visit to this farm, so another staff member must
              approve it.
            </p>
          ) : null}
          <div className="flex flex-wrap gap-2">
            {allowed.map((d) => (
              <Button
                key={d}
                variant={
                  d === "APPROVE" || d === "REINSTATE"
                    ? "default"
                    : "destructive"
                }
                disabled={pending || (d === "APPROVE" && actorIsVisitor)}
                onClick={() => submit(d)}
              >
                {LABELS[d]}
              </Button>
            ))}
          </div>
        </>
      ) : null}
    </section>
  );
}
