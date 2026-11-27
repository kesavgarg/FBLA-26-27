import { createClient } from "@supabase/supabase-js";
import { expect, test } from "@playwright/test";
import { DEMO, resetDemo, signInWithPassword } from "./helpers";

/**
 * Phase 5: owner analytics, reports + CSV, audit log, demo reset, roles,
 * store settings, usability log, help assistant, About page, and the
 * owner-only protections.
 */
test.describe.configure({ mode: "serial" });
test.beforeAll(resetDemo);

const admin = () => createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, { auth: { persistSession: false } });

test("owner dashboard shows simulated analytics and validates dates", async ({ page }) => {
  await signInWithPassword(page, DEMO.owner);
  await expect(page.getByText("Simulated revenue")).toBeVisible();
  await expect(page.getByRole("img", { name: "Orders per day" })).toBeVisible();
  await expect(page.getByText("Pickup vs delivery")).toBeVisible();
  await page.getByRole("link", { name: "Last 7 days" }).click();
  await expect(page).toHaveURL(/from=.*&to=/);
  await page.goto("/owner?from=2026-11-20&to=2026-11-01");
  await expect(page.getByText("The start date must be on or before the end date.", { exact: false })).toBeVisible();
});

test("reports group by category and download as CSV", async ({ page }) => {
  await signInWithPassword(page, DEMO.owner);
  await page.goto("/owner/reports");
  await page.getByLabel("Category").check();
  await page.getByRole("button", { name: "Update report" }).click();
  await expect(page).toHaveURL(/group=category/);
  await expect(page.getByRole("columnheader", { name: "Category" })).toBeVisible();
  await expect(page.getByRole("button", { name: "Print or save as PDF" })).toBeVisible();

  const response = await page.request.get(`/owner/reports/export?${new URL(page.url()).searchParams}`);
  expect(response.status()).toBe(200);
  expect(response.headers()["content-type"]).toContain("text/csv");
  const csv = await response.text();
  expect(csv).toContain("Simulated data");
  expect(csv).toContain('"Category","Orders","Units sold","Simulated sales"');
});

test("demo reset works from the presenter guide and is audited", async ({ page }) => {
  await signInWithPassword(page, DEMO.owner);
  await page.goto("/owner/demo");
  await page.getByRole("button", { name: "Reset demo data" }).click();
  await expect(page.getByText("Type RESET to confirm.").last()).toBeVisible();
  await page.getByLabel("Type RESET to confirm").fill("RESET");
  await page.getByRole("button", { name: "Reset demo data" }).click();
  await expect(page.getByText(/Demo restored: 34 products/)).toBeVisible();
  await page.goto("/owner/audit?type=admin");
  await expect(page.getByText("Demo reset").first()).toBeVisible();
});

test("owner can grant and remove staff access; it takes effect", async ({ page }) => {
  await signInWithPassword(page, DEMO.owner);
  await page.goto("/owner/users");
  const row = page.locator("li", { hasText: "daniel@goodson-demo.example" });
  await row.getByLabel("Role for Daniel Ortiz").selectOption("staff");
  await row.getByRole("button", { name: "Save role" }).click();
  await expect(row.getByText("Role updated.")).toBeVisible();

  await page.context().clearCookies();
  await signInWithPassword(page, DEMO.daniel);
  await expect(page).toHaveURL(/\/staff$/);

  await page.context().clearCookies();
  await signInWithPassword(page, DEMO.owner);
  await page.goto("/owner/users");
  await row.getByLabel("Role for Daniel Ortiz").selectOption("customer");
  await row.getByRole("button", { name: "Save role" }).click();
  await expect(row.getByText("Role updated.")).toBeVisible();
});

