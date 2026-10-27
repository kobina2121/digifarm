"use client";

import { useSearchParams } from "next/navigation";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import { authClient } from "@/lib/auth-client";

export function ResendVerification() {
  const email = useSearchParams().get("email");
  const [state, setState] = useState<"idle" | "sending" | "sent" | "error">(
    "idle",
  );

  if (!email) return null;

  async function resend() {
    setState("sending");
    const { error } = await authClient.sendVerificationEmail({
      email: email!,
      callbackURL: "/home",
    });
    setState(error ? "error" : "sent");
  }

  return (
    <div className="grid gap-2">
      <Button
        variant="outline"
        size="lg"
        onClick={resend}
        disabled={state === "sending"}
        className="w-full"
      >
        {state === "sending" ? "Sending…" : "Send the link again"}
      </Button>
      <p aria-live="polite" className="text-sm text-muted-foreground">
        {state === "sent" && `A new link is on its way to ${email}.`}
        {state === "error" &&
          "We couldn't send it right now. Please wait a few minutes and try again."}
      </p>
    </div>
  );
}
