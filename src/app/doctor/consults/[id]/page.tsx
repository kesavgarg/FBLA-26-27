import { ArrowLeft, Pill, ShieldAlert, Watch } from "lucide-react";
import Link from "next/link";
import { notFound } from "next/navigation";
import type { ReactNode } from "react";
import { DecisionForm } from "@/components/doctor/decision-form";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Badge, Card } from "@/components/ui/card";
import { startReviewAction } from "@/lib/actions/doctor";
import { requireRole } from "@/lib/auth/session";
import { getConsultReview } from "@/lib/data/doctor";
import { formatStoreDateTime } from "@/lib/domain/slots";
import { doctorCanDecide } from "@/lib/domain/workflow";
import { en } from "@/lib/i18n/en";

export const metadata = { title: "Review request" };

const STATUS_LABEL = { submitted: "New", under_review: "Reviewing", needs_info: "Waiting on patient", approved: "Approved", denied: "Denied" } as const;
const TRIAGE = { EMERGENCY: ["Emergency", "danger"], CONSULT: ["See a clinician", "warning"], SELF_CARE: ["Self-care", "success"] } as const;

function Section({ title, children, icon }: { title: string; children: ReactNode; icon?: ReactNode }) {
  return (
    <Card className="flex flex-col gap-3 p-6">
      <h2 className="flex items-center gap-2 font-semibold">
        {icon}
        {title}
      </h2>
      {children}
    </Card>
  );
}

/**
 * One consult request, with everything the doctor needs (and nothing more):
 * patient basics, the symptom check, history, allergies, medicines, any
 * simulated watch data, and the decision form.
 */
