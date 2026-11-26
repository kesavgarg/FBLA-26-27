import { expect, test } from "@playwright/test";
import { DEMO, resetDemo, signInWithPassword } from "./helpers";

/**
 * The customer journey through the real website.
 * Brief scenarios: 11 out-of-stock, 10 allergy (UI), 12 totals,
 * 13 inventory, 14 orders persist after refresh, invalid checkout input,
 * budget constraint, refills.
 */
test.describe.configure({ mode: "serial" });
test.beforeAll(resetDemo);

test("search, filter and sort the catalog", async ({ page }) => {
  await page.goto("/shop?q=vitamin");
  await expect(page.getByText(/^\d+ products?$/)).toBeVisible();
  await expect(page.getByRole("link", { name: /Vitamin D3/ })).toBeVisible();

  await page.goto("/shop?q=zzzz-not-a-product");
  await expect(page.getByRole("heading", { name: "No products match your search" })).toBeVisible();

  await page.goto("/shop?category=first_aid&sort=price_asc");
  const prices = await page.locator("li p.tabular").allInnerTexts();
  const cents = prices.map((p) => Math.round(Number(p.replace(/[$,]/g, "")) * 100));
  expect(cents).toEqual([...cents].sort((a, b) => a - b));
});

test("sold-out and allergy items show why they can't be bought", async ({ page }) => {
  await signInWithPassword(page, DEMO.margaret);
  await page.goto("/shop/select-loratadine-10");
  await expect(page.getByText("Sold out right now.", { exact: false })).toBeVisible();
  await expect(page.getByRole("button", { name: "Add to cart" })).toHaveCount(0);

  await page.goto("/shop/select-aspirin-81");
  await expect(page.getByText("Blocked for your safety")).toBeVisible();
  await expect(page.getByRole("button", { name: "Add to cart" })).toHaveCount(0);

  await page.goto("/shop/rx-benzonatate-100");
  await expect(page.getByText("Prescription required").first()).toBeVisible();
  await expect(page.getByRole("button", { name: "Add to cart" })).toHaveCount(0);
});

test("full order: cart totals, checkout validation, order placed, persists, cancel", async ({ page }) => {
  await signInWithPassword(page, DEMO.daniel);

  // Acetaminophen $7.99 × 2 and a thermometer $12.99 → $28.97 + 7% tax ($2.03) = $31.00
  await page.goto("/shop/select-acetaminophen-500");
  await page.getByRole("button", { name: "+1" }).click();
  await page.getByRole("button", { name: "Add to cart" }).click();
  await expect(page.getByText("Added to your cart.")).toBeVisible();
  await page.goto("/shop/digital-thermometer");
  await page.getByRole("button", { name: "Add to cart" }).click();
  await expect(page.getByText("Added to your cart.")).toBeVisible();

  await page.goto("/cart");
  const summary = page.locator("dl").first();
  await expect(summary).toContainText("$28.97");
  await expect(summary).toContainText("$2.03");
  await expect(summary).toContainText("$31.00");

  // A quantity above stock is caught in the cart.
  const thermometerQty = page.getByLabel("Quantity for Goodson Select Digital Thermometer");
  await thermometerQty.fill("5");
  await page.getByRole("button", { name: "Update" }).last().click();
  await expect(page.getByText("Only 2 of", { exact: false })).toBeVisible();

  // Checkout: submitting pickup without a time shows a field error.
  await page.getByRole("link", { name: "Go to checkout" }).click();
  await page.getByRole("button", { name: /Place order/ }).click();
  await expect(page.getByText("Choose a pickup time.")).toBeVisible();

  // Delivery outside the area is refused before reaching the database.
  await page.getByLabel(/Home delivery/).check();
  await page.getByLabel("Street address", { exact: true }).fill("1 Hollywood Blvd");
  await page.getByLabel("ZIP code", { exact: true }).fill("90210");
  await page.getByRole("button", { name: /Place order/ }).click();
  await expect(page.getByText("We don’t deliver to that ZIP code yet.")).toBeVisible();

  // Pickup with a time → order placed.
  await page.getByLabel(/Pickup at the pharmacy/).check();
  await page.locator('label:has(input[name="slotId"]:not([disabled]))').first().click();
  await page.getByRole("button", { name: /Place order · \$31\.00/ }).click();
  await expect(page).toHaveURL(/\/account\/orders\/[0-9a-f-]+\?placed=1/);
  await expect(page.getByRole("heading", { name: "Thank you. Your order is in." })).toBeVisible();
  const orderNumber = await page.locator("p.tabular").filter({ hasText: /^GD-/ }).first().innerText();

  // Persists after a refresh and shows up in history.
  await page.reload();
  await expect(page.getByText(orderNumber)).toBeVisible();
  await page.goto("/account/orders");
  await expect(page.getByText(orderNumber)).toBeVisible();

  // Stock went down: the thermometer is now sold out.
  await page.goto("/shop/digital-thermometer");
  await expect(page.getByText("Only 1 left")).toBeVisible();

  // Cancel it.
  await page.goto("/account/orders");
  await page.getByRole("link", { name: `View order ${orderNumber}` }).click();
  await page.getByRole("button", { name: "Cancel order" }).click();
  await page.getByRole("button", { name: "Yes, cancel this order" }).click();
  await expect(page.getByText("This order was cancelled.").first()).toBeVisible();
});

