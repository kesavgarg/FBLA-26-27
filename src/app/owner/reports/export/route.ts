import { NextResponse, type NextRequest } from "next/server";
import { requireRole } from "@/lib/auth/session";
import { toCsv, validateRange } from "@/lib/domain/analytics";
import { storeToday } from "@/lib/domain/refills";
import { parseReportOptions, REPORT_COLUMNS, runReport } from "@/lib/reports";
import { createSupabaseServerClient } from "@/lib/supabase/server";

/**
 * GET /owner/reports/export?from=&to=&group=&col= → CSV download.
 * Owner only; the export itself is recorded in the audit log.
 */
export async function GET(request: NextRequest) {
  await requireRole(["owner"]);
  const params = Object.fromEntries(request.nextUrl.searchParams.entries());
  const today = storeToday();
  const checked = validateRange(params.from ?? "", params.to ?? "", today);
  if (!checked.ok) return NextResponse.json({ error: `Invalid date range (${checked.reason}).` }, { status: 400 });

  const options = parseReportOptions({ group: params.group, col: request.nextUrl.searchParams.getAll("col") });
  const { rows, totals } = await runReport(checked.range, options.group, today);
  const columnLabels = REPORT_COLUMNS.filter((c) => options.columns.includes(c.value));
  const values = (r: typeof totals) =>
    columnLabels.map((c) => (c.value === "orders" ? r.orders : c.value === "units" ? r.units : (r.revenueCents / 100).toFixed(2)));

  const csv = toCsv(
    [options.group === "week" ? "Week" : options.group[0].toUpperCase() + options.group.slice(1), ...columnLabels.map((c) => c.label)],
    [...rows.map((r) => [r.label, ...values(r)]), [totals.label, ...values(totals)]],
  );
  const note = `"Simulated data from fictional demo orders — not Goodson Drug Co. business results. ${checked.range.from} to ${checked.range.to}."\r\n`;

  const supabase = await createSupabaseServerClient();
  await supabase.rpc("log_audit", {
    p_action: "report.exported",
    p_target_type: "report",
    p_target_id: options.group,
    p_details: { from: checked.range.from, to: checked.range.to, rows: rows.length },
  });

  return new NextResponse(note + csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="goodson-report-${options.group}-${checked.range.from}-to-${checked.range.to}.csv"`,
      "Cache-Control": "no-store",
    },
  });
}
