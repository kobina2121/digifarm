import { expect, test } from "@playwright/test";

// Needs a production build (the service worker is off in `next dev`):
//   pnpm build && pnpm start -p 3001
//   PWA_BASE_URL=http://localhost:3001 pnpm test:e2e --project=desktop-chrome e2e/pwa.spec.ts
const base = process.env.PWA_BASE_URL;

test.describe("installable PWA", () => {
  test.skip(!base, "Set PWA_BASE_URL to a production build to run PWA checks");
  test.use({ baseURL: base });

  test("has an installable manifest with the brand colours and icons", async ({
    request,
  }) => {
    const manifest = await (await request.get("/manifest.webmanifest")).json();
    expect(manifest).toMatchObject({
      name: "DigiFarm",
      display: "standalone",
      theme_color: "#17663a",
    });
    for (const icon of manifest.icons) {
      const res = await request.get(icon.src);
      expect(res.headers()["content-type"]).toBe("image/png");
    }
    expect(
      manifest.icons.some(
        (i: { purpose?: string }) => i.purpose === "maskable",
      ),
    ).toBe(true);
  });

  test("shows the branded offline page and never serves pages from cache", async ({
    page,
    context,
  }) => {
    await page.goto("/sign-in");
    await page.evaluate(() => navigator.serviceWorker.ready);
    await page.reload(); // now controlled by the service worker
    expect(
      await page.evaluate(() => !!navigator.serviceWorker.controller),
    ).toBe(true);

    const cached = await page.evaluate(async () => {
      const urls: string[] = [];
      for (const name of await caches.keys()) {
        for (const req of await (await caches.open(name)).keys())
          urls.push(new URL(req.url).pathname);
      }
      return urls;
    });
    // Only the app shell is cached: no pages with data, no API responses.
    for (const url of cached) {
      expect(
        url === "/offline" ||
          url.startsWith("/splash/") ||
          url.startsWith("/_next/static/") ||
          url.startsWith("/icon"),
      ).toBe(true);
    }

    await context.setOffline(true);
    await page.goto("/sign-in").catch(() => undefined);
    await expect(
      page.getByRole("heading", { name: "You’re offline" }),
    ).toBeVisible();
    await context.setOffline(false);
  });
});
