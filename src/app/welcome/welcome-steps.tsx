"use client";

import { ArrowRight } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { type ComponentType, useRef, useState } from "react";

import { Logo } from "@/components/brand/logo";
import { Button, buttonVariants } from "@/components/ui/button";
import {
  ChooseProduce,
  ConfirmWithFarm,
  PaySecurely,
  TrackDelivery,
  VerifiedFarm,
} from "@/components/welcome/illustrations";
import { cn } from "@/lib/utils";

import { WELCOME_SEEN_COOKIE } from "./constants";

const STEPS: { title: string; body: string; Art: ComponentType }[] = [
  {
    title: "Produce from farms we’ve visited",
    body: "Every farm on DigiFarm is visited by our team and approved before it can sell to you.",
    Art: VerifiedFarm,
  },
  {
    title: "Choose what you need",
    body: "Compare price, unit, grade and minimum order. Items without confirmed stock are clearly marked.",
    Art: ChooseProduce,
  },
  {
    title: "Pay securely",
    body: "Pay with mobile money or card. Your payment is confirmed with the provider before your order moves forward.",
    Art: PaySecurely,
  },
  {
    title: "What you see is in stock",
    body: "DigiFarm keeps every farm’s stock up to date. If you can order it, it’s available, and anything sold out says so.",
    Art: ConfirmWithFarm,
  },
  {
    title: "Track it to your door",
    body: "Follow each step from confirmation to delivery in Greater Accra and Kumasi, and report any problem with what arrives.",
    Art: TrackDelivery,
  },
];

/** Remember for a year so the welcome screens only appear on first launch. */
function markSeen() {
  document.cookie = `${WELCOME_SEEN_COOKIE}=1; Max-Age=31536000; Path=/; SameSite=Lax`;
}

export function WelcomeSteps() {
  const router = useRouter();
  const track = useRef<HTMLDivElement>(null);
  const [index, setIndex] = useState(0);
  const last = index === STEPS.length - 1;

  function goTo(i: number) {
    const el = track.current;
    if (!el) return;
    el.scrollTo({ left: i * el.clientWidth, behavior: "smooth" });
  }

  function onScroll() {
    const el = track.current;
    if (!el) return;
    const i = Math.round(el.scrollLeft / el.clientWidth);
    if (i !== index) setIndex(i);
  }

  function finish(path: string) {
    markSeen();
    router.replace(path);
  }

  return (
    <div className="flex min-h-dvh flex-col bg-background pt-safe pb-safe">
      <header className="flex h-16 items-center justify-between px-4">
        <Logo />
        {!last ? (
          <Button
            variant="ghost"
            className="px-3 text-muted-foreground"
            onClick={() => finish("/sign-in")}
          >
            Skip
          </Button>
        ) : null}
      </header>

      <div
        ref={track}
        onScroll={onScroll}
        className="flex flex-1 snap-x snap-mandatory [scrollbar-width:none] overflow-x-auto overscroll-x-contain [&::-webkit-scrollbar]:hidden"
        aria-roledescription="carousel"
        aria-label="How DigiFarm works"
      >
        {STEPS.map(({ title, body, Art }, i) => (
          <section
            key={title}
            className="flex w-full shrink-0 snap-center flex-col items-center justify-center px-6"
            aria-roledescription="slide"
            aria-label={`Step ${i + 1} of ${STEPS.length}`}
            aria-hidden={i !== index}
          >
            <div className="w-full max-w-xs">
              <Art />
            </div>
            <p className="mt-6 eyebrow text-field-green">
              Step {i + 1} of {STEPS.length}
            </p>
            <h1 className="mt-2 max-w-sm text-center text-3xl font-bold text-soil">
              {title}
            </h1>
            <p className="mt-3 max-w-sm text-center text-base text-muted-foreground">
              {body}
            </p>
          </section>
        ))}
      </div>

      <div className="grid gap-5 px-4 pt-4 pb-2">
        <div
          className="flex justify-center gap-2"
          role="tablist"
          aria-label="Choose a step"
        >
          {STEPS.map((step, i) => (
            <button
              key={step.title}
              type="button"
              role="tab"
              aria-selected={i === index}
              aria-label={`Step ${i + 1}: ${step.title}`}
              onClick={() => goTo(i)}
              className="flex h-6 items-center"
            >
              <span
                className={cn(
                  "block h-2 rounded-full transition-all",
                  i === index ? "w-6 bg-field-green" : "w-2 bg-input",
                )}
              />
            </button>
          ))}
        </div>

        {last ? (
          <div className="mx-auto grid w-full max-w-sm gap-3">
            <Link
              href="/sign-up"
              onClick={markSeen}
              replace
              className={cn(buttonVariants({ size: "lg" }), "w-full")}
            >
              Create a buyer account
            </Link>
            <Link
              href="/sign-in"
              onClick={markSeen}
              replace
              className={cn(
                buttonVariants({ size: "lg", variant: "outline" }),
                "w-full",
              )}
            >
              I already have an account
            </Link>
            <Link
              href="/market"
              onClick={markSeen}
              replace
              className="py-1 text-center text-sm font-medium text-field-green underline-offset-4 hover:underline"
            >
              Just browse produce first
            </Link>
          </div>
        ) : (
          <Button
            size="lg"
            className="mx-auto w-full max-w-sm"
            onClick={() => goTo(index + 1)}
          >
            Next
            <ArrowRight aria-hidden />
          </Button>
        )}
      </div>
    </div>
  );
}
