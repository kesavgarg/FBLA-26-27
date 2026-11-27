import { ScrollText } from "lucide-react";
import { buttonClasses } from "@/components/ui/button";
import { Badge } from "@/components/ui/card";
import { requireRole } from "@/lib/auth/session";
import { formatStoreDateTime } from "@/lib/domain/slots";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export const metadata = { title: "Owner · Audit log" };

/** Filter groups → the action prefixes they include. */
const GROUPS = {
  all: { label: "Everything", prefixes: [] as string[] },
  orders: { label: "Orders", prefixes: ["order."] },
  consults: { label: "Doctor decisions", prefixes: ["consult."] },
  refills: { label: "Refills", prefixes: ["refill."] },
  inventory: { label: "Inventory & products", prefixes: ["inventory.", "product."] },
  admin: { label: "Roles, settings, demo, reports", prefixes: ["role.", "settings.", "demo.", "report."] },
} as const;
type GroupKey = keyof typeof GROUPS;

const ACTION_LABELS: Record<string, string> = {
  "order.placed": "Order placed",
  "order.cancelled": "Order cancelled",
  "order.status_changed": "Order status changed",
  "order.message_sent": "Message sent",
  "consult.submitted": "Consult requested",
  "consult.replied": "Patient replied",
  "consult.approved": "Doctor approved",
  "consult.denied": "Doctor denied",
  "consult.info_requested": "Doctor asked for info",
  "refill.requested": "Refill requested",
  "refill.status_changed": "Refill status changed",
  "inventory.updated": "Stock / price changed",
  "product.added": "Product added",
  "role.changed": "Role changed",
  "settings.updated": "Store settings changed",
  "demo.reset": "Demo reset",
  "report.exported": "Report exported",
};

/** Turn the JSON details into a short readable line. */
function describe(details: Record<string, unknown>): string {
  const parts: string[] = [];
  for (const [key, value] of Object.entries(details)) {
    if (value && typeof value === "object" && "from" in value && "to" in value) {
      const v = value as { from: unknown; to: unknown };
      if (v.from !== v.to) parts.push(`${key}: ${String(v.from)} → ${String(v.to)}`);
    } else if (key === "from" && "to" in details) {
      parts.push(`${String(details.from)} → ${String(details.to)}`);
    } else if (key !== "to") {
      parts.push(`${key}: ${String(value)}`);
    }
  }
  return parts.join(" · ");
}

/**
 * Insert-only record of important actions: who, what, when. Customers,
 * staff and doctors cannot read it; nobody can edit or delete it.
 */
export default async function AuditLogPage({ searchParams }: PageProps<"/owner/audit">) {
  await requireRole(["owner"], "/owner/audit");
  const params = await searchParams;
  const groupParam = (Array.isArray(params.type) ? params.type[0] : params.type) ?? "all";
  const group: GroupKey = groupParam in GROUPS ? (groupParam as GroupKey) : "all";
  const search = ((Array.isArray(params.q) ? params.q[0] : params.q) ?? "").trim().slice(0, 60).toLowerCase();

  const supabase = await createSupabaseServerClient();
  let query = supabase
    .from("audit_logs")
    .select("id, action, actor_role, target_type, target_id, details, created_at, actor:profiles(full_name)")
    .order("created_at", { ascending: false })
    .limit(300);
  const prefixes = GROUPS[group].prefixes;
  if (prefixes.length) query = query.or(prefixes.map((p) => `action.like.${p}*`).join(","));
  const { data } = await query;

  const rows = (data ?? []).filter((row) => {
    if (!search) return true;
    const text = `${row.actor?.full_name ?? ""} ${ACTION_LABELS[row.action] ?? row.action} ${JSON.stringify(row.details)}`.toLowerCase();
    return text.includes(search);
  });

  return (
    <>
      <div>
        <h1 className="flex items-center gap-3 text-[2rem] font-semibold tracking-tight">
          <ScrollText className="size-7 text-action" aria-hidden="true" />
          Audit log
        </h1>
        <p className="text-lg text-ink/80">Every doctor decision, order change, stock change and admin action — who did it and when. Entries can’t be edited or deleted.</p>
      </div>

      <form action="/owner/audit" method="get" className="flex flex-col gap-3 rounded-[var(--radius-card)] border border-line bg-sky-50 p-4 md:flex-row md:items-end">
        <label className="flex flex-col gap-1 text-sm font-semibold">
          Show
          <select name="type" defaultValue={group} className="min-h-11 rounded-[var(--radius-field)] border border-line-strong bg-canvas px-3">
            {Object.entries(GROUPS).map(([key, g]) => (
              <option key={key} value={key}>
                {g.label}
              </option>
            ))}
          </select>
        </label>
        <label className="flex flex-1 flex-col gap-1 text-sm font-semibold">
          Search (person, action or detail)
          <input name="q" defaultValue={search} maxLength={60} className="min-h-11 rounded-[var(--radius-field)] border border-line-strong bg-canvas px-3" />
        </label>
        <button type="submit" className={buttonClasses("secondary")}>
          Filter
        </button>
      </form>

      <p className="text-sm text-muted">{rows.length} entries (latest 300)</p>
      {rows.length === 0 ? (
        <p className="text-muted">No entries match.</p>
      ) : (
        <ol className="divide-y divide-line rounded-[var(--radius-card)] border border-line bg-canvas">
          {rows.map((row) => (
            <li key={row.id} className="grid gap-1 px-5 py-3 md:grid-cols-[11rem_13rem_1fr] md:items-center md:gap-4">
              <span className="tabular text-sm text-muted">{formatStoreDateTime(row.created_at, "en")}</span>
              <span className="flex flex-wrap items-center gap-2">
                <span className="font-medium">{row.actor?.full_name ?? "System"}</span>
                {row.actor_role && <Badge>{row.actor_role}</Badge>}
              </span>
              <span>
                <strong className="font-semibold">{ACTION_LABELS[row.action] ?? row.action}</strong>
                {describe(row.details as Record<string, unknown>) && <span className="text-ink/75"> — {describe(row.details as Record<string, unknown>)}</span>}
              </span>
            </li>
          ))}
        </ol>
      )}
    </>
  );
}
