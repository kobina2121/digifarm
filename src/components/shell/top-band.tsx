import { ChevronLeft, X } from "lucide-react";
import Link from "next/link";
import type { ReactNode } from "react";

import { cn } from "@/lib/utils";

export type Scenery = "full" | "hills" | "line";

const SCENERY_PADDING: Record<Scenery, string> = {
  full: "pb-14 md:pb-16",
  hills: "pb-10 md:pb-12",
  line: "pb-7 md:pb-8",
};

/**
 * The green top of a phone screen. It runs flush to the top of the page, under
 * the status bar the installed app fills with the same green, so the clock,
 * the header and the page title read as one block. On wider screens it's a
 * rounded card. Put it first in a page inside the app shell or market layout.
 *
 * Rolling fields along its bottom edge, in the style of the app's farm
 * pictures: `full` adds a rising sun (Home), `hills` is for section pages and
 * `line` a faint ridge for pages with a back button, so it never crowds them.
 */
export function TopBand({
  children,
  className,
  scenery = "hills",
}: {
  children: ReactNode;
  className?: string;
  scenery?: Scenery;
}) {
  return (
    <section
      className={cn(
        "relative isolate -mx-4 -mt-6 overflow-hidden bg-app-bar px-4 pt-4 text-white md:mx-0 md:mt-0 md:rounded-3xl md:p-6",
        SCENERY_PADDING[scenery],
        className,
      )}
    >
      <Fields scenery={scenery} />
      {children}
    </section>
  );
}

/** Hills (and on Home a morning sun) behind the band's content. */
function Fields({ scenery }: { scenery: Scenery }) {
  return (
    <div
      aria-hidden
      className="pointer-events-none absolute inset-x-0 bottom-0 -z-10"
    >
      {scenery === "full" ? (
        <span className="absolute right-[6%] bottom-5 size-14 rounded-full bg-harvest-gold dark:bg-harvest-gold/80" />
      ) : null}
      <svg
        viewBox="0 0 400 60"
        preserveAspectRatio="none"
        className={cn(
          "relative block w-full",
          scenery === "full" ? "h-14" : scenery === "hills" ? "h-10" : "h-5",
        )}
      >
        {scenery === "line" ? (
          <path
            d="M0 44 C 120 20, 260 50, 400 26 L400 60 L0 60Z"
            fill="#8fd16a"
            fillOpacity=".18"
          />
        ) : (
          <>
            <path
              d="M0 38 C 90 14, 190 34, 400 10 L400 60 L0 60Z"
              className="fill-hill-back"
            />
            <path
              d="M0 52 C 120 30, 250 56, 400 34 L400 60 L0 60Z"
              className="fill-hill-front"
            />
          </>
        )}
      </svg>
    </div>
  );
}

/** A round back (arrow) or close (X) button for the green band. */
export function BandButton({
  href,
  label,
  kind = "back",
  className,
}: {
  href: string;
  /** What it does, for screen readers: "Back to your cart". */
  label: string;
  kind?: "back" | "close";
  className?: string;
}) {
  const Icon = kind === "close" ? X : ChevronLeft;
  return (
    <Link
      href={href}
      aria-label={label}
      className={cn(
        "flex size-11 shrink-0 items-center justify-center rounded-full bg-white/15 text-white transition-colors hover:bg-white/25",
        className,
      )}
    >
      <Icon className="size-5" aria-hidden />
    </Link>
  );
}

/**
 * The band's top row: a back or close button, the title in the middle and an
 * optional button on the right. Use inside <TopBand>.
 */
export function BandTitleBar({
  back,
  close,
  title,
  end,
}: {
  back?: { href: string; label: string };
  close?: { href: string; label: string };
  title: ReactNode;
  end?: ReactNode;
}) {
  const leading = back ?? close;
  return (
    <header className="grid grid-cols-[2.75rem_minmax(0,1fr)_2.75rem] items-center gap-2">
      {leading ? (
        <BandButton {...leading} kind={back ? "back" : "close"} />
      ) : (
        <span />
      )}
      <h1 className="truncate text-center text-xl font-semibold">{title}</h1>
      {end ?? <span />}
    </header>
  );
}

/**
 * A green header for screens outside the app shell (sign-in, onboarding, the
 * public market): it sticks to the top and covers the status bar area.
 */
export function GreenHeader({
  children,
  className,
}: {
  children: ReactNode;
  /** Classes for the inner row, e.g. its maximum width. */
  className?: string;
}) {
  return (
    <header className="sticky top-0 z-40 bg-app-bar pt-safe text-white">
      <div
        className={cn(
          "mx-auto flex h-16 w-full items-center justify-between gap-3 px-4",
          className,
        )}
      >
        {children}
      </div>
    </header>
  );
}
