"use client";

import { LogOut, Menu, UserRound, X } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { signOutAction } from "@/lib/auth/actions";
import { useI18n } from "@/lib/i18n/provider";
import { buttonClasses } from "@/components/ui/button";
import type { NavLink } from "./site-header";
import { LanguageSwitch } from "./preferences-menu";

/** Full-screen navigation for phones and tablets (below 1024px). */
export function MobileMenu({ links, signedIn }: { links: NavLink[]; signedIn: boolean }) {
  const { t } = useI18n();
  const [open, setOpen] = useState(false);
  const pathname = usePathname();

  // Close the menu after navigating to a new page.
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setOpen(false);
  }, [pathname]);

  // Stop the page behind the menu from scrolling, and allow Escape to close.
  useEffect(() => {
    if (!open) return;
    document.body.style.overflow = "hidden";
    const onKey = (event: KeyboardEvent) => event.key === "Escape" && setOpen(false);
    document.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = "";
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  return (
    <div className="xl:hidden">
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-expanded={open}
        aria-controls="mobile-menu"
        className="inline-flex size-11 items-center justify-center rounded-full border border-line text-ink hover:border-action"
      >
        <Menu className="size-5" aria-hidden="true" />
        <span className="sr-only">{t.nav.menu}</span>
      </button>

      {open && (
        <div id="mobile-menu" role="dialog" aria-modal="true" aria-label={t.nav.menu} className="fixed inset-0 z-50 bg-canvas">
          <div className="wrap flex h-[4.5rem] items-center justify-end">
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="inline-flex size-11 items-center justify-center rounded-full border border-line"
              autoFocus
            >
              <X className="size-5" aria-hidden="true" />
              <span className="sr-only">{t.nav.closeMenu}</span>
            </button>
          </div>
          <nav aria-label={t.nav.mainNav} className="wrap flex flex-col gap-6 pt-4">
            <ul className="flex flex-col">
              {links.map((link) => (
                <li key={link.href}>
                  <Link
                    href={link.href}
                    className="flex min-h-14 items-center border-b border-line text-xl font-semibold text-ink"
                    aria-current={pathname === link.href ? "page" : undefined}
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
            <LanguageSwitch />
            {signedIn ? (
              <form action={signOutAction}>
                <button type="submit" className={buttonClasses("secondary", "lg", "w-full")}>
                  <LogOut className="size-4" aria-hidden="true" />
                  {t.nav.signOut}
                </button>
              </form>
            ) : (
              <Link href="/login" className={buttonClasses("primary", "lg", "w-full")}>
                <UserRound className="size-4" aria-hidden="true" />
                {t.nav.signIn}
              </Link>
            )}
          </nav>
        </div>
      )}
    </div>
  );
}
