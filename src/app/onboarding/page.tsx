import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { Suspense } from "react";

import { Logo } from "@/components/brand/logo";
import { Skeleton } from "@/components/ui/skeleton";
import { homePathFor, requireActor } from "@/lib/session";

import { OnboardingForm } from "./onboarding-form";
import { GreenHeader } from "@/components/shell/top-band";

export const metadata: Metadata = { title: "Set up your account" };

async function OnboardingGate() {
  const actor = await requireActor();
  // Staff and users who already have an account set up don't onboard again.
  if (actor.platformRole !== "USER" || actor.membership)
    redirect(homePathFor(actor));
  return <OnboardingForm />;
}

export default function OnboardingPage() {
  return (
    <div className="min-h-dvh pb-safe">
      <GreenHeader className="max-w-xl">
        <Link href="/home" aria-label="Akuafo home">
          <Logo tone="on-dark" />
        </Link>
      </GreenHeader>
      <main className="mx-auto max-w-xl px-4 pt-6 pb-12">
        <p className="eyebrow text-field-green">Step 2 of 2</p>
        <h1 className="mt-2 text-3xl font-bold">Set up your account</h1>
        <p className="mt-2 text-muted-foreground">
          Tell us where to deliver. Buying for a business? Choose it below. You
          can add more delivery addresses later.
        </p>
        <div className="mt-8">
          <Suspense fallback={<FormSkeleton />}>
            <OnboardingGate />
          </Suspense>
        </div>
        <p className="mt-8 text-center text-sm text-muted-foreground">
          Changed your mind?{" "}
          <Link
            href="/account/delete"
            className="underline underline-offset-4 hover:text-destructive"
          >
            Delete my account
          </Link>
        </p>
      </main>
    </div>
  );
}

function FormSkeleton() {
  return (
    <div className="grid gap-4" aria-busy="true" aria-label="Loading">
      {Array.from({ length: 5 }, (_, i) => (
        <Skeleton key={i} className="h-16 w-full rounded-xl" />
      ))}
    </div>
  );
}
