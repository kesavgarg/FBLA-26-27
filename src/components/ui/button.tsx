import Link from "next/link";
import type { ComponentProps, ReactNode } from "react";
import { cx } from "@/lib/utils";

/**
 * The one button style for the whole site.
 * Variants:
 *   primary   filled blue, the main action on a screen (use once per screen)
 *   secondary white with a border, for the second choice
 *   quiet     text-only, for low-emphasis actions like "Skip for now"
 *   danger    for destructive actions (remove, cancel order)
 *   bright    the main action on a dark (navy or glass) background
 *   outline   the second action on a dark background
 */
export type ButtonVariant = "primary" | "secondary" | "quiet" | "danger" | "bright" | "outline";
export type ButtonSize = "md" | "lg";

const BASE =
  "inline-flex items-center justify-center gap-2 rounded-[var(--radius-pill)] font-semibold " +
  "transition-[background-color,box-shadow,transform,color] duration-200 ease-[var(--ease-out-soft)] " +
  "active:scale-[0.98] disabled:pointer-events-none disabled:opacity-55 select-none text-center";

const VARIANTS: Record<ButtonVariant, string> = {
  primary: "bg-action text-white shadow-soft hover:bg-action-strong hover:shadow-lift",
  secondary: "bg-canvas text-ink border border-line-strong hover:border-action hover:text-action",
  quiet: "text-action hover:bg-sky-50",
  danger: "bg-canvas text-danger border border-danger/40 hover:bg-danger-soft",
  bright: "bg-sky-300 text-ink hover:bg-white",
  outline: "border border-white/35 text-white hover:border-sky-300 hover:text-sky-300",
};

const SIZES: Record<ButtonSize, string> = {
  // Vertical padding keeps a button tidy if its text wraps onto two lines
  // (narrow phones, or Large Text mode).
  md: "min-h-11 px-5 py-2 text-[0.94rem]",
  lg: "min-h-13 px-7 py-2.5 text-base",
};

/** Build the class string so links can look exactly like buttons. */
export function buttonClasses(variant: ButtonVariant = "primary", size: ButtonSize = "md", extra?: string) {
  return cx(BASE, VARIANTS[variant], SIZES[size], extra);
}

type ButtonProps = ComponentProps<"button"> & {
  variant?: ButtonVariant;
  size?: ButtonSize;
  /** Shows a spinner and disables the button while an action runs. */
  pending?: boolean;
  icon?: ReactNode;
};

export function Button({
  variant = "primary",
  size = "md",
  pending = false,
  icon,
  className,
  children,
  disabled,
  type = "button",
  ...rest
}: ButtonProps) {
  return (
    <button
      type={type}
      className={buttonClasses(variant, size, className)}
      disabled={disabled || pending}
      aria-busy={pending || undefined}
      {...rest}
    >
      {pending ? <Spinner /> : icon}
      {children}
    </button>
  );
}

type ButtonLinkProps = ComponentProps<typeof Link> & {
  variant?: ButtonVariant;
  size?: ButtonSize;
  icon?: ReactNode;
};

export function ButtonLink({ variant = "primary", size = "md", icon, className, children, ...rest }: ButtonLinkProps) {
  return (
    <Link className={buttonClasses(variant, size, className)} {...rest}>
      {icon}
      {children}
    </Link>
  );
}

/** Small loading indicator used inside buttons. Hidden from screen readers. */
export function Spinner({ className }: { className?: string }) {
  return (
    <span
      aria-hidden="true"
      className={cx("size-4 animate-spin rounded-full border-2 border-current border-r-transparent", className)}
    />
  );
}
