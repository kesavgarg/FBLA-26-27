import { CheckCircle2, ChevronRight, Inbox, MessageCircleQuestion } from "lucide-react";
import Link from "next/link";
import { WorkspaceHeader } from "@/components/layout/workspace-header";
import { Alert } from "@/components/ui/alert";
import { Badge } from "@/components/ui/card";
import { StatTile } from "@/components/ui/stat";
import { requireRole } from "@/lib/auth/session";
import { listConsultQueue, type QueueItem } from "@/lib/data/doctor";
import { formatStoreDateTime } from "@/lib/domain/slots";

export const metadata = { title: "Doctor" };

const STATUS_LABEL = {
  submitted: "New",
  under_review: "Reviewing",
  needs_info: "Waiting on patient",
  approved: "Approved",
  denied: "Denied",
} as const;
const STATUS_TONE = { submitted: "info", under_review: "info", needs_info: "warning", approved: "success", denied: "danger" } as const;

function QueueList({ items, empty }: { items: QueueItem[]; empty: string }) {
  if (items.length === 0) return <p className="text-muted">{empty}</p>;
  return (
    <ul className="divide-y divide-line rounded-[var(--radius-card)] border border-line bg-canvas">
      {items.map((item) => (
        <li key={item.id}>
          <Link href={`/doctor/consults/${item.id}`} className="flex items-center gap-4 px-5 py-4 hover:bg-sky-50">
            <div className="min-w-0 flex-1">
              <p className="font-semibold">{item.patientName}</p>
              <p className="truncate text-sm text-muted">{item.summary}</p>
            </div>
            <span className="hidden text-sm text-muted md:block">{formatStoreDateTime(item.createdAt, "en")}</span>
            <Badge tone={STATUS_TONE[item.status]}>{STATUS_LABEL[item.status]}</Badge>
            <ChevronRight className="size-5 text-muted" aria-hidden="true" />
          </Link>
        </li>
      ))}
    </ul>
  );
}

/** Consult inbox: new and reviewing requests first, then waiting and decided. */
export default async function DoctorHomePage() {
  const user = await requireRole(["doctor", "owner"], "/doctor");
  const queue = await listConsultQueue();
  const waiting = queue.filter((c) => c.status === "submitted" || c.status === "under_review");
  const needsInfo = queue.filter((c) => c.status === "needs_info");
  const decided = queue.filter((c) => c.status === "approved" || c.status === "denied").reverse();

  return (
    <>
      <WorkspaceHeader user={user} title="Consult inbox" description="Review symptom summaries, allergies and medicines, then approve, deny or ask for more information." />
      <Alert tone="info" title="Simulated prescriber">
        This role is played by a demo account. In a real pharmacy, only a licensed clinician could approve a prescription.
      </Alert>
      <div className="grid gap-6 sm:grid-cols-3">
        <StatTile label="Waiting for review" value={waiting.length} icon={<Inbox className="size-4" aria-hidden="true" />} />
        <StatTile label="Waiting on patient" value={needsInfo.length} icon={<MessageCircleQuestion className="size-4" aria-hidden="true" />} />
        <StatTile label="Decided" value={decided.length} icon={<CheckCircle2 className="size-4" aria-hidden="true" />} />
      </div>
      <section className="flex flex-col gap-4" aria-labelledby="waiting">
        <h2 id="waiting" className="text-xl font-semibold">
          Waiting for review
        </h2>
        <QueueList items={waiting} empty="No requests waiting. New requests appear here." />
      </section>
      {needsInfo.length > 0 && (
        <section className="flex flex-col gap-4" aria-labelledby="needs-info">
          <h2 id="needs-info" className="text-xl font-semibold">
            Waiting on the patient
          </h2>
          <QueueList items={needsInfo} empty="" />
        </section>
      )}
      <section className="flex flex-col gap-4" aria-labelledby="history">
        <h2 id="history" className="text-xl font-semibold">
          Decision history
        </h2>
        <QueueList items={decided} empty="No decisions yet." />
      </section>
    </>
  );
}
