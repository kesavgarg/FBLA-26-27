"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cx } from "@/lib/utils";

const TABS = [
  { href: "/staff", label: "Orders" },
  { href: "/staff/refills", label: "Refills" },
  { href: "/staff/inventory", label: "Inventory" },
];

/** Tabs across the top of the staff workspace. */
export function StaffNav() {
  const pathname = usePathname();
  return (
    <nav aria-label="Staff sections" className="flex gap-1 overflow-x-auto border-b border-line">
      {TABS.map((tab) => {
        const active = tab.href === "/staff" ? pathname === "/staff" || pathname.startsWith("/staff/orders") : pathname.startsWith(tab.href);
        return (
          <Link
            key={tab.href}
            href={tab.href}
            aria-current={active ? "page" : undefined}
            className={cx(
              "-mb-px inline-flex min-h-12 items-center border-b-2 px-4 font-semibold whitespace-nowrap",
              active ? "border-action text-action" : "border-transparent text-muted hover:text-ink",
            )}
          >
            {tab.label}
          </Link>
        );
      })}
    </nav>
  );
}
