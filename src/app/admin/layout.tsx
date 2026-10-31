import { Suspense } from "react";

import { AppShell } from "@/components/shell/app-shell";
import { PageSkeleton } from "@/components/shell/page-skeleton";

import { STAFF_NAV } from "./nav";

export default function AdminLayout({ children }: LayoutProps<"/admin">) {
  return (
    <AppShell nav={STAFF_NAV} areaLabel="DigiFarm staff" tone="dark">
      <Suspense fallback={<PageSkeleton />}>{children}</Suspense>
    </AppShell>
  );
}
