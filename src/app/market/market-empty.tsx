import { ShieldCheck, Sprout, Truck } from "lucide-react";
import Link from "next/link";

import { BasketArt } from "@/components/illustrations/commerce-art";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type Viewer = "visitor" | "buyer" | "staff";

const PROMISES = [
  { icon: ShieldCheck, text: "Every farm is visited by our team" },
  { icon: Truck, text: "Delivered anywhere in Ghana" },
  { icon: Sprout, text: "New harvests added every week" },
];

/**
 * What the market shows when it has nothing to list: either no produce is on
 * sale yet, or a search or filter found nothing.
 */
export function MarketEmpty({
  viewer,
  searched,
}: {
  viewer: Viewer;
  /** Set when a search or filter found nothing: what to tell them. */
  searched?: { title: string };
}) {
  return (
    <section className="grid justify-items-center gap-4 overflow-hidden rounded-3xl bg-card px-6 pt-6 pb-8 text-center">
      <div className="w-full max-w-56 rounded-full bg-sprout-soft p-6">
        <BasketArt className="h-auto w-full" />
      </div>

      {searched ? (
        <>
          <h2 className="text-xl font-bold">{searched.title}</h2>
          <p className="max-w-sm text-sm text-muted-foreground">
            Try another word or fewer filters. Farms add new harvests every
            week.
          </p>
          <Link
            href="/market"
            className={cn(buttonVariants({ size: "lg" }), "rounded-full px-8")}
          >
            See all produce
          </Link>
        </>
      ) : (
        <>
          <h2 className="text-xl font-bold">Fresh harvests are on the way</h2>
          <p className="max-w-sm text-sm text-muted-foreground">
            We’re visiting farms across Ghana and adding their produce. Check
            back soon.
          </p>
          <ul className="grid w-full max-w-sm gap-2 text-left text-sm">
            {PROMISES.map(({ icon: Icon, text }) => (
              <li
                key={text}
                className="flex items-center gap-3 rounded-2xl bg-muted px-4 py-3"
              >
                <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-sprout-soft text-field-green-dark">
                  <Icon className="size-4" aria-hidden />
                </span>
                {text}
              </li>
            ))}
          </ul>
          <EmptyActions viewer={viewer} />
        </>
      )}
    </section>
  );
}

function EmptyActions({ viewer }: { viewer: Viewer }) {
  const primary = cn(buttonVariants({ size: "lg" }), "rounded-full px-8");
  if (viewer === "staff") {
    return (
      <Link href="/admin/listings/new" className={primary}>
        Add the first listing
      </Link>
    );
  }
  if (viewer === "buyer") {
    return (
      <Link href="/home" className={primary}>
        Back to Home
      </Link>
    );
  }
  return (
    <div className="grid w-full max-w-sm gap-2">
      <Link href="/sign-up" className={primary}>
        Create your account
      </Link>
      <Link
        href="/welcome"
        className={cn(
          buttonVariants({ variant: "ghost", size: "lg" }),
          "rounded-full",
        )}
      >
        How Akuafo works
      </Link>
    </div>
  );
}
