import { describe, expect, it, vi } from "vitest";

import {
  createPaystackProvider,
  mapPaystackStatus,
  paystackSignature,
} from "./paystack";
import { InvalidWebhookError, PaymentProviderError } from "./provider";

const KEY = "sk_test_example";

function reply(body: unknown, status = 200) {
  return vi.fn(
    async () =>
      new Response(JSON.stringify(body), {
        status,
        headers: { "Content-Type": "application/json" },
      }),
  );
}

describe("Paystack adapter", () => {
  it("starts a checkout in pesewas, for mobile money and cards", async () => {
    const fetch = reply({
      status: true,
      message: "ok",
      data: {
        authorization_url: "https://checkout.paystack.com/abc",
        reference: "DF-1",
      },
    });
    const provider = createPaystackProvider(KEY, fetch);
    const result = await provider.initialize({
      reference: "DF-1",
      amountMinor: BigInt(225000),
      currency: "GHS",
      email: "buyer@example.test",
      callbackUrl: "http://localhost:3000/back",
    });
    expect(result.authorizationUrl).toBe("https://checkout.paystack.com/abc");
    const [url, init] = fetch.mock.calls[0] as unknown as [string, RequestInit];
    expect(url).toBe("https://api.paystack.co/transaction/initialize");
    expect(init.headers).toMatchObject({ Authorization: `Bearer ${KEY}` });
    expect(JSON.parse(init.body as string)).toMatchObject({
      amount: "225000",
      currency: "GHS",
      reference: "DF-1",
      channels: ["mobile_money", "card"],
    });
  });

  it("reads a verification, including the fee", async () => {
    const provider = createPaystackProvider(
      KEY,
      reply({
        status: true,
        message: "ok",
        data: {
          id: 99,
          reference: "DF-1",
          status: "success",
          amount: 225000,
          currency: "GHS",
          fees: 4388,
          channel: "mobile_money",
          paid_at: "2026-10-31T10:00:00.000Z",
        },
      }),
    );
    const v = await provider.verify("DF-1");
    expect(v).toMatchObject({
      status: "success",
      amountMinor: BigInt(225000),
      feeMinor: BigInt(4388),
      providerTransactionId: "99",
      channel: "mobile_money",
    });
  });

  it("treats anything unexpected from Paystack as a provider error", async () => {
    const provider = createPaystackProvider(
      KEY,
      reply({ status: false, message: "Invalid key" }, 401),
    );
    await expect(provider.verify("DF-1")).rejects.toBeInstanceOf(
      PaymentProviderError,
    );
  });

  it("maps Paystack statuses, waiting on anything it doesn't recognise", () => {
    expect(mapPaystackStatus("success")).toBe("success");
    expect(mapPaystackStatus("failed")).toBe("failed");
    expect(mapPaystackStatus("abandoned")).toBe("abandoned");
    expect(mapPaystackStatus("ongoing")).toBe("pending");
    expect(mapPaystackStatus("something-new")).toBe("pending");
  });

  it("accepts only webhooks signed with the secret key", () => {
    const provider = createPaystackProvider(KEY, reply({}));
    const body = JSON.stringify({
      event: "charge.success",
      data: { id: 99, reference: "DF-1" },
    });
    const signed = new Headers({
      "x-paystack-signature": paystackSignature(body, KEY),
    });
    expect(provider.parseWebhook(body, signed)).toEqual({
      kind: "charge.success",
      eventId: "charge.success:99",
      reference: "DF-1",
    });

    const forged = new Headers({
      "x-paystack-signature": paystackSignature(body, "sk_test_other"),
    });
    expect(() => provider.parseWebhook(body, forged)).toThrow(
      InvalidWebhookError,
    );
    expect(() => provider.parseWebhook(body, new Headers())).toThrow(
      InvalidWebhookError,
    );
    const tampered = body.replace("DF-1", "DF-2");
    expect(() => provider.parseWebhook(tampered, signed)).toThrow(
      InvalidWebhookError,
    );
  });
});
