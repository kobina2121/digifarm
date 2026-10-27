"use client";

import { usePathname } from "next/navigation";
import type { ComponentProps } from "react";

import { NavLinkView } from "./nav-link-view";

/** Highlights itself on the current route. Render inside <Suspense> (it reads the URL). */
export function NavLink({
  exact,
  ...props
}: Omit<ComponentProps<typeof NavLinkView>, "active"> & { exact?: boolean }) {
  const pathname = usePathname();
  const active = exact
    ? pathname === props.href
    : pathname === props.href || pathname.startsWith(`${props.href}/`);
  return <NavLinkView {...props} active={active} />;
}
