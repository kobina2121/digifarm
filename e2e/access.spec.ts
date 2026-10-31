import { expect, test } from "@playwright/test";

test.describe("signed-out visitors", () => {
  for (const path of [
    "/buyer",
    "/buyer/addresses",
    "/admin",
    "/admin/suppliers",
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

  test("can still read the install guide", async ({ page }) => {
    await page.goto("/install");
    await expect(
      page.getByRole("heading", { name: "iPhone (Safari)" }),
    ).toBeVisible();
  });
});
