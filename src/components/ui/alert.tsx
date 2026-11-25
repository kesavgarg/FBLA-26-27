import { AlertTriangle, CheckCircle2, Info, XCircle } from "lucide-react";
import type { ReactNode } from "react";
import { cx } from "@/lib/utils";

/**
 * Status message box. Colour is never the only signal: each tone has its own
 * icon, and errors use role="alert" so screen readers announce them at once.
 */
export type AlertTone = "info" | "success" | "warning" | "danger";

const STYLES: Record<AlertTone, { box: string; icon: ReactNode }> = {
  info: { box: "bg-sky-50 border-sky-200 text-ink", icon: <Info className="size-5 text-action" /> },
  success: {
    box: "bg-success-soft border-success/25 text-ink",
    icon: <CheckCircle2 className="size-5 text-success" />,
  },
  warning: {
    box: "bg-warning-soft border-warning/25 text-ink",
    icon: <AlertTriangle className="size-5 text-warning" />,
  },
  danger: { box: "bg-danger-soft border-danger/25 text-ink", icon: <XCircle className="size-5 text-danger" /> },
};

export function Alert({
  tone = "info",
  title,
  children,
  className,
}: {
  tone?: AlertTone;
  title?: string;
  children?: ReactNode;
  className?: string;
}) {
  const style = STYLES[tone];
  return (
    <div
      role={tone === "danger" ? "alert" : "status"}
      className={cx("flex gap-3 rounded-[var(--radius-field)] border px-4 py-3", style.box, className)}
    >
      <span className="mt-0.5 shrink-0" aria-hidden="true">
        {style.icon}
      </span>
      <div className="text-[0.94rem] leading-relaxed">
        {title && <p className="font-semibold">{title}</p>}
        {children}
      </div>
    </div>
  );
}
