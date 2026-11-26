import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { expect, test } from "@playwright/test";
import { DEMO, demoPassword, resetDemo } from "./helpers";

/**
 * Ordering rules tested straight against the database functions — the same
 * calls an attacker could make from a browser console. These prove the
 * rules hold even if the website's own checks were skipped.
 *
 * Brief scenarios: 7/8 unapproved Rx can't be bought, 9 expired refill,
 * 10 allergy restriction, 11 out-of-stock, 13 inventory decreases,
 * plus insufficient inventory and two buyers racing for the last item.
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

async function stockOf(client: SupabaseClient, slug: string): Promise<number> {
  const { data } = await client.from("products").select("inventory(quantity)").eq("slug", slug).single();
  return (data as unknown as { inventory: { quantity: number } }).inventory.quantity;
}

async function nextSlot(client: SupabaseClient): Promise<string> {
  await client.rpc("ensure_pickup_slots", { p_days: 7 });
  const { data } = await client
    .from("pickup_slots")
    .select("id")
    .gte("starts_at", new Date(Date.now() + 2 * 3600_000).toISOString())
    .order("starts_at")
    .limit(1)
    .single();
  return data!.id;
}

test.describe.configure({ mode: "serial" });
test.beforeAll(resetDemo);

test("an out-of-stock product cannot be added", async () => {
  const daniel = await signIn(DEMO.daniel);
  const { error } = await daniel.rpc("set_cart_quantity", { p_product: await productId(daniel, "select-loratadine-10"), p_quantity: 1 });
  expect(error?.message).toMatch(/^OUT_OF_STOCK:.*Loratadine/);
});

test("a quantity above stock is refused with the amount left", async () => {
  const daniel = await signIn(DEMO.daniel);
  const { error } = await daniel.rpc("set_cart_quantity", { p_product: await productId(daniel, "digital-thermometer"), p_quantity: 3 });
  expect(error?.message).toBe("NOT_ENOUGH_STOCK:Goodson Select Digital Thermometer|2");
});

test("a negative or huge quantity is refused", async () => {
  const daniel = await signIn(DEMO.daniel);
  const id = await productId(daniel, "select-vitamin-c");
  const huge = await daniel.rpc("set_cart_quantity", { p_product: id, p_quantity: 50 });
  expect(huge.error?.message).toBe("QUANTITY_LIMIT:10");
  // Negative = remove; it must never create a line.
  await daniel.rpc("set_cart_quantity", { p_product: id, p_quantity: -5 });
  const { data } = await daniel.from("cart_items").select("product_id").eq("product_id", id);
  expect(data).toEqual([]);
});

test("an allergy match is blocked (Margaret is allergic to aspirin)", async () => {
  const margaret = await signIn(DEMO.margaret);
  const { error } = await margaret.rpc("set_cart_quantity", { p_product: await productId(margaret, "select-aspirin-81"), p_quantity: 1 });
  expect(error?.message).toBe("ALLERGY_BLOCK:aspirin");
});

test("a prescription item cannot be bought without an approved prescription", async () => {
  const margaret = await signIn(DEMO.margaret);
  const benzonatate = await productId(margaret, "rx-benzonatate-100");
  const noRx = await margaret.rpc("set_cart_quantity", { p_product: benzonatate, p_quantity: 1 });
  expect(noRx.error?.message).toMatch(/^RX_REQUIRED:Benzonatate/);

  // Someone else's prescription doesn't work either: Daniel tries to use
  // Margaret's lisinopril prescription (no allergy involved, so this tests
  // only the "must belong to this patient" rule).
  const admin = createClient(url, process.env.SUPABASE_SERVICE_ROLE_KEY!, { auth: { persistSession: false } });
  const { data: margaretsRx } = await admin.from("prescriptions").select("id, product_id").eq("rx_number", "RX-100231").single();
  const daniel = await signIn(DEMO.daniel);
  const stolen = await daniel.rpc("set_cart_quantity", { p_product: margaretsRx!.product_id, p_quantity: 1, p_prescription: margaretsRx!.id });
  expect(stolen.error?.message).toMatch(/^RX_REQUIRED:/);
});

test("an expired prescription cannot be refilled; a valid one can, once", async () => {
  const margaret = await signIn(DEMO.margaret);
  const { data: rxs } = await margaret.from("prescriptions").select("id, rx_number");
  const byNumber = Object.fromEntries((rxs ?? []).map((rx) => [rx.rx_number, rx.id]));

  const expired = await margaret.rpc("request_refill", { p_prescription: byNumber["RX-100232"], p_fulfillment: "delivery" });
  expect(expired.error?.message).toBe("RX_EXPIRED");

  const none = await margaret.rpc("request_refill", { p_prescription: byNumber["RX-100233"], p_fulfillment: "delivery" });
  expect(none.error?.message).toBe("RX_NO_REFILLS");

  const ok = await margaret.rpc("request_refill", { p_prescription: byNumber["RX-100231"], p_fulfillment: "pickup", p_slot: await nextSlot(margaret) });
  expect(ok.error).toBeNull();

  const again = await margaret.rpc("request_refill", { p_prescription: byNumber["RX-100231"], p_fulfillment: "delivery" });
  expect(again.error?.message).toBe("REFILL_IN_PROGRESS");
});

test("checkout lowers stock exactly once and a repeat submit returns the same order", async () => {
  const daniel = await signIn(DEMO.daniel);
  const before = await stockOf(daniel, "select-bandages-assorted");
  await daniel.rpc("set_cart_quantity", { p_product: await productId(daniel, "select-bandages-assorted"), p_quantity: 3 });

  const key = crypto.randomUUID();
  const slot = await nextSlot(daniel);
  const first = await daniel.rpc("place_order", { p_fulfillment: "pickup", p_idempotency_key: key, p_slot: slot });
  expect(first.error).toBeNull();
  const second = await daniel.rpc("place_order", { p_fulfillment: "pickup", p_idempotency_key: key, p_slot: slot });
  expect(second.data.order_id).toBe(first.data.order_id);
  expect(second.data.duplicate).toBe(true);

  expect(await stockOf(daniel, "select-bandages-assorted")).toBe(before - 3);
  expect(first.data.order_number).toMatch(/^GD-\d{8}-\d{4}$/);

  // Cancelling puts the stock back.
  const cancel = await daniel.rpc("cancel_my_order", { p_order: first.data.order_id });
  expect(cancel.error).toBeNull();
  expect(await stockOf(daniel, "select-bandages-assorted")).toBe(before);
});

test("delivery outside the service area is refused", async () => {
  const daniel = await signIn(DEMO.daniel);
  await daniel.rpc("set_cart_quantity", { p_product: await productId(daniel, "honey-lozenges"), p_quantity: 1 });
  const { error } = await daniel.rpc("place_order", {
    p_fulfillment: "delivery",
    p_idempotency_key: crypto.randomUUID(),
    p_line1: "1 Hollywood Blvd",
    p_zip: "90210",
  });
  expect(error?.message).toBe("ZIP_OUT_OF_AREA");
  await daniel.rpc("set_cart_quantity", { p_product: await productId(daniel, "honey-lozenges"), p_quantity: 0 });
});

test("two customers racing for the last 2 thermometers: only one order succeeds", async () => {
  const [margaret, daniel] = await Promise.all([signIn(DEMO.margaret), signIn(DEMO.daniel)]);
  const thermometer = await productId(daniel, "digital-thermometer");
  expect(await stockOf(daniel, "digital-thermometer")).toBe(2);
  await Promise.all([
    margaret.rpc("set_cart_quantity", { p_product: thermometer, p_quantity: 2 }),
    daniel.rpc("set_cart_quantity", { p_product: thermometer, p_quantity: 2 }),
  ]);

  const [a, b] = await Promise.all([
    margaret.rpc("place_order", { p_fulfillment: "delivery", p_idempotency_key: crypto.randomUUID(), p_line1: "12 Maple Ave", p_zip: "30040" }),
    daniel.rpc("place_order", { p_fulfillment: "delivery", p_idempotency_key: crypto.randomUUID(), p_line1: "40 Elm St", p_zip: "30041" }),
  ]);
  const results = [a, b];
  expect(results.filter((r) => !r.error)).toHaveLength(1);
  expect(results.filter((r) => r.error?.message.startsWith("OUT_OF_STOCK"))).toHaveLength(1);
  expect(await stockOf(daniel, "digital-thermometer")).toBe(0); // never negative

  // Tidy up the loser's cart for later tests.
  await Promise.all([margaret.from("cart_items").delete().eq("product_id", thermometer), daniel.from("cart_items").delete().eq("product_id", thermometer)]);
});
