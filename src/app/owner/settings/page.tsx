import { SettingsForm } from "@/components/owner/owner-forms";
import { Card } from "@/components/ui/card";
import { requireRole } from "@/lib/auth/session";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export const metadata = { title: "Owner · Store settings" };

const DAYS = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

/** The business rules the whole site reads: tax, fees, pickup capacity. */
export default async function SettingsPage() {
  await requireRole(["owner"], "/owner/settings");
  const supabase = await createSupabaseServerClient();
  const { data: s } = await supabase.from("store_settings").select("*").eq("id", 1).single();
  if (!s) return <p>Store settings are missing — run the demo reset.</p>;
  const hours = s.hours as Record<string, { open: string; close: string } | null>;

  return (
    <>
      <div>
        <h1 className="text-[2rem] font-semibold tracking-tight">Store settings</h1>
        <p className="text-lg text-ink/80">These rules drive pricing, delivery and pickup times everywhere on the site.</p>
      </div>
      <Card className="p-6 sm:p-8">
        <SettingsForm
          values={{
            taxRate: String(s.tax_rate_bps / 100),
            deliveryFee: (s.delivery_fee_cents / 100).toFixed(2),
            freeThreshold: (s.free_delivery_threshold_cents / 100).toFixed(2),
            slotCapacity: String(s.slot_capacity),
            maxLineQuantity: String(s.max_line_quantity),
            pharmacistName: s.pharmacist_name,
          }}
        />
      </Card>
      <Card className="flex flex-col gap-3 p-6 sm:p-8">
        <h2 className="text-lg font-semibold">Pickup hours (demo assumption)</h2>
        <p className="text-sm text-muted">The real store is reported closed on Sundays; weekday hours were not confirmed, so these are assumed demo hours. Delivery ZIP codes: {s.delivery_zips.join(", ")}.</p>
        <dl className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
          {DAYS.map((day, i) => (
            <div key={day} className="rounded-[var(--radius-field)] bg-sky-50 px-4 py-2">
              <dt className="text-sm text-muted">{day}</dt>
              <dd className="tabular font-medium">{hours[String(i)] ? `${hours[String(i)]!.open}–${hours[String(i)]!.close}` : "Closed"}</dd>
            </div>
          ))}
        </dl>
      </Card>
    </>
  );
}
