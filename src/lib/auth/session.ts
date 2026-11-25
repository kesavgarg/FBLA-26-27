import "server-only";
import { cache } from "react";
import { redirect } from "next/navigation";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import type { Role } from "./roles";

/** The small, safe view of the signed-in user that pages and actions use. */
export type SessionUser = {
  id: string;
  email: string;
  fullName: string;
  role: Role;
  title: string | null;
  isDemo: boolean;
};

/**
 * Data Access Layer entry point: who is signed in?
 *
 * `auth.getUser()` asks Supabase Auth to verify the session token (it does
 * not just trust the cookie). The role is then read from `profiles`, which
 * users cannot edit. `cache()` means one lookup per request, even if many
 * components ask.
 */
export const getSessionUser = cache(async (): Promise<SessionUser | null> => {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const { data: profile } = await supabase
    .from("profiles")
    .select("id, email, full_name, role, title, is_demo")
    .eq("id", user.id)
    .single();
  if (!profile) return null;

  return {
    id: profile.id,
    email: profile.email,
    fullName: profile.full_name,
    role: profile.role,
    title: profile.title,
    isDemo: profile.is_demo,
  };
});

/**
 * Use at the top of every protected page and every Server Action.
 * Sends signed-out visitors to /login and wrong roles to /forbidden.
 * Returns the verified user so the caller can use their id safely.
 */
export async function requireRole(allowed: readonly Role[], returnTo?: string): Promise<SessionUser> {
  const user = await getSessionUser();
  if (!user) {
    redirect(returnTo ? `/login?next=${encodeURIComponent(returnTo)}` : "/login");
  }
  if (!allowed.includes(user.role)) {
    redirect("/forbidden");
  }
  return user;
}
