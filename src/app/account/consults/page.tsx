import { MessageCircleQuestion, Stethoscope } from "lucide-react";
import { ApprovalJourney } from "@/components/health/approval-journey";
import { ConsultReplyForm } from "@/components/health/consult-reply-form";
import { Alert } from "@/components/ui/alert";
import { ButtonLink } from "@/components/ui/button";
import { Badge, Card } from "@/components/ui/card";
import { requireRole } from "@/lib/auth/session";
import { listMyConsults } from "@/lib/data/health";
import { fillTemplate } from "@/lib/domain/db-errors";
import { formatStoreDateTime } from "@/lib/domain/slots";
import { getDictionary } from "@/lib/i18n/server";

export const metadata = { title: "Doctor requests" };

/** The customer's consult requests, each with its approval journey. */
export default async function ConsultsPage() {
  const user = await requireRole(["customer", "staff", "doctor", "owner"], "/account/consults");
  const { t, locale } = await getDictionary();
  const consults = await listMyConsults(user.id, locale);
  const tone = { submitted: "info", under_review: "info", needs_info: "warning", approved: "success", denied: "danger" } as const;

  return (
    <>
      <header className="flex flex-col gap-2 border-b border-line pb-8">
        <h1 className="text-[2.1rem] font-semibold tracking-tight">{t.consults.title}</h1>
        <p className="max-w-2xl text-lg text-ink/80">{t.consults.intro}</p>
      </header>

      {consults.length === 0 ? (
        <div className="flex flex-col items-start gap-4">
          <Stethoscope className="size-10 text-action" aria-hidden="true" />
          <p className="max-w-prose text-lg">{t.consults.none}</p>
          <ButtonLink href="/account/health/check">{t.health.startCheck}</ButtonLink>
        </div>
      ) : (
        <ul className="flex flex-col gap-6">
          {consults.map((consult) => (
            <li key={consult.id}>
              <Card className="flex flex-col gap-6 p-6 sm:p-8">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <p className="text-sm text-muted">{fillTemplate(t.consults.sentOn, [formatStoreDateTime(consult.createdAt, locale)])}</p>
                  <Badge tone={tone[consult.status]}>{t.consults.status[consult.status]}</Badge>
                </div>
                <ApprovalJourney status={consult.status} firstFilled={consult.prescription?.firstFilled ?? false} t={t} />

                <div>
                  <h2 className="text-sm font-semibold text-muted">{t.consults.yourSummary}</h2>
                  <p className="max-w-prose">{consult.summary}</p>
                  {consult.patientReply && <p className="mt-2 max-w-prose text-ink/80">↳ {consult.patientReply}</p>}
                </div>

                {consult.status === "under_review" && consult.patientReply && <Alert tone="info">{t.consults.replySent}</Alert>}

                {consult.status === "needs_info" && consult.infoRequest && (
                  <div className="flex flex-col gap-4 rounded-[var(--radius-card)] border border-warning/25 bg-warning-soft p-5">
                    <p className="flex items-start gap-2">
                      <MessageCircleQuestion className="mt-0.5 size-5 shrink-0 text-warning" aria-hidden="true" />
                      <span>
                        <strong>{t.consults.doctorAsks}:</strong> {consult.infoRequest}
                      </span>
                    </p>
                    <ConsultReplyForm consultId={consult.id} />
                  </div>
                )}

                {consult.status === "approved" && consult.prescription && (
                  <Alert tone="success" title={t.consults.status.approved}>
                    <p>{fillTemplate(t.consults.approvedBody, [`${consult.prescription.productName} (${consult.prescription.rxNumber})`])}</p>
                    {consult.doctorNote && (
                      <p className="mt-1">
                        <strong>{t.consults.doctorNote}:</strong> {consult.doctorNote}
                      </p>
                    )}
                    {!consult.prescription.firstFilled && (
                      <ButtonLink href={`/shop/${consult.prescription.productSlug}`} className="mt-3">
                        {t.consults.buyNow}
                      </ButtonLink>
                    )}
                  </Alert>
                )}

                {consult.status === "denied" && (
                  <Alert tone="danger" title={t.consults.status.denied}>
                    <p>{t.consults.deniedBody}</p>
                    {consult.doctorNote && (
                      <p className="mt-1">
                        <strong>{t.consults.doctorNote}:</strong> {consult.doctorNote}
                      </p>
                    )}
                  </Alert>
                )}
                <p className="text-sm text-muted">{t.consults.simulatedDoctor}</p>
              </Card>
            </li>
          ))}
        </ul>
      )}
    </>
  );
}
