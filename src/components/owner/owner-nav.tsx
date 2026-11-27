"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cx } from "@/lib/utils";

const TABS = [
  { href: "/owner", label: "Overview" },
  { href: "/owner/reports", label: "Reports" },
  { href: "/owner/audit", label: "Audit log" },
  { href: "/owner/users", label: "Users & roles" },
  { href: "/owner/settings", label: "Store settings" },
  { href: "/owner/usability", label: "Usability tests" },
  { href: "/owner/demo", label: "Presenter guide" },
];

/** Tabs across the top of the owner workspace. */
export function OwnerNav() {
  const pathname = usePathname();
  return (
    <nav aria-label="Owner sections" className="relative flex gap-1 overflow-x-auto border-b border-line print:hidden">
      {TABS.map((tab) => {
        const active = tab.href === "/owner" ? pathname === "/owner" : pathname.startsWith(tab.href);
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
