import Link from "next/link";
import { redirect } from "next/navigation";
import { AuthShell } from "@/components/auth/auth-shell";
import { PasswordSignInForm } from "@/components/auth/forms";
import { PasskeySignIn } from "@/components/auth/passkey-sign-in";
import { Alert } from "@/components/ui/alert";
import { getSessionUser } from "@/lib/auth/session";
import { homePathForRole, safeNextPath } from "@/lib/auth/roles";
import { getDictionary } from "@/lib/i18n/server";

export const metadata = { title: "Sign in" };

/**
 * Sign-in page. Passkey (Touch ID) is the main path; email + password is the
 * fallback, and recovery is one link away so nobody is locked out.
 */
export default async function LoginPage({ searchParams }: PageProps<"/login">) {
  const params = await searchParams;
  const next = safeNextPath(typeof params.next === "string" ? params.next : null) ?? undefined;

  const user = await getSessionUser();
  if (user) redirect(next ?? homePathForRole(user.role));

  const { t } = await getDictionary();
  return (
    <AuthShell title={t.auth.welcomeTitle} intro={t.auth.welcomeBody}>
      {params.signedOut && <Alert tone="success">{t.auth.signedOut}</Alert>}
      {params.recoveryFailed && <Alert tone="danger">{t.errors.generic}</Alert>}

      <PasskeySignIn next={next} />

      <div className="flex items-center gap-4 text-sm text-muted" role="separator">
        <span className="h-px flex-1 bg-line" />
        {t.auth.orPassword}
        <span className="h-px flex-1 bg-line" />
      </div>

      <PasswordSignInForm next={next} />

      <div className="flex flex-col gap-2 border-t border-line pt-6 text-[0.94rem]">
        <p>
          {t.auth.noAccount}{" "}
          <Link href="/register" className="font-semibold text-action hover:underline">
            {t.auth.createAccount}
          </Link>
        </p>
        <p>
          {t.auth.forgot}{" "}
          <Link href="/recover" className="font-semibold text-action hover:underline">
            {t.auth.recoverLink}
          </Link>
        </p>
      </div>
    </AuthShell>
  );
}
