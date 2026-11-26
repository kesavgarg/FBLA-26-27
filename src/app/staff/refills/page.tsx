import { RefillControls } from "@/components/staff/refill-controls";
import { Alert } from "@/components/ui/alert";
import { Badge, Card } from "@/components/ui/card";
import { requireRole } from "@/lib/auth/session";
import { listRefillsForStaff } from "@/lib/data/staff";
import { getRefillEligibility, storeToday } from "@/lib/domain/refills";
import { formatStoreDateTime } from "@/lib/domain/slots";
import { en } from "@/lib/i18n/en";

export const metadata = { title: "Staff · Refills" };

const OPEN = ["requested", "verified", "preparing", "ready"];

/**
 * Refill queue. Eligibility is re-checked live (the prescription may have
 * expired since the request) — verifying is blocked when it fails, and the
 * database checks again when the button is pressed.
 */
export default async function StaffRefillsPage() {
  await requireRole(["staff", "owner"], "/staff/refills");
  const refills = await listRefillsForStaff();
  const today = storeToday();
  const open = refills.filter((r) => OPEN.includes(r.status));
  const done = refills.filter((r) => !OPEN.includes(r.status)).reverse();

  return (
    <>
      <div>
        <h1 className="text-[2rem] font-semibold tracking-tight">Refill requests</h1>
        <p className="text-lg text-ink/80">Verify each prescription, prepare it, and tell the patient when it’s ready. Completing a refill uses one refill.</p>
      </div>

      {open.length === 0 ? (
        <p className="text-muted">No refill requests waiting.</p>
      ) : (
        <ul className="grid gap-4 lg:grid-cols-2">
          {open.map((r) => {
            const reason = getRefillEligibility(
              { patientId: "x", status: r.rxStatus as "active", expiresOn: r.expiresOn, refillsRemaining: r.refillsRemaining, hasOpenRefill: false },
              "x",
              today,
            );
            const eligible = reason === "eligible";
            return (
              <li key={r.id}>
                <Card className="flex flex-col gap-4 p-6">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <p className="font-semibold">{r.patientName}</p>
                      <p className="text-sm text-muted">
                        {r.productName} · {r.rxNumber}
                      </p>
                    </div>
                    <Badge tone="info">{en.refills.requestStatus[r.status]}</Badge>
                  </div>
                  <p className="text-sm">
                    {r.fulfillment === "pickup" ? `Pickup ${r.pickupAt ? formatStoreDateTime(r.pickupAt, "en") : ""}` : "Delivery"} · requested{" "}
                    {formatStoreDateTime(r.requestedAt, "en")}
                  </p>
                  {eligible ? (
                    <Alert tone="success">
                      Eligible: active, expires {r.expiresOn}, {r.refillsRemaining} refills left.
                    </Alert>
                  ) : (
                    <Alert tone="danger" title="Not eligible">
                      {en.refills.notEligible[reason === "in_progress" ? "in_progress" : reason]}
                    </Alert>
                  )}
                  <RefillControls refillId={r.id} status={r.status} eligible={eligible} />
                </Card>
              </li>
            );
          })}
        </ul>
      )}

      {done.length > 0 && (
        <section className="flex flex-col gap-3" aria-labelledby="refill-history">
          <h2 id="refill-history" className="text-xl font-semibold">Finished</h2>
          <ul className="divide-y divide-line rounded-[var(--radius-card)] border border-line">
            {done.map((r) => (
              <li key={r.id} className="flex flex-wrap items-center gap-3 px-5 py-3">
                <span className="flex-1">
                  {r.patientName} — {r.productName}
                </span>
                {r.staffNote && <span className="text-sm text-muted">“{r.staffNote}”</span>}
                <Badge tone={r.status === "completed" ? "success" : "danger"}>{en.refills.requestStatus[r.status]}</Badge>
              </li>
            ))}
          </ul>
        </section>
      )}
    </>
  );
}
