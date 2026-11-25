"use client";

import Link from "next/link";
import { useActionState } from "react";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Field, Input } from "@/components/ui/field";
import {
  recoverAction,
  registerAction,
  signInWithPasswordAction,
  type FormState,
} from "@/lib/auth/actions";
import { useI18n } from "@/lib/i18n/provider";

const INITIAL: FormState = { status: "idle" };

/** Email + password sign-in (fallback when a passkey isn't available). */
export function PasswordSignInForm({ next }: { next?: string }) {
  const { t } = useI18n();
  const [state, action, pending] = useActionState(signInWithPasswordAction, INITIAL);
  const err = (field: string) => {
    const key = state.fieldErrors?.[field];
    return key ? t.errors[key] : undefined;
  };

  return (
    <form action={action} className="flex flex-col gap-4" noValidate>
      {next && <input type="hidden" name="next" value={next} />}
      <Field id="signin-email" label={t.auth.email} error={err("email")}>
        {(describedBy, invalid) => (
          <Input
            id="signin-email"
            name="email"
            type="email"
            autoComplete="username webauthn"
            inputMode="email"
            defaultValue={state.values?.email}
            aria-describedby={describedBy}
            aria-invalid={invalid}
            required
          />
        )}
      </Field>
      <Field id="signin-password" label={t.auth.password} error={err("password")}>
        {(describedBy, invalid) => (
          <Input
            id="signin-password"
            name="password"
            type="password"
            autoComplete="current-password"
            aria-describedby={describedBy}
            aria-invalid={invalid}
            required
          />
        )}
      </Field>
      <div aria-live="polite">{state.formError && <Alert tone="danger">{t.errors[state.formError]}</Alert>}</div>
      <Button type="submit" variant="secondary" size="lg" pending={pending}>
        {t.auth.passwordButton}
      </Button>
    </form>
  );
}

/** Step one of registration: personal details and a backup password. */
export function RegisterForm() {
  const { t } = useI18n();
  const [state, action, pending] = useActionState(registerAction, INITIAL);
  const err = (field: string) => {
    const key = state.fieldErrors?.[field];
    return key ? t.errors[key] : undefined;
  };
  const today = new Date().toISOString().slice(0, 10);

  return (
    <form action={action} className="flex flex-col gap-4" noValidate>
      {/* Honeypot for bots: hidden from people and screen readers. */}
      <div aria-hidden="true" className="absolute -left-[9999px] h-0 w-0 overflow-hidden">
        <label>
          Company
          <input name="company" tabIndex={-1} autoComplete="off" />
        </label>
      </div>

      <Field id="reg-name" label={t.auth.fullName} error={err("fullName")}>
        {(d, invalid) => (
          <Input id="reg-name" name="fullName" autoComplete="name" maxLength={80} defaultValue={state.values?.fullName}
            aria-describedby={d} aria-invalid={invalid} required />
        )}
      </Field>
      <Field id="reg-email" label={t.auth.email} error={err("email")}>
        {(d, invalid) => (
          <Input id="reg-email" name="email" type="email" autoComplete="email" inputMode="email" maxLength={254}
            defaultValue={state.values?.email} aria-describedby={d} aria-invalid={invalid} required />
        )}
      </Field>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field id="reg-dob" label={t.auth.dateOfBirth} error={err("dateOfBirth")}>
          {(d, invalid) => (
            <Input id="reg-dob" name="dateOfBirth" type="date" max={today} min="1900-01-01" autoComplete="bday"
              defaultValue={state.values?.dateOfBirth} aria-describedby={d} aria-invalid={invalid} required />
          )}
        </Field>
        <Field id="reg-phone" label={t.auth.phone} error={err("phone")}>
          {(d, invalid) => (
            <Input id="reg-phone" name="phone" type="tel" autoComplete="tel-national" inputMode="tel" maxLength={20}
              placeholder="770-555-0123" defaultValue={state.values?.phone} aria-describedby={d} aria-invalid={invalid} />
          )}
        </Field>
      </div>
      <Field id="reg-password" label={t.auth.password} hint={t.auth.passwordHint} error={err("password")}>
        {(d, invalid) => (
          <Input id="reg-password" name="password" type="password" autoComplete="new-password" minLength={10}
            maxLength={72} aria-describedby={d} aria-invalid={invalid} required />
        )}
      </Field>
      <div className="flex flex-col gap-1.5">
        <label className="flex items-start gap-3 text-[0.94rem]">
          <input
            type="checkbox"
            name="agree"
            className="mt-1 size-5 shrink-0 accent-[var(--color-action)]"
            aria-invalid={Boolean(err("agree"))}
            aria-describedby={err("agree") ? "reg-agree-error" : undefined}
          />
          <span>{t.auth.agreeDemo}</span>
        </label>
        {err("agree") && (
          <p id="reg-agree-error" className="text-sm font-medium text-danger">
            {err("agree")}
          </p>
        )}
      </div>
      <div aria-live="polite">{state.formError && <Alert tone="danger">{t.errors[state.formError]}</Alert>}</div>
      <Button type="submit" size="lg" pending={pending}>
        {t.auth.registerButton}
      </Button>
      <p className="text-center text-[0.94rem] text-muted">
        {t.auth.haveAccount}{" "}
        <Link href="/login" className="font-semibold text-action hover:underline">
          {t.nav.signIn}
        </Link>
      </p>
    </form>
  );
}

/** Account recovery: request a one-time sign-in link by email. */
export function RecoverForm() {
  const { t } = useI18n();
  const [state, action, pending] = useActionState(recoverAction, INITIAL);
  const emailError = state.fieldErrors?.email ? t.errors[state.fieldErrors.email] : undefined;

  if (state.status === "success") {
    return <Alert tone="success">{t.auth.recoverSent}</Alert>;
  }

  return (
    <form action={action} className="flex flex-col gap-4" noValidate>
      <Field id="recover-email" label={t.auth.email} error={emailError}>
        {(d, invalid) => (
          <Input id="recover-email" name="email" type="email" autoComplete="email" inputMode="email"
            defaultValue={state.values?.email} aria-describedby={d} aria-invalid={invalid} required />
        )}
      </Field>
      <div aria-live="polite">{state.formError && <Alert tone="danger">{t.errors[state.formError]}</Alert>}</div>
      <Button type="submit" size="lg" pending={pending}>
        {t.auth.recoverButton}
      </Button>
    </form>
  );
}
