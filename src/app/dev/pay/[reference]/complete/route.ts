import { notFound } from "next/navigation";
import { NextResponse } from "next/server";

import { env } from "@/lib/env";
import { completeFakeTransaction, type FakeOutcome } from "@/modules/payments";

const OUTCOMES: FakeOutcome[] = ["success", "failed", "abandoned"];

/**
 * DEVELOPMENT ONLY: the test payment page's buttons post here. A full-page
 * redirect back to DigiFarm, as Paystack's checkout does.
 */
export async function POST(
  request: Request,
  { params }: RouteContext<"/dev/pay/[reference]/complete">,
) {
  if (env().PAYMENT_PROVIDER !== "fake") notFound();
  const { reference } = await params;
  const outcome = String((await request.formData()).get("outcome"));
  if (!OUTCOMES.includes(outcome as FakeOutcome)) notFound();
  const { callbackUrl } = await completeFakeTransaction(
    reference,
    outcome as FakeOutcome,
  );
  // Stay on whichever local server is running (the callback names APP_URL).
  const back = new URL(new URL(callbackUrl).pathname, request.url);
  back.searchParams.set("reference", reference);
  return NextResponse.redirect(back, { status: 303 });
}
