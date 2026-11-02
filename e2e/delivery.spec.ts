import { expect, type Page, test } from "@playwright/test";
import { config } from "dotenv";

import { linkFromLatestEmail, submitSignUp, uniqueEmail } from "./helpers";

config({ quiet: true });

const staffEmail = process.env.TEST_OPS_EMAIL;
const staffPassword = process.env.TEST_OPS_PASSWORD;

async function newCustomer(page: Page) {
  const email = uniqueEmail("delivery");
  await page.goto("/sign-up");
  await page.waitForLoadState("networkidle");
  await page.getByLabel("Your full name").fill("Abena Ofori");
  await page.getByLabel("Email", { exact: true }).fill(email);
  await page.getByLabel("Password").fill(`e2e-${Date.now()}-pass`);
  await submitSignUp(page);
  await page.goto(await linkFromLatestEmail(email));
  await page.waitForLoadState("networkidle");
  await page.getByLabel("Phone number").fill("024 555 0404");
  await page.getByLabel("Region").selectOption("VOLTA");
  await page.getByLabel("Town or area").fill("Ho");
  await page.getByRole("button", { name: "Finish setup" }).click();
  await expect(page).toHaveURL(/\/buyer$/);
}

test("an order goes from checkout to delivered, with the customer following along", async ({
  page,
  browser,
}, testInfo) => {
  test.skip(!staffEmail || !staffPassword, "Needs the test staff account");
  // Uses up real test stock, so once per run is plenty.
  test.skip(testInfo.project.name !== "desktop-chrome", "Runs on desktop only");
  test.setTimeout(240_000);

  // The customer orders from a farm in another region and pays.
  await newCustomer(page);
  await page.goto("/market?inStock=1");
  await page.waitForLoadState("networkidle");
  await page
    .getByRole("button", { name: /^Add .* to cart$/ })
    .first()
    .click();
  await expect(page.getByText(/in your cart/).first()).toBeVisible();

  await page.goto("/buyer/cart");
  await expect(page.getByText("Delivery to Volta")).toBeVisible();
  await page.getByRole("link", { name: "Checkout" }).click();
  await expect(page).toHaveURL(/\/buyer\/checkout$/);
  await page.waitForLoadState("networkidle");
  await expect(page.getByText("Delivery GH₵").first()).toBeVisible();
  await page.getByRole("button", { name: /^Pay GH₵/ }).click();

  await expect(page).toHaveURL(/\/dev\/pay\//, { timeout: 30_000 });
  await page
    .getByRole("button", { name: /success|approve|paid/i })
    .first()
    .click();
  await expect(page).toHaveURL(/\/buyer\/orders\/[0-9a-f-]+/, {
    timeout: 30_000,
  });
  const orderUrl = new URL(page.url()).pathname;
  const orderId = orderUrl.split("/").pop();

  // Staff book a rider and record each step.
  const staffContext = await browser.newContext();
  const staff = await staffContext.newPage();
  await staff.goto("/sign-in");
  await staff.waitForLoadState("networkidle");
  await staff.getByLabel("Email").fill(staffEmail!);
  await staff.getByLabel("Password").fill(staffPassword!);
  await staff.getByRole("button", { name: "Sign in", exact: true }).click();
  await expect(staff).toHaveURL(/\/admin/, { timeout: 30_000 });
  await staff.goto(`/admin/orders/${orderId}`);
  await staff.waitForLoadState("networkidle");

  const orderNumber = (await staff
    .getByText(/^DF-\d{4}-\d{6}/)
    .first()
    .textContent())!.match(/DF-\d{4}-\d{6}/)![0];

  await staff.getByLabel("Rider or driver").fill("Kofi Rider");
  await staff.getByLabel("Their phone").fill("024 111 2222");
  await staff.getByLabel("Details (optional)").fill("VIP bus, waybill 1234");
  await staff.getByRole("button", { name: "Save" }).click();
  await expect(staff.getByText("VIP bus, waybill 1234")).toBeVisible();

  await staff.getByRole("button", { name: "Picked up from the farm" }).click();
  await expect(staff.getByLabel("Who received it")).toBeVisible();

  // The customer can see who has it and can't cancel any more.
  await page.goto(orderUrl);
  await expect(page.getByText("On its way with")).toBeVisible();
  await expect(page.getByText("Kofi Rider")).toBeVisible();

  // A failed try, then out again, then delivered.
  await staff.getByRole("button", { name: "Couldn’t deliver" }).click();
  await staff.getByLabel("What went wrong").fill("Gate locked, no answer");
  await staff.getByRole("button", { name: "Record failed delivery" }).click();
  await expect(staff.getByText("Gate locked, no answer")).toBeVisible();

  await page.reload();
  await expect(page.getByText("We couldn’t deliver this one")).toBeVisible();

  await staff.getByRole("button", { name: "Sent out again" }).click();
  await staff.getByLabel("Who received it").fill("Abena Ofori");
  await staff.getByRole("button", { name: "Delivered", exact: true }).click();
  await expect(staff.getByText(/Delivered .* to/)).toBeVisible();

  await page.reload();
  await expect(page.getByText("received by Abena Ofori")).toBeVisible();

  // The farm gets paid, once.
  await staff.goto("/admin/payouts");
  await staff.waitForLoadState("networkidle");
  const row = staff.getByRole("listitem").filter({ hasText: orderNumber });
  await row.getByRole("button", { name: "Record payment" }).click();
  const reference = `MP${Date.now()}`;
  await row.getByLabel("Transaction ID").fill(reference);
  await row.getByRole("button", { name: /I’ve sent/ }).click();
  await expect(staff.getByText(`Ref ${reference}`)).toBeVisible();

  await staffContext.close();
});
