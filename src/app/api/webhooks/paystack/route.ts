import { logger } from "@/lib/logger";
import { handlePaymentWebhook } from "@/modules/ordering";
import { InvalidWebhookError } from "@/modules/payments";

/**
 * Paystack webhook. The signature is checked against the raw body before
 * anything else; events are deduplicated, and a 500 makes Paystack retry.
 */
export async function POST(request: Request) {
  const rawBody = await request.text();
  try {
    const { duplicate } = await handlePaymentWebhook(rawBody, request.headers);
    return Response.json({ received: true, duplicate });
  } catch (error) {
    if (error instanceof InvalidWebhookError) {
      logger.warn({ reason: error.message }, "Rejected a payment webhook");
      return Response.json({ error: "Invalid signature" }, { status: 401 });
    }
    logger.error({ err: error }, "Payment webhook failed");
    return Response.json({ error: "Processing failed" }, { status: 500 });
  }
}
