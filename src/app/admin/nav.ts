import { LayoutDashboard, Medal, Package, Tractor } from "lucide-react";

import type { NavItem } from "@/components/shell/app-shell";

export const STAFF_NAV: NavItem[] = [
  { href: "/admin", label: "Overview", icon: LayoutDashboard, exact: true },
  { href: "/admin/suppliers", label: "Suppliers", icon: Tractor },
  { href: "/admin/listings", label: "Listings", icon: Package },
  { href: "/admin/grades", label: "Grades", icon: Medal },
];
