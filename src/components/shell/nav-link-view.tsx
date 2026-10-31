import Link from "next/link";
import type { ReactNode } from "react";

import { cn } from "@/lib/utils";

export type NavLinkVariant = "sidebar" | "sidebar-dark" | "tab";

/** Presentational nav link; usable on the server (as a fallback) and the client. */
export function NavLinkView({
  href,
  label,
  icon,
  active,
  variant,
}: {
  href: string;
  label: string;
  icon: ReactNode;
  active: boolean;
  variant: NavLinkVariant;
}) {
  if (variant === "tab") {
    return (
      <Link
        href={href}
        aria-current={active ? "page" : undefined}
        className={cn(
          "flex min-h-14 flex-col items-center justify-center gap-0.5 rounded-full text-[0.68rem] font-medium transition-colors [&_svg]:size-5",
          active
            ? "bg-field-green text-white"
            : "text-muted-foreground hover:text-soil",
        )}
      >
        {icon}
        {label}
      </Link>
    );
  }

  return (
    <Link
      href={href}
      aria-current={active ? "page" : undefined}
      className={cn(
        "flex h-11 items-center gap-3 rounded-lg px-3 text-sm font-medium transition-colors [&_svg]:size-4",
        variant === "sidebar-dark"
          ? active
            ? "bg-sidebar-accent text-sprout"
            : "text-sidebar-foreground/80 hover:bg-sidebar-accent hover:text-sidebar-foreground"
          : active
            ? "bg-secondary text-field-green"
            : "text-soil/80 hover:bg-muted hover:text-soil",
      )}
    >
      {icon}
      {label}
    </Link>
  );
}
