/**
 * Group pickup slots by store day for the time picker. PURE function.
 * Times are shown in the store's time zone (America/New_York) no matter
 * where the visitor's computer is.
 */
export type SlotLike = { id: string; startsAt: string; remaining: number };
export type SlotDay<T extends SlotLike> = { key: string; label: string; slots: Array<T & { time: string }> };

export const STORE_TIME_ZONE = "America/New_York";

export function groupSlotsByDay<T extends SlotLike>(slots: readonly T[], locale: "en" | "es"): SlotDay<T>[] {
  const lang = locale === "es" ? "es-US" : "en-US";
  const dayKey = new Intl.DateTimeFormat("en-CA", { timeZone: STORE_TIME_ZONE });
  const dayLabel = new Intl.DateTimeFormat(lang, { timeZone: STORE_TIME_ZONE, weekday: "short", month: "short", day: "numeric" });
  const timeLabel = new Intl.DateTimeFormat(lang, { timeZone: STORE_TIME_ZONE, hour: "numeric", minute: "2-digit" });

  const days = new Map<string, SlotDay<T>>();
  for (const slot of slots) {
    const date = new Date(slot.startsAt);
    const key = dayKey.format(date);
    if (!days.has(key)) days.set(key, { key, label: dayLabel.format(date), slots: [] });
    days.get(key)!.slots.push({ ...slot, time: timeLabel.format(date) });
  }
  return [...days.values()];
}

/** "Fri, Nov 27, 2:30 PM" in the store time zone. */
export function formatStoreDateTime(iso: string, locale: "en" | "es"): string {
  return new Intl.DateTimeFormat(locale === "es" ? "es-US" : "en-US", {
    timeZone: STORE_TIME_ZONE,
    weekday: "short",
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(new Date(iso));
}
