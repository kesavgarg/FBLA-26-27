import { createClient } from "@supabase/supabase-js";
import { expect, test } from "@playwright/test";
import { DEMO, demoPassword } from "./helpers";

/**
 * Talks to the database DIRECTLY with the public anon key — exactly what an
 * attacker could do from the browser console — to prove Row Level Security
 * and the role guard hold even if the website's own checks were bypassed.
 */
const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

async function signedInClient(email: string) {
  const client = createClient(url, anonKey, { auth: { persistSession: false } });
  const { data, error } = await client.auth.signInWithPassword({ email, password: demoPassword() });
  expect(error).toBeNull();
  return { client, userId: data.user!.id };
}

test("a customer cannot make themselves staff, doctor or owner", async () => {
  const { client, userId } = await signedInClient(DEMO.margaret);

  const update = await client.from("profiles").update({ role: "owner" }).eq("id", userId);
  expect(update.error).not.toBeNull(); // column-level grant: role is not writable

  const rpc = await client.rpc("set_user_role", { target_user: userId, new_role: "owner" });
  expect(rpc.error?.message).toMatch(/Only the owner/);

  const { data } = await client.from("profiles").select("role").eq("id", userId).single();
  expect(data?.role).toBe("customer");
});

test("a customer only sees their own private records", async () => {
  const { client, userId } = await signedInClient(DEMO.margaret);

  const profiles = await client.from("profiles").select("id");
  expect(profiles.data?.map((row) => row.id)).toEqual([userId]);

  const orders = await client.from("orders").select("customer_id");
  expect(orders.data!.length).toBeGreaterThan(0);
  expect(orders.data!.every((row) => row.customer_id === userId)).toBe(true);

  const prescriptions = await client.from("prescriptions").select("patient_id");
  expect(prescriptions.data!.every((row) => row.patient_id === userId)).toBe(true);

  const audit = await client.from("audit_logs").select("id");
  expect(audit.data).toEqual([]);
});

test("a customer cannot reset the demo or create prescriptions", async () => {
  const { client, userId } = await signedInClient(DEMO.margaret);

  const reset = await client.rpc("reset_demo_data");
  expect(reset.error?.message).toMatch(/Only the owner/);

  const rx = await client.from("prescriptions").insert({
    rx_number: "RX-999999",
    patient_id: userId,
    product_id: "00000000-0000-0000-0000-000000000000",
    directions: "Self-approved",
    status: "active",
    expires_on: "2030-01-01",
  });
  expect(rx.error).not.toBeNull();
});

test("signed-out visitors can browse products but see no private data", async () => {
  const anon = createClient(url, anonKey, { auth: { persistSession: false } });
  const products = await anon.from("products").select("id");
  expect(products.data!.length).toBeGreaterThan(20);
  for (const table of ["profiles", "orders", "prescriptions", "symptom_logs", "allergies"] as const) {
    const { data } = await anon.from(table).select("*");
    expect(data ?? []).toEqual([]);
  }
});
