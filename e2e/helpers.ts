import { readdir, readFile } from "node:fs/promises";
import path from "node:path";

import { expect, type Page } from "@playwright/test";

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

/**
 * Submit the sign-up form and wait for "Check your email". Sign-ups are limited
 * to 5 a minute per address and all the browser projects share one, so when the
 * limit is reached wait it out, as a person would, rather than switching it off.
 */
export async function submitSignUp(page: Page) {
  const submit = page.getByRole("button", { name: "Create account" });
  const sent = page.getByRole("heading", { name: "Check your email" });
  const limited = page.getByText("Too many attempts");
  await submit.click();
  // Longer than the default: it writes to a remote database and can hit a slow moment.
  await expect(sent.or(limited)).toBeVisible({ timeout: 30_000 });
  if (await limited.isVisible()) {
    await page.waitForTimeout(61_000);
    await submit.click();
    await expect(sent).toBeVisible({ timeout: 30_000 });
  }
}
