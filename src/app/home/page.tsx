import { redirect } from "next/navigation";
import { Suspense } from "react";

import { Logo } from "@/components/brand/logo";

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
        // The same green as the launch screen, so opening the app goes
        // straight from it to your home page with no pale screen between.
        <div
          aria-busy="true"
          className="flex min-h-dvh items-center justify-center bg-field-green pt-safe pb-safe"
        >
          <Logo tone="on-dark" />
          <span className="sr-only">Loading</span>
        </div>
      }
    >
      <RedirectHome />
    </Suspense>
  );
}
