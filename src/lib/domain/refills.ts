/**
 * Prescription refill eligibility. PURE function, mirrored by the database
 * function request_refill(), which enforces the same rules in a transaction.
 *
 * A refill is allowed only if ALL of these are true, checked in this order
 * so the customer hears the most useful reason first:
 *   1. the prescription belongs to this patient
 *   2. it is active
 *   3. it has not expired
 *   4. refills remain
 *   5. no refill for it is already in progress
 */

export type RefillReason = "eligible" | "wrong_patient" | "inactive" | "expired" | "no_refills" | "in_progress";

export type RefillCandidate = {
  patientId: string;
  status: "pending_approval" | "active" | "inactive" | "denied";
  expiresOn: string; // YYYY-MM-DD
  refillsRemaining: number;
  hasOpenRefill: boolean;
};

/** Compare calendar dates as YYYY-MM-DD strings (no time-zone surprises). */
export function isExpired(expiresOn: string, today: string): boolean {
  return expiresOn < today;
}

export function getRefillEligibility(rx: RefillCandidate, patientId: string, today: string): RefillReason {
  if (rx.patientId !== patientId) return "wrong_patient";
  if (rx.status !== "active") return "inactive";
  if (isExpired(rx.expiresOn, today)) return "expired";
  if (rx.refillsRemaining <= 0) return "no_refills";
  if (rx.hasOpenRefill) return "in_progress";
  return "eligible";
}

/** Today's date in the store's time zone, as YYYY-MM-DD. */
export function storeToday(now: Date = new Date()): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "America/New_York" }).format(now);
}
