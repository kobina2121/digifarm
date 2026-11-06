import "server-only";

import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";

import { env } from "./env";
import { logger } from "./logger";

export type EmailMessage = {
  to: string;
  subject: string;
  text: string;
};

export interface EmailTransport {
  send(message: EmailMessage): Promise<void>;
}

/**
 * Development transport: prints the email (including any link) to the dev server
 * log and saves a copy under <STORAGE_LOCAL_DIR>/outbox/ so links are easy to open
 * and end-to-end tests can read them. Refused outside APP_ENV=development.
 */
const consoleTransport: EmailTransport = {
  async send(message) {
    logger.info(
      { emailTo: message.to, emailSubject: message.subject },
      `\n────── EMAIL (not sent — development) ──────\nTo: ${message.to}\nSubject: ${message.subject}\n\n${message.text}\n────────────────────────────────────────────`,
    );
    const dir = path.resolve(env().STORAGE_LOCAL_DIR, "outbox");
    await mkdir(dir, { recursive: true });
    const safeTo = message.to.replace(/[^a-z0-9@._-]/gi, "_");
    await writeFile(
      path.join(dir, `${Date.now()}-${safeTo}.json`),
      JSON.stringify(message, null, 2),
    );
  },
};

const RESEND_URL = "https://api.resend.com/emails";
const SEND_TIMEOUT_MS = 10_000;

/**
 * Sends through Resend's HTTP API. The sending domain in `from` must be
 * verified in Resend (until then, only onboarding@resend.dev to the Resend
 * account's own address works). Errors carry Resend's reason, never the key.
 */
export function createResendTransport({
  apiKey,
  from,
  fetch: send = fetch,
}: {
  apiKey: string;
  from: string;
  fetch?: typeof fetch;
}): EmailTransport {
  return {
    async send(message) {
      const response = await send(RESEND_URL, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${apiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          from,
          to: [message.to],
          subject: message.subject,
          text: message.text,
        }),
        signal: AbortSignal.timeout(SEND_TIMEOUT_MS),
      });
      if (!response.ok) {
        const body = (await response.json().catch(() => null)) as {
          message?: string;
        } | null;
        throw new Error(
          `Resend refused the email (${response.status}): ${body?.message ?? response.statusText}`,
        );
      }
    },
  };
}

export function emailTransport(): EmailTransport {
  const config = env();
  switch (config.EMAIL_TRANSPORT) {
    case "console":
      return consoleTransport;
    case "resend":
      return createResendTransport({
        // parseEnv refuses EMAIL_TRANSPORT=resend without a key.
        apiKey: config.RESEND_API_KEY!,
        from: config.EMAIL_FROM,
      });
  }
}

export async function sendEmail(message: EmailMessage): Promise<void> {
  await emailTransport().send(message);
}
