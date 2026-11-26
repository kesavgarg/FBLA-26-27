"use client";

import { ArrowRight, PhoneCall, ShieldAlert, Stethoscope, Sparkles } from "lucide-react";
import Link from "next/link";
import { startTransition, useActionState, type FormEvent } from "react";
import { Alert } from "@/components/ui/alert";
import { Button, buttonClasses } from "@/components/ui/button";
import { Field, Textarea } from "@/components/ui/field";
import { submitConsultAction } from "@/lib/actions/health";
import { IDLE_RESULT } from "@/lib/actions/idle";
import { fillTemplate } from "@/lib/domain/db-errors";
import type { TriageResult } from "@/lib/domain/triage";
import { useI18n } from "@/lib/i18n/provider";

/**
 * What happens after the symptom check:
 *   EMERGENCY  big red screen, call 911 (and Poison Control). No shopping.
 *   CONSULT    the reasons, then "Send to the doctor".
 *   SELF_CARE  links to helpful OTC shop categories + "ask the pharmacist".
 */
export function TriageResultView({
  triage,
  symptomLogId,
  draftSummary,
  onStartOver,
}: {
  triage: TriageResult;
  symptomLogId: string;
  draftSummary: string;
  onStartOver: () => void;
}) {
  const { t } = useI18n();
  const r = t.result;

  if (triage.outcome === "EMERGENCY") {
    return (
      <section role="alert" aria-labelledby="emergency-title" className="flex flex-col gap-6 rounded-[28px] bg-danger p-8 text-white sm:p-12">
        <ShieldAlert className="size-12" aria-hidden="true" />
        <h2 id="emergency-title" className="text-[2.4rem] leading-tight font-semibold">
          {r.emergencyTitle}
        </h2>
        <p className="max-w-xl text-xl">{r.emergencyBody}</p>
        <a href="tel:911" className="inline-flex min-h-16 items-center justify-center gap-3 self-start rounded-[var(--radius-pill)] bg-white px-10 text-xl font-semibold text-danger">
          <PhoneCall className="size-6" aria-hidden="true" />
          {r.call911}
        </a>
        {triage.poisonControl && (
          <div className="flex flex-col gap-3 rounded-[var(--radius-card)] bg-white/15 p-6">
            <h3 className="text-xl font-semibold">{r.poisonTitle}</h3>
            <p>{r.poisonBody}</p>
            <a href="tel:18002221222" className="inline-flex min-h-12 items-center gap-2 self-start rounded-[var(--radius-pill)] border border-white px-6 font-semibold">
              <PhoneCall className="size-5" aria-hidden="true" />
              {r.callPoison}
            </a>
          </div>
        )}
      </section>
    );
  }

  if (triage.outcome === "CONSULT") {
    return (
      <section aria-labelledby="consult-title" className="flex flex-col gap-6 rounded-[28px] border border-sky-200 bg-sky-50 p-8 sm:p-10">
        <Stethoscope className="size-10 text-action" aria-hidden="true" />
        <h2 id="consult-title" className="text-[2rem] leading-tight font-semibold">
          {r.consultTitle}
        </h2>
        <p className="max-w-2xl text-lg">{r.consultBody}</p>
        <ul className="flex flex-col gap-2">
          {triage.reasons
            .filter((reason): reason is "severity" | "duration" | "temperature" => reason !== "red_flag" && reason !== "mild")
            .map((reason) => (
              <li key={reason} className="flex items-center gap-2 font-medium">
                <span className="size-2 rounded-full bg-warning" aria-hidden="true" />
                {r.consultReasons[reason]}
              </li>
            ))}
        </ul>
        <ConsultRequestForm symptomLogId={symptomLogId} draft={draftSummary} />
        <p className="text-sm text-muted">{t.health.disclaimer}</p>
      </section>
    );
  }

  return (
    <section aria-labelledby="selfcare-title" className="flex flex-col gap-6 rounded-[28px] border border-success/25 bg-success-soft p-8 sm:p-10">
      <Sparkles className="size-10 text-success" aria-hidden="true" />
      <h2 id="selfcare-title" className="text-[2rem] leading-tight font-semibold">
        {r.selfCareTitle}
      </h2>
      <p className="max-w-2xl text-lg">{r.selfCareBody}</p>
      {triage.suggestedCategories.length > 0 && (
        <ul className="flex flex-wrap gap-3">
          {triage.suggestedCategories.map((category) => (
            <li key={category}>
              <Link href={`/shop?category=${category}`} className={buttonClasses("secondary")}>
                {fillTemplate(r.shopCategory, [t.shop.categories[category]])}
                <ArrowRight className="size-4" aria-hidden="true" />
              </Link>
            </li>
          ))}
        </ul>
      )}
      <p className="font-medium">{r.askPharmacist}</p>
      <div className="flex flex-wrap items-center gap-3 border-t border-success/20 pt-5">
        <p className="text-sm text-muted">{r.savedToJournal}</p>
        <Button variant="quiet" onClick={onStartOver}>
          {r.startOver}
        </Button>
      </div>
      <p className="text-sm text-muted">{t.health.disclaimer}</p>
    </section>
  );
}

/** "Message to the doctor" + send button (creates the consult request). */
function ConsultRequestForm({ symptomLogId, draft }: { symptomLogId: string; draft: string }) {
  const { t } = useI18n();
  const [state, action, pending] = useActionState(submitConsultAction, IDLE_RESULT);

  if (state.status === "success") {
    return (
      <div className="flex flex-col gap-3">
        <Alert tone="success">{state.message}</Alert>
        <Link href="/account/consults" className={buttonClasses("primary", "lg", "self-start")}>
          {t.result.viewConsult}
        </Link>
      </div>
    );
  }

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    startTransition(() => action(formData));
  }

  return (
    <form onSubmit={submit} className="flex flex-col gap-4" noValidate>
      <input type="hidden" name="symptomLogId" value={symptomLogId} />
      <Field id="consult-summary" label={t.result.summaryLabel} hint={t.result.summaryHint} error={state.fieldErrors?.summary}>
        {(d, invalid) => (
          <Textarea id="consult-summary" name="summary" defaultValue={draft} maxLength={1000} rows={4} aria-describedby={d} aria-invalid={invalid} />
        )}
      </Field>
      <div aria-live="polite">{state.status === "error" && state.message && <Alert tone="danger">{state.message}</Alert>}</div>
      <Button type="submit" size="lg" pending={pending} className="self-start" icon={<Stethoscope className="size-5" aria-hidden="true" />}>
        {pending ? t.result.sending : t.result.sendConsult}
      </Button>
    </form>
  );
}
