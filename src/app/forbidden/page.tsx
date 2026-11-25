import { ShieldX } from "lucide-react";
import { ButtonLink } from "@/components/ui/button";
import { getSessionUser } from "@/lib/auth/session";
import { homePathForRole } from "@/lib/auth/roles";
import { getDictionary } from "@/lib/i18n/server";

export const metadata = { title: "No access" };

/** Shown when a signed-in user opens an area their role may not use. */
export default async function ForbiddenPage() {
  const [{ t }, user] = await Promise.all([getDictionary(), getSessionUser()]);
  return (
    <div className="wrap flex flex-1 flex-col items-start justify-center gap-5 py-20">
      <ShieldX className="size-10 text-danger" aria-hidden="true" />
      <h1 className="text-[2.1rem] font-semibold tracking-tight">{t.errors.notAllowed}</h1>
      <ButtonLink href={user ? homePathForRole(user.role) : "/login"}>{user ? t.nav.account : t.nav.signIn}</ButtonLink>
    </div>
  );
}
