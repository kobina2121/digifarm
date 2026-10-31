import "server-only";

import { createHmac, timingSafeEqual } from "node:crypto";

import { z } from "zod";

import {
  InvalidWebhookError,
  type PaymentProvider,
  PaymentProviderError,
  type ProviderTransaction,
  type VerifiedStatus,
  type WebhookEvent,
} from "./provider";

const API = "https://api.paystack.co";

/**
 * Paystack adapter (mobile money and cards). Amounts are in pesewas, which is
 * what Paystack expects for GHS. Test keys only until live payments are
 * approved (enforced in env.ts).
 */

const envelope = z.object({
  status: z.boolean(),
  message: z.string(),
  data: z.unknown(),
});

const transaction = z.object({
  id: z.number(),
  reference: z.string(),
  status: z.string(),
  amount: z.number().int(),
  currency: z.string(),
  fees: z.number().int().nullable().optional(),
  channel: z.string().nullable().optional(),
  paid_at: z.string().nullable().optional(),
  created_at: z.string().optional(),
  createdAt: z.string().optional(),
  gateway_response: z.string().nullable().optional(),
});

/** Paystack's statuses mapped to ours. Anything unrecognised waits. */
export function mapPaystackStatus(status: string): VerifiedStatus {
  switch (status) {
    case "success":
      return "success";
    case "failed":
    case "reversed":
      return "failed";
    case "abandoned":
      return "abandoned";
    default:
      return "pending"; // ongoing, pending, processing, queued
  }
}

export function paystackSignature(rawBody: string, secretKey: string): string {
  return createHmac("sha512", secretKey).update(rawBody).digest("hex");
}

const webhookBody = z.object({
  event: z.string(),
  data: z.looseObject({
    id: z.union([z.number(), z.string()]).optional(),
    reference: z.string().optional(),
    transaction_reference: z.string().optional(),
    refund_reference: z.string().nullable().optional(),
  }),
});

export function createPaystackProvider(
  secretKey: string,
  fetchImpl: typeof fetch = fetch,
): PaymentProvider {
  async function call<T extends z.ZodType>(
    path: string,
    schema: T,
    init?: { method?: string; body?: unknown },
  ): Promise<z.infer<T>> {
    let res: Response;
    try {
      res = await fetchImpl(`${API}${path}`, {
        method: init?.method ?? "GET",
        headers: {
          Authorization: `Bearer ${secretKey}`,
          "Content-Type": "application/json",
        },
        body: init?.body === undefined ? undefined : JSON.stringify(init.body),
        signal: AbortSignal.timeout(15_000),
      });
    } catch (error) {
      throw new PaymentProviderError(
        "We couldn’t reach the payment service. Please try again.",
        error,
      );
    }
    const json: unknown = await res.json().catch(() => null);
    const body = envelope.safeParse(json);
    const data = body.success ? schema.safeParse(body.data.data) : null;
    if (!res.ok || !body.success || !body.data.status || !data?.success) {
      throw new PaymentProviderError(
        "The payment service didn’t accept the request. Please try again.",
        { status: res.status, body: json },
      );
    }
    return data.data;
  }

  return {
    name: "paystack",

    async initialize(input) {
      const data = await call(
        "/transaction/initialize",
        z.object({ authorization_url: z.url(), reference: z.string() }),
        {
          method: "POST",
          body: {
            email: input.email,
            amount: input.amountMinor.toString(),
            currency: input.currency,
            reference: input.reference,
            callback_url: input.callbackUrl,
            channels: ["mobile_money", "card"],
            metadata: input.metadata,
          },
        },
      );
      return { authorizationUrl: data.authorization_url };
    },

    async verify(reference) {
      const tx = await call(
        `/transaction/verify/${encodeURIComponent(reference)}`,
        transaction,
      );
      const status = mapPaystackStatus(tx.status);
      return {
        status,
        rawStatus: tx.status,
        amountMinor: BigInt(tx.amount),
        currency: tx.currency,
        feeMinor: tx.fees == null ? null : BigInt(tx.fees),
        providerTransactionId: String(tx.id),
        channel: tx.channel ?? null,
        paidAt: tx.paid_at ? new Date(tx.paid_at) : null,
        failureReason:
          status === "failed"
            ? (tx.gateway_response ?? "Payment failed")
            : null,
      };
    },

    async refund({ transactionReference, amountMinor }) {
      const data = await call(
        "/refund",
        z.object({ id: z.union([z.number(), z.string()]), status: z.string() }),
        {
          method: "POST",
          body: {
            transaction: transactionReference,
            amount: amountMinor.toString(),
          },
        },
      );
      return {
        providerReference: String(data.id),
        status:
          data.status === "processed"
            ? "processed"
            : data.status === "failed"
              ? "failed"
              : "processing",
      };
    },

    async listTransactions({ from, to }) {
      const out: ProviderTransaction[] = [];
      for (let page = 1; page <= 50; page++) {
        const query = new URLSearchParams({
          from: from.toISOString(),
          to: to.toISOString(),
          perPage: "100",
          page: String(page),
        });
        const rows = await call(`/transaction?${query}`, z.array(transaction));
        for (const tx of rows) {
          out.push({
            reference: tx.reference,
            status: mapPaystackStatus(tx.status),
            amountMinor: BigInt(tx.amount),
            currency: tx.currency,
            createdAt: new Date(tx.created_at ?? tx.createdAt ?? 0),
          });
        }
        if (rows.length < 100) break;
      }
      return out;
    },

    parseWebhook(rawBody, headers) {
      const given = headers.get("x-paystack-signature") ?? "";
      const expected = paystackSignature(rawBody, secretKey);
      const a = Buffer.from(given, "utf8");
      const b = Buffer.from(expected, "utf8");
      if (a.length !== b.length || !timingSafeEqual(a, b)) {
        throw new InvalidWebhookError();
      }
      let json: unknown;
      try {
        json = JSON.parse(rawBody);
      } catch {
        throw new InvalidWebhookError("Webhook body is not JSON");
      }
      const body = webhookBody.safeParse(json);
      if (!body.success) throw new InvalidWebhookError("Unexpected webhook");
      const { event, data } = body.data;
      // Paystack sends no event ID; the event name plus the object's ID is unique.
      const eventId = `${event}:${data.id ?? data.reference ?? ""}`;
      return toEvent(event, eventId, data);
    },
  };
}

function toEvent(
  event: string,
  eventId: string,
  data: z.infer<typeof webhookBody>["data"],
): WebhookEvent {
  if (event === "charge.success" && data.reference) {
    return { kind: "charge.success", eventId, reference: data.reference };
  }
  if (
    (event === "refund.processed" || event === "refund.failed") &&
    data.id !== undefined
  ) {
    return {
      kind: event,
      eventId,
      refundReference: String(data.id),
      transactionReference: data.transaction_reference ?? null,
    };
  }
  return { kind: "ignored", eventId, type: event };
}
