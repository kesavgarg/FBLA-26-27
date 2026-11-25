import { ShieldCheck } from "lucide-react";
import Link from "next/link";
import { WorkspaceHeader } from "@/components/layout/workspace-header";
import { Card } from "@/components/ui/card";
import { requireRole } from "@/lib/auth/session";
import { getDictionary } from "@/lib/i18n/server";

export const metadata = { title: "My account" };

/** Customer home. Phase 3 adds orders, refills and quick actions here. */
export default async function AccountPage() {
  const user = await requireRole(["customer", "staff", "doctor", "owner"], "/account");
  const { t } = await getDictionary();
  const firstName = user.fullName.split(" ")[0];

  return (
    <>
      <WorkspaceHeader user={user} title={`${t.account.greeting}, ${firstName}`} />
      <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
        <Link href="/account/security" className="group rounded-[var(--radius-card)]">
          <Card className="flex h-full flex-col gap-3 p-6 transition-[box-shadow,transform] duration-200 group-hover:-translate-y-0.5 group-hover:shadow-lift">
            <ShieldCheck className="size-7 text-action" aria-hidden="true" />
            <h2 className="text-xl font-semibold">{t.account.securityTitle}</h2>
            <p className="text-ink/80">{t.account.securityBody}</p>
          </Card>
        </Link>
      </div>
    </>
  );
}
