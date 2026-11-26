"use client";

import { useState } from "react";
import { fillTemplate } from "@/lib/domain/db-errors";
import { groupSlotsByDay, type SlotLike } from "@/lib/domain/slots";
import { useI18n } from "@/lib/i18n/provider";
import { cx } from "@/lib/utils";

/**
 * Pickup time picker: choose a day, then a 30-minute window.
 * Real radio buttons underneath, so it works with the keyboard and screen
 * readers; full slots are shown but disabled.
 */
export function SlotPicker({ slots, error, name = "slotId" }: { slots: SlotLike[]; error?: string; name?: string }) {
  const { t, locale } = useI18n();
  const days = groupSlotsByDay(slots, locale);
  const [dayKey, setDayKey] = useState(days[0]?.key ?? "");
  const day = days.find((d) => d.key === dayKey) ?? days[0];

  if (!day) return <p className="rounded-[var(--radius-field)] bg-warning-soft p-4">{t.checkout.noSlots}</p>;

  return (
    <fieldset className="flex min-w-0 flex-col gap-4" aria-describedby={error ? "slot-error" : "slot-hint"}>
      <legend className="mb-1 text-[0.94rem] font-semibold">{t.checkout.slotLegend}</legend>
      <p id="slot-hint" className="-mt-2 text-sm text-muted">
        {t.checkout.slotHint}
      </p>
      <div className="-mx-1 flex gap-2 overflow-x-auto px-1 pb-1" role="group" aria-label={t.checkout.slotLegend}>
        {days.map((d) => (
          <button
            key={d.key}
            type="button"
            onClick={() => setDayKey(d.key)}
            aria-pressed={d.key === day.key}
            className={cx(
              "min-h-11 shrink-0 rounded-[var(--radius-pill)] border px-4 text-sm font-semibold whitespace-nowrap",
              d.key === day.key ? "border-ink bg-ink text-white" : "border-line text-ink hover:border-action",
            )}
          >
            {d.label}
          </button>
        ))}
      </div>
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-4">
        {day.slots.map((slot) => {
          const full = slot.remaining <= 0;
          return (
            <label
              key={slot.id}
              className={cx(
                "flex min-h-14 cursor-pointer flex-col justify-center rounded-[var(--radius-field)] border px-3 py-2 text-center transition-colors",
                "has-[:checked]:border-action has-[:checked]:bg-sky-100 has-[:focus-visible]:ring-3 has-[:focus-visible]:ring-action",
                full ? "cursor-not-allowed border-line bg-sky-50 text-muted" : "border-line-strong hover:border-action",
              )}
            >
              <input type="radio" name={name} value={slot.id} disabled={full} className="sr-only" />
              <span className="tabular font-semibold">{slot.time}</span>
              <span className="text-xs text-muted">
                {full ? t.checkout.full : fillTemplate(t.checkout.slotsLeft, [String(slot.remaining)])}
              </span>
            </label>
          );
        })}
      </div>
      {error && (
        <p id="slot-error" className="text-sm font-medium text-danger">
          {error}
        </p>
      )}
    </fieldset>
  );
}
