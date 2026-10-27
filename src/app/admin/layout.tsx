import { LayoutDashboard, Tractor } from "lucide-react";
import { Suspense } from "react";

import { AppShell, type NavItem } from "@/components/shell/app-shell";
import { PageSkeleton } from "@/components/shell/page-skeleton";

const NAV: NavItem[] = [
  { href: "/admin", label: "Overview", icon: LayoutDashboard, exact: true },
  { href: "/admin/suppliers", label: "Suppliers", icon: Tractor },
];

export default function AdminLayout({ children }: LayoutProps<"/admin">) {
  return (
    <AppShell nav={NAV} areaLabel="DigiFarm staff" tone="dark">
      <Suspense fallback={<PageSkeleton />}>{children}</Suspense>
    </AppShell>
  );
}
