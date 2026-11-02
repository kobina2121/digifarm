import type { Metadata } from "next";
import Link from "next/link";

import { Logo } from "@/components/brand/logo";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export const metadata: Metadata = { title: "Account deleted" };

export default function AccountDeletedPage() {
  return (
    <main className="mx-auto grid min-h-dvh max-w-md content-center justify-items-center gap-4 px-4 pt-safe pb-safe text-center">
      <Logo />
      <h1 className="mt-4 text-2xl font-bold">Your account has been deleted</h1>
      <p className="text-muted-foreground">
        We’ve sent a confirmation to your email. You’re welcome back any time.
      </p>
      <Link
        href="/market"
        className={cn(buttonVariants({ size: "lg" }), "mt-2 rounded-full px-8")}
      >
        Back to the market
      </Link>
    </main>
  );
}
