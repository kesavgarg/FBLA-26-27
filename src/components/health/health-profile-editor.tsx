"use client";

import { Plus, X } from "lucide-react";
import { startTransition, useActionState, useEffect, useRef, type FormEvent } from "react";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/field";
import { addAllergyAction, addMedicationAction, removeHealthItemAction } from "@/lib/actions/health";
import { IDLE_RESULT } from "@/lib/actions/idle";
import type { HealthProfile } from "@/lib/data/health";
import { useI18n } from "@/lib/i18n/provider";

/** One list (allergies or medicines) with remove buttons and an add form. */
function ItemList({
  kind,
  items,
  emptyText,
}: {
  kind: "allergy" | "medication";
  items: Array<{ id: string; label: string; detail?: string | null }>;
  emptyText: string;
}) {
  const { t } = useI18n();
  if (items.length === 0) return <p className="text-muted">{emptyText}</p>;
  return (
    <ul className="flex flex-wrap gap-2">
      {items.map((item) => (
        <li key={item.id} className="flex items-center gap-1 rounded-[var(--radius-pill)] border border-line bg-sky-50 py-1 pr-1 pl-4">
          <span className="font-medium capitalize">{item.label}</span>
          {item.detail && <span className="text-sm text-muted">· {item.detail}</span>}
          <form action={removeHealthItemAction}>
            <input type="hidden" name="id" value={item.id} />
            <input type="hidden" name="kind" value={kind} />
            <button type="submit" className="flex size-9 items-center justify-center rounded-full text-muted hover:bg-danger-soft hover:text-danger">
              <X className="size-4" aria-hidden="true" />
              <span className="sr-only">
                {t.health.remove} {item.label}
              </span>
            </button>
          </form>
        </li>
      ))}
    </ul>
  );
}

/** Allergies and current medicines — used by every safety check. */
export function HealthProfileEditor({ profile }: { profile: HealthProfile }) {
  const { t } = useI18n();
  const [allergyState, allergyAction, allergyPending] = useActionState(addAllergyAction, IDLE_RESULT);
  const [medState, medAction, medPending] = useActionState(addMedicationAction, IDLE_RESULT);
  const allergyForm = useRef<HTMLFormElement>(null);
  const medForm = useRef<HTMLFormElement>(null);

  // Clear a form only after its entry was saved (keep typing on errors).
  useEffect(() => {
    if (allergyState.status === "success") allergyForm.current?.reset();
  }, [allergyState]);
  useEffect(() => {
    if (medState.status === "success") medForm.current?.reset();
  }, [medState]);

  function submitWith(run: (data: FormData) => void) {
    return (event: FormEvent<HTMLFormElement>) => {
      event.preventDefault();
      const formData = new FormData(event.currentTarget);
      startTransition(() => run(formData));
    };
  }

  return (
    <div className="grid gap-8 lg:grid-cols-2">
      <section className="flex flex-col gap-4" aria-labelledby="allergies-title">
        <h3 id="allergies-title" className="font-semibold">
          {t.health.allergies}
        </h3>
        <ItemList
          kind="allergy"
          items={profile.allergies.map((a) => ({ id: a.id, label: a.substance, detail: a.reaction }))}
          emptyText={t.health.allergiesNone}
        />
        <form ref={allergyForm} onSubmit={submitWith(allergyAction)} className="flex flex-col gap-2 sm:flex-row sm:items-end" noValidate>
          <label className="flex flex-1 flex-col gap-1 text-sm font-semibold">
            {t.health.allergySubstance}
            <Input name="substance" maxLength={60} aria-invalid={Boolean(allergyState.fieldErrors?.substance)} />
          </label>
          <label className="flex flex-1 flex-col gap-1 text-sm font-semibold">
            {t.health.allergyReaction}
            <Input name="reaction" maxLength={120} />
          </label>
          <Button type="submit" variant="secondary" pending={allergyPending} icon={<Plus className="size-4" aria-hidden="true" />}>
            {t.health.addAllergy}
          </Button>
        </form>
        <div aria-live="polite">
          {(allergyState.fieldErrors?.substance || (allergyState.status === "error" && allergyState.message)) && (
            <Alert tone="danger">{allergyState.fieldErrors?.substance ?? allergyState.message}</Alert>
          )}
        </div>
      </section>

      <section className="flex flex-col gap-4" aria-labelledby="meds-title">
        <h3 id="meds-title" className="font-semibold">
          {t.health.medications}
        </h3>
        <ItemList kind="medication" items={profile.medications.map((m) => ({ id: m.id, label: m.name }))} emptyText={t.health.medicationsNone} />
        <form ref={medForm} onSubmit={submitWith(medAction)} className="flex flex-col gap-2 sm:flex-row sm:items-end" noValidate>
          <label className="flex flex-1 flex-col gap-1 text-sm font-semibold">
            {t.health.medicationName}
            <Input name="name" maxLength={80} aria-invalid={Boolean(medState.fieldErrors?.name)} />
          </label>
          <Button type="submit" variant="secondary" pending={medPending} icon={<Plus className="size-4" aria-hidden="true" />}>
            {t.health.addMedication}
          </Button>
        </form>
        <div aria-live="polite">
          {(medState.fieldErrors?.name || (medState.status === "error" && medState.message)) && (
            <Alert tone="danger">{medState.fieldErrors?.name ?? medState.message}</Alert>
          )}
        </div>
      </section>
    </div>
  );
}
