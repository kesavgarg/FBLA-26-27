import { NextResponse, type NextRequest } from "next/server";
import { getSessionUser } from "@/lib/auth/session";
import { homePathForRole, safeNextPath } from "@/lib/auth/roles";

/**
 * After a passkey sign-in in the browser, the page sends the visitor here.
 * The server reads the now-active session, looks up the role, and sends
 * each role to its own home (customers → /account, doctors → /doctor …).
 */
export async function GET(request: NextRequest) {
  const user = await getSessionUser();
  const { origin, searchParams } = request.nextUrl;
  if (!user) return NextResponse.redirect(`${origin}/login`);
  const next = safeNextPath(searchParams.get("next")) ?? homePathForRole(user.role);
  return NextResponse.redirect(`${origin}${next}`);
}
