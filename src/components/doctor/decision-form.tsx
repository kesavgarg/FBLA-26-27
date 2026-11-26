"use client";

import { CheckCircle2, MessageCircleQuestion, TriangleAlert, XCircle } from "lucide-react";
import { startTransition, useActionState, useState, type FormEvent } from "react";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Field, Input, Select, Textarea } from "@/components/ui/field";
import { decideConsultAction } from "@/lib/actions/doctor";
import { IDLE_RESULT } from "@/lib/actions/idle";
import type { RxOption } from "@/lib/data/doctor";
import { cx } from "@/lib/utils";

type Decision = "approve" | "deny" | "needs_info";

/**
 * The doctor's decision. Prescription items the patient is allergic to are
 * disabled in the list (and the database refuses them anyway). Interaction
 * cautions from the demo table appear when an item is chosen.
 */
export function DecisionForm({ consultId, rxOptions }: { consultId: string; rxOptions: RxOption[] }) {
  const [state, action, pending] = useActionState(decideConsultAction, IDLE_RESULT);
  const [decision, setDecision] = useState<Decision>("approve");
  const [productId, setProductId] = useState("");
  const chosen = rxOptions.find((option) => option.id === productId);
  const err = state.fieldErrors ?? {};

  if (state.status === "success") return <Alert tone="success" title="Decision saved">{state.message}</Alert>;

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    startTransition(() => action(formData));
  }

  const choices: Array<{ value: Decision; label: string; icon: React.ReactNode }> = [
    { value: "approve", label: "Approve", icon: <CheckCircle2 className="size-5 text-success" aria-hidden="true" /> },
    { value: "deny", label: "Deny", icon: <XCircle className="size-5 text-danger" aria-hidden="true" /> },
    { value: "needs_info", label: "Ask for information", icon: <MessageCircleQuestion className="size-5 text-warning" aria-hidden="true" /> },
  ];

  return (
    <form onSubmit={submit} className="flex flex-col gap-5" noValidate>
      <input type="hidden" name="consultId" value={consultId} />
      <fieldset className="flex min-w-0 flex-col gap-2">
        <legend className="mb-2 font-semibold">Decision</legend>
        <div className="grid gap-2 sm:grid-cols-3">
          {choices.map((choice) => (
            <label
              key={choice.value}
              className={cx(
                "flex min-h-12 cursor-pointer items-center gap-2 rounded-[var(--radius-field)] border px-4 font-medium has-[:focus-visible]:ring-3 has-[:focus-visible]:ring-action",
                decision === choice.value ? "border-action bg-sky-50" : "border-line-strong",
              )}
            >
              <input type="radio" name="decision" value={choice.value} checked={decision === choice.value} onChange={() => setDecision(choice.value)} className="sr-only" />
              {choice.icon}
              {choice.label}
            </label>
          ))}
        </div>
      </fieldset>

      {decision === "approve" && (
        <div className="flex flex-col gap-4 rounded-[var(--radius-card)] border border-line p-5">
          <Field id="productId" label="Prescription item" error={err.productId}>
            {(d, invalid) => (
              <Select id="productId" name="productId" value={productId} onChange={(e) => setProductId(e.target.value)} aria-describedby={d} aria-invalid={invalid}>
                <option value="">Choose an item…</option>
                {rxOptions.map((option) => (
                  <option key={option.id} value={option.id} disabled={Boolean(option.allergyConflict)}>
                    {option.name}
                    {option.allergyConflict ? ` — blocked: allergic to ${option.allergyConflict}` : ""}
                  </option>
                ))}
              </Select>
            )}
          </Field>
          {chosen && chosen.interactions.length > 0 && (
            <Alert tone="warning" title="Interaction caution (demo table)">
              <ul className="list-disc pl-5">
                {chosen.interactions.map((warning) => (
                  <li key={warning.between.join("+")}>
                    {warning.between.join(" + ")}: {warning.note}
                  </li>
                ))}
              </ul>
            </Alert>
          )}
          <Field id="directions" label="Directions on the label" hint="Written by the prescriber. The app never suggests doses." error={err.directions}>
            {(d, invalid) => <Textarea id="directions" name="directions" maxLength={300} rows={2} aria-describedby={d} aria-invalid={invalid} />}
          </Field>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field id="refills" label="Refills (0–5)" error={err.refills}>
              {(d, invalid) => <Input id="refills" name="refills" inputMode="numeric" defaultValue="0" maxLength={1} aria-describedby={d} aria-invalid={invalid} />}
            </Field>
            <Field id="validDays" label="Valid for (days, 7–365)" error={err.validDays}>
              {(d, invalid) => <Input id="validDays" name="validDays" inputMode="numeric" defaultValue="90" maxLength={3} aria-describedby={d} aria-invalid={invalid} />}
            </Field>
          </div>
        </div>
      )}

      <Field
        id="note"
        label={decision === "needs_info" ? "Question for the patient" : "Note for the patient"}
        hint={decision === "deny" ? "Explain why, and what they can do instead." : undefined}
        error={err.note}
      >
        {(d, invalid) => <Textarea id="note" name="note" maxLength={1000} rows={3} aria-describedby={d} aria-invalid={invalid} />}
      </Field>

      <div aria-live="polite">{state.status === "error" && state.message && <Alert tone="danger">{state.message}</Alert>}</div>
      <div className="flex items-start gap-3 rounded-[var(--radius-field)] bg-warning-soft p-4 text-sm">
        <TriangleAlert className="mt-0.5 size-4 shrink-0 text-warning" aria-hidden="true" />
        Simulated prescriber. In a real pharmacy only a licensed clinician could make this decision.
      </div>
      <Button type="submit" size="lg" pending={pending} variant={decision === "deny" ? "danger" : "primary"} className="self-start">
        {decision === "approve" ? "Approve and create prescription" : decision === "deny" ? "Deny request" : "Send question"}
      </Button>
    </form>
  );
}
