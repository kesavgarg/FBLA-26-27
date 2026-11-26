"use client";

import { Activity, BedDouble, Footprints, HeartPulse, Watch, X } from "lucide-react";
import { useState } from "react";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/card";
import { fillTemplate } from "@/lib/domain/db-errors";
import { sampleWearableData, validateWearableImport, type WearableSnapshot } from "@/lib/domain/wearable";
import { useI18n } from "@/lib/i18n/provider";

/** Tiny 7-point line for the resting heart-rate trend (decorative). */
function Sparkline({ values }: { values: number[] }) {
  const min = Math.min(...values) - 2;
  const max = Math.max(...values) + 2;
  const points = values.map((v, i) => `${(i / (values.length - 1)) * 100},${30 - ((v - min) / (max - min)) * 30}`).join(" ");
  return (
    <svg viewBox="0 0 100 30" className="h-10 w-full" aria-hidden="true" preserveAspectRatio="none">
      <polyline points={points} fill="none" stroke="var(--color-action)" strokeWidth="2" vectorEffect="non-scaling-stroke" strokeLinejoin="round" />
    </svg>
  );
}

/**
 * "Import Apple Watch data" — an honest demonstration.
 * 1. explain what could be shared and why this is a sample
 * 2. preview the fictional sample
 * 3. confirm → validate → attach to the symptom check (hidden form field)
 */
export function WatchImport({ today, value, onChange }: { today: string; value: WearableSnapshot | null; onChange: (data: WearableSnapshot | null) => void }) {
  const { t } = useI18n();
  const [preview, setPreview] = useState<WearableSnapshot | null>(null);
  const [problem, setProblem] = useState<string | null>(null);
  const w = t.watch;
  const shown = value ?? preview;

  function confirm() {
    const checked = validateWearableImport(preview, today);
    if (!checked.ok) {
      setProblem(checked.problem);
      return;
    }
    setProblem(null);
    setPreview(null);
    onChange(checked.data);
  }

  const metrics = shown
    ? [
        { icon: <HeartPulse className="size-5" aria-hidden="true" />, label: w.metrics.heartRateAvgBpm, value: `${shown.heartRateAvgBpm} ${w.units.bpm}` },
        { icon: <HeartPulse className="size-5" aria-hidden="true" />, label: w.metrics.restingHeartRateBpm, value: `${shown.restingHeartRateBpm} ${w.units.bpm}` },
        { icon: <Footprints className="size-5" aria-hidden="true" />, label: w.metrics.steps, value: `${shown.steps.toLocaleString()} ${w.units.steps}` },
        { icon: <BedDouble className="size-5" aria-hidden="true" />, label: w.metrics.sleepHours, value: `${shown.sleepHours} ${w.units.hours}` },
        { icon: <Activity className="size-5" aria-hidden="true" />, label: w.metrics.activeMinutes, value: `${shown.activeMinutes} ${w.units.minutes}` },
      ]
    : [];

  return (
    <div className="flex flex-col gap-5">
      <div className="flex items-start gap-4 rounded-[var(--radius-card)] bg-ink p-6 text-white">
        <span className="flex size-12 shrink-0 items-center justify-center rounded-2xl bg-white/10">
          <Watch className="size-6 text-sky-300" aria-hidden="true" />
        </span>
        <div className="flex flex-col gap-2">
          <h3 className="text-xl font-semibold">{w.title}</h3>
          <p className="text-white/80">{w.intro}</p>
          <p className="text-sm text-white/70">{w.honest}</p>
        </div>
      </div>

      {!shown && (
        <div className="flex flex-col gap-3">
          <p className="font-semibold">{w.whatShared}</p>
          <ul className="grid gap-2 text-ink/85 sm:grid-cols-2">
            {Object.values(w.metrics).map((label) => (
              <li key={label} className="flex items-center gap-2">
                <span className="size-1.5 rounded-full bg-action" aria-hidden="true" />
                {label}
              </li>
            ))}
          </ul>
          <Button variant="secondary" className="self-start" onClick={() => setPreview(sampleWearableData(today))} icon={<Watch className="size-4" aria-hidden="true" />}>
            {w.preview}
          </Button>
        </div>
      )}

      {shown && (
        <div className="flex flex-col gap-4 rounded-[var(--radius-card)] border border-line p-5">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h4 className="font-semibold">{value ? w.imported : w.previewTitle}</h4>
            <Badge tone="warning">{w.simulatedBadge}</Badge>
          </div>
          <dl className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {metrics.map((metric) => (
              <div key={metric.label} className="flex items-center gap-3 rounded-[var(--radius-field)] bg-sky-50 p-3">
                <span className="text-action">{metric.icon}</span>
                <div>
                  <dt className="text-sm text-muted">{metric.label}</dt>
                  <dd className="tabular font-semibold">{metric.value}</dd>
                </div>
              </div>
            ))}
            <div className="rounded-[var(--radius-field)] bg-sky-50 p-3">
              <dt className="text-sm text-muted">{w.trend}</dt>
              <dd>
                <Sparkline values={shown.restingTrend} />
              </dd>
            </div>
          </dl>
          <p className="text-sm text-muted">{w.notDiagnosis}</p>
          {problem && <Alert tone="danger">{fillTemplate(w.invalid, [problem])}</Alert>}
          {value ? (
            <Button variant="quiet" className="self-start" onClick={() => onChange(null)} icon={<X className="size-4" aria-hidden="true" />}>
              {w.remove}
            </Button>
          ) : (
            <div className="flex flex-wrap gap-2">
              <Button onClick={confirm}>{w.confirm}</Button>
              <Button variant="secondary" onClick={() => setPreview(null)}>
                {w.cancel}
              </Button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
