import {
  Building2,
  ChevronRight,
  Mail,
  MapPin,
  Phone,
  ReceiptText,
} from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import type { ReactNode } from "react";

import { SignOutButton } from "@/components/shell/sign-out-button";
import { ThemePicker } from "@/components/theme/theme-picker";
import { formatGhanaPhone } from "@/lib/ghana";
import {
  BUYER_SEGMENTS,
  getBuyerProfile,
  getMyAccount,
} from "@/modules/buyers";

import { requireBuyer } from "../guard";

export const metadata: Metadata = { title: "Profile" };

export default async function ProfilePage() {
  const actor = await requireBuyer();
  const [profile, account] = await Promise.all([
    getBuyerProfile(actor),
    getMyAccount(actor),
  ]);
  const business = profile.tradingName ?? profile.legalName;
  const initials = account.name
    .split(/\s+/)
    .map((w) => w[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();

  return (
    <div className="mx-auto grid w-full max-w-xl gap-6">
      <section className="flex items-center gap-4">
        <span
          aria-hidden
          className="flex size-16 shrink-0 items-center justify-center rounded-full bg-field-green text-xl font-bold text-white"
        >
          {initials}
        </span>
        <div className="min-w-0">
          <h1 className="truncate text-2xl font-bold">{account.name}</h1>
          <p className="truncate text-muted-foreground">{business}</p>
        </div>
      </section>

      <section className="grid gap-2">
        <h2 className="px-1 eyebrow text-muted-foreground">Account</h2>
        <ul className="divide-y divide-border overflow-hidden rounded-3xl bg-card">
          <Row icon={<Mail />} label="Email" value={account.email} />
          <Row
            icon={<Building2 />}
            label="Business"
            value={`${business} · ${BUYER_SEGMENTS[profile.buyerSegment ?? "OTHER"]}`}
          />
          <Row
            icon={<Phone />}
            label="Business phone"
            value={formatGhanaPhone(profile.phone)}
          />
        </ul>
      </section>

      <section className="grid gap-2">
        <h2 className="px-1 eyebrow text-muted-foreground">Ordering</h2>
        <ul className="divide-y divide-border overflow-hidden rounded-3xl bg-card">
          <Row
            icon={<MapPin />}
            label="Delivery addresses"
            value={`${profile.addresses.length} saved`}
            href="/buyer/addresses"
          />
          <Row
            icon={<ReceiptText />}
            label="Orders"
            value="Track, pay, cancel or order again"
            href="/buyer/orders"
          />
        </ul>
      </section>

      <section className="grid gap-2">
        <h2 className="px-1 eyebrow text-muted-foreground">Appearance</h2>
        <ThemePicker />
      </section>

      <SignOutButton className="h-12 justify-center rounded-full border border-border bg-card" />
    </div>
  );
}

function Row({
  icon,
  label,
  value,
  href,
}: {
  icon: ReactNode;
  label: string;
  value: string;
  href?: string;
}) {
  const body = (
    <>
      <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-sprout-soft text-field-green-dark [&_svg]:size-5">
        {icon}
      </span>
      <span className="min-w-0 flex-1">
        <span className="block text-sm text-muted-foreground">{label}</span>
        <span className="block truncate font-medium">{value}</span>
      </span>
      {href ? (
        <ChevronRight
          className="size-5 shrink-0 text-muted-foreground"
          aria-hidden
        />
      ) : null}
    </>
  );
  return (
    <li>
      {href ? (
        <Link
          href={href}
          className="flex items-center gap-3 px-4 py-3.5 transition-colors hover:bg-muted"
        >
          {body}
        </Link>
      ) : (
        <div className="flex items-center gap-3 px-4 py-3.5">{body}</div>
      )}
    </li>
  );
}
