/**
 * What DigiFarm needs from a payment provider (ROADMAP §2.2). Adapters turn a
 * provider's API into these shapes; nothing outside this module knows which
 * provider is in use. Amounts are always integer minor units (pesewas).
 */

export type InitializeInput = {
  reference: string;
  amountMinor: bigint;
  currency: string;
  email: string;
  /** Where the provider sends the buyer after paying. */
  callbackUrl: string;
  metadata?: Record<string, string>;
};

export type VerifiedStatus = "success" | "failed" | "abandoned" | "pending";

export type Verification = {
  status: VerifiedStatus;
  /** The provider's own wording, kept for support and reconciliation. */
  rawStatus: string;
  amountMinor: bigint;
  currency: string;
  feeMinor: bigint | null;
  providerTransactionId: string | null;
  channel: string | null;
  paidAt: Date | null;
  failureReason: string | null;
};

export type RefundResult = {
  providerReference: string;
  status: "processing" | "processed" | "failed";
};

export type ProviderTransaction = {
  reference: string;
  status: VerifiedStatus;
  amountMinor: bigint;
  currency: string;
  createdAt: Date;
};

export type WebhookEvent =
  | { kind: "charge.success"; eventId: string; reference: string }
  | {
      kind: "refund.processed" | "refund.failed";
      eventId: string;
      refundReference: string;
      transactionReference: string | null;
    }
  | { kind: "ignored"; eventId: string; type: string };

export interface PaymentProvider {
  readonly name: "paystack" | "fake";
  initialize(input: InitializeInput): Promise<{ authorizationUrl: string }>;
  /** Ask the provider what happened. The only source of truth for "paid". */
  verify(reference: string): Promise<Verification>;
  refund(input: {
    transactionReference: string;
    amountMinor: bigint;
  }): Promise<RefundResult>;
  listTransactions(range: {
    from: Date;
    to: Date;
  }): Promise<ProviderTransaction[]>;
  /** Check the signature and read the event. Throws {@link InvalidWebhookError}. */
  parseWebhook(rawBody: string, headers: Headers): WebhookEvent;
}

export class InvalidWebhookError extends Error {
  constructor(message = "Webhook signature is invalid") {
    super(message);
    this.name = "InvalidWebhookError";
  }
}

/** The provider couldn't be reached or refused the request. Safe to show the message. */
export class PaymentProviderError extends Error {
  constructor(
    message: string,
    readonly cause?: unknown,
  ) {
    super(message);
    this.name = "PaymentProviderError";
  }
}
