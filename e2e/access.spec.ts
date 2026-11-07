import { expect, test } from "@playwright/test";

test.describe("signed-out visitors", () => {
  for (const path of [
    "/buyer",
    "/buyer/addresses",
    "/buyer/cart",
    "/buyer/checkout",
    "/buyer/orders",
    "/buyer/profile",
    "/admin",
    "/admin/listings",
    "/admin/grades",
    "/admin/suppliers",
    "/admin/orders",
    "/admin/payments",
    "/onboarding",
  ]) {
    test(`are sent to sign in from ${path}`, async ({ page }) => {
      await page.goto(path);
      await expect(page).toHaveURL(/\/sign-in/);
    });
  }

  test("cannot fetch private farm photos", async ({ request }) => {
    const response = await request.get(
      "/api/files/farm-visit-photos/00000000-0000-0000-0000-000000000000",
    );
    expect(response.status()).toBe(404);
  });

  // "/" and "/home" show first-time visitors the welcome screens instead.
  test("open the app at / and see the welcome screens first", async ({
    page,
  }) => {
    await page.goto("/");
    await expect(page).toHaveURL(/\/welcome$/);
    await expect(
      page.getByRole("heading", { name: "Produce from farms we’ve visited" }),
    ).toBeVisible();
    await page.waitForLoadState("networkidle");
    await page.getByRole("button", { name: "Skip" }).click();
    await expect(page).toHaveURL(/\/sign-in/);

    // Once the welcome screens have been seen, / goes straight to sign-in.
    await page.goto("/");
    await expect(page).toHaveURL(/\/sign-in/);
  });

  test("can browse and filter the market without signing in", async ({
    page,
  }) => {
    await page.goto("/market");
    await expect(
      page.getByRole("heading", { level: 1, name: "Market" }),
    ).toBeVisible();
    await expect(
      page.getByRole("banner").getByRole("link", { name: "Sign in" }),
    ).toBeVisible();

    await page.waitForLoadState("networkidle");
    await page.getByRole("button", { name: "Filters" }).click();
    await page.getByLabel("Farm region").selectOption("ASHANTI");
    await page.getByRole("button", { name: "Show results" }).click();
    await expect(page).toHaveURL(/region=ASHANTI/);
    await expect(
      page.getByRole("heading", { level: 1, name: "Market" }),
    ).toBeVisible();
  });

  test("get a not-found page for listings that don't exist", async ({
    page,
  }) => {
    await page.goto("/market/listings/not-a-real-id");
    await expect(page.getByText("could not be found")).toBeVisible();
  });

  test("are asked to sign in before ordering", async ({ page }) => {
    await page.goto("/market");
    const first = page.locator('a[href^="/market/listings/"]').first();
    test.skip((await first.count()) === 0, "no listings in this database");
    const href = (await first.getAttribute("href"))!;
    await first.click();
    // The market has a heading too, so wait for the product page itself.
    await expect(page).toHaveURL(href);
    await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
    await expect(
      page
        .getByRole("link", { name: "Sign in to order" })
        .or(page.getByText("can’t be ordered right now")),
    ).toBeVisible();
    await expect(page.getByRole("button", { name: "Add to cart" })).toHaveCount(
      0,
    );
  });

  test("cannot send unsigned payment webhooks or run scheduled jobs", async ({
    request,
  }) => {
    const webhook = await request.post("/api/webhooks/paystack", {
      data: { event: "charge.success", data: { reference: "DF-FAKE" } },
    });
    expect(webhook.status()).toBe(401);
    for (const job of ["expire-orders", "reconcile-payments"]) {
      const response = await request.get(`/api/cron/${job}`);
      expect(response.status()).toBe(401);
    }
  });

  test("can still read the install guide", async ({ page }) => {
    await page.goto("/install");
    await expect(
      page.getByRole("heading", { name: "iPhone (Safari)" }),
    ).toBeVisible();
  });
});
