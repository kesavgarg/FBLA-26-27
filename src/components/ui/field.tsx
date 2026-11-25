import type { ComponentProps, ReactNode } from "react";
import { cx } from "@/lib/utils";

/**
 * Accessible form field: a visible label, the control, an optional hint and
 * an error message. The error is linked with aria-describedby and the control
 * gets aria-invalid, so screen readers announce what is wrong and where.
 */
type FieldProps = {
  id: string;
  label: string;
  hint?: string;
  error?: string;
  children: (describedBy: string | undefined, invalid: boolean) => ReactNode;
  className?: string;
};

export function Field({ id, label, hint, error, children, className }: FieldProps) {
  const hintId = hint ? `${id}-hint` : undefined;
  const errorId = error ? `${id}-error` : undefined;
  const describedBy = [hintId, errorId].filter(Boolean).join(" ") || undefined;

  return (
    <div className={cx("flex flex-col gap-1.5", className)}>
      <label htmlFor={id} className="text-[0.94rem] font-semibold text-ink">
        {label}
      </label>
      {children(describedBy, Boolean(error))}
      {hint && !error && (
        <p id={hintId} className="text-sm text-muted">
          {hint}
        </p>
      )}
      {error && (
        <p id={errorId} className="flex items-start gap-1.5 text-sm font-medium text-danger">
          <span aria-hidden="true">•</span>
          {error}
        </p>
      )}
    </div>
  );
}

const CONTROL =
  "w-full min-h-12 rounded-[var(--radius-field)] border bg-canvas px-4 text-base text-ink " +
  "placeholder:text-muted/80 transition-[border-color,box-shadow] duration-150 " +
  "focus:border-action focus:outline-none focus:ring-4 focus:ring-sky-200";

export function Input({ className, "aria-invalid": invalid, ...rest }: ComponentProps<"input">) {
  return (
    <input
      className={cx(CONTROL, invalid ? "border-danger" : "border-line-strong", className)}
      aria-invalid={invalid}
      {...rest}
    />
  );
}

export function Textarea({ className, "aria-invalid": invalid, ...rest }: ComponentProps<"textarea">) {
  return (
    <textarea
      className={cx(CONTROL, "min-h-28 py-3", invalid ? "border-danger" : "border-line-strong", className)}
      aria-invalid={invalid}
      {...rest}
    />
  );
}

export function Select({ className, "aria-invalid": invalid, children, ...rest }: ComponentProps<"select">) {
  return (
    <select
      className={cx(CONTROL, "appearance-none pr-10", invalid ? "border-danger" : "border-line-strong", className)}
      aria-invalid={invalid}
      {...rest}
    >
      {children}
    </select>
  );
}
