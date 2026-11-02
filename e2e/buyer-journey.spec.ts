import { expect, test } from "@playwright/test";

import { linkFromLatestEmail, submitSignUp, uniqueEmail } from "./helpers";

test("a new buyer signs up, confirms their email, sets up their business and adds an address", async ({
  page,
}) => {
  const email = uniqueEmail("buyer");
  const password = `e2e-${Date.now()}-pass`;

  await page.goto("/sign-up");
  await expect(
    page.getByRole("heading", { name: "Create your account" }),
  ).toBeVisible();
  // Interact only once the page is interactive (as a person would after it loads).
  await page.waitForLoadState("networkidle");

  // Validation runs before anything is sent.
  await page.getByRole("button", { name: "Create account" }).click();
  await expect(page.getByText("Enter your full name")).toBeVisible();

  await page.getByLabel("Your full name").fill("Efua Boateng");
  await page.getByLabel("Email", { exact: true }).fill(email);
  await page.getByLabel("Password").fill(password);
  await submitSignUp(page);

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
    page.getByRole("heading", { name: "Set up your account" }),
  ).toBeVisible();
  await page.waitForLoadState("networkidle");

  // Individuals are the default; this buyer is a business.
  await page.getByText("For a business", { exact: true }).click();

  await page.getByLabel("Business name").fill("Efua's Chop Bar");
  await page.getByLabel("Type of business").selectOption("RESTAURANT");
  await page.getByLabel("Business phone").fill("024 555 0101");
  await page.getByLabel("Region").selectOption("ASHANTI");
  await page.getByLabel("Town or area").fill("Adum");
  await page.getByLabel("GhanaPost GPS address (optional)").fill("ak-039-1234");
  await page.getByRole("button", { name: "Finish setup" }).click();

  await expect(page).toHaveURL(/\/buyer$/);
  await expect(page.getByRole("heading", { name: "Efua" })).toBeVisible();

  // The business details are on the profile.
  await page.goto("/buyer/profile");
  await expect(page.getByText("Efua's Chop Bar").first()).toBeVisible();
  await expect(page.getByText("024 555 0101")).toBeVisible();

  // Second address, then confirm it's listed.
  await page.goto("/buyer/addresses");
  await page.waitForLoadState("networkidle");
  await page.getByLabel("Name for this address").fill("Second kitchen");
  await page.getByLabel("Region").selectOption("VOLTA");
  await page.getByLabel("Town or area").fill("Osu");
  await page.getByRole("button", { name: "Save address" }).click();
  await expect(page.getByText("Address saved.")).toBeVisible();
  await expect(page.getByText("Second kitchen")).toBeVisible();

  // Buyers can't open the staff area.
  await page.goto("/admin");
  await expect(page).toHaveURL(/\/buyer$/);
});

test("an individual signs up without any business details", async ({
  page,
}) => {
  const email = uniqueEmail("person");
  const password = `e2e-${Date.now()}-pass`;

  await page.goto("/sign-up");
  await page.waitForLoadState("networkidle");
  await page.getByLabel("Your full name").fill("Kwame Asante");
  await page.getByLabel("Email", { exact: true }).fill(email);
  await page.getByLabel("Password").fill(password);
  await submitSignUp(page);

  await page.goto(await linkFromLatestEmail(email));
  await expect(page).toHaveURL(/\/onboarding$/);
  await page.waitForLoadState("networkidle");

  // "For myself" is the default: no business name or type is asked for.
  await expect(page.getByLabel("Business name")).toHaveCount(0);
  await page.getByLabel("Phone number").fill("024 555 0202");
  await page.getByLabel("Region").selectOption("GREATER_ACCRA");
  await page.getByLabel("Town or area").fill("East Legon");
  await page.getByRole("button", { name: "Finish setup" }).click();

  await expect(page).toHaveURL(/\/buyer$/);
  await expect(page.getByRole("heading", { name: "Kwame" })).toBeVisible();

  await page.goto("/buyer/profile");
  await expect(page.getByText("Personal", { exact: true })).toBeVisible();
  await expect(page.getByText("Add your business details")).toBeVisible();
});

test("a customer deletes their account and can't sign in with it again", async ({
  page,
}) => {
  const email = uniqueEmail("leaving");
  const password = `e2e-${Date.now()}-pass`;

  await page.goto("/sign-up");
  await page.waitForLoadState("networkidle");
  await page.getByLabel("Your full name").fill("Yaw Mensah");
  await page.getByLabel("Email", { exact: true }).fill(email);
  await page.getByLabel("Password").fill(password);
  await submitSignUp(page);
  await page.goto(await linkFromLatestEmail(email));
  await expect(page).toHaveURL(/\/onboarding$/);
  await page.waitForLoadState("networkidle");
  await page.getByLabel("Phone number").fill("024 555 0303");
  await page.getByLabel("Region").selectOption("NORTHERN");
  await page.getByLabel("Town or area").fill("Tamale");
  await page.getByRole("button", { name: "Finish setup" }).click();
  await expect(page).toHaveURL(/\/buyer$/);

  await page.goto("/buyer/profile");
  await page.getByRole("link", { name: "Delete my account" }).click();
  await expect(page).toHaveURL(/\/account\/delete$/);
  await page.waitForLoadState("networkidle");

  // The button stays off until the word is typed.
  const remove = page.getByRole("button", { name: "Delete my account" });
  await expect(remove).toBeDisabled();
  await page.getByLabel("Type DELETE to confirm").fill("DELETE");

  // A wrong password changes nothing.
  await page.getByLabel("Your password").fill("not-my-password");
  await remove.click();
  await expect(
    page.getByText("That password isn’t right.").first(),
  ).toBeVisible();

  await page.getByLabel("Your password").fill(password);
  await remove.click();
  await expect(page).toHaveURL(/\/account\/deleted$/, { timeout: 30_000 });
  await expect(
    page.getByRole("heading", { name: "Your account has been deleted" }),
  ).toBeVisible();

  // Signed out, and the old details no longer work.
  await page.goto("/buyer");
  await expect(page).toHaveURL(/\/sign-in/);
  await page.waitForLoadState("networkidle");
  await page.getByLabel("Email").fill(email);
  await page.getByLabel("Password").fill(password);
  await page.getByRole("button", { name: "Sign in", exact: true }).click();
  await expect(page.getByText(/email and password don.t match/)).toBeVisible({
    timeout: 30_000,
  });
  await expect(page).toHaveURL(/\/sign-in/);
});
