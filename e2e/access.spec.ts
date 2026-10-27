import { expect, test } from "@playwright/test";

test.describe("signed-out visitors", () => {
  for (const path of [
    "/home",
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

  test("see the landing page and install guide", async ({ page }) => {
    await page.goto("/");
    await expect(page.getByRole("heading", { level: 1 })).toContainText(
      "Fresh produce",
    );
    await page.goto("/install");
    await expect(
      page.getByRole("heading", { name: "iPhone (Safari)" }),
    ).toBeVisible();
  });
});
