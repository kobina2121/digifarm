import { ArrowLeft } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { Suspense } from "react";

import { Logo } from "@/components/brand/logo";
import { buttonVariants } from "@/components/ui/button";
import { can } from "@/lib/authz";
import { homePathFor, requireActor } from "@/lib/session";
import { cn } from "@/lib/utils";
import { getAccountDeletionInfo } from "@/modules/buyers";

import { DeleteForm } from "./delete-form";

export const metadata: Metadata = { title: "Delete account" };

async function DeleteGate() {
  const actor = await requireActor();
  if (!can(actor, "account.delete")) redirect(homePathFor(actor));
  const { hasPassword, activeOrders, openRefunds } =
    await getAccountDeletionInfo(actor);
  const back = homePathFor(actor);

  if (activeOrders || openRefunds) {
    return (
      <div className="grid gap-4 rounded-3xl bg-card p-6">
        <p className="text-lg font-semibold">Not just yet</p>
        <p className="text-muted-foreground">
          You have{" "}
          {activeOrders
            ? `${activeOrders} ${activeOrders === 1 ? "order" : "orders"}`
            : `${openRefunds} ${openRefunds === 1 ? "refund" : "refunds"}`}{" "}
          in progress. You can delete your account once{" "}
          {activeOrders + openRefunds === 1 ? "it’s" : "they’re"} finished. An
          order that hasn’t been paid for yet can be cancelled.
        </p>
        <Link
          href="/buyer/orders"
          className={cn(buttonVariants({ size: "lg" }), "rounded-full")}
        >
          See my orders
        </Link>
      </div>
    );
  }

  return (
    <div className="grid gap-6">
      <section className="grid gap-3 rounded-3xl bg-card p-6">
        <h2 className="font-semibold">What happens</h2>
        <ul className="grid list-disc gap-2 pl-5 text-sm text-muted-foreground">
          <li>You won’t be able to sign in, and this can’t be undone.</li>
          <li>
            Your name, email, phone, addresses, cart and saved products are
            erased.
          </li>
          <li>
            Past orders and payments, and our security logs, are kept for
            accounting and safety. Your name and contact details are removed
            from your orders.
          </li>
          <li>You can sign up again later as a new customer.</li>
        </ul>
      </section>
      <DeleteForm hasPassword={hasPassword} />
      <Link
        href={back}
        className="justify-self-center py-2 text-sm font-medium text-field-green-dark"
      >
        Keep my account
      </Link>
    </div>
  );
}

export default function DeleteAccountPage() {
  return (
    <div className="min-h-dvh pt-safe pb-safe">
      <header className="mx-auto flex h-16 max-w-xl items-center justify-between px-4">
        <Link href="/home" aria-label="Back to DigiFarm" className="-ml-2 p-2">
          <ArrowLeft className="size-5" aria-hidden />
        </Link>
        <Logo />
        <span className="w-9" />
      </header>
      <main className="mx-auto max-w-xl px-4 pt-4 pb-12">
        <h1 className="text-3xl font-bold">Delete your account</h1>
        <div className="mt-6">
          <Suspense
            fallback={
              <div className="h-64 animate-pulse rounded-3xl bg-muted" />
            }
          >
            <DeleteGate />
          </Suspense>
        </div>
      </main>
    </div>
  );
}
