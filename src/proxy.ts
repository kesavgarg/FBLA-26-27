import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { findProtectedArea } from "@/lib/auth/roles";

/**
 * Runs before every page request (Next.js 16 "proxy", formerly middleware).
 *
 * Job 1: refresh the Supabase session cookie so signed-in users stay signed in.
 * Job 2: an early, cheap check that sends signed-out visitors away from
 *        protected areas (/account, /staff, /doctor, /owner) to /login.
 *
 * This is NOT the security boundary. The real checks are requireRole() in
 * every protected layout and Server Action, plus Row Level Security in the
 * database. The proxy just avoids rendering a page we'd redirect anyway.
 */
export async function proxy(request: NextRequest) {
  let response = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet, headers) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
          response = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) => response.cookies.set(name, value, options));
          Object.entries(headers ?? {}).forEach(([key, value]) => response.headers.set(key, value));
        },
      },
    },
  );

  // Verifies the token with Supabase and refreshes it when needed.
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { pathname, search } = request.nextUrl;
  if (!user && findProtectedArea(pathname)) {
    const loginUrl = request.nextUrl.clone();
    loginUrl.pathname = "/login";
    loginUrl.search = `?next=${encodeURIComponent(pathname + search)}`;
    return NextResponse.redirect(loginUrl);
  }

  return response;
}

export const config = {
  // Skip static files and images; run on everything else.
  matcher: ["/((?!_next/static|_next/image|favicon.ico|products/|.*\\.(?:svg|png|jpg|jpeg|gif|webp|avif|ico)$).*)"],
};
