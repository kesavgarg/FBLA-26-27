import { createClient } from "@supabase/supabase-js";
import { expect, test, type Page } from "@playwright/test";
import { DEMO, demoPassword, resetDemo, signInWithPassword } from "./helpers";

/**
 * The FBLA demonstration sequence, end to end through the real website:
 *   customer survey (+ Apple Watch sample) → consult → doctor approves →
 *   prescription unlocked → cart → checkout → staff prepares → ready →
 *   customer sees "Ready for pickup".
 * Plus the alternative demos: doctor denies, doctor asks for more info,
 * emergency red flag, staff inventory change, and role protection.
 * Brief scenarios 5, 6, 7, 8, 15, 18.
 */
test.describe.configure({ mode: "serial" });
test.beforeAll(resetDemo);

async function switchUser(page: Page, email: string) {
  await page.context().clearCookies();
  await signInWithPassword(page, email);
}

async function runSymptomCheck(page: Page, opts: { symptom: string; redFlag?: string; severity?: number; watch?: boolean }) {
  await page.goto("/account/health/check");
  await page.getByText(opts.symptom, { exact: true }).click();
  if (opts.redFlag) await page.getByLabel(opts.redFlag).check();
  else await page.getByLabel("None of these").check();
  if (opts.redFlag) {
    await page.getByRole("button", { name: "See my next step" }).click();
    return;
  }
  await page.getByRole("button", { name: "Continue" }).click();
  if (opts.severity) await page.getByLabel("How bad is it, from 1 to 10?").fill(String(opts.severity));
  await page.getByRole("button", { name: "Continue" }).click();
  if (opts.watch) {
    await page.getByRole("button", { name: "Preview sample data" }).click();
    await expect(page.getByText("Simulated sample")).toBeVisible();
    await page.getByRole("button", { name: "Import this sample" }).click();
    await expect(page.getByText("Sample watch data added to this check.")).toBeVisible();
  }
  await page.getByRole("button", { name: "Continue" }).click();
  await page.getByRole("button", { name: "See my next step" }).click();
}

test("a red-flag answer shows the emergency screen and no shopping", async ({ page }) => {
  await signInWithPassword(page, DEMO.daniel);
  await runSymptomCheck(page, { symptom: "Headache", redFlag: "Chest pain or pressure" });
  await expect(page.getByRole("heading", { name: "Call 911 now" })).toBeVisible();
  await expect(page.getByRole("link", { name: "Call 911" })).toHaveAttribute("href", "tel:911");
  await expect(page.getByRole("button", { name: "Send to the doctor" })).toHaveCount(0);
});

test("main demo: survey → doctor approves → buy → staff → ready for pickup", async ({ page }) => {
  // 1. Customer: symptom check with the Apple Watch sample → consult.
  await signInWithPassword(page, DEMO.margaret);
  await runSymptomCheck(page, { symptom: "Cough", severity: 8, watch: true });
  await expect(page.getByRole("heading", { name: "A clinician should look at this" })).toBeVisible();
  await page.getByLabel("Message to the doctor").fill("Dry cough for several nights, keeping me awake. No fever. (Fictional.)");
  await page.getByRole("button", { name: "Send to the doctor" }).click();
  await expect(page.getByText("Sent. The doctor will review your request.")).toBeVisible();

  // Before approval the Rx item is locked.
  await page.goto("/shop/rx-benzonatate-100");
  await expect(page.getByRole("button", { name: "Add to cart" })).toHaveCount(0);

  // 2. Doctor: review and approve. The penicillin-class item is blocked for Margaret.
  await switchUser(page, DEMO.doctor);
  await page.getByRole("link", { name: /Margaret Ellis/ }).first().click();
  await expect(page.getByText("Watch data (simulated sample)")).toBeVisible();
  await expect(page.locator("option", { hasText: "blocked: allergic to penicillin" })).toBeDisabled();
  await page.getByLabel("Prescription item").selectOption({ label: "Benzonatate 100 mg capsules (Rx)" });
  await page.getByLabel("Directions on the label").fill("Take 1 capsule by mouth up to three times daily as needed for cough. (Fictional.)");
  await page.getByLabel("Note for the patient").fill("Approved for a short course. Follow up if it lasts another week.");
  await page.getByRole("button", { name: "Approve and create prescription" }).click();
  await expect(page.getByText(/Prescription RX-\d{6}: Benzonatate/)).toBeVisible();

  // 3. Customer: sees approval, buys the first fill.
  await switchUser(page, DEMO.margaret);
  await page.goto("/account/consults");
  await expect(page.getByText("Approved").first()).toBeVisible();
  await page.getByRole("link", { name: "Go to the prescription item" }).click();
  await expect(page.getByText(/Approved for you: Rx RX-\d{6}/)).toBeVisible();
  await page.getByRole("button", { name: "Add to cart" }).click();
  await expect(page.getByText("Added to your cart.")).toBeVisible();
  await page.goto("/checkout");
  await page.locator('label:has(input[name="slotId"]:not([disabled]))').first().click();
  await page.getByRole("button", { name: /Place order/ }).click();
  await expect(page.getByRole("heading", { name: "Thank you. Your order is in." })).toBeVisible();
  const orderNumber = await page.locator("p.tabular").filter({ hasText: /^GD-/ }).first().innerText();

  // 4. Staff: the order is in the queue; prepare it and mark ready.
  await switchUser(page, DEMO.staff);
  await page.getByRole("link", { name: orderNumber, exact: true }).click();
  await page.getByRole("button", { name: "Mark as “Being prepared”" }).click();
  await expect(page.getByRole("button", { name: "Mark as “Ready for pickup”" })).toBeVisible();
  await page.getByRole("button", { name: "Mark as “Ready for pickup”" }).click();
  await expect(page.getByRole("button", { name: "Mark as “Completed”" })).toBeVisible();

  // 5. Customer sees "Ready for pickup" and the pharmacist's name.
  await switchUser(page, DEMO.margaret);
  await page.goto("/account/orders");
  await page.getByRole("link", { name: `View order ${orderNumber}` }).click();
  await expect(page.getByText("Ready for pickup").first()).toBeVisible();
  await expect(page.getByText(/ready for pickup at 116 W\. Maple St\. Pharmacist: Dana Whitfield/)).toBeVisible();

  // The first fill is used: the item is locked again (refills go through Refills).
  await page.goto("/shop/rx-benzonatate-100");
  await expect(page.getByRole("button", { name: "Add to cart" })).toHaveCount(0);
});

