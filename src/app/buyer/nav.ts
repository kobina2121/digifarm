import { Home, MapPin, Store } from "lucide-react";

import type { NavItem } from "@/components/shell/app-shell";

export const BUYER_NAV: NavItem[] = [
  { href: "/market", label: "Market", icon: Store },
  { href: "/buyer", label: "Home", icon: Home, exact: true },
  { href: "/buyer/addresses", label: "Addresses", icon: MapPin },
];
