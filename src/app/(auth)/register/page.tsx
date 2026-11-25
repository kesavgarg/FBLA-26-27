import { redirect } from "next/navigation";
import { AuthShell } from "@/components/auth/auth-shell";
import { RegisterForm } from "@/components/auth/forms";
import { getSessionUser } from "@/lib/auth/session";
import { homePathForRole } from "@/lib/auth/roles";
import { getDictionary } from "@/lib/i18n/server";

export const metadata = { title: "Create account" };

/** Registration, step 1 of 2. Step 2 (add a passkey) is /account/security?setup=1. */
export default async function RegisterPage() {
  const user = await getSessionUser();
  if (user) redirect(homePathForRole(user.role));

  const { t } = await getDictionary();
  return (
    <AuthShell title={t.auth.registerTitle} intro={t.auth.registerBody}>
      <RegisterForm />
    </AuthShell>
  );
}
