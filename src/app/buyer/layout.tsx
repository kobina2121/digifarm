import { Suspense } from "react";

import { AppShell } from "@/components/shell/app-shell";
import { PageSkeleton } from "@/components/shell/page-skeleton";

import { BUYER_NAV } from "./nav";

export default function BuyerLayout({ children }: LayoutProps<"/buyer">) {
  return (
    <AppShell
      nav={BUYER_NAV}
      areaLabel="Buyer"
      showSignOut={false}
      phoneLogoBar={false}
    >
      {/* Pages read the session, so they stream in behind this boundary. */}
      <Suspense fallback={<PageSkeleton />}>{children}</Suspense>
    </AppShell>
  );
}
