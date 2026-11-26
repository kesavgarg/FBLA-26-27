import { createClient } from "@supabase/supabase-js";

/**
 * Before the browser tests run, restore the demo data so every run starts
 * from the same state. Refuses to touch anything but a LOCAL database, so
 * the tests can never wipe the hosted demo.
 */
export default async function globalSetup() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY ?? "";
  if (!/^http:\/\/(127\.0\.0\.1|localhost)(:\d+)?$/.test(url)) {
    throw new Error(`E2E tests only run against a local Supabase (got ${url || "nothing"}).`);
  }
  const admin = createClient(url, key, { auth: { persistSession: false } });
  const { error } = await admin.rpc("reset_demo_data");
  if (error) throw new Error(`Demo reset failed: ${error.message}`);
}
