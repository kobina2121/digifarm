import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { Suspense } from "react";

import { Logo } from "@/components/brand/logo";
import { Skeleton } from "@/components/ui/skeleton";
import { homePathFor, requireActor } from "@/lib/session";

import { OnboardingForm } from "./onboarding-form";

export const metadata: Metadata = { title: "Set up your business" };

async function OnboardingGate() {
  const actor = await requireActor();
  // Staff and users who already have a business don't onboard again.
  if (actor.platformRole !== "USER" || actor.membership)
    redirect(homePathFor(actor));
  return <OnboardingForm />;
}

export default function OnboardingPage() {
  return (
    <div className="min-h-dvh pt-safe pb-safe">
      <header className="mx-auto flex h-16 max-w-xl items-center px-4">
        <Link href="/home" aria-label="DigiFarm home">
          <Logo />
        </Link>
      </header>
      <main className="mx-auto max-w-xl px-4 pt-4 pb-12">
        <p className="eyebrow text-field-green">Step 2 of 2</p>
        <h1 className="mt-2 text-3xl font-bold">Set up your business</h1>
        <p className="mt-2 text-muted-foreground">
          Tell us who you are and where to deliver. You can add more delivery
          addresses later.
        </p>
        <div className="mt-8">
          <Suspense fallback={<FormSkeleton />}>
            <OnboardingGate />
          </Suspense>
        </div>
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
