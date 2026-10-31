import { Home, MapPin } from "lucide-react";

import { MarketStallIcon } from "@/components/icons/market-stall";
import type { NavItem } from "@/components/shell/app-shell";

export const BUYER_NAV: NavItem[] = [
  { href: "/market", label: "Market", icon: MarketStallIcon },
  { href: "/buyer", label: "Home", icon: Home, exact: true },
  { href: "/buyer/addresses", label: "Addresses", icon: MapPin },
];
