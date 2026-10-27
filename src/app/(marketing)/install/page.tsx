import { PlusSquare, Share, Smartphone } from "lucide-react";
import type { Metadata } from "next";

import { InstallButton } from "./install-button";

export const metadata: Metadata = { title: "Install DigiFarm on your phone" };

export default function InstallPage() {
  return (
    <div className="mx-auto max-w-xl px-4 py-10">
      <p className="eyebrow text-field-green">No app store needed</p>
      <h1 className="mt-2 text-4xl font-bold">
        Put DigiFarm on your home screen
      </h1>
      <p className="mt-3 text-muted-foreground">
        DigiFarm opens full-screen like an app and loads quickly on mobile data.
        It still needs a connection to show current prices and stock.
      </p>

      <section className="mt-8 rounded-2xl border border-border bg-card p-5">
        <h2 className="flex items-center gap-2 text-lg font-bold">
          <Smartphone className="size-5 text-field-green" aria-hidden /> Android
          (Chrome)
        </h2>
        <p className="mt-2 text-sm text-muted-foreground">
          Tap the button below, or open Chrome’s ⋮ menu and choose{" "}
          <strong className="text-soil">Install app</strong>.
        </p>
        <InstallButton />
      </section>

      <section className="mt-4 rounded-2xl border border-border bg-card p-5">
        <h2 className="flex items-center gap-2 text-lg font-bold">
          <Smartphone className="size-5 text-field-green" aria-hidden /> iPhone
          (Safari)
        </h2>
        <ol className="mt-3 grid gap-3 text-sm">
          <li className="flex items-start gap-3">
            <span className="flex size-6 shrink-0 items-center justify-center rounded-full bg-secondary text-xs font-bold">
              1
            </span>
            <span>
              Open DigiFarm in <strong>Safari</strong> and tap the Share button{" "}
              <Share
                className="inline size-4 align-text-bottom"
                aria-label="Share"
              />
              .
            </span>
          </li>
          <li className="flex items-start gap-3">
            <span className="flex size-6 shrink-0 items-center justify-center rounded-full bg-secondary text-xs font-bold">
              2
            </span>
            <span>
              Scroll down and tap <strong>Add to Home Screen</strong>{" "}
              <PlusSquare
                className="inline size-4 align-text-bottom"
                aria-hidden
              />
              .
            </span>
          </li>
          <li className="flex items-start gap-3">
            <span className="flex size-6 shrink-0 items-center justify-center rounded-full bg-secondary text-xs font-bold">
              3
            </span>
            <span>
              Tap <strong>Add</strong>. DigiFarm appears on your home screen.
            </span>
          </li>
        </ol>
      </section>
    </div>
  );
}
