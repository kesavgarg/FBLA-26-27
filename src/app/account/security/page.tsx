import Link from "next/link";
import { PasskeyManager } from "@/components/auth/passkey-manager";
import { WorkspaceHeader } from "@/components/layout/workspace-header";
import { Alert } from "@/components/ui/alert";
import { Card } from "@/components/ui/card";
import { requireRole } from "@/lib/auth/session";
import { homePathForRole } from "@/lib/auth/roles";
import { getDictionary } from "@/lib/i18n/server";

export const metadata = { title: "Security" };

/**
 * Security settings: add or remove passkeys.
 * `?setup=1` is step two of registration; `?recovered=1` follows an
 * account-recovery email link.
 */
export default async function SecurityPage({ searchParams }: PageProps<"/account/security">) {
  const user = await requireRole(["customer", "staff", "doctor", "owner"], "/account/security");
  const params = await searchParams;
  const { t } = await getDictionary();
  const setupMode = params.setup === "1";

  return (
    <>
      <WorkspaceHeader user={user} title={t.auth.security} description={t.account.securityBody} />
      {params.recovered === "1" && <Alert tone="success">{t.auth.passkeySetupBody}</Alert>}
      <Card className="max-w-3xl p-6 sm:p-8">
        <PasskeyManager setupMode={setupMode} />
        {setupMode && (
          <Link
            href={homePathForRole(user.role)}
            className="mt-6 inline-flex min-h-11 items-center font-semibold text-action hover:underline"
          >
            {t.auth.passkeySetupSkip} →
          </Link>
        )}
      </Card>
    </>
  );
}
