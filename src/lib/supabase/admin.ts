import "server-only";
import { createClient } from "@supabase/supabase-js";
import type { Database } from "./database.types";
import { getPublicSupabaseEnv } from "./env";

/**
 * Service-role Supabase client. It BYPASSES Row Level Security, so:
 *   - it is imported only from server files ("server-only" makes the build
 *     fail if a client component ever imports it), and
 *   - it is used only for account creation, where no user session exists yet.
 * The key comes from SUPABASE_SERVICE_ROLE_KEY, which has no NEXT_PUBLIC_
 * prefix and therefore is never sent to the browser.
 */
export function createSupabaseAdminClient() {
  const { url } = getPublicSupabaseEnv();
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!serviceKey) throw new Error("Missing SUPABASE_SERVICE_ROLE_KEY (server only).");
  return createClient<Database>(url, serviceKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}
