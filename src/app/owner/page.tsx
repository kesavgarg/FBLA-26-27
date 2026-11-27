import { AlertTriangle, CalendarDays, Clock, DollarSign, ReceiptText, RefreshCw, ShoppingBag } from "lucide-react";
import Link from "next/link";
import { ColumnChart, RankedBars, SplitBar } from "@/components/charts/charts";
import { DateRangeFilter, parseRange } from "@/components/owner/date-range-filter";
import { WorkspaceHeader } from "@/components/layout/workspace-header";
import { Alert } from "@/components/ui/alert";
import { ButtonLink } from "@/components/ui/button";
import { Badge, Card } from "@/components/ui/card";
import { StatTile } from "@/components/ui/stat";
import { requireRole } from "@/lib/auth/session";
import { loadAnalyticsData } from "@/lib/data/analytics";
import { listInventory } from "@/lib/data/staff";
import { computeDashboard } from "@/lib/domain/analytics";
import { getStockStatus } from "@/lib/domain/inventory";
import { storeToday } from "@/lib/domain/refills";
import { formatCents } from "@/lib/format";

export const metadata = { title: "Owner · Overview" };

/**
 * Owner analytics. Every number is a live query over the (fictional) demo
 * orders, computed by computeDashboard() — place a new demo order and the
 * charts change on the next page load.
 */
export default async function OwnerHomePage({ searchParams }: PageProps<"/owner">) {
  const user = await requireRole(["owner"], "/owner");
  const today = storeToday();
  const { range, error } = parseRange(await searchParams, today);
  const [data, inventory] = await Promise.all([loadAnalyticsData(range, today), listInventory()]);
  const m = computeDashboard(data.orders, data.consults, data.refills, range, today);
  const alerts = inventory.filter((p) => p.isActive && getStockStatus(p.quantity, p.lowStockThreshold) !== "in_stock");
  const shortDay = (day: string) => new Date(`${day}T12:00:00Z`).toLocaleDateString("en-US", { month: "short", day: "numeric", timeZone: "UTC" });

  return (
    <>
      <WorkspaceHeader user={user} title="Business overview" description={`Simulated results from ${range.from} to ${range.to}.`} />
      <Alert tone="warning" title="Simulated data">
        Every figure here comes from fictional demo orders created for this student project. None of it is Goodson Drug Co.’s real business data.
      </Alert>
      <DateRangeFilter path="/owner" range={range} today={today} />
      {error && <Alert tone="danger">{error} Showing the last 14 days instead.</Alert>}

      <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-4">
        <StatTile label="Simulated revenue" value={formatCents(m.revenueCents)} icon={<DollarSign className="size-4" aria-hidden="true" />} note={`Average order ${formatCents(m.averageOrderCents)}`} />
        <StatTile label="Orders in range" value={m.ordersInRange} icon={<ReceiptText className="size-4" aria-hidden="true" />} note={`${m.cancelledInRange} cancelled (not counted)`} />
        <StatTile label="Orders today" value={m.ordersToday} icon={<CalendarDays className="size-4" aria-hidden="true" />} note={`${m.ordersThisWeek} in the last 7 days`} />
        <StatTile
          label="Average consult approval time"
          value={m.averageApprovalHours === null ? "—" : `${m.averageApprovalHours} h`}
          icon={<Clock className="size-4" aria-hidden="true" />}
          note={m.consultsDecided ? `${m.consultsDecided} decided · ${m.approvalRate}% approved` : "No decisions in range"}
        />
      </div>

      <Card className="p-6 sm:p-8">
        <ColumnChart
          title="Orders per day"
          data={m.byDay.map((d) => ({ key: d.day, label: shortDay(d.day), value: d.orders, detail: `${formatCents(d.revenueCents)} simulated revenue` }))}
          format="count"
          labelEvery={m.byDay.length > 16 ? Math.ceil(m.byDay.length / 8) : 1}
        />
      </Card>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card className="p-6 sm:p-8">
          <RankedBars
            title="Most popular products (units sold)"
            data={m.topProducts.map((p) => ({ key: p.productId, label: p.name, value: p.units, detail: `${formatCents(p.revenueCents)} simulated sales` }))}
            format="units"
          />
        </Card>
        <div className="flex flex-col gap-6">
          <Card className="p-6 sm:p-8">
            <SplitBar
              title="Pickup vs delivery"
              parts={[
                { label: "Pickup", value: m.fulfillment.pickup },
                { label: "Delivery", value: m.fulfillment.delivery },
              ]}
            />
          </Card>
          <Card className="flex flex-col gap-3 p-6 sm:p-8">
            <h2 className="flex items-center gap-2 font-semibold">
              <RefreshCw className="size-4 text-action" aria-hidden="true" />
              Refill completion rate
            </h2>
            <p className="tabular text-[2.2rem] leading-none font-semibold">{m.refillCompletionRate === null ? "—" : `${m.refillCompletionRate}%`}</p>
            <p className="text-sm text-muted">
              {m.refillsCompleted} completed of {m.refillsTotal} refill requests (cancelled ones excluded).
            </p>
          </Card>
        </div>
      </div>

      <Card className="flex flex-col gap-4 p-6 sm:p-8">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="flex items-center gap-2 text-lg font-semibold">
            <AlertTriangle className="size-5 text-warning" aria-hidden="true" />
            Inventory alerts
          </h2>
          <Link href="/staff/inventory" className="font-semibold text-action hover:underline">
            Open inventory
          </Link>
        </div>
        {alerts.length === 0 ? (
          <p className="text-muted">Every active product is above its low-stock level.</p>
        ) : (
          <ul className="flex flex-wrap gap-2">
            {alerts.map((p) => (
              <li key={p.id}>
                <Badge tone={p.quantity === 0 ? "danger" : "warning"}>
                  {p.name}: {p.quantity} left
                </Badge>
              </li>
            ))}
          </ul>
        )}
      </Card>

      <div className="flex flex-wrap gap-3">
        <ButtonLink href={`/owner/reports?from=${range.from}&to=${range.to}`} icon={<ShoppingBag className="size-4" aria-hidden="true" />}>
          Build a report for these dates
        </ButtonLink>
      </div>
    </>
  );
}
