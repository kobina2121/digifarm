import "server-only";

import { mkdir, readdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

import { env } from "@/lib/env";

import {
  InvalidWebhookError,
  type PaymentProvider,
  PaymentProviderError,
  type ProviderTransaction,
  type VerifiedStatus,
} from "./provider";

/**
 * DEVELOPMENT STAND-IN for a payment provider. No money moves: "payments" are
 * JSON files under <STORAGE_LOCAL_DIR>/fake-payments/, and the "checkout" is
 * DigiFarm's own /dev/pay page where you choose what happens. Refused outside
 * APP_ENV=development (env.ts).
 */

export type FakeOutcome = "success" | "failed" | "abandoned";

type FakeTransaction = {
  id: string;
  reference: string;
  amountMinor: string;
  currency: string;
  email: string;
  callbackUrl: string;
  status: VerifiedStatus;
  channel: string | null;
  createdAt: string;
  paidAt: string | null;
  refunds: { id: string; amountMinor: string }[];
};

/** A flat 1.95% fee, roughly Paystack Ghana's, so fee bookkeeping is exercised. */
const FEE_BPS = BigInt(195);

const REFERENCE = /^[A-Za-z0-9-]{1,64}$/;

function dir() {
  return path.resolve(env().STORAGE_LOCAL_DIR, "fake-payments");
}

function file(reference: string) {
  if (!REFERENCE.test(reference))
    throw new PaymentProviderError("Bad reference");
  return path.join(dir(), `${reference}.json`);
}

async function load(reference: string): Promise<FakeTransaction | null> {
  try {
    return JSON.parse(await readFile(file(reference), "utf8"));
  } catch {
    return null;
  }
}

async function save(tx: FakeTransaction) {
  await mkdir(dir(), { recursive: true });
  await writeFile(file(tx.reference), JSON.stringify(tx, null, 2));
}

/** For the /dev/pay page: what's being "paid". */
export async function getFakeTransaction(reference: string) {
  const tx = await load(reference);
  if (!tx) return null;
  return {
    reference: tx.reference,
    amountMinor: BigInt(tx.amountMinor),
    status: tx.status,
    callbackUrl: tx.callbackUrl,
  };
}

/** For the /dev/pay page: pretend the buyer approved, declined or walked away. */
export async function completeFakeTransaction(
  reference: string,
  outcome: FakeOutcome,
) {
  const tx = await load(reference);
  if (!tx) throw new PaymentProviderError("Unknown test payment");
  if (tx.status === "pending") {
    tx.status = outcome;
    tx.channel = outcome === "success" ? "mobile_money" : null;
    tx.paidAt = outcome === "success" ? new Date().toISOString() : null;
    await save(tx);
  }
  return { callbackUrl: tx.callbackUrl };
}

export const fakeProvider: PaymentProvider = {
  name: "fake",

  async initialize(input) {
    const existing = await load(input.reference);
    if (!existing) {
      await save({
        id: `fake_${Date.now()}`,
        reference: input.reference,
        amountMinor: input.amountMinor.toString(),
        currency: input.currency,
        email: input.email,
        callbackUrl: input.callbackUrl,
        status: "pending",
        channel: null,
        createdAt: new Date().toISOString(),
        paidAt: null,
        refunds: [],
      });
    }
    return { authorizationUrl: `/dev/pay/${input.reference}` };
  },

  async verify(reference) {
    const tx = await load(reference);
    if (!tx) throw new PaymentProviderError("Unknown test payment");
    const amount = BigInt(tx.amountMinor);
    return {
      status: tx.status,
      rawStatus: tx.status,
      amountMinor: amount,
      currency: tx.currency,
      feeMinor:
        tx.status === "success"
          ? (amount * FEE_BPS + BigInt(5000)) / BigInt(10000)
          : null,
      providerTransactionId: tx.id,
      channel: tx.channel,
      paidAt: tx.paidAt ? new Date(tx.paidAt) : null,
      failureReason:
        tx.status === "failed" ? "Declined on the test page" : null,
    };
  },

  async refund({ transactionReference, amountMinor }) {
    const tx = await load(transactionReference);
    if (!tx || tx.status !== "success") {
      throw new PaymentProviderError("This test payment can’t be refunded");
    }
    const id = `fake_refund_${Date.now()}_${tx.refunds.length + 1}`;
    tx.refunds.push({ id, amountMinor: amountMinor.toString() });
    await save(tx);
    return { providerReference: id, status: "processed" };
  },

  async listTransactions({ from, to }) {
    let names: string[] = [];
    try {
      names = await readdir(dir());
    } catch {
      return [];
    }
    const out: ProviderTransaction[] = [];
    for (const name of names) {
      if (!name.endsWith(".json")) continue;
      const tx = await load(name.slice(0, -5));
      if (!tx) continue;
      const createdAt = new Date(tx.createdAt);
      if (createdAt < from || createdAt > to) continue;
      out.push({
        reference: tx.reference,
        status: tx.status,
        amountMinor: BigInt(tx.amountMinor),
        currency: tx.currency,
        createdAt,
      });
    }
    return out;
  },

  parseWebhook() {
    // The test page returns the buyer to DigiFarm, which verifies directly.
    throw new InvalidWebhookError("The test provider sends no webhooks");
  },
};
