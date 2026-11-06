import Link from "next/link";

import { Logo } from "@/components/brand/logo";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export default function MarketingLayout({ children }: LayoutProps<"/">) {
  return (
    <>
      <header className="sticky top-0 z-40 border-b border-border/70 bg-paper/90 pt-safe backdrop-blur">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between gap-3 px-4">
          <Link href="/home" aria-label="Akuafo home" className="rounded-md">
            <Logo />
          </Link>
          <nav className="flex items-center gap-1 sm:gap-2">
            <Link
              href="/sign-in"
              className={cn(buttonVariants({ variant: "ghost" }), "px-3")}
            >
              Sign in
            </Link>
            <Link href="/sign-up" className={buttonVariants()}>
              Get started
            </Link>
          </nav>
        </div>
      </header>
      <main className="flex-1">{children}</main>
      <footer className="bg-ink pb-safe text-white">
        <div className="mx-auto flex max-w-6xl flex-col gap-6 px-4 py-10 sm:flex-row sm:items-end sm:justify-between">
          <Logo tone="on-dark" tagline />
          <p className="max-w-sm text-sm text-white/70">
            Delivering anywhere in Ghana. Produce comes from farms Akuafo has
            visited and approved.
          </p>
        </div>
      </footer>
    </>
  );
}
