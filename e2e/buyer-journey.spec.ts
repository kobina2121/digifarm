import { expect, test } from "@playwright/test";

import { linkFromLatestEmail, uniqueEmail } from "./helpers";

test("a new buyer signs up, confirms their email, sets up their business and adds an address", async ({
  page,
}) => {
  const email = uniqueEmail("buyer");
  const password = `e2e-${Date.now()}-pass`;

  await page.goto("/");
  await page.getByRole("link", { name: "Create a buyer account" }).click();
  await expect(
    page.getByRole("heading", { name: "Create your account" }),
  ).toBeVisible();
  // Interact only once the page is interactive (as a person would after it loads).
  await page.waitForLoadState("networkidle");

  // Validation runs before anything is sent.
  await page.getByRole("button", { name: "Create account" }).click();
  await expect(page.getByText("Enter your full name")).toBeVisible();

  await page.getByLabel("Your full name").fill("Efua Boateng");
  await page.getByLabel("Work email").fill(email);
  await page.getByLabel("Password").fill(password);
  await page.getByRole("button", { name: "Create account" }).click();
  await expect(
    page.getByRole("heading", { name: "Check your email" }),
  ).toBeVisible();

  // Unverified users can't get into the app.
  await page.goto("/sign-in");
  await page.waitForLoadState("networkidle");
  await page.getByLabel("Email").fill(email);
  await page.getByLabel("Password").fill(password);
  await page.getByRole("button", { name: "Sign in" }).click();
  await expect(page.getByText("Please confirm your email first")).toBeVisible();

  // Open the confirmation link from the development outbox.
  await page.goto(await linkFromLatestEmail(email));
  await expect(page).toHaveURL(/\/onboarding$/);
  await expect(
    page.getByRole("heading", { name: "Set up your business" }),
  ).toBeVisible();
  await page.waitForLoadState("networkidle");

  await page.getByLabel("Business name").fill("Efua's Chop Bar");
  await page.getByLabel("Type of business").selectOption("RESTAURANT");
  await page.getByLabel("Business phone").fill("024 555 0101");
  await page.getByText("Kumasi", { exact: true }).click();
  await page.getByLabel("Town or area").fill("Adum");
  await page.getByLabel("GhanaPost GPS address (optional)").fill("ak-039-1234");
  await page.getByRole("button", { name: "Finish setup" }).click();

  await expect(page).toHaveURL(/\/buyer$/);
  await expect(
    page.getByRole("heading", { name: "Efua's Chop Bar" }),
  ).toBeVisible();
  await expect(page.getByText("024 555 0101")).toBeVisible();

  // Second address, then confirm it's listed.
  await page.goto("/buyer/addresses");
  await page.waitForLoadState("networkidle");
  await page.getByLabel("Name for this address").fill("Second kitchen");
  await page.getByLabel("Delivery area").selectOption("ACCRA");
  await page.getByLabel("Town or area").fill("Osu");
  await page.getByRole("button", { name: "Save address" }).click();
  await expect(page.getByText("Address saved.")).toBeVisible();
  await expect(page.getByText("Second kitchen")).toBeVisible();

  // Buyers can't open the staff area.
  await page.goto("/admin");
  await expect(page).toHaveURL(/\/buyer$/);
});
