import { ClipboardPlus, Stethoscope, Watch } from "lucide-react";
import { HealthProfileEditor } from "@/components/health/health-profile-editor";
import { SeverityChart } from "@/components/health/severity-chart";
import { Alert } from "@/components/ui/alert";
import { ButtonLink } from "@/components/ui/button";
import { Badge, Card } from "@/components/ui/card";
import { requireRole } from "@/lib/auth/session";
import { getHealthProfile, listSymptomLogs } from "@/lib/data/health";
import { fillTemplate } from "@/lib/domain/db-errors";
import type { Symptom } from "@/lib/domain/triage";
import { getDictionary } from "@/lib/i18n/server";

export const metadata = { title: "Health" };

/** Health hub: start a check, see the journal and trend, manage allergies. */
export default async function HealthPage() {
  const user = await requireRole(["customer", "staff", "doctor", "owner"], "/account/health");
  const { t, locale } = await getDictionary();
  const [profile, logs] = await Promise.all([getHealthProfile(user.id), listSymptomLogs(user.id)]);
  const lang = locale === "es" ? "es-US" : "en-US";
  const shortDate = (iso: string) => new Intl.DateTimeFormat(lang, { month: "short", day: "numeric", timeZone: "America/New_York" }).format(new Date(iso));
  const tone = { EMERGENCY: "danger", CONSULT: "warning", SELF_CARE: "success" } as const;

  return (
    <>
      <header className="flex flex-col gap-4 border-b border-line pb-8 lg:flex-row lg:items-end lg:justify-between">
        <div className="flex flex-col gap-2">
          <p className="text-sm font-semibold text-action">{t.health.title}</p>
          <h1 className="text-[2.1rem] leading-tight font-semibold tracking-tight">{t.health.heading}</h1>
          <p className="max-w-2xl text-lg text-ink/80">{t.health.intro}</p>
        </div>
        <div className="flex flex-wrap gap-3">
          <ButtonLink href="/account/health/check" size="lg" icon={<ClipboardPlus className="size-5" aria-hidden="true" />}>
            {t.health.startCheck}
          </ButtonLink>
          <ButtonLink href="/account/consults" size="lg" variant="secondary" icon={<Stethoscope className="size-5" aria-hidden="true" />}>
            {t.health.consultsLink}
          </ButtonLink>
        </div>
      </header>

      <Alert tone="warning">{t.health.disclaimer}</Alert>

      <Card className="flex flex-col gap-6 p-6 sm:p-8">
        <h2 className="text-xl font-semibold">{t.health.journal}</h2>
        {logs.length === 0 ? (
          <p className="text-muted">{t.health.journalEmpty}</p>
        ) : (
          <>
            <SeverityChart logs={logs} title={t.health.journalChart} dateLabel={shortDate} />
            <ul className="divide-y divide-line">
              {logs.slice(0, 8).map((log) => (
                <li key={log.id} className="flex flex-col gap-2 py-4 sm:flex-row sm:items-center sm:gap-6">
                  <p className="tabular w-20 shrink-0 text-sm text-muted">{shortDate(log.loggedAt)}</p>
                  <div className="flex min-w-0 flex-1 flex-col gap-1">
                    <p className="font-medium">
                      {log.symptoms.map((s) => t.check.symptoms[s as Symptom] ?? s).join(", ")}
                    </p>
                    <p className="text-sm text-muted">
                      {fillTemplate(t.health.entrySeverity, [String(log.severity)])}
                      {log.temperatureF ? ` · ${fillTemplate(t.health.entryTemp, [String(log.temperatureF)])}` : ""}
                    </p>
                    {log.wearable && (
                      <p className="flex items-center gap-1.5 text-sm text-warning">
                        <Watch className="size-4" aria-hidden="true" />
                        {t.health.entryWearable}
                      </p>
                    )}
                  </div>
                  {log.triageResult && <Badge tone={tone[log.triageResult]}>{t.health.outcomeLabel[log.triageResult]}</Badge>}
                </li>
              ))}
            </ul>
          </>
        )}
      </Card>

      <Card className="flex flex-col gap-6 p-6 sm:p-8">
        <div>
          <h2 className="text-xl font-semibold">{t.health.profileTitle}</h2>
          <p className="text-ink/80">{t.health.profileHint}</p>
        </div>
        <HealthProfileEditor profile={profile} />
      </Card>
    </>
  );
}
