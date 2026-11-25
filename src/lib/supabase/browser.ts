"use client";

import { createBrowserClient } from "@supabase/ssr";
import type { Database } from "./database.types";
import { getPublicSupabaseEnv } from "./env";

let client: ReturnType<typeof createBrowserClient<Database>> | undefined;

/**
 * Supabase client for the browser. Used only where the browser itself must
 * talk to Supabase — the passkey (WebAuthn) ceremony, which needs
 * navigator.credentials. All other data access happens on the server.
 */
export function getSupabaseBrowserClient() {
  if (!client) {
    const { url, anonKey } = getPublicSupabaseEnv();
    client = createBrowserClient<Database>(url, anonKey);
  }
  return client;
}
