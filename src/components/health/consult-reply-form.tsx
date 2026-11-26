"use client";

import { startTransition, useActionState, type FormEvent } from "react";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Field, Textarea } from "@/components/ui/field";
import { replyToConsultAction } from "@/lib/actions/health";
import { IDLE_RESULT } from "@/lib/actions/idle";
import { useI18n } from "@/lib/i18n/provider";

/** Answer the doctor's question; the request goes back to "Doctor reviewing". */
export function ConsultReplyForm({ consultId }: { consultId: string }) {
  const { t } = useI18n();
  const [state, action, pending] = useActionState(replyToConsultAction, IDLE_RESULT);
  if (state.status === "success") return <Alert tone="success">{state.message}</Alert>;

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    startTransition(() => action(formData));
  }

  return (
    <form onSubmit={submit} className="flex flex-col gap-3" noValidate>
      <input type="hidden" name="consultId" value={consultId} />
      <Field id={`reply-${consultId}`} label={t.consults.replyLabel} error={state.fieldErrors?.reply}>
        {(d, invalid) => <Textarea id={`reply-${consultId}`} name="reply" maxLength={1000} rows={3} aria-describedby={d} aria-invalid={invalid} />}
      </Field>
      <div aria-live="polite">{state.status === "error" && state.message && <Alert tone="danger">{state.message}</Alert>}</div>
      <Button type="submit" pending={pending} className="self-start">
        {t.consults.replySend}
      </Button>
    </form>
  );
}
