import { readdir, readFile } from "node:fs/promises";
import path from "node:path";

import { expect } from "@playwright/test";

const OUTBOX = path.resolve(".storage/outbox");

/** Wait for the newest development email to `to` and return the first link in it. */
export async function linkFromLatestEmail(to: string): Promise<string> {
  const safeTo = to.replace(/[^a-z0-9@._-]/gi, "_");
  let link: string | undefined;
  await expect
    .poll(
      async () => {
        const files = (await readdir(OUTBOX).catch(() => [] as string[]))
          .filter((f) => f.endsWith(`-${safeTo}.json`))
          .sort();
        const latest = files.at(-1);
        if (!latest) return undefined;
        const message = JSON.parse(
          await readFile(path.join(OUTBOX, latest), "utf8"),
        ) as { text: string };
        link = message.text.match(/https?:\/\/\S+/)?.[0];
        return link;
      },
      { timeout: 20_000, message: `no email arrived for ${to}` },
    )
    .toBeTruthy();
  return link!;
}

export function uniqueEmail(prefix: string) {
  return `${prefix}.${Date.now()}.${Math.floor(Math.random() * 1e6)}@e2e.digifarm.test`;
}
