/**
 * Order status rules: the steps a customer sees on the tracker and what
 * each status allows. PURE functions.
 */
import type { FulfillmentMethod } from "./pricing";

export const ORDER_STATUSES = [
  "received",
  "preparing",
  "ready_for_pickup",
  "out_for_delivery",
  "completed",
  "cancelled",
] as const;
export type OrderStatus = (typeof ORDER_STATUSES)[number];

/** The tracker steps for each way of getting an order. */
export function trackerSteps(method: FulfillmentMethod): OrderStatus[] {
  return method === "pickup"
    ? ["received", "preparing", "ready_for_pickup", "completed"]
    : ["received", "preparing", "out_for_delivery", "completed"];
}

/**
 * How far along the tracker an order is: the index of its current step,
 * or -1 if it was cancelled.
 */
export function trackerProgress(status: OrderStatus, method: FulfillmentMethod): number {
  if (status === "cancelled") return -1;
  return trackerSteps(method).indexOf(status);
}

/** Customers may cancel only before the pharmacy starts preparing. */
export function canCustomerCancel(status: OrderStatus): boolean {
  return status === "received";
}

/** Orders that are still moving (shown under "Current orders"). */
export function isOpenOrder(status: OrderStatus): boolean {
  return status !== "completed" && status !== "cancelled";
}
