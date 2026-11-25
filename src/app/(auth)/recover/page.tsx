import Link from "next/link";
import { AuthShell } from "@/components/auth/auth-shell";
import { RecoverForm } from "@/components/auth/forms";
import { getDictionary } from "@/lib/i18n/server";

export const metadata = { title: "Recover account" };

/** Account recovery: a one-time email link, then add a new passkey. */
export default async function RecoverPage() {
  const { t } = await getDictionary();
  return (
    <AuthShell title={t.auth.recoverTitle} intro={t.auth.recoverBody}>
      <RecoverForm />
      <Link href="/login" className="text-[0.94rem] font-semibold text-action hover:underline">
        ← {t.auth.backToSignIn}
      </Link>
    </AuthShell>
  );
}
