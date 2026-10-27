import { redirect } from "next/navigation";
import { Suspense } from "react";

import { homePathFor, requireActor } from "@/lib/session";

/** Sends a signed-in user to the right area for their role. */
async function RedirectHome(): Promise<null> {
  const actor = await requireActor();
  redirect(homePathFor(actor));
}

export default function HomeRedirectPage() {
  return (
    <Suspense
      fallback={
        <p className="p-6 text-center text-muted-foreground">Loading…</p>
      }
    >
      <RedirectHome />
    </Suspense>
  );
}
