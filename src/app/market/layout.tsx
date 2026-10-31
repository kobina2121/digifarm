import { House, LogIn, UserPlus } from "lucide-react";
import Link from "next/link";
import { type ReactNode, Suspense } from "react";

import { Logo } from "@/components/brand/logo";
import { MarketStallIcon } from "@/components/icons/market-stall";
import { AppShell, BottomTabBar } from "@/components/shell/app-shell";
import { NavLinkView } from "@/components/shell/nav-link-view";
import { PageSkeleton } from "@/components/shell/page-skeleton";
import { buttonVariants } from "@/components/ui/button";
import { isStaff } from "@/lib/authz";
import { getActor } from "@/lib/session";
import { cn } from "@/lib/utils";

import { STAFF_NAV } from "../admin/nav";
import { BUYER_NAV } from "../buyer/nav";

/**
 * The market is public, so anyone can browse before signing up. Signed-in
 * buyers and staff see it inside their usual app shell with its tab bar.
 */
export default function MarketLayout({ children }: LayoutProps<"/market">) {
  return (
    <Suspense
      fallback={
        <div className="mx-auto w-full max-w-5xl px-4 pt-safe">
          <div className="h-16" />
          <PageSkeleton />
        </div>
      }
    >
      <MarketFrame>{children}</MarketFrame>
    </Suspense>
  );
}

async function MarketFrame({ children }: { children: ReactNode }) {
  const actor = await getActor();
  if (actor?.emailVerified && isStaff(actor)) {
    return (
      <AppShell nav={STAFF_NAV} areaLabel="DigiFarm staff" tone="dark">
        {children}
      </AppShell>
    );
  }
  if (actor?.emailVerified && actor.membership?.organizationType === "BUYER") {
    return (
      <AppShell nav={BUYER_NAV} areaLabel="Buyer" showSignOut={false}>
        {children}
      </AppShell>
    );
  }
  return (
    <div className="flex min-h-dvh flex-col pb-safe">
      <header className="sticky top-0 z-40 border-b border-border/70 bg-paper/95 pt-safe backdrop-blur">
        <div className="mx-auto flex h-16 max-w-5xl items-center justify-between gap-3 px-4">
          <Link href="/market" aria-label="DigiFarm market">
            <Logo />
          </Link>
          {actor ? (
            <Link
              href="/home"
              className={buttonVariants({ variant: "outline" })}
            >
              My account
            </Link>
          ) : (
            <nav className="flex items-center gap-1">
              <Link
                href="/sign-in?next=%2Fmarket"
                className={cn(buttonVariants({ variant: "ghost" }), "px-3")}
              >
                Sign in
              </Link>
              <Link href="/sign-up" className={buttonVariants()}>
                Join
              </Link>
            </nav>
          )}
        </div>
      </header>
      <main className="mx-auto w-full max-w-5xl flex-1 px-4 pt-6 pb-32 md:px-8 md:pt-10 md:pb-12">
        {children}
      </main>
      <BottomTabBar label="Market">
        <li className="flex-1">
          <NavLinkView
            href="/market"
            label="Market"
            icon={<MarketStallIcon aria-hidden />}
            active
            variant="tab"
          />
        </li>
        {actor ? (
          <li className="flex-1">
            <NavLinkView
              href="/home"
              label="My account"
              icon={<House aria-hidden />}
              active={false}
              variant="tab"
            />
          </li>
        ) : (
          <>
            <li className="flex-1">
              <NavLinkView
                href="/sign-in?next=%2Fmarket"
                label="Sign in"
                icon={<LogIn aria-hidden />}
                active={false}
                variant="tab"
              />
            </li>
            <li className="flex-1">
              <NavLinkView
                href="/sign-up"
                label="Join"
                icon={<UserPlus aria-hidden />}
                active={false}
                variant="tab"
              />
            </li>
          </>
        )}
      </BottomTabBar>
    </div>
  );
}