export default async function ConsultReviewPage({ params }: PageProps<"/doctor/consults/[id]">) {
  const { id } = await params;
  const user = await requireRole(["doctor", "owner"], `/doctor/consults/${id}`);
  const review = await getConsultReview(id);
  if (!review) notFound();
  const symptomName = (s: string) => en.check.symptoms[s as keyof typeof en.check.symptoms] ?? s;

  return (
    <>
      <Link href="/doctor" className="inline-flex min-h-11 items-center gap-2 self-start font-semibold text-action hover:underline">
        <ArrowLeft className="size-4" aria-hidden="true" />
        Consult inbox
      </Link>

      <header className="flex flex-wrap items-end justify-between gap-4 border-b border-line pb-6">
        <div>
          <p className="text-sm text-muted">Request sent {formatStoreDateTime(review.createdAt, "en")}</p>
          <h1 className="text-[2rem] font-semibold tracking-tight">{review.patient.name}</h1>
          <p className="text-muted">
            {review.patient.age !== null ? `Age ${review.patient.age}` : "Age not given"}
            {review.patient.phone ? ` · ${review.patient.phone} (fictional)` : ""}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {review.triage && <Badge tone={TRIAGE[review.triage][1]}>Symptom check: {TRIAGE[review.triage][0]}</Badge>}
          <Badge tone={review.status === "approved" ? "success" : review.status === "denied" ? "danger" : "info"}>{STATUS_LABEL[review.status]}</Badge>
        </div>
      </header>

      <div className="grid gap-6 lg:grid-cols-[1fr_28rem] lg:items-start">
        <div className="flex flex-col gap-6">
          <Section title="Patient’s summary">
            <p className="text-lg">{review.summary}</p>
            {review.infoRequest && (
              <p className="text-ink/80">
                <strong>You asked:</strong> {review.infoRequest}
              </p>
            )}
            {review.patientReply && (
              <p className="rounded-[var(--radius-field)] bg-sky-50 p-3">
                <strong>Patient replied:</strong> {review.patientReply}
              </p>
            )}
          </Section>

          {review.symptomLog && (
            <Section title="Symptom check">
              <dl className="grid gap-3 sm:grid-cols-2">
                <div>
                  <dt className="text-sm text-muted">Symptoms</dt>
                  <dd>{review.symptomLog.symptoms.map(symptomName).join(", ")}</dd>
                </div>
                <div>
                  <dt className="text-sm text-muted">Severity</dt>
                  <dd className="tabular">{review.symptomLog.severity} / 10</dd>
                </div>
                <div>
                  <dt className="text-sm text-muted">Started</dt>
                  <dd>{review.symptomLog.startedOn}</dd>
                </div>
                <div>
                  <dt className="text-sm text-muted">Temperature</dt>
                  <dd>{review.symptomLog.temperatureF ? `${review.symptomLog.temperatureF} °F` : "Not given"}</dd>
                </div>
                {review.symptomLog.notes && (
                  <div className="sm:col-span-2">
                    <dt className="text-sm text-muted">Notes</dt>
                    <dd>{review.symptomLog.notes}</dd>
                  </div>
                )}
              </dl>
            </Section>
          )}

          {review.wearable && (
            <Section title="Watch data (simulated sample)" icon={<Watch className="size-5 text-warning" aria-hidden="true" />}>
              <p className="text-sm text-muted">Fictional sample imported in the demo. Context only, not a diagnosis.</p>
              <p className="tabular">
                Avg HR {review.wearable.heartRateAvgBpm} bpm · Resting {review.wearable.restingHeartRateBpm} bpm · {review.wearable.steps.toLocaleString()} steps ·{" "}
                {review.wearable.sleepHours} h sleep · {review.wearable.activeMinutes} active min
              </p>
            </Section>
          )}

          <Section title="Symptom history">
            {review.history.length === 0 ? (
              <p className="text-muted">No earlier entries.</p>
            ) : (
              <ul className="divide-y divide-line">
                {review.history.map((entry) => (
                  <li key={entry.id} className="flex flex-wrap items-center gap-3 py-2">
                    <span className="tabular w-36 text-sm text-muted">{formatStoreDateTime(entry.loggedAt, "en")}</span>
                    <span className="flex-1">{entry.symptoms.map(symptomName).join(", ")}</span>
                    <span className="tabular text-sm">{entry.severity}/10</span>
                  </li>
                ))}
              </ul>
            )}
          </Section>
        </div>

        <div className="flex flex-col gap-6 lg:sticky lg:top-28">
          <Section title="Allergies" icon={<ShieldAlert className="size-5 text-danger" aria-hidden="true" />}>
            {review.currentAllergies.length ? (
              <ul className="flex flex-wrap gap-2">
                {review.currentAllergies.map((a) => (
                  <li key={a}>
                    <Badge tone="danger">{a}</Badge>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-muted">None on file.</p>
            )}
            {review.allergiesSnapshot.length > 0 && <p className="text-sm text-muted">At request time: {review.allergiesSnapshot.join(", ")}</p>}
          </Section>
          <Section title="Current medicines" icon={<Pill className="size-5 text-action" aria-hidden="true" />}>
            {review.currentMedications.length ? (
              <ul className="list-disc pl-5">
                {review.currentMedications.map((m) => (
                  <li key={m.name}>{m.name}</li>
                ))}
              </ul>
            ) : (
              <p className="text-muted">None on file.</p>
            )}
          </Section>

          <Card className="flex flex-col gap-4 p-6">
            <h2 className="text-lg font-semibold">Your decision</h2>
            {review.prescription && (
              <Alert tone="success" title="Approved">
                Prescription {review.prescription.rxNumber}: {review.prescription.product}
              </Alert>
            )}
            {review.status === "denied" && <Alert tone="danger" title="Denied">{review.doctorNote}</Alert>}
            {review.status === "needs_info" && <Alert tone="warning">Waiting for the patient’s answer.</Alert>}
            {user.role !== "doctor" ? (
              <Alert tone="info">Only the doctor account can decide. The owner can view this page but not approve.</Alert>
            ) : (
              doctorCanDecide(review.status) && (
                <>
                  {review.status === "submitted" && (
                    <form action={startReviewAction}>
                      <input type="hidden" name="consultId" value={review.id} />
                      <Button type="submit" variant="secondary">
                        Mark as reviewing (patient sees “Doctor reviewing”)
                      </Button>
                    </form>
                  )}
                  <DecisionForm consultId={review.id} rxOptions={review.rxOptions} />
                </>
              )
            )}
          </Card>
        </div>
      </div>
    </>
  );
}