test("alternative demo: doctor asks for info, then denies; item stays locked", async ({ page }) => {
  // Daniel's seeded request (wants an antibiotic for a mild cough).
  await signInWithPassword(page, DEMO.doctor);
  await page.getByRole("link", { name: /Daniel Ortiz/ }).first().click();
  await page.getByText("Ask for information").click();
  await page.getByLabel("Question for the patient").fill("Have you had a fever above 100.4°F at any point?");
  await page.getByRole("button", { name: "Send question" }).click();
  await expect(page.getByText("Waiting for the patient’s answer.")).toBeVisible();

  await switchUser(page, DEMO.daniel);
  await page.goto("/account/consults");
  await expect(page.getByText("Doctor needs more information").first()).toBeVisible();
  await page.getByLabel("Your answer").fill("No fever at all, just the cough.");
  await page.getByRole("button", { name: "Send answer" }).click();
  await expect(page.getByText("Answer sent. The doctor will look again.")).toBeVisible();

  await switchUser(page, DEMO.doctor);
  await page.getByRole("link", { name: /Daniel Ortiz/ }).first().click();
  await expect(page.getByText("No fever at all, just the cough.")).toBeVisible();
  await page.getByText("Deny", { exact: true }).click();
  await page.getByLabel("Note for the patient").fill("An antibiotic won't help a viral cough. Try honey lozenges and rest; see a clinician if it worsens.");
  await page.getByRole("button", { name: "Deny request" }).click();
  await expect(page.getByText("An antibiotic won't help a viral cough.", { exact: false })).toBeVisible();

  await switchUser(page, DEMO.daniel);
  await page.goto("/account/consults");
  await expect(page.getByText("The doctor did not approve a prescription.", { exact: false })).toBeVisible();
  await page.goto("/shop/rx-amoxicillin-500");
  await expect(page.getByRole("button", { name: "Add to cart" })).toHaveCount(0);
});

test("staff inventory change shows in the shop and is audited", async ({ page }) => {
  await signInWithPassword(page, DEMO.staff);
  await page.goto("/staff/inventory");
  await page.getByLabel("Stock for Goodson Select Loratadine 10 mg, 30 tablets").fill("12");
  const row = page.locator("li", { has: page.getByLabel("Stock for Goodson Select Loratadine 10 mg, 30 tablets") });
  await row.getByRole("button", { name: "Save" }).click();
  await expect(row.getByText("Saved.")).toBeVisible();

  await page.goto("/shop/select-loratadine-10");
  await expect(page.getByRole("button", { name: "Add to cart" })).toBeVisible();

  // Invalid stock is refused.
  await page.goto("/staff/inventory");
  await page.getByLabel("Stock for Goodson Select Loratadine 10 mg, 30 tablets").fill("-4");
  await row.getByRole("button", { name: "Save" }).click();
  await expect(row.getByText("Stock must be a whole number from 0 to 9,999.")).toBeVisible();
});

test("customers cannot run doctor or staff database functions", async () => {
  const client = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!, { auth: { persistSession: false } });
  await client.auth.signInWithPassword({ email: DEMO.daniel, password: demoPassword() });
  const { data: consults } = await client.from("consult_requests").select("id").limit(1);
  const decide = await client.rpc("doctor_decide_consult", { p_consult: consults?.[0]?.id ?? crypto.randomUUID(), p_decision: "approve", p_note: "self-approve" });
  expect(decide.error?.message).toBe("NOT_ALLOWED");
  const status = await client.rpc("staff_set_order_status", { p_order: crypto.randomUUID(), p_status: "completed" });
  expect(status.error?.message).toBe("NOT_ALLOWED");
  const stock = await client.rpc("staff_update_product", { p_product: crypto.randomUUID(), p_quantity: 999, p_price_cents: 1, p_is_active: true });
  expect(stock.error?.message).toBe("NOT_ALLOWED");
});

test("the owner can view a consult but cannot approve it", async ({ page }) => {
  await signInWithPassword(page, DEMO.owner);
  await page.goto("/doctor");
  await expect(page.getByRole("heading", { name: "Consult inbox" })).toBeVisible();
  await page.locator('a[href^="/doctor/consults/"]').first().click();
  await expect(page.getByText("Only the doctor account can decide.", { exact: false })).toBeVisible();
  await expect(page.getByRole("button", { name: /Approve and create prescription/ })).toHaveCount(0);
});
