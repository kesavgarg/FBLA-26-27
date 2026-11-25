import { requireRole } from "@/lib/auth/session";

/** Owner workspace (analytics, reports, audit log). Owner only. */
export default async function OwnerLayout({ children }: LayoutProps<"/owner">) {
  await requireRole(["owner"], "/owner");
  return <div className="wrap flex flex-1 flex-col gap-10 py-10 lg:py-14">{children}</div>;
}
