"use client";

import { startTransition, useActionState, type FormEvent, type ReactNode } from "react";
import { Alert } from "@/components/ui/alert";
import type { ActionResult } from "@/lib/actions/result";
import { IDLE_RESULT } from "@/lib/actions/idle";

type Action = (prev: ActionResult, formData: FormData) => Promise<ActionResult>;

/**
 * Reusable form for staff screens: runs a Server Action without resetting
 * the inputs, and shows the success or error message underneath.
 * `children` receives the latest result so fields can show their errors.
 */
export function ActionForm({
  action,
  children,
  className,
  hidden,
}: {
  action: Action;
  children: (state: ActionResult, pending: boolean) => ReactNode;
  className?: string;
  /** Hidden fields sent with the form, e.g. { orderId }. */
  hidden?: Record<string, string>;
}) {
  const [state, dispatch, pending] = useActionState(action, IDLE_RESULT);

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    const submitter = (event.nativeEvent as SubmitEvent).submitter as HTMLButtonElement | null;
    if (submitter?.name) formData.set(submitter.name, submitter.value);
    startTransition(() => dispatch(formData));
  }

  return (
    <form onSubmit={submit} className={className} noValidate>
      {Object.entries(hidden ?? {}).map(([name, value]) => (
        <input key={name} type="hidden" name={name} value={value} />
      ))}
      {children(state, pending)}
      <div aria-live="polite" className="empty:hidden">
        {state.status === "success" && state.message && <Alert tone="success">{state.message}</Alert>}
        {state.status === "error" && state.message && <Alert tone="danger">{state.message}</Alert>}
      </div>
    </form>
  );
}
