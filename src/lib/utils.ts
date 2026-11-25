/**
 * Join CSS class names, skipping empty values.
 * Example: cx("btn", isActive && "btn-active") → "btn btn-active"
 */
export function cx(...classes: Array<string | false | null | undefined>): string {
  return classes.filter(Boolean).join(" ");
}
