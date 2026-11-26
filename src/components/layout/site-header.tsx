import { LogOut, ShoppingCart, UserRound } from "lucide-react";
import Link from "next/link";
import { signOutAction } from "@/lib/auth/actions";
import { getSessionUser } from "@/lib/auth/session";
import { getCartCount } from "@/lib/data/cart";
import type { Role } from "@/lib/auth/roles";
import type { Dictionary } from "@/lib/i18n";
import { getDictionary } from "@/lib/i18n/server";
import type { DisplayPrefs } from "@/lib/preferences/display";
import { buttonClasses } from "@/components/ui/button";
import { Logo } from "./logo";
import { MobileMenu } from "./mobile-menu";
import { AccessibilityMenu, LanguageSwitch } from "./preferences-menu";

export type NavLink = { href: string; label: string };

/**
 * Links shown in the main navigation. Public links appear for everyone;
 * each role also sees a link to its own workspace. Only pages that exist
 * are listed, so navigation never leads to a dead end.
 */
export function navLinksFor(t: Dictionary, role: Role | null): NavLink[] {
  const links: NavLink[] = [
    { href: "/", label: t.nav.home },
    { href: "/shop", label: t.nav.shop },
  ];
  if (role) {
    links.push({ href: "/account/orders", label: t.nav.orders });
    links.push({ href: "/account/prescriptions", label: t.nav.refills });
  }
  if (role === "customer") links.push({ href: "/account", label: t.nav.account });
  if (role === "staff" || role === "owner") links.push({ href: "/staff", label: t.nav.staff });
  if (role === "doctor" || role === "owner") links.push({ href: "/doctor", label: t.nav.doctor });
  if (role === "owner") links.push({ href: "/owner", label: t.nav.owner });
  return links;
}

export async function SiteHeader({ display }: { display: DisplayPrefs }) {
  const [{ t }, user] = await Promise.all([getDictionary(), getSessionUser()]);
  const links = navLinksFor(t, user?.role ?? null);
  const cartCount = user ? await getCartCount() : 0;

  return (
    <header className="sticky top-0 z-40 border-b border-line bg-canvas/90 backdrop-blur-md">
      <div className="wrap flex h-[4.5rem] items-center gap-3 sm:gap-6">
        <a href="#main" className="skip-link">
          {t.nav.skip}
        </a>
        <Logo />

        <nav aria-label={t.nav.mainNav} className="hidden flex-1 xl:block">
          <ul className="flex items-center gap-1">
            {links.map((link) => (
              <li key={link.href}>
                <Link
                  href={link.href}
                  className="rounded-[var(--radius-pill)] px-3 py-2 text-[0.94rem] font-medium text-ink transition-colors hover:bg-sky-50 hover:text-action"
                >
                  {link.label}
                </Link>
              </li>
            ))}
          </ul>
        </nav>

        <div className="ml-auto flex items-center gap-2">
          <div className="hidden md:block">
            <LanguageSwitch />
          </div>
          <AccessibilityMenu initial={display} />
          {user && (
            <Link
              href="/cart"
              className="relative inline-flex size-11 items-center justify-center rounded-full border border-line text-ink hover:border-action hover:text-action"
            >
              <ShoppingCart className="size-5" aria-hidden="true" />
              <span className="sr-only">
                {t.cart.title} ({cartCount})
              </span>
              {cartCount > 0 && (
                <span
                  aria-hidden="true"
                  className="tabular absolute -top-1 -right-1 flex min-w-5 items-center justify-center rounded-full bg-action px-1 text-xs font-semibold text-white"
                >
                  {cartCount}
                </span>
              )}
            </Link>
          )}
          {user ? (
            <form action={signOutAction} className="hidden xl:block">
              <button type="submit" className={buttonClasses("secondary")}>
                <LogOut className="size-4" aria-hidden="true" />
                {t.nav.signOut}
              </button>
            </form>
          ) : (
            <div className="hidden xl:block">
              <Link href="/login" className={buttonClasses("primary")}>
                <UserRound className="size-4" aria-hidden="true" />
                {t.nav.signIn}
              </Link>
            </div>
          )}
          <MobileMenu links={links} signedIn={Boolean(user)} />
        </div>
      </div>
    </header>
  );
}
