"use client";

import { ArrowLeft, ArrowRight, Check } from "lucide-react";
import Link from "next/link";
import { startTransition, useActionState, useState } from "react";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Field, Input, Textarea } from "@/components/ui/field";
import { submitSymptomCheckAction, type SymptomCheckResult } from "@/lib/actions/health";
import { fillTemplate } from "@/lib/domain/db-errors";
import { RED_FLAGS, SYMPTOMS, type RedFlag, type Symptom } from "@/lib/domain/triage";
import type { WearableSnapshot } from "@/lib/domain/wearable";
import { useI18n } from "@/lib/i18n/provider";
import { cx } from "@/lib/utils";
import { TriageResultView } from "./triage-result";
import { WatchImport } from "./watch-import";

const INITIAL: SymptomCheckResult = { status: "idle" };

/**
 * Four-step symptom check: Symptoms → Details → Watch data → Review.
 * Answers are kept in component state and sent together at the end; the
 * server validates them again and runs the triage rules itself.
 */
export function SymptomCheckWizard({
  today,
  allergies,
  medications,
}: {
  today: string;
  allergies: string[];
  medications: string[];
}) {
  const { t } = useI18n();
  const c = t.check;
  const [state, action, pending] = useActionState(submitSymptomCheckAction, INITIAL);
  const [step, setStep] = useState(0);
  const [symptoms, setSymptoms] = useState<Symptom[]>([]);
  const [redFlags, setRedFlags] = useState<RedFlag[]>([]);
  const [noRedFlags, setNoRedFlags] = useState(false);
  const [severity, setSeverity] = useState(4);
  const [startedOn, setStartedOn] = useState(today);
  const [temperature, setTemperature] = useState("");
  const [notes, setNotes] = useState("");
  const [wearable, setWearable] = useState<WearableSnapshot | null>(null);
  const [stepError, setStepError] = useState<string | null>(null);
  /** The result the person chose to leave with "Start a new check". */
  const [dismissedLogId, setDismissedLogId] = useState<string | null>(null);

  const toggle = <T,>(list: T[], item: T) => (list.includes(item) ? list.filter((x) => x !== item) : [...list, item]);

  /** Check the current step before moving on (the server checks again). */
  function canLeaveStep(): boolean {
    if (step === 0) {
      if (symptoms.length === 0 && redFlags.length === 0) return fail(t.errors.symptomsRequired);
      if (redFlags.length === 0 && !noRedFlags) return fail(t.errors.redFlagAnswer);
    }
    if (step === 1 && startedOn > today) return fail(t.errors.startedFuture);
    setStepError(null);
    return true;
  }
  function fail(message: string) {
    setStepError(message);
    return false;
  }

  function submit() {
    const formData = new FormData();
    (symptoms.length ? symptoms : (["other"] as Symptom[])).forEach((s) => formData.append("symptoms", s));
    redFlags.forEach((flag) => formData.append("redFlags", flag));
    formData.set("severity", String(severity));
    formData.set("startedOn", startedOn);
    formData.set("temperatureF", temperature);
    formData.set("notes", notes);
    if (wearable) formData.set("wearable", JSON.stringify(wearable));
    startTransition(() => action(formData));
  }

  function startOver() {
    setStep(0);
    setSymptoms([]);
    setRedFlags([]);
    setNoRedFlags(false);
    setSeverity(4);
    setStartedOn(today);
    setTemperature("");
    setNotes("");
    setWearable(null);
    setDismissedLogId(state.symptomLogId ?? null);
  }

  // ----- Result -----------------------------------------------------------
  if (state.status === "success" && state.triage && state.symptomLogId && state.symptomLogId !== dismissedLogId) {
    const days = Math.max(0, Math.round((Date.parse(today) - Date.parse(startedOn)) / 86_400_000));
    const draft = [
      symptoms.map((s) => c.symptoms[s]).join(", "),
      `${fillTemplate(t.health.entrySeverity, [String(severity)])}`,
      `${days} d`,
      temperature ? fillTemplate(t.health.entryTemp, [temperature]) : "",
      notes,
    ]
      .filter(Boolean)
      .join(" · ");
    return <TriageResultView triage={state.triage} symptomLogId={state.symptomLogId} draftSummary={draft} onStartOver={startOver} />;
  }

  // Red flags skip the remaining questions: go straight to the result.
  const isLast = step === 3 || redFlags.length > 0;
  const errors = state.fieldErrors ?? {};

  return (
    <div className="flex flex-col gap-8">
      {/* Progress */}
      <ol className="grid grid-cols-4 gap-2" aria-label={fillTemplate(c.stepOf, [String(step + 1), "4"])}>
        {c.steps.map((label, index) => (
          <li key={label} className="flex flex-col gap-2">
            <span className={cx("h-1.5 rounded-full", index <= step ? "bg-action" : "bg-line")} aria-hidden="true" />
            <span className={cx("text-sm", index === step ? "font-semibold text-ink" : "text-muted")}>
              {label}
              {index === step && <span className="sr-only"> ({fillTemplate(c.stepOf, [String(step + 1), "4"])})</span>}
            </span>
          </li>
        ))}
      </ol>

      {step === 0 && (
        <div className="flex flex-col gap-8">
          <fieldset className="flex min-w-0 flex-col gap-3">
            <legend className="mb-3 text-lg font-semibold">{c.symptomsLegend}</legend>
            <div className="flex flex-wrap gap-2">
              {SYMPTOMS.map((symptom) => {
                const on = symptoms.includes(symptom);
                return (
                  <label
                    key={symptom}
                    className={cx(
                      "flex min-h-12 cursor-pointer items-center gap-2 rounded-[var(--radius-pill)] border px-4 font-medium transition-colors has-[:focus-visible]:ring-3 has-[:focus-visible]:ring-action",
                      on ? "border-action bg-sky-100 text-ink" : "border-line-strong hover:border-action",
                    )}
                  >
                    <input type="checkbox" className="sr-only" checked={on} onChange={() => setSymptoms(toggle(symptoms, symptom))} />
                    {on && <Check className="size-4 text-action" aria-hidden="true" />}
                    {c.symptoms[symptom]}
                  </label>
                );
              })}
            </div>
          </fieldset>

          <fieldset className="flex min-w-0 flex-col gap-3 rounded-[var(--radius-card)] border border-danger/25 bg-danger-soft/50 p-5">
            <legend className="sr-only">{c.redFlagsLegend}</legend>
            <p className="text-lg font-semibold" aria-hidden="true">
              {c.redFlagsLegend}
            </p>
            <p className="text-sm text-ink/80">{c.redFlagsHint}</p>
            <div className="grid gap-2 sm:grid-cols-2">
              {RED_FLAGS.map((flag) => (
                <label key={flag} className="flex min-h-12 cursor-pointer items-center gap-3 rounded-[var(--radius-field)] bg-canvas px-4 py-2">
                  <input
                    type="checkbox"
                    className="size-5 shrink-0 accent-[var(--color-danger)]"
                    checked={redFlags.includes(flag)}
                    onChange={() => {
                      setRedFlags(toggle(redFlags, flag));
                      setNoRedFlags(false);
                    }}
                  />
                  {c.redFlags[flag]}
                </label>
              ))}
              <label className="flex min-h-12 cursor-pointer items-center gap-3 rounded-[var(--radius-field)] bg-canvas px-4 py-2 font-semibold">
                <input
                  type="checkbox"
                  className="size-5 shrink-0 accent-[var(--color-action)]"
                  checked={noRedFlags}
                  onChange={() => {
                    setNoRedFlags(!noRedFlags);
                    setRedFlags([]);
                  }}
                />
                {c.noneOfThese}
              </label>
            </div>
          </fieldset>
        </div>
      )}

      {step === 1 && (
        <div className="grid gap-6 lg:grid-cols-2">
          <div className="flex flex-col gap-3 lg:col-span-2">
            <label htmlFor="severity" className="text-lg font-semibold">
              {c.severity}
            </label>
            <div className="flex items-center gap-5">
              <input
                id="severity"
                type="range"
                min={1}
                max={10}
                step={1}
                value={severity}
                onChange={(event) => setSeverity(Number(event.target.value))}
                aria-valuetext={`${severity} / 10`}
                className="h-3 flex-1 cursor-pointer accent-[var(--color-action)]"
              />
              <output htmlFor="severity" className="tabular w-16 text-center text-[2rem] font-semibold">
                {severity}
              </output>
            </div>
            <div className="flex justify-between text-sm text-muted">
              <span>{c.severityLow}</span>
              <span>{c.severityHigh}</span>
            </div>
            {errors.severity && <p className="text-sm font-medium text-danger">{errors.severity}</p>}
          </div>
          <Field id="startedOn" label={c.startedOn} error={errors.startedOn}>
            {(d, invalid) => (
              <Input id="startedOn" type="date" max={today} value={startedOn} onChange={(e) => setStartedOn(e.target.value)} aria-describedby={d} aria-invalid={invalid} />
            )}
          </Field>
          <Field id="temperatureF" label={c.temperature} hint={c.temperatureHint} error={errors.temperatureF}>
            {(d, invalid) => (
              <Input
                id="temperatureF"
                inputMode="decimal"
                value={temperature}
                onChange={(e) => setTemperature(e.target.value.replace(/[^\d.]/g, "").slice(0, 5))}
                placeholder="98.6"
                aria-describedby={d}
                aria-invalid={invalid}
              />
            )}
          </Field>
          <Field id="notes" label={c.notes} hint={c.notesHint} error={errors.notes} className="lg:col-span-2">
            {(d, invalid) => (
              <Textarea id="notes" value={notes} maxLength={1000} onChange={(e) => setNotes(e.target.value)} rows={3} aria-describedby={d} aria-invalid={invalid} />
            )}
          </Field>
        </div>
      )}

      {step === 2 && <WatchImport today={today} value={wearable} onChange={setWearable} />}

      {step === 3 && (
        <div className="grid gap-6 sm:grid-cols-2">
          <div className="rounded-[var(--radius-card)] border border-line p-5">
            <h3 className="mb-2 font-semibold">{c.reviewAllergies}</h3>
            <p className="text-ink/85">{allergies.length ? allergies.join(", ") : c.reviewNone}</p>
          </div>
          <div className="rounded-[var(--radius-card)] border border-line p-5">
            <h3 className="mb-2 font-semibold">{c.reviewMeds}</h3>
            <p className="text-ink/85">{medications.length ? medications.join(", ") : c.reviewNone}</p>
          </div>
          <Link href="/account/health" className="text-[0.94rem] font-semibold text-action hover:underline">
            {c.editProfile}
          </Link>
        </div>
      )}

      <div aria-live="polite">
        {stepError && <Alert tone="danger">{stepError}</Alert>}
        {state.status === "error" && state.message && <Alert tone="danger">{state.message}</Alert>}
        {state.status === "error" && !state.message && Object.keys(errors).length > 0 && (
          <Alert tone="danger">{Object.values(errors)[0]}</Alert>
        )}
      </div>

      <div className="flex flex-wrap items-center gap-3 border-t border-line pt-6">
        {step > 0 && (
          <Button variant="secondary" size="lg" onClick={() => setStep(step - 1)} icon={<ArrowLeft className="size-5" aria-hidden="true" />}>
            {c.back}
          </Button>
        )}
        {isLast ? (
          <Button size="lg" pending={pending} onClick={() => canLeaveStep() && submit()}>
            {pending ? c.submitting : c.submit}
          </Button>
        ) : (
          <Button size="lg" onClick={() => canLeaveStep() && setStep(step + 1)}>
            {c.next}
            <ArrowRight className="size-5" aria-hidden="true" />
          </Button>
        )}
        {step === 2 && !wearable && (
          <Button variant="quiet" onClick={() => setStep(3)}>
            {t.watch.skip}
          </Button>
        )}
      </div>
    </div>
  );
}
