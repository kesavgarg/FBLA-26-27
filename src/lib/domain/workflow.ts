/**
 * Allowed next steps for staff and doctor screens. PURE functions that
 * mirror the database functions staff_set_order_status,
 * staff_set_refill_status and doctor_decide_consult — the screens only
 * show buttons the database would accept.
 */
import type { OrderStatus } from "./orders";
import type { FulfillmentMethod } from "./pricing";

/** The one forward step an order can take (cancel is handled separately). */
export function nextOrderStatus(status: OrderStatus, method: FulfillmentMethod): OrderStatus | null {
  switch (status) {
    case "received":
      return "preparing";
    case "preparing":
      return method === "pickup" ? "ready_for_pickup" : "out_for_delivery";
    case "ready_for_pickup":
    case "out_for_delivery":
      return "completed";
    default:
      return null;
  }
}

export function staffCanCancelOrder(status: OrderStatus): boolean {
  return status !== "completed" && status !== "cancelled";
}

export type RefillStatus = "requested" | "verified" | "preparing" | "ready" | "completed" | "rejected" | "cancelled";

export function nextRefillStatus(status: RefillStatus): RefillStatus | null {
  const order: RefillStatus[] = ["requested", "verified", "preparing", "ready", "completed"];
  const index = order.indexOf(status);
  return index >= 0 && index < order.length - 1 ? order[index + 1] : null;
}

export function staffCanRejectRefill(status: RefillStatus): boolean {
  return status === "requested" || status === "verified";
}

export type ConsultStatus = "submitted" | "under_review" | "needs_info" | "approved" | "denied";

/** The doctor may decide only while the request is open on their side. */
export function doctorCanDecide(status: ConsultStatus): boolean {
  return status === "submitted" || status === "under_review";
}

/**
 * The six steps of the doctor-approval journey, and how far a consult has
 * got. Used by the progress strip on the customer's consult page.
 */
export const APPROVAL_JOURNEY = ["survey", "consult", "review", "decision", "available", "checkout"] as const;
export type JourneyStep = (typeof APPROVAL_JOURNEY)[number];

export function journeyProgress(status: ConsultStatus, firstFilled: boolean): number {
  if (status === "submitted") return 1;
  if (status === "under_review" || status === "needs_info") return 2;
  if (status === "denied") return 3;
  // approved
  return firstFilled ? 5 : 4;
}