test("store settings validate input and change the tax shown in the cart", async ({ page }) => {
  await signInWithPassword(page, DEMO.owner);
  await page.goto("/owner/settings");
  await page.getByLabel("Sales tax rate (%)").fill("50");
  await page.getByRole("button", { name: "Save settings" }).click();
  await expect(page.getByText("Tax rate must be 0–20%.")).toBeVisible();
  await page.getByLabel("Sales tax rate (%)").fill("8");
  await page.getByRole("button", { name: "Save settings" }).click();
  await expect(page.getByText("Settings saved.", { exact: false })).toBeVisible();

  await page.goto("/shop/select-vitamin-c");
  await page.getByRole("button", { name: "Add to cart" }).click();
  await expect(page.getByText("Added to your cart.")).toBeVisible();
  await page.goto("/cart");
  await expect(page.getByText("Sales tax (8%, non-prescription items)")).toBeVisible();

  // Put things back.
  await page.getByRole("button", { name: /Remove/ }).first().click();
  await page.goto("/owner/settings");
  await page.getByLabel("Sales tax rate (%)").fill("7");
  await page.getByRole("button", { name: "Save settings" }).click();
  await expect(page.getByText("Settings saved.", { exact: false })).toBeVisible();
});

test("usability log requires consent and a code, never a name", async ({ page }) => {
  await signInWithPassword(page, DEMO.owner);
  await page.goto("/owner/usability");
  await expect(page.getByText("No sessions recorded yet.")).toBeVisible();
  await page.getByLabel("Participant code").fill("Jane Smith");
  await page.getByLabel("Time taken (seconds)").fill("40");
  await page.getByRole("button", { name: "Record session" }).click();
  await expect(page.getByText("Use a code like P01 (no names).")).toBeVisible();
  await expect(page.getByText("Record a test only after the participant agrees.")).toBeVisible();

  // A test-only entry (P99), removed straight after so no fake results remain.
  await page.getByLabel("Participant code").fill("P99");
  await page.getByLabel(/The participant agreed/).check();
  await page.getByRole("button", { name: "Record session" }).click();
  await expect(page.getByText("Session recorded.")).toBeVisible();
  await admin().from("usability_sessions").delete().eq("participant_code", "P99");
});

test("customers cannot open owner pages or download reports", async ({ page }) => {
  await signInWithPassword(page, DEMO.margaret);
  await page.goto("/owner/reports");
  await expect(page).toHaveURL(/\/forbidden$/);
  const response = await page.request.get("/owner/reports/export?from=2026-11-01&to=2026-11-02", { maxRedirects: 0 });
  expect(response.status()).not.toBe(200);
});

test("help assistant answers in English and Spanish", async ({ page }) => {
  await page.goto("/help");
  const assistant = page.getByRole("region", { name: "Ask the help assistant" });
  await page.getByLabel("Your question").fill("how do I refill my medicine?");
  await page.getByRole("button", { name: "Ask" }).click();
  await expect(assistant.getByText("Open Refills, find the prescription", { exact: false })).toBeVisible();

  await page.getByLabel("Your question").fill("what is the meaning of life");
  await page.getByRole("button", { name: "Ask" }).click();
  await expect(assistant.getByText("I couldn’t find an answer to that.", { exact: false })).toBeVisible();

  await page.getByRole("button", { name: /ES/ }).click();
  await page.getByLabel("Su pregunta").fill("¿Cómo cancelo un pedido?");
  await page.getByRole("button", { name: "Preguntar" }).click();
  await expect(page.getByRole("region", { name: "Pregunte al asistente" }).getByText("Abra Pedidos, elija el pedido", { exact: false })).toBeVisible();
  await page.getByRole("button", { name: /EN/ }).click();
});

test("About page shows the heritage timeline in both languages", async ({ page }) => {
  await page.goto("/about");
  await expect(page.getByRole("heading", { name: "Milestones" })).toBeVisible();
  await expect(page.getByText("Jim Goodson Sr. opens the pharmacy on July 24", { exact: false })).toBeVisible();
  await page.getByRole("button", { name: /ES/ }).click();
  await expect(page.getByRole("heading", { name: "Momentos clave" })).toBeVisible();
  await page.getByRole("button", { name: /EN/ }).click();
});
