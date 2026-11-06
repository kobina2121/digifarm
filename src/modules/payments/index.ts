import "server-only";

import { env } from "@/lib/env";
import { AppError } from "@/lib/errors";

import { fakeProvider } from "./fake";
import { createPaystackProvider } from "./paystack";
import type { PaymentProvider } from "./provider";

export {
  completeFakeTransaction,
  type FakeOutcome,
  getFakeTransaction,
} from "./fake";
export {
  InvalidWebhookError,
  type PaymentProvider,
  PaymentProviderError,
  type ProviderTransaction,
  type Verification,
  type WebhookEvent,
} from "./provider";

let override: PaymentProvider | null = null;

export const PAYMENTS_OFF_MESSAGE =
  "Ordering opens soon. We can’t take payments yet, so no order was placed.";

/** Whether buyers can pay. PAYMENT_PROVIDER=none keeps checkout closed. */
export function paymentsEnabled(): boolean {
  return Boolean(override) || env().PAYMENT_PROVIDER !== "none";
}

/** The configured provider (PAYMENT_PROVIDER). */
export function paymentProvider(): PaymentProvider {
  if (override) return override;
  const config = env();
  switch (config.PAYMENT_PROVIDER) {
    case "fake":
      return fakeProvider;
    case "paystack":
      return createPaystackProvider(config.PAYSTACK_SECRET_KEY!);
    case "none":
      throw new AppError(PAYMENTS_OFF_MESSAGE, "PAYMENTS_OFF", 503);
  }
}

/** Tests only: swap in a scripted provider. Pass null to restore. */
export function setPaymentProviderForTests(provider: PaymentProvider | null) {
  override = provider;
}
