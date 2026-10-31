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
 * Signed-in layout. Phones: top bar + bottom tab bar (thumb-reachable).
 * Desktop: left sidebar. `tone="dark"` gives staff areas the Soil sidebar.
 */
export function AppShell({
  nav,
  areaLabel,
  tone = "light",
  children,
}: {
  nav: NavItem[];
  areaLabel: string;
  tone?: "light" | "dark";
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
        <Link href="/home" aria-label="DigiFarm home" className="px-2 py-2">
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
        <SignOutButton onDark={dark} className="mt-auto justify-start" />
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        <header
          className={cn(
            "sticky top-0 z-30 border-b pt-safe md:hidden",
            dark
              ? "border-sidebar-border bg-sidebar"
              : "border-border bg-paper/95 backdrop-blur",
          )}
        >
          <div className="flex h-14 items-center justify-between px-4">
            <Link href="/home" aria-label="DigiFarm home">
              <Logo tone={dark ? "on-dark" : "brand"} />
            </Link>
            <SignOutButton onDark={dark} className="px-2" />
          </div>
        </header>

        <main className="mx-auto w-full max-w-5xl flex-1 px-4 pt-6 pb-28 md:px-8 md:pt-10 md:pb-12">
          {children}
        </main>

        <nav
          aria-label={areaLabel}
          className="fixed inset-x-0 bottom-0 z-30 border-t border-border bg-card pb-safe md:hidden"
        >
          <ul className="flex">
            {nav.map((item) => (
              <li key={item.href} className="flex-1">
                <ShellNavLink item={item} variant="tab" />
              </li>
            ))}
          </ul>
        </nav>
      </div>
    </div>
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
