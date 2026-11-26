import { CalendarClock, Pill, RefreshCw, UserRound } from "lucide-react";
import { RefillForm } from "@/components/orders/refill-form";
import { Alert } from "@/components/ui/alert";
import { ButtonLink } from "@/components/ui/button";
import { Badge, Card } from "@/components/ui/card";
import { requireRole } from "@/lib/auth/session";
import { listMyPrescriptions, listOpenSlots } from "@/lib/data/orders";
import { fillTemplate } from "@/lib/domain/db-errors";
import { getRefillEligibility, storeToday } from "@/lib/domain/refills";
import { formatStoreDateTime } from "@/lib/domain/slots";
import { getDictionary } from "@/lib/i18n/server";

export const metadata = { title: "Prescriptions" };

/**
 * Prescriptions and refills. For each prescription the page shows refills
 * left and expiry, then either the refill form or the exact reason a refill
 * isn't possible (the same rule the database enforces in request_refill).
 */
export default async function PrescriptionsPage() {
  const user = await requireRole(
    ["customer", "staff", "doctor", "owner"],
    "/account/prescriptions",
  );
  const { t, locale } = await getDictionary();
  const [prescriptions, slots] = await Promise.all([
    listMyPrescriptions(user.id, locale),
    listOpenSlots(),
  ]);
  const today = storeToday();
  const dateFormat = new Intl.DateTimeFormat(
    locale === "es" ? "es-US" : "en-US",
    { dateStyle: "medium", timeZone: "UTC" },
  );

  return (
    <>
      <header className="flex flex-col gap-2 border-b border-line pb-8">
        <h1 className="text-[2.1rem] font-semibold tracking-tight">
          {t.refills.title}
        </h1>
        <p className="max-w-2xl text-lg text-ink/80">{t.refills.intro}</p>
      </header>

      {prescriptions.length === 0 ? (
        <p className="text-lg text-muted">{t.refills.none}</p>
      ) : (
        <ul className="grid gap-6 lg:grid-cols-2">
          {prescriptions.map((rx) => {
            const reason = getRefillEligibility(
              {
                patientId: user.id,
                status: rx.status,
                expiresOn: rx.expiresOn,
                refillsRemaining: rx.refillsRemaining,
                hasOpenRefill: Boolean(rx.openRefill),
              },
              user.id,
              today,
            );
            const expired = rx.expiresOn < today;
            const expiry = dateFormat.format(
              new Date(`${rx.expiresOn}T00:00:00Z`),
            );
            const firstFillReady =
              rx.status === "active" && !expired && !rx.firstFilledAt;

            return (
              <li key={rx.id}>
                <Card className="flex h-full flex-col gap-5 p-6">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex items-start gap-3">
                      <span className="flex size-11 shrink-0 items-center justify-center rounded-full bg-sky-100">
                        <Pill
                          className="size-5 text-action"
                          aria-hidden="true"
                        />
                      </span>
                      <div>
                        <h2 className="text-lg leading-snug font-semibold">
                          {rx.productName}
                        </h2>
                        <p className="tabular text-sm text-muted">
                          {fillTemplate(t.refills.rxNumber, [rx.rxNumber])}
                        </p>
                      </div>
                    </div>
                    <Badge tone={rx.refillsRemaining > 0 ? "info" : "neutral"}>
                      {rx.refillsRemaining === 1
                        ? t.refills.refillsLeftOne
                        : fillTemplate(t.refills.refillsLeft, [
                            String(rx.refillsRemaining),
                          ])}
                    </Badge>
                  </div>

                  <dl className="grid gap-3 text-[0.94rem] sm:grid-cols-2">
                    <div className="flex items-center gap-2">
                      <CalendarClock
                        className="size-4 text-muted"
                        aria-hidden="true"
                      />
                      <dd
                        className={expired ? "font-semibold text-danger" : ""}
                      >
                        {fillTemplate(
                          expired ? t.refills.expired : t.refills.expires,
                          [expiry],
                        )}
                      </dd>
                    </div>
                    {rx.prescriberName && (
                      <div className="flex items-center gap-2">
                        <UserRound
                          className="size-4 text-muted"
                          aria-hidden="true"
                        />
                        <dd>
                          {fillTemplate(t.refills.prescriber, [
                            rx.prescriberName,
                          ])}
                        </dd>
                      </div>
                    )}
                    <div className="sm:col-span-2">
                      <dt className="text-sm text-muted">
                        {t.refills.directions}
                      </dt>
                      <dd>{rx.directions}</dd>
                    </div>
                  </dl>

                  <div className="mt-auto border-t border-line pt-5">
                    {rx.openRefill ? (
                      <div className="flex flex-col gap-3">
                        {rx.openRefill.status === "requested" && (
                          <Alert tone="success">{t.refills.requested}</Alert>
                        )}
                        <div className="flex flex-wrap items-center gap-3">
                          <RefreshCw
                            className="size-5 text-action"
                            aria-hidden="true"
                          />
                          <span className="font-medium">
                            {t.refills.openRequests}:
                          </span>
                          <Badge tone="info">
                            {
                              t.refills.requestStatus[
                                rx.openRefill
                                  .status as keyof typeof t.refills.requestStatus
                              ]
                            }
                          </Badge>
                          {rx.openRefill.pickupAt && (
                            <span className="text-sm text-muted">
                              {fillTemplate(t.orders.pickupAt, [
                                formatStoreDateTime(
                                  rx.openRefill.pickupAt,
                                  locale,
                                ),
                              ])}
                            </span>
                          )}
                        </div>
                      </div>
                    ) : firstFillReady ? (
                      <div className="flex flex-col gap-3">
                        <Alert tone="success">{t.refills.firstFillReady}</Alert>
                        <ButtonLink
                          href={`/shop/${rx.productSlug}`}
                          className="self-start"
                        >
                          {t.refills.goToProduct}
                        </ButtonLink>
                      </div>
                    ) : reason === "eligible" ? (
                      <RefillForm prescriptionId={rx.id} slots={slots} />
                    ) : (
                      <Alert tone={reason === "expired" ? "danger" : "warning"}>
                        {
                          t.refills.notEligible[
                            reason === "in_progress" ? "in_progress" : reason
                          ]
                        }
                      </Alert>
                    )}
                  </div>
                </Card>
              </li>
            );
          })}
        </ul>
      )}
    </>
  );
}
