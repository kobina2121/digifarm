import Link from "next/link";
import { type ComponentType, type ReactNode, Suspense } from "react";

import { Logo } from "@/components/brand/logo";
import { cn } from "@/lib/utils";

import { NavLink } from "./nav-link";
import { NavLinkView, type NavLinkVariant } from "./nav-link-view";
import { SignOutButton } from "./sign-out-button";

export type NavItem = {
  href: string;
  label: string;
  /** A Lucide icon or one of ours from components/icons. */
  icon: ComponentType<{ "aria-hidden"?: boolean }>;
  exact?: boolean;
};

/**
 * Signed-in layout. Phones: top bar (scrolls away) + bottom tab bar.
 * Desktop: left sidebar. `tone="dark"` gives staff areas the Soil sidebar.
 */
export function AppShell({
  nav,
  areaLabel,
  tone = "light",
  showSignOut = true,
  phoneLogoBar = true,
  children,
}: {
  nav: NavItem[];
  areaLabel: string;
  tone?: "light" | "dark";
  /** Buyers sign out from their Profile page instead. */
  showSignOut?: boolean;
  /** Buyers see the logo on Home only (the page draws it), so no bar on phones. */
  phoneLogoBar?: boolean;
  children: ReactNode;
}) {
  const dark = tone === "dark";
  return (
    <div className="flex min-h-dvh">
      <aside
        className={cn(
          "sticky top-0 hidden h-dvh w-64 shrink-0 flex-col border-r p-4 md:flex",
          dark
            ? "border-sidebar-border bg-sidebar text-sidebar-foreground"
            : "border-border bg-card",
        )}
      >
        <Link href="/home" aria-label="Akuafo home" className="px-2 py-2">
          <Logo tone={dark ? "on-dark" : "brand"} />
        </Link>
        <p
          className={cn(
            "mt-6 px-3 eyebrow",
            dark ? "text-sidebar-foreground/60" : "text-muted-foreground",
          )}
        >
          {areaLabel}
        </p>
        <nav aria-label={areaLabel} className="mt-2 grid gap-1">
          {nav.map((item) => (
            <ShellNavLink
              key={item.href}
              item={item}
              variant={dark ? "sidebar-dark" : "sidebar"}
            />
          ))}
        </nav>
        {showSignOut ? (
          <SignOutButton onDark={dark} className="mt-auto justify-start" />
        ) : null}
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        {phoneLogoBar ? (
          <>
            {/* Phones: a green header with the logo centred, one block with
              the green behind the status bar. The logo row (3.5rem) scrolls
              away, while the part behind the status bar stays pinned. */}
            <header className="sticky top-[-3.5rem] z-30 bg-app-bar pt-safe md:hidden">
              <div className="grid h-14 grid-cols-[1fr_auto_1fr] items-center px-4">
                <span />
                <Link href="/home" aria-label="Akuafo home">
                  <Logo tone="on-dark" />
                </Link>
                {showSignOut ? (
                  <SignOutButton onDark className="justify-self-end px-2" />
                ) : null}
              </div>
            </header>
          </>
        ) : (
          // A thin green strip pinned to the top, the same green as the status
          // bar and each page's TopBand, so the top of the screen is one block.
          <div
            aria-hidden
            className="sticky top-0 z-30 -mb-2 box-content h-2 bg-app-bar pt-safe md:hidden"
          />
        )}

        <main className="mx-auto w-full max-w-5xl flex-1 px-4 pt-6 pb-32 md:px-8 md:pt-10 md:pb-12">
          {children}
        </main>

        <BottomTabBar label={areaLabel}>
          {nav.map((item) => (
            <li key={item.href} className="flex-1">
              <ShellNavLink item={item} variant="tab" />
            </li>
          ))}
        </BottomTabBar>
      </div>
    </div>
  );
}

/**
 * Phone tab bar: a rounded bar floating above the content, centred and lifted
 * clear of the home indicator, within thumb reach.
 */
export function BottomTabBar({
  label,
  children,
}: {
  label: string;
  children: ReactNode;
}) {
  return (
    <nav
      aria-label={label}
      className="fixed inset-x-0 bottom-0 z-30 flex pin-to-screen justify-center px-4 pb-[max(0.75rem,env(safe-area-inset-bottom))] md:hidden"
    >
      <ul className="flex w-full max-w-md rounded-full border border-border/60 bg-card/95 p-1.5 shadow-[0_10px_30px_rgb(31_42_31/0.16)] backdrop-blur">
        {children}
      </ul>
    </nav>
  );
}

/** The active state depends on the URL, so it streams in; until then the link renders unhighlighted. */
function ShellNavLink({
  item,
  variant,
}: {
  item: NavItem;
  variant: NavLinkVariant;
}) {
  const props = {
    href: item.href,
    label: item.label,
    icon: <item.icon aria-hidden />,
    variant,
  };
  return (
    <Suspense fallback={<NavLinkView {...props} active={false} />}>
      <NavLink {...props} exact={item.exact} />
    </Suspense>
  );
}
