import { requireRole } from "@/lib/auth/session";

/**
 * Every page under /account requires a signed-in user.
 * (Staff, doctors and the owner also have an account page for their passkeys.)
 */
export default async function AccountLayout({ children }: LayoutProps<"/account">) {
  await requireRole(["customer", "staff", "doctor", "owner"], "/account");
  return <div className="wrap flex flex-1 flex-col gap-10 py-10 lg:py-14">{children}</div>;
}
