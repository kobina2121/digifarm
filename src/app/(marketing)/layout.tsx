import Link from "next/link";

import { Logo, LogoMark } from "@/components/brand/logo";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { GreenHeader } from "@/components/shell/top-band";

export default function MarketingLayout({ children }: LayoutProps<"/">) {
  return (
    <>
      <GreenHeader className="max-w-6xl">
        <Link href="/home" aria-label="Akuafo home" className="rounded-md">
          {/* The smallest phones fit the mark and both buttons, not the name. */}
          <LogoMark tone="on-dark" className="h-8 min-[380px]:hidden" />
          <Logo tone="on-dark" className="hidden min-[380px]:inline-flex" />
        </Link>
        <nav className="flex items-center gap-1 sm:gap-2">
          <Link
            href="/sign-in"
            className={cn(
              buttonVariants({ variant: "ghost" }),
              "px-3 text-white hover:bg-white/10 hover:text-white",
            )}
          >
            Sign in
          </Link>
          <Link
            href="/sign-up"
            className={cn(
              buttonVariants(),
              "bg-white text-field-green hover:bg-white/90",
            )}
          >
            Get started
          </Link>
        </nav>
      </GreenHeader>
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
