/**
 * Roles and where each one is allowed to go.
 * This file has no server or browser dependencies, so both proxy.ts and
 * unit tests can import it.
 */
export const ROLES = ["customer", "staff", "doctor", "owner"] as const;
export type Role = (typeof ROLES)[number];

/**
 * Protected areas of the site and the roles allowed in each.
 * The owner can open every area so they can supervise the business.
 */
export const AREA_ACCESS: ReadonlyArray<{ prefix: string; roles: readonly Role[] }> = [
  { prefix: "/staff", roles: ["staff", "owner"] },
  { prefix: "/doctor", roles: ["doctor", "owner"] },
  { prefix: "/owner", roles: ["owner"] },
  { prefix: "/account", roles: ["customer", "staff", "doctor", "owner"] },
];

/** Find the protected area a path belongs to, or null for public pages. */
export function findProtectedArea(pathname: string) {
  return AREA_ACCESS.find((area) => pathname === area.prefix || pathname.startsWith(`${area.prefix}/`)) ?? null;
}

/** True when `role` may open `pathname`. Public pages are open to everyone. */
export function canAccessPath(role: Role | null, pathname: string): boolean {
  const area = findProtectedArea(pathname);
  if (!area) return true;
  return role !== null && area.roles.includes(role);
}

/** Each role's home page after signing in. */
export function homePathForRole(role: Role): string {
  switch (role) {
    case "staff":
      return "/staff";
    case "doctor":
      return "/doctor";
    case "owner":
      return "/owner";
    default:
      return "/account";
  }
}

/** Only allow redirects to our own pages (blocks "open redirect" attacks). */
export function safeNextPath(next: string | null | undefined): string | null {
  if (!next || !next.startsWith("/") || next.startsWith("//") || next.includes("\\")) return null;
  return next;
}
