import type { ReactNode } from "react";
import { Card } from "./card";

/** A labelled number tile used on dashboards. The number is real database data. */
export function StatTile({ label, value, icon, note }: { label: string; value: string | number; icon?: ReactNode; note?: string }) {
  return (
    <Card className="flex flex-col gap-2 p-6">
      <div className="flex items-center gap-2 text-[0.94rem] font-medium text-muted">
        {icon}
        {label}
      </div>
      <p className="tabular text-[2.2rem] leading-none font-semibold tracking-tight">{value}</p>
      {note && <p className="text-sm text-muted">{note}</p>}
    </Card>
  );
}
