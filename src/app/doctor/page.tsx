import { CheckCircle2, Inbox, MessageCircleQuestion } from "lucide-react";
import { WorkspaceHeader } from "@/components/layout/workspace-header";
import { Alert } from "@/components/ui/alert";
import { StatTile } from "@/components/ui/stat";
import { requireRole } from "@/lib/auth/session";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export const metadata = { title: "Doctor" };

/** Doctor overview: how many consult requests are waiting. */
export default async function DoctorHomePage() {
  const user = await requireRole(["doctor", "owner"], "/doctor");
  const supabase = await createSupabaseServerClient();

  const count = (statuses: Array<"submitted" | "under_review" | "needs_info" | "approved" | "denied">) =>
    supabase.from("consult_requests").select("id", { count: "exact", head: true }).in("status", statuses);
  const [waiting, needsInfo, decided] = await Promise.all([
    count(["submitted", "under_review"]),
    count(["needs_info"]),
    count(["approved", "denied"]),
  ]);

  return (
    <>
      <WorkspaceHeader user={user} title="Consult inbox" description="Review symptom summaries, allergies and medications, then approve, deny or ask for more information." />
      <Alert tone="info" title="Simulated prescriber">
        This role is played by a demo account. In a real pharmacy, only a licensed clinician could approve a prescription.
      </Alert>
      <div className="grid gap-6 sm:grid-cols-3">
        <StatTile label="Waiting for review" value={waiting.count ?? 0} icon={<Inbox className="size-4" aria-hidden="true" />} />
        <StatTile label="Waiting on patient" value={needsInfo.count ?? 0} icon={<MessageCircleQuestion className="size-4" aria-hidden="true" />} />
        <StatTile label="Decided" value={decided.count ?? 0} icon={<CheckCircle2 className="size-4" aria-hidden="true" />} />
      </div>
    </>
  );
}
