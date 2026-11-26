import type { ActionResult } from "./result";

/** Starting state for forms that use a shopping action (safe to import in the browser). */
export const IDLE_RESULT: ActionResult = { status: "idle" };
