import { Home, MapPin } from "lucide-react";
import { Suspense } from "react";

import { AppShell, type NavItem } from "@/components/shell/app-shell";
import { PageSkeleton } from "@/components/shell/page-skeleton";

const NAV: NavItem[] = [
  { href: "/buyer", label: "Home", icon: Home, exact: true },
  { href: "/buyer/addresses", label: "Addresses", icon: MapPin },
];

export default function BuyerLayout({ children }: LayoutProps<"/buyer">) {
  return (
    <AppShell nav={NAV} areaLabel="Buyer">
      {/* Pages read the session, so they stream in behind this boundary. */}
      <Suspense fallback={<PageSkeleton />}>{children}</Suspense>
    </AppShell>
  );
}
