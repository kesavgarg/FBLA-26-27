import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { expect, test, type Page } from "@playwright/test";
import { DEMO, demoPassword, resetDemo, signInWithPassword } from "./helpers";

/**
 * The remaining cases from the build guide's testing checklist (section 11)
 * that other files didn't already cover: duplicate email, empty-cart
 * checkout, cancel after preparing, status order, quotes / SQL-style text,
 * keyboard-only use and a very small window.
 */
const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

async function signIn(email: string): Promise<SupabaseClient> {
  const client = createClient(url, anonKey, { auth: { persistSession: false } });
  const { error } = await client.auth.signInWithPassword({ email, password: demoPassword() });
  expect(error).toBeNull();
  return client;
}

async function productId(client: SupabaseClient, slug: string): Promise<string> {
  const { data } = await client.from("products").select("id").eq("slug", slug).single();
  return data!.id;
}

test.describe.configure({ mode: "serial" });
test.beforeAll(resetDemo);

test("registering with an email that already has an account says so", async ({ page }) => {
  await page.goto("/register");
  await page.getByLabel("Full name").fill("Second Margaret");
  await page.getByLabel("Email").fill(DEMO.margaret);
  await page.getByLabel("Date of birth").fill("1958-03-14");
  await page.getByLabel("Password", { exact: true }).fill("another-password-123");
  await page.getByLabel(/student demo/).check();
  await page.getByRole("button", { name: "Create account" }).click();
  await expect(page.getByText("An account with that email already exists.")).toBeVisible();
  await expect(page).toHaveURL(/\/register/);
});

test("checkout with an empty cart is stopped on the page and in the database", async ({ page }) => {
  const daniel = await signIn(DEMO.daniel);
  const { error } = await daniel.rpc("place_order", { p_fulfillment: "delivery", p_idempotency_key: crypto.randomUUID(), p_line1: "40 Elm St", p_zip: "30041" });
  expect(error?.message).toBe("CART_EMPTY");

  await signInWithPassword(page, DEMO.daniel);
  await page.goto("/checkout");
  await expect(page).toHaveURL(/\/cart$/);
  await expect(page.getByRole("heading", { name: "Your cart is empty" })).toBeVisible();
});

test("orders move through statuses in order; customers can't cancel once preparing", async () => {
  const daniel = await signIn(DEMO.daniel);
  const staff = await signIn(DEMO.staff);
  await daniel.rpc("set_cart_quantity", { p_product: await productId(daniel, "honey-lozenges"), p_quantity: 1 });
  const placed = await daniel.rpc("place_order", { p_fulfillment: "delivery", p_idempotency_key: crypto.randomUUID(), p_line1: "40 Elm St", p_zip: "30041" });
  expect(placed.error).toBeNull();
  const order = placed.data.order_id as string;

  // Staff can't skip straight from received to completed.
  const skip = await staff.rpc("staff_set_order_status", { p_order: order, p_status: "completed" });
  expect(skip.error?.message).toBe("BAD_TRANSITION:received|completed");
  // Delivery orders never become "ready for pickup".
  expect((await staff.rpc("staff_set_order_status", { p_order: order, p_status: "preparing" })).error).toBeNull();
  const wrongPath = await staff.rpc("staff_set_order_status", { p_order: order, p_status: "ready_for_pickup" });
  expect(wrongPath.error?.message).toBe("BAD_TRANSITION:preparing|ready_for_pickup");

  // Once preparing, the customer can no longer cancel.
  const cancel = await daniel.rpc("cancel_my_order", { p_order: order });
  expect(cancel.error?.message).toBe("CANNOT_CANCEL");
});

test("quotes, HTML and SQL-style text are stored as plain text, never run", async ({ page }) => {
  const nasty = `O'Brien "side door" <script>window.hacked=1</script> '; DROP TABLE products; --`;
  const daniel = await signIn(DEMO.daniel);
  await daniel.rpc("set_cart_quantity", { p_product: await productId(daniel, "honey-lozenges"), p_quantity: 1 });
  const placed = await daniel.rpc("place_order", {
    p_fulfillment: "delivery",
    p_idempotency_key: crypto.randomUUID(),
    p_line1: "40 Elm St",
    p_zip: "30041",
    p_notes: nasty,
  });
  expect(placed.error).toBeNull();

  // Staff sees the note exactly as typed, the script never ran, and the products table is fine.
  await signInWithPassword(page, DEMO.staff);
  await page.goto(`/staff/orders/${placed.data.order_id}`);
  await expect(page.getByText(nasty, { exact: false })).toBeVisible();
  expect(await page.evaluate(() => (window as unknown as { hacked?: number }).hacked)).toBeUndefined();
  const { count } = await daniel.from("products").select("id", { count: "exact", head: true });
  expect(count).toBeGreaterThan(10);

  // Very long text is refused by the database itself, even if the form's
  // own 300-character check were skipped.
  await daniel.rpc("set_cart_quantity", { p_product: await productId(daniel, "honey-lozenges"), p_quantity: 1 });
  const base = { p_fulfillment: "delivery", p_line1: "40 Elm St", p_zip: "30041" };
  const longAddress = await daniel.rpc("place_order", { ...base, p_idempotency_key: crypto.randomUUID(), p_line1: "x".repeat(500) });
  expect(longAddress.error?.message).toContain("orders_delivery_line1_check");
  const longNotes = await daniel.rpc("place_order", { ...base, p_idempotency_key: crypto.randomUUID(), p_notes: "n".repeat(400) });
  expect(longNotes.error?.message).toContain("orders_delivery_notes_check");
  await daniel.rpc("set_cart_quantity", { p_product: await productId(daniel, "honey-lozenges"), p_quantity: 0 });
});

test("keyboard only: skip link, then add to cart without a mouse", async ({ page }) => {
  await signInWithPassword(page, DEMO.margaret);
  await page.goto("/shop/select-vitamin-d3");

  await page.keyboard.press("Tab");
  const skip = page.getByRole("link", { name: "Skip to content" });
  await expect(skip).toBeFocused();
  await expect(skip).toBeInViewport();
  await page.keyboard.press("Enter");
  await expect(page).toHaveURL(/#main$/);

  // Tab forward until "Add to cart" has focus, then press Enter.
  const add = page.getByRole("button", { name: "Add to cart" });
  for (let i = 0; i < 40 && !(await add.evaluate((el) => el === document.activeElement)); i++) {
    await page.keyboard.press("Tab");
  }
  await expect(add).toBeFocused();
  // The focus ring is visible (not removed by the styles).
  const outline = await add.evaluate((el) => getComputedStyle(el).outlineStyle);
  expect(outline).not.toBe("none");
  await page.keyboard.press("Enter");
  await expect(page.getByText("Added to your cart.")).toBeVisible();
});

async function sideScroll(page: Page, path: string) {
  await page.goto(path);
  return page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
}

test("a very small window (320 px) never scrolls sideways", async ({ page }) => {
  await page.setViewportSize({ width: 320, height: 700 });
  for (const path of ["/", "/shop", "/about", "/help", "/login", "/register"]) {
    expect(await sideScroll(page, path), path).toBeLessThanOrEqual(0);
  }
  await signInWithPassword(page, DEMO.margaret);
  for (const path of ["/account", "/cart", "/checkout", "/account/orders", "/account/health/check", "/account/security"]) {
    expect(await sideScroll(page, path), path).toBeLessThanOrEqual(0);
  }
});
