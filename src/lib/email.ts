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

export function emailTransport(): EmailTransport {
  switch (env().EMAIL_TRANSPORT) {
    case "console":
      return consoleTransport;
  }
}

export async function sendEmail(message: EmailMessage): Promise<void> {
  await emailTransport().send(message);
}
