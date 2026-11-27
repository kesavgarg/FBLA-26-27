import { OwnerNav } from "@/components/owner/owner-nav";
import { requireRole } from "@/lib/auth/session";

/** Owner workspace (analytics, reports, audit log, settings). Owner only. */
export default async function OwnerLayout({ children }: LayoutProps<"/owner">) {
  await requireRole(["owner"], "/owner");
  return (
    <div className="wrap flex flex-1 flex-col gap-8 py-10 lg:py-14">
      <OwnerNav />
      {children}
    </div>
  );
}
