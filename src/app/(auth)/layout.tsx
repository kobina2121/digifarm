import Link from "next/link";

import { Logo } from "@/components/brand/logo";
import { BandButton, GreenHeader } from "@/components/shell/top-band";

export default function AuthLayout({ children }: LayoutProps<"/">) {
  return (
    <div className="flex min-h-dvh flex-col pb-safe">
      <GreenHeader className="max-w-md">
        <Link href="/home" aria-label="Akuafo home">
          <Logo tone="on-dark" />
        </Link>
        <BandButton
          href="/market"
          label="Close and browse the market"
          kind="close"
        />
      </GreenHeader>
      <main className="mx-auto w-full max-w-md flex-1 px-4 pt-6 pb-10">
        {children}
      </main>
    </div>
  );
}
