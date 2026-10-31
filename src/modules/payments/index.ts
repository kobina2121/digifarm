import "server-only";

import { env } from "@/lib/env";

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

/** The configured provider (PAYMENT_PROVIDER). */
export function paymentProvider(): PaymentProvider {
  if (override) return override;
  const config = env();
  switch (config.PAYMENT_PROVIDER) {
    case "fake":
      return fakeProvider;
    case "paystack":
      return createPaystackProvider(config.PAYSTACK_SECRET_KEY!);
  }
}

/** Tests only: swap in a scripted provider. Pass null to restore. */
export function setPaymentProviderForTests(provider: PaymentProvider | null) {
  override = provider;
}
