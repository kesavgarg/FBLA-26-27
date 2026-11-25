import { expect, test } from "@playwright/test";
import { DEMO, addVirtualAuthenticator, signInWithPassword } from "./helpers";

/**
 * Brief test scenarios covered here:
 *  1. Customer registration and login
 *  2. Passkey authentication (virtual authenticator)
 *  3. Customer cannot access staff pages
 *  4. Customer cannot access doctor pages
 */

test("signed-out visitors are sent to sign in from protected areas", async ({ page }) => {
  await page.goto("/staff");
  await expect(page).toHaveURL(/\/login\?next=%2Fstaff/);
});

test("registration validates input, then creates a customer account", async ({ page }) => {
  await page.goto("/register");
  await page.getByRole("button", { name: "Create account" }).click();
  await expect(page.getByText("This field is required.").first()).toBeVisible();

  const email = `e2e-${Date.now()}@goodson-demo.example`;
  await page.getByLabel("Full name").fill("Test Customer");
  await page.getByLabel("Email").fill(email);
  await page.getByLabel("Date of birth").fill("2030-01-01");
  await page.getByLabel("Password", { exact: true }).fill("e2e-password-123");
  await page.getByLabel(/student demo/).check();
  await page.getByRole("button", { name: "Create account" }).click();
  await expect(page.getByText("Date of birth can’t be in the future.")).toBeVisible();

  await page.getByLabel("Date of birth").fill("1990-05-05");
  await page.getByRole("button", { name: "Create account" }).click();
  await expect(page).toHaveURL(/\/account\/security\?setup=1/);
  await expect(page.getByRole("heading", { name: "Add a passkey" })).toBeVisible();
});

test("wrong password shows a clear error", async ({ page }) => {
  await page.goto("/login");
  await page.getByLabel("Email").fill(DEMO.margaret);
  await page.getByLabel("Password", { exact: true }).fill("not-the-password");
  await page.getByRole("button", { name: "Sign in with password" }).click();
  await expect(page.getByText("That email and password don’t match an account.")).toBeVisible();
});

test("a customer cannot open staff, doctor or owner pages", async ({ page }) => {
  await signInWithPassword(page, DEMO.margaret);
  await expect(page).toHaveURL(/\/account$/);
  for (const path of ["/staff", "/doctor", "/owner"]) {
    await page.goto(path);
    await expect(page).toHaveURL(/\/forbidden$/);
  }
});

test("each role lands in its own workspace", async ({ page }) => {
  for (const [email, path] of [
    [DEMO.staff, "/staff"],
    [DEMO.doctor, "/doctor"],
    [DEMO.owner, "/owner"],
  ] as const) {
    await page.context().clearCookies();
    await signInWithPassword(page, email);
    await expect(page).toHaveURL(new RegExp(`${path}$`));
  }
});

test("a customer can add a passkey and sign in with it", async ({ page }) => {
  await addVirtualAuthenticator(page);
  await signInWithPassword(page, DEMO.daniel);

  await page.goto("/account/security");
  await page.getByRole("button", { name: "Add passkey with Touch ID" }).click();
  await expect(page.getByText("Passkey added.")).toBeVisible();

  // Sign out, then back in using only the passkey.
  await page.getByRole("button", { name: "Sign out" }).click();
  await expect(page).toHaveURL(/\/login/);
  await page.getByRole("button", { name: "Sign in with passkey" }).click();
  await expect(page).toHaveURL(/\/account$/);
  await expect(page.getByRole("heading", { name: /Hello, Daniel/ })).toBeVisible();

  // Clean up so the test can run again.
  await page.goto("/account/security");
  await page.getByRole("button", { name: /^Remove/ }).first().click();
  await expect(page.getByText("Passkey removed.")).toBeVisible();
});

test("language switch changes the sign-in page to Spanish and persists", async ({ page }) => {
  await page.goto("/login");
  await page.getByRole("button", { name: /ES/ }).click();
  await expect(page.getByRole("heading", { name: "Bienvenido de nuevo" })).toBeVisible();
  await page.reload();
  await expect(page.getByRole("heading", { name: "Bienvenido de nuevo" })).toBeVisible();
  await page.getByRole("button", { name: /EN/ }).click();
  await expect(page.getByRole("heading", { name: "Welcome back" })).toBeVisible();
});

test("accessibility mode enlarges text and persists after reload", async ({ page }) => {
  await page.goto("/login");
  await page.getByRole("button", { name: "Accessibility" }).click();
  await page.getByRole("switch", { name: "Larger text" }).click();
  await expect(page.locator("html")).toHaveAttribute("data-text", "large");
  await page.reload();
  await expect(page.locator("html")).toHaveAttribute("data-text", "large");
  await page.getByRole("button", { name: "Accessibility" }).click();
  await page.getByRole("switch", { name: "Larger text" }).click();
  await expect(page.locator("html")).not.toHaveAttribute("data-text", "large");
});
