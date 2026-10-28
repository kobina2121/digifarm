import {
  Award,
  ClipboardList,
  MapPin,
  ShieldCheck,
  ShoppingBasket,
} from "lucide-react";
import Link from "next/link";

import { GoogleButton } from "@/components/auth/google-button";
import { LogoMark } from "@/components/brand/logo";
import { buttonVariants } from "@/components/ui/button";
import { googleSignInEnabled } from "@/lib/env";
import { cn } from "@/lib/utils";

const BUYERS = [
  "Restaurants",
  "Hotels",
  "Caterers",
  "Retailers",
  "Wholesalers",
  "Food processors",
];

const STEPS = [
  {
    title: "Choose produce",
    body: "See price, unit, grade and minimum order for each listing. Items without confirmed stock are marked unavailable.",
  },
  {
    title: "Pay securely",
    body: "Pay by mobile money or card. Payment is confirmed with the provider before your order moves forward.",
  },
  {
    title: "We confirm with the farm",
    body: "Our team calls the farm to confirm your quantities. Anything that can't be supplied is refunded automatically.",
  },
  {
    title: "Track to delivery",
    body: "Follow each status update from confirmation to delivery, and report any problem with the produce you receive.",
  },
];

export default function HomePage() {
  return (
    <>
      <section className="mx-auto max-w-6xl px-4 pt-10 pb-14 sm:pt-16 sm:pb-20">
        <p className="eyebrow text-field-green">Farm to buyer · Ghana</p>
        <h1 className="mt-4 max-w-3xl text-4xl leading-[1.05] font-bold text-soil sm:text-6xl">
          Fresh produce for your business, straight from verified farms.
        </h1>
        <p className="mt-5 max-w-xl text-lg text-muted-foreground">
          DigiFarm connects kitchens, shops and processors with farms our team
          has visited in person. Order from the marketplace, or ask us to source
          in bulk for you.
        </p>
        <div className="mt-8 flex flex-col gap-3 sm:flex-row">
          <Link
            href="/sign-up"
            className={cn(buttonVariants({ size: "lg" }), "w-full sm:w-auto")}
          >
            Create a buyer account
          </Link>
          <Link
            href="/sign-in"
            className={cn(
              buttonVariants({ size: "lg", variant: "outline" }),
              "w-full sm:w-auto",
            )}
          >
            Sign in
          </Link>
        </div>
        <div className="mt-3 sm:max-w-sm">
          <GoogleButton available={googleSignInEnabled()} />
        </div>
        <ul
          className="mt-10 flex flex-wrap gap-2"
          aria-label="Who DigiFarm serves"
        >
          {BUYERS.map((b) => (
            <li
              key={b}
              className="rounded-full border border-border bg-card px-3 py-1 text-sm text-soil"
            >
              {b}
            </li>
          ))}
        </ul>
      </section>

      <section className="border-y border-border bg-card">
        <div className="mx-auto grid max-w-6xl gap-4 px-4 py-14 md:grid-cols-2">
          <h2 className="text-3xl font-bold md:col-span-2">Two ways to buy</h2>
          <div className="rounded-2xl border border-border p-6">
            <ShoppingBasket className="size-6 text-field-green" aria-hidden />
            <h3 className="mt-4 text-xl font-bold">Marketplace</h3>
            <p className="mt-2 text-muted-foreground">
              Browse listings from approved farms, compare grades and prices,
              and order the quantities you need.
            </p>
          </div>
          <div className="rounded-2xl border border-border p-6">
            <ClipboardList className="size-6 text-field-green" aria-hidden />
            <h3 className="mt-4 text-xl font-bold">Managed sourcing</h3>
            <p className="mt-2 text-muted-foreground">
              Tell us what you need, the quality, budget and deadline. We find
              the farms and send you a full quotation, delivery included.
            </p>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-4 py-14">
        <h2 className="text-3xl font-bold">How an order works</h2>
        <ol className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {STEPS.map((step, i) => (
            <li
              key={step.title}
              className="rounded-2xl border border-border bg-card p-5"
            >
              <span className="eyebrow text-field-green">Step {i + 1}</span>
              <h3 className="mt-2 text-lg font-bold">{step.title}</h3>
              <p className="mt-2 text-sm text-muted-foreground">{step.body}</p>
            </li>
          ))}
        </ol>
      </section>

      <section className="mx-auto max-w-6xl px-4 pb-16">
        <div className="grid gap-8 rounded-3xl bg-field-green p-6 text-white sm:p-10 md:grid-cols-[1fr_auto] md:items-center">
          <div>
            <h2 className="text-3xl font-bold">
              Every farm is visited before it sells
            </h2>
            <ul className="mt-6 space-y-4">
              <li className="flex gap-3">
                <ShieldCheck
                  className="mt-0.5 size-5 shrink-0 text-sprout"
                  aria-hidden
                />
                <span>
                  Our team visits each farm and records what they grow before
                  approving it.
                </span>
              </li>
              <li className="flex gap-3">
                <MapPin
                  className="mt-0.5 size-5 shrink-0 text-sprout"
                  aria-hidden
                />
                <span>Pilot deliveries cover Greater Accra and Kumasi.</span>
              </li>
              <li className="flex gap-3">
                <Award
                  className="mt-0.5 size-5 shrink-0 text-sprout"
                  aria-hidden
                />
                <span>
                  Produce is graded A, B or C so you know what you are ordering.
                </span>
              </li>
            </ul>
          </div>
          <LogoMark tone="on-dark" className="hidden h-40 md:block" />
        </div>
      </section>
    </>
  );
}
