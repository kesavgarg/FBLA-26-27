import { NextResponse, type NextRequest } from "next/server";
import { safeNextPath } from "@/lib/auth/roles";
import { createSupabaseServerClient } from "@/lib/supabase/server";

/**
 * Landing point for the account-recovery email link.
 * Supabase sends the visitor here with a one-time `code`; we exchange it for
 * a session (cookie), then continue to Security settings so they can add a
 * new passkey.
 */
export async function GET(request: NextRequest) {
  const { searchParams, origin } = request.nextUrl;
  const code = searchParams.get("code");
  const next = safeNextPath(searchParams.get("next")) ?? "/account";

  if (code) {
    const supabase = await createSupabaseServerClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) return NextResponse.redirect(`${origin}${next}`);
  }
  return NextResponse.redirect(`${origin}/login?recoveryFailed=1`);
}
