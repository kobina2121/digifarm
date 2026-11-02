import {
  Building2,
  ChevronRight,
  Heart,
  Mail,
  MapPin,
  Palette,
  Phone,
  ReceiptText,
  ShoppingCart,
} from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import type { ReactNode } from "react";

import { Logo } from "@/components/brand/logo";
import { SignOutButton } from "@/components/shell/sign-out-button";
import { ThemePicker } from "@/components/theme/theme-picker";
import { formatGhanaPhone, GHANA_REGIONS } from "@/lib/ghana";
import {
  BUYER_SEGMENTS,
  getBuyerProfile,
  getMyAccount,
} from "@/modules/buyers";
import { savedListingCount } from "@/modules/catalog";
import { cartLineCount, countOrdersForBuyer } from "@/modules/ordering";

import { requireBuyer } from "../guard";

export const metadata: Metadata = { title: "Profile" };

export default async function ProfilePage() {
  const actor = await requireBuyer();
  const [profile, account, orders, cartLines, savedCount] = await Promise.all([
    getBuyerProfile(actor),
    getMyAccount(actor),
    countOrdersForBuyer(actor),
    cartLineCount(actor),
    savedListingCount(actor),
  ]);
  const isBusiness = profile.buyerKind === "BUSINESS";
  const business = profile.tradingName ?? profile.legalName;
  const segment = BUYER_SEGMENTS[profile.buyerSegment ?? "OTHER"];
  const address = profile.addresses[0];
  const initials = account.name
    .split(/\s+/)
    .map((w) => w[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();

  return (
    <div className="mx-auto grid w-full max-w-xl gap-6">
      {/* Who you are */}
      <div>
        <section className="relative overflow-hidden rounded-3xl bg-field-green px-5 pt-6 pb-16 text-white">
          <span
            aria-hidden
            className="absolute -top-10 -right-10 size-40 rounded-full bg-white/10"
          />
          <span
            aria-hidden
            className="absolute right-16 -bottom-14 size-28 rounded-full bg-white/10"
          />
          <div className="relative flex items-center gap-4">
            <span
              aria-hidden
              className="flex size-18 shrink-0 items-center justify-center rounded-full bg-white text-2xl font-bold text-[#11502d] shadow-md"
            >
              {initials}
            </span>
            <div className="min-w-0">
              <h1 className="truncate text-2xl font-bold">{account.name}</h1>
              <p className="truncate text-white/80">
                {isBusiness ? business : account.email}
              </p>
              <div className="mt-2 flex flex-wrap gap-1.5">
                <Chip>{isBusiness ? segment : "Personal"}</Chip>
                {address ? <Chip>{GHANA_REGIONS[address.region]}</Chip> : null}
              </div>
            </div>
          </div>
        </section>

        {/* Counts, overlapping the header */}
        <ul className="relative mx-4 -mt-10 grid grid-cols-3 divide-x divide-border rounded-3xl bg-card py-4 shadow-[0_8px_30px_rgb(31_42_31/0.12)]">
          <Stat href="/buyer/orders" value={orders.total} label="Orders" />
          <Stat
            href="/buyer/orders"
            value={orders.active}
            label="In progress"
          />
          <Stat
            href="/buyer/addresses"
            value={profile.addresses.length}
            label={profile.addresses.length === 1 ? "Address" : "Addresses"}
          />
        </ul>
      </div>

      <Group title="Account">
        <Row icon={<Mail />} label="Email" value={account.email} />
        <Row
          icon={<Phone />}
          label={isBusiness ? "Business phone" : "Phone number"}
          value={formatGhanaPhone(profile.phone)}
        />
        {isBusiness ? (
          <Row
            icon={<Building2 />}
            label="Business"
            value={`${business} · ${segment}`}
            href="/buyer/business"
          />
        ) : (
          <Row
            icon={<Building2 />}
            label="Buying for a business?"
            value="Add your business details"
            href="/buyer/business"
          />
        )}
      </Group>

      <Group title="Ordering">
        <Row
          icon={<MapPin />}
          label="Delivery addresses"
          value={
            address
              ? [address.label, address.town, GHANA_REGIONS[address.region]]
                  .filter(Boolean)
                  .join(", ")
              : "Add an address"
          }
          href="/buyer/addresses"
        />
        <Row
          icon={<ReceiptText />}
          label="Orders"
          value={
            orders.active
              ? `${orders.active} in progress`
              : "Track, pay, cancel or order again"
          }
          href="/buyer/orders"
        />
        <Row
          icon={<ShoppingCart />}
          label="Cart"
          value={
            cartLines
              ? `${cartLines} ${cartLines === 1 ? "product" : "products"} waiting`
              : "Empty"
          }
          href="/buyer/cart"
        />
        <Row
          icon={<Heart />}
          label="Saved"
          value={
            savedCount
              ? `${savedCount} ${savedCount === 1 ? "product" : "products"}`
              : "Tap the heart on a product to save it"
          }
          href="/buyer/saved"
        />
      </Group>

      <section className="grid gap-2">
        <h2 className="flex items-center gap-1.5 px-1 eyebrow text-muted-foreground">
          <Palette className="size-3.5" aria-hidden />
          Appearance
        </h2>
        <ThemePicker />
      </section>

      <SignOutButton className="h-12 justify-center rounded-full border border-border bg-card text-destructive hover:bg-destructive/5 hover:text-destructive" />

      <footer className="grid justify-items-center gap-1 pb-2 text-center opacity-80">
        <Logo />
        <p className="text-xs text-muted-foreground">
          Farm to buyer · anywhere in Ghana
        </p>
      </footer>
    </div>
  );
}

function Chip({ children }: { children: ReactNode }) {
  return (
    <span className="rounded-full bg-white/15 px-2.5 py-0.5 text-xs font-medium">
      {children}
    </span>
  );
}

function Stat({
  href,
  value,
  label,
}: {
  href: string;
  value: number;
  label: string;
}) {
  return (
    <li>
      <Link href={href} className="grid justify-items-center gap-0.5 px-2">
        <span className="text-2xl font-bold">{value}</span>
        <span className="text-xs text-muted-foreground">{label}</span>
      </Link>
    </li>
  );
}

function Group({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="grid gap-2">
      <h2 className="px-1 eyebrow text-muted-foreground">{title}</h2>
      <ul className="divide-y divide-border overflow-hidden rounded-3xl bg-card">
        {children}
      </ul>
    </section>
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
