import { Check, X } from "lucide-react";
import { APPROVAL_JOURNEY, journeyProgress, type ConsultStatus } from "@/lib/domain/workflow";
import type { Dictionary } from "@/lib/i18n";
import { cx } from "@/lib/utils";

/**
 * The doctor-approval journey as a progress strip:
 * Health check → Request sent → Doctor review → Decision → Prescription ready → Bought.
 * A denied request stops at "Decision" with a cross.
 */
export function ApprovalJourney({ status, firstFilled, t }: { status: ConsultStatus; firstFilled: boolean; t: Dictionary }) {
  const reached = journeyProgress(status, firstFilled);
  const denied = status === "denied";

  return (
    <ol className="grid grid-cols-3 gap-y-4 sm:grid-cols-6" aria-label={t.consults.title}>
      {APPROVAL_JOURNEY.map((step, index) => {
        const done = index < reached || (index === reached && index === APPROVAL_JOURNEY.length - 1);
        const current = index === reached && !done;
        const stopped = denied && index === 3;
        const after = denied && index > 3;
        return (
          <li key={step} className="flex flex-col items-start gap-2 pr-2">
            <span
              className={cx(
                "flex size-9 items-center justify-center rounded-full border-2 text-sm font-semibold",
                stopped && "border-danger bg-danger text-white",
                !stopped && done && "border-action bg-action text-white",
                !stopped && current && "border-action bg-sky-100 text-action",
                !stopped && !done && !current && "border-line text-muted",
                after && "opacity-40",
              )}
            >
              {stopped ? <X className="size-4" aria-hidden="true" /> : done ? <Check className="size-4" aria-hidden="true" /> : index + 1}
            </span>
            <span className={cx("text-sm leading-tight", current || stopped ? "font-semibold text-ink" : "text-muted", after && "opacity-40")}>
              {t.consults.journey[step]}
              {(current || stopped) && <span className="sr-only"> (current)</span>}
            </span>
          </li>
        );
      })}
    </ol>
  );
}
