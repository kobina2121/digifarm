import { WifiOff } from "lucide-react";
import type { Metadata } from "next";

import { Logo } from "@/components/brand/logo";

import { RetryButton } from "./retry-button";

export const metadata: Metadata = { title: "You're offline" };

/** Shown by the service worker when a page can't be reached. Fully static. */
export default function OfflinePage() {
  return (
    <main className="mx-auto flex min-h-dvh max-w-md flex-col items-center justify-center px-6 pt-safe pb-safe text-center">
      <Logo />
      <span className="mt-10 flex size-14 items-center justify-center rounded-2xl bg-harvest-gold-soft">
        <WifiOff className="size-7 text-soil" aria-hidden />
      </span>
      <h1 className="mt-6 text-3xl font-bold">You’re offline</h1>
      <p className="mt-3 text-muted-foreground">
        DigiFarm needs a connection to show current prices, stock and orders.
        Check your mobile data or Wi-Fi and try again.
      </p>
      <RetryButton />
    </main>
  );
}