test("a spending limit blocks checkout when the cart is over it", async ({ page }) => {
  await signInWithPassword(page, DEMO.daniel);
  await page.goto("/shop/get-well-basket");
  await page.getByRole("button", { name: "Add to cart" }).click();
  await expect(page.getByText("Added to your cart.")).toBeVisible();

  await page.goto("/cart");
  await page.getByLabel("Limit in dollars").fill("20");
  await page.getByRole("button", { name: "Save limit" }).click();
  await expect(page.getByText("Spending limit saved.")).toBeVisible();
  await page.reload();
  await expect(page.getByText(/over your \$20\.00 limit/)).toBeVisible();
  await expect(page.getByRole("link", { name: "Go to checkout" })).toHaveCount(0);

  // Invalid limits are rejected.
  await page.getByLabel("Limit in dollars").fill("-5");
  await page.getByRole("button", { name: "Save limit" }).click();
  await expect(page.getByText("Enter an amount between $1 and $1,000.")).toBeVisible();

  // Tidy up: remove limit and item.
  await page.getByRole("button", { name: "Remove limit" }).click();
  await page.getByRole("button", { name: /Remove Get Well Soon/ }).click();
  await expect(page.getByText("Your cart is empty")).toBeVisible();
});

test("refills: eligible, expired and no-refill prescriptions each say what to do", async ({ page }) => {
  await signInWithPassword(page, DEMO.margaret);
  await page.goto("/account/prescriptions");
  await expect(page.getByText("This prescription has expired.", { exact: false })).toBeVisible();
  await expect(page.getByText("No refills left.", { exact: false })).toBeVisible();
  // RX-100231 already has a refill in progress from the database test, or is eligible on a fresh run.
  const inProgress = page.getByText("Refills in progress");
  if ((await inProgress.count()) === 0) {
    await page.getByRole("button", { name: "Request refill" }).click();
    await page.getByLabel("Home delivery").check();
    await page.getByRole("button", { name: "Send refill request" }).click();
    await expect(page.getByText("Refill requested.", { exact: false })).toBeVisible();
  }
  await page.reload();
  await expect(page.getByText("Refills in progress")).toBeVisible();
});

test("the shop works in Spanish", async ({ page }) => {
  await page.goto("/shop");
  await page.getByRole("button", { name: /ES/ }).click();
  await expect(page.getByRole("heading", { name: "Productos de farmacia, listos cuando usted lo esté" })).toBeVisible();
  await expect(page.getByRole("link", { name: "Alivio del dolor", exact: true })).toBeVisible();
  await page.getByRole("button", { name: /EN/ }).click();
});
