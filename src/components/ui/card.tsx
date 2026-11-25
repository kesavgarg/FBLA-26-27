import type { ComponentProps } from "react";
import { cx } from "@/lib/utils";

/** The one card recipe: white, hairline border, soft shadow, 20px corners. */
export function Card({ className, ...rest }: ComponentProps<"div">) {
  return (
    <div
      className={cx("rounded-[var(--radius-card)] border border-line bg-canvas shadow-soft", className)}
      {...rest}
    />
  );
}

/** Small rounded label for statuses and categories. */
export function Badge({
  tone = "neutral",
  className,
  ...rest
}: ComponentProps<"span"> & { tone?: "neutral" | "info" | "success" | "warning" | "danger" }) {
  const tones = {
    neutral: "bg-sky-50 text-muted border-line",
    info: "bg-sky-100 text-action border-sky-200",
    success: "bg-success-soft text-success border-success/20",
    warning: "bg-warning-soft text-warning border-warning/20",
    danger: "bg-danger-soft text-danger border-danger/20",
  } as const;
  return (
    <span
      className={cx(
        "inline-flex items-center gap-1 rounded-[var(--radius-pill)] border px-2.5 py-0.5 text-[0.8rem] font-semibold",
        tones[tone],
        className,
      )}
      {...rest}
    />
  );
}
