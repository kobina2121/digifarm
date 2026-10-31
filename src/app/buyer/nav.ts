import { Home, ReceiptText, ShoppingCart, UserRound } from "lucide-react";

import { MarketStallIcon } from "@/components/icons/market-stall";
import type { NavItem } from "@/components/shell/app-shell";

export const BUYER_NAV: NavItem[] = [
  { href: "/buyer", label: "Home", icon: Home, exact: true },
  { href: "/market", label: "Market", icon: MarketStallIcon },
  { href: "/buyer/cart", label: "Cart", icon: ShoppingCart },
  { href: "/buyer/orders", label: "Orders", icon: ReceiptText },
  { href: "/buyer/profile", label: "Profile", icon: UserRound },
];
