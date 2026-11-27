"use client";

import { RotateCcw } from "lucide-react";
import { ActionForm } from "@/components/staff/action-form";
import { Button } from "@/components/ui/button";
import { Field, Input, Select, Textarea } from "@/components/ui/field";
import { recordUsabilitySessionAction, resetDemoAction, saveStoreSettingsAction, setUserRoleAction } from "@/lib/actions/owner";
import type { Role } from "@/lib/auth/roles";

const ROLE_LABELS: Record<Role, string> = { customer: "Customer", staff: "Pharmacy staff", doctor: "Doctor (simulated)", owner: "Owner" };

/** Role picker for one user row. */
export function RoleForm({ userId, role, name }: { userId: string; role: Role; name: string }) {
  return (
    <ActionForm action={setUserRoleAction} hidden={{ userId }} className="flex flex-wrap items-center gap-2">
      {(_, pending) => (
        <>
          <label className="sr-only" htmlFor={`role-${userId}`}>
            Role for {name}
          </label>
          <select id={`role-${userId}`} name="role" defaultValue={role} className="min-h-11 rounded-[var(--radius-field)] border border-line-strong bg-canvas px-3">
            {(Object.keys(ROLE_LABELS) as Role[]).map((r) => (
              <option key={r} value={r}>
                {ROLE_LABELS[r]}
              </option>
            ))}
          </select>
          <Button type="submit" variant="secondary" pending={pending}>
            Save role
          </Button>
        </>
      )}
    </ActionForm>
  );
}

export type SettingsValues = {
  taxRate: string;
  deliveryFee: string;
  freeThreshold: string;
  slotCapacity: string;
  maxLineQuantity: string;
  pharmacistName: string;
};

/** Store business rules. */
export function SettingsForm({ values }: { values: SettingsValues }) {
  const fields: Array<{ name: keyof SettingsValues; label: string; hint: string }> = [
    { name: "taxRate", label: "Sales tax rate (%)", hint: "Applied to non-prescription items only. Verify the Forsyth County rate with the Georgia Department of Revenue." },
    { name: "deliveryFee", label: "Delivery fee ($)", hint: "Charged when the order is below the free-delivery amount." },
    { name: "freeThreshold", label: "Free delivery from ($)", hint: "Orders at or above this subtotal deliver free." },
    { name: "slotCapacity", label: "Orders per pickup time", hint: "How many pickups fit in each 30-minute window (new windows)." },
    { name: "maxLineQuantity", label: "Most of one item per order", hint: "Limits bulk buying of a single product." },
    { name: "pharmacistName", label: "Pharmacist named on pickup notices", hint: "Shown to customers when an order is ready." },
  ];
  return (
    <ActionForm action={saveStoreSettingsAction} className="grid gap-5 md:grid-cols-2">
      {(state, pending) => (
        <>
          {fields.map((f) => (
            <Field key={f.name} id={`set-${f.name}`} label={f.label} hint={f.hint} error={state.fieldErrors?.[f.name]}>
              {(d, invalid) => (
                <Input
                  id={`set-${f.name}`}
                  name={f.name}
                  defaultValue={values[f.name]}
                  inputMode={f.name === "pharmacistName" ? "text" : "decimal"}
                  aria-describedby={d}
                  aria-invalid={invalid}
                />
              )}
            </Field>
          ))}
          <Button type="submit" pending={pending} className="self-start md:col-span-2">
            Save settings
          </Button>
        </>
      )}
    </ActionForm>
  );
}

/** One-click reset with a typed confirmation, so it can't happen by accident. */
export function ResetDemoForm() {
  return (
    <ActionForm action={resetDemoAction} className="flex flex-col gap-3">
      {(state, pending) => (
        <>
          <Field id="confirm-reset" label="Type RESET to confirm" error={state.fieldErrors?.confirm}>
            {(d, invalid) => <Input id="confirm-reset" name="confirm" autoComplete="off" className="max-w-xs" aria-describedby={d} aria-invalid={invalid} />}
          </Field>
          <Button type="submit" variant="danger" pending={pending} className="self-start" icon={<RotateCcw className="size-4" aria-hidden="true" />}>
            Reset demo data
          </Button>
        </>
      )}
    </ActionForm>
  );
}

/** Record one real usability-test session (participant code, no names). */
export function UsabilitySessionForm() {
  return (
    <ActionForm action={recordUsabilitySessionAction} className="grid gap-4 md:grid-cols-2">
      {(state, pending) => {
        const err = state.fieldErrors ?? {};
        return (
          <>
            <Field id="us-code" label="Participant code" hint="Like P01. Never a name." error={err.participantCode}>
              {(d, i) => <Input id="us-code" name="participantCode" maxLength={4} aria-describedby={d} aria-invalid={i} />}
            </Field>
            <Field id="us-task" label="Task" error={err.task}>
              {(d, i) => (
                <Select id="us-task" name="task" aria-describedby={d} aria-invalid={i}>
                  <option value="find_product">Find a product</option>
                  <option value="request_refill">Request a refill</option>
                  <option value="complete_checkout">Complete checkout</option>
                  <option value="find_order_status">Find an order’s status</option>
                  <option value="other">Other</option>
                </Select>
              )}
            </Field>
            <Field id="us-method" label="Method" error={err.method}>
              {(d, i) => (
                <Select id="us-method" name="method" aria-describedby={d} aria-invalid={i}>
                  <option value="digital">This website</option>
                  <option value="previous_process">Previous process (phone / in person)</option>
                </Select>
              )}
            </Field>
            <Field id="us-done" label="Completed the task?" error={err.completed}>
              {(d, i) => (
                <Select id="us-done" name="completed" aria-describedby={d} aria-invalid={i}>
                  <option value="yes">Yes</option>
                  <option value="no">No</option>
                </Select>
              )}
            </Field>
            <Field id="us-seconds" label="Time taken (seconds)" error={err.seconds}>
              {(d, i) => <Input id="us-seconds" name="seconds" inputMode="numeric" aria-describedby={d} aria-invalid={i} />}
            </Field>
            <Field id="us-clicks" label="Number of clicks (optional)" error={err.clicks}>
              {(d, i) => <Input id="us-clicks" name="clicks" inputMode="numeric" aria-describedby={d} aria-invalid={i} />}
            </Field>
            <Field id="us-feedback" label="Participant feedback (optional)" error={err.feedback} className="md:col-span-2">
              {(d, i) => <Textarea id="us-feedback" name="feedback" maxLength={1000} rows={3} aria-describedby={d} aria-invalid={i} />}
            </Field>
            <label className="flex items-start gap-3 md:col-span-2">
              <input type="checkbox" name="consent" className="mt-1 size-5 accent-[var(--color-action)]" aria-invalid={Boolean(err.consent)} />
              <span>The participant agreed to take part and to have this result recorded (and their parent or guardian, if under 18).</span>
            </label>
            {err.consent && <p className="text-sm font-medium text-danger md:col-span-2">{err.consent}</p>}
            <Button type="submit" pending={pending} className="self-start md:col-span-2">
              Record session
            </Button>
          </>
        );
      }}
    </ActionForm>
  );
}
