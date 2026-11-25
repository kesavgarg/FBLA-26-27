import { DollarSign, ReceiptText, ScrollText, Users } from "lucide-react";
import { WorkspaceHeader } from "@/components/layout/workspace-header";
import { Alert } from "@/components/ui/alert";
import { StatTile } from "@/components/ui/stat";
import { requireRole } from "@/lib/auth/session";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { formatCents } from "@/lib/format";

export const metadata = { title: "Owner" };

/** Owner overview. Every number is a live query on the (fictional) demo data. */
export default async function OwnerHomePage() {
  const user = await requireRole(["owner"], "/owner");
  const supabase = await createSupabaseServerClient();

  const [orders, people, audit] = await Promise.all([
    supabase.from("orders").select("total_cents, status"),
    supabase.from("profiles").select("id", { count: "exact", head: true }),
    supabase.from("audit_logs").select("id", { count: "exact", head: true }),
  ]);
  const placed = (orders.data ?? []).filter((order) => order.status !== "cancelled");
  const revenueCents = placed.reduce((sum, order) => sum + order.total_cents, 0);

  return (
    <>
      <WorkspaceHeader user={user} title="Business overview" description="Simulated results from fictional demo orders." />
      <Alert tone="warning" title="Simulated data">
        These figures come from fictional demo orders. They are not Goodson Drug Co.’s real business results.
      </Alert>
      <div className="grid gap-6 sm:grid-cols-2 xl:grid-cols-4">
        <StatTile label="Orders (not cancelled)" value={placed.length} icon={<ReceiptText className="size-4" aria-hidden="true" />} />
        <StatTile label="Simulated revenue" value={formatCents(revenueCents)} icon={<DollarSign className="size-4" aria-hidden="true" />} />
        <StatTile label="Accounts" value={people.count ?? 0} icon={<Users className="size-4" aria-hidden="true" />} />
        <StatTile label="Audit log entries" value={audit.count ?? 0} icon={<ScrollText className="size-4" aria-hidden="true" />} />
      </div>
    </>
  );
}
