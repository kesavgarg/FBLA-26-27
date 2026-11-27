"use client";

/**
 * Small, dependency-free SVG charts for the owner dashboard.
 * Follows the project's chart rules:
 *   - one hue for a single series (no legend needed); two series get a
 *     legend AND direct labels, so colour is never the only cue
 *   - thin bars with 4 px rounded ends on the baseline, 2 px gaps
 *   - recessive grid and axes; text in ink colours, never the series colour
 *   - hover/focus tooltip on every bar, and a "Show as table" view
 * Colours were checked with the dataviz palette validator
 * (#1F6FA8 + #C77A16: all checks pass, light mode).
 */
import { useState } from "react";

export const SERIES = { primary: "#1F6FA8", secondary: "#C77A16" } as const;

/**
 * How to print a value. A name instead of a function, because server pages
 * can't hand functions to these interactive (client) components.
 */
export type ValueFormat = "count" | "units" | "money";
function formatValue(value: number, kind: ValueFormat): string {
  if (kind === "money") return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(value / 100);
  if (kind === "units") return `${Math.round(value)} units`;
  return String(Math.round(value));
}

/** Round up to a "nice" axis maximum (1, 2, 5 × 10ⁿ). */
function niceMax(value: number): number {
  if (value <= 0) return 1;
  const power = 10 ** Math.floor(Math.log10(value));
  const step = [1, 2, 5, 10].find((s) => s * power >= value) ?? 10;
  return step * power;
}

/** A bar with 4 px rounded top corners and a square base on the axis. */
function roundedTopBar(x: number, top: number, width: number, height: number): string {
  const r = Math.min(4, width / 2, height);
  const bottom = top + height;
  return `M${x},${bottom} V${top + r} Q${x},${top} ${x + r},${top} H${x + width - r} Q${x + width},${top} ${x + width},${top + r} V${bottom} Z`;
}

function TableView({ caption, headers, rows }: { caption: string; headers: string[]; rows: Array<Array<string | number>> }) {
  return (
    <details className="text-sm">
      <summary className="cursor-pointer font-semibold text-action">Show as table</summary>
      <table className="mt-2 w-full text-left">
        <caption className="sr-only">{caption}</caption>
        <thead className="text-muted">
          <tr>
            {headers.map((h) => (
              <th key={h} scope="col" className="py-1 pr-4 font-semibold">
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="tabular">
          {rows.map((row) => (
            <tr key={String(row[0])} className="border-t border-line">
              {row.map((cell, i) => (
                <td key={i} className="py-1 pr-4">
                  {cell}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </details>
  );
}

/** Vertical bars over time (one series), with a hover/focus tooltip. */
export function ColumnChart({
  title,
  data,
  format,
  labelEvery = 1,
}: {
  title: string;
  data: Array<{ key: string; label: string; value: number; detail?: string }>;
  format: ValueFormat;
  labelEvery?: number;
}) {
  const fmt = (value: number) => formatValue(value, format);
  const [active, setActive] = useState<number | null>(null);
  const width = 720;
  const height = 240;
  const pad = { left: 44, right: 8, top: 16, bottom: 28 };
  const innerW = width - pad.left - pad.right;
  const innerH = height - pad.top - pad.bottom;
  const max = niceMax(Math.max(...data.map((d) => d.value), 0));
  const slot = innerW / Math.max(data.length, 1);
  const barW = Math.max(4, Math.min(28, slot - 2)); // 2 px gap between bars
  const y = (v: number) => pad.top + innerH - (v / max) * innerH;
  const ticks = [0, max / 2, max];

  return (
    <figure className="flex flex-col gap-3">
      <figcaption className="font-semibold">{title}</figcaption>
      <div className="relative">
        <svg viewBox={`0 0 ${width} ${height}`} className="h-auto w-full" role="img" aria-label={title}>
          {ticks.map((t) => (
            <g key={t}>
              <line x1={pad.left} x2={width - pad.right} y1={y(t)} y2={y(t)} stroke="var(--color-line)" />
              <text x={pad.left - 8} y={y(t) + 4} textAnchor="end" fontSize="12" fill="var(--color-muted)">
                {fmt(t)}
              </text>
            </g>
          ))}
          {data.map((d, i) => {
            const x = pad.left + i * slot + (slot - barW) / 2;
            const h = Math.max(d.value > 0 ? 2 : 0, innerH - (y(d.value) - pad.top));
            const top = pad.top + innerH - h;
            return (
              <g key={d.key}>
                {/* Hit area larger than the bar */}
                <rect
                  x={pad.left + i * slot}
                  y={pad.top}
                  width={slot}
                  height={innerH}
                  fill="transparent"
                  tabIndex={0}
                  aria-label={`${d.label}: ${fmt(d.value)}`}
                  onMouseEnter={() => setActive(i)}
                  onMouseLeave={() => setActive(null)}
                  onFocus={() => setActive(i)}
                  onBlur={() => setActive(null)}
                />
                {h > 0 && (
                  <path
                    d={roundedTopBar(x, top, barW, h)}
                    fill={SERIES.primary}
                    opacity={active === null || active === i ? 1 : 0.45}
                    pointerEvents="none"
                  />
                )}
                {i % labelEvery === 0 && (
                  <text x={pad.left + i * slot + slot / 2} y={height - 8} textAnchor="middle" fontSize="11" fill="var(--color-muted)">
                    {d.label}
                  </text>
                )}
              </g>
            );
          })}
          <line x1={pad.left} x2={width - pad.right} y1={pad.top + innerH} y2={pad.top + innerH} stroke="var(--color-line-strong)" />
        </svg>
        {active !== null && data[active] && (
          <div
            role="status"
            className="pointer-events-none absolute top-0 z-10 -translate-x-1/2 rounded-[var(--radius-field)] border border-line bg-canvas px-3 py-2 text-sm shadow-lift"
            style={{ left: `${((pad.left + active * slot + slot / 2) / width) * 100}%` }}
          >
            <p className="font-semibold">{data[active].label}</p>
            <p className="tabular">{fmt(data[active].value)}</p>
            {data[active].detail && <p className="tabular text-muted">{data[active].detail}</p>}
          </div>
        )}
      </div>
      <TableView caption={title} headers={["Date", "Value"]} rows={data.map((d) => [d.label, fmt(d.value)])} />
    </figure>
  );
}

/** Horizontal ranked bars (one series) with direct value labels. */
export function RankedBars({ title, data, format }: { title: string; data: Array<{ key: string; label: string; value: number; detail?: string }>; format: ValueFormat }) {
  const fmt = (value: number) => formatValue(value, format);
  const max = Math.max(...data.map((d) => d.value), 1);
  return (
    <figure className="flex flex-col gap-3">
      <figcaption className="font-semibold">{title}</figcaption>
      {data.length === 0 ? (
        <p className="text-muted">No sales in this period.</p>
      ) : (
        <ol className="flex flex-col gap-3">
          {data.map((d) => (
            <li key={d.key} className="flex flex-col gap-1" title={d.detail}>
              <div className="flex items-baseline justify-between gap-3 text-[0.94rem]">
                <span className="truncate">{d.label}</span>
                <span className="tabular shrink-0 font-semibold">{fmt(d.value)}</span>
              </div>
              <div className="h-2.5 rounded-full bg-sky-50">
                <div className="h-2.5 rounded-full" style={{ width: `${(d.value / max) * 100}%`, background: SERIES.primary }} />
              </div>
            </li>
          ))}
        </ol>
      )}
      <TableView caption={title} headers={["Product", "Units"]} rows={data.map((d) => [d.label, fmt(d.value)])} />
    </figure>
  );
}

/** Two-part split (pickup vs delivery) with legend and direct labels. */
export function SplitBar({ title, parts }: { title: string; parts: [{ label: string; value: number }, { label: string; value: number }] }) {
  const total = parts[0].value + parts[1].value;
  const pct = (v: number) => (total ? Math.round((v / total) * 100) : 0);
  const colors = [SERIES.primary, SERIES.secondary];
  return (
    <figure className="flex flex-col gap-3">
      <figcaption className="font-semibold">{title}</figcaption>
      {total === 0 ? (
        <p className="text-muted">No orders in this period.</p>
      ) : (
        <>
          <div className="flex h-4 gap-0.5 overflow-hidden rounded-full" role="img" aria-label={`${parts[0].label} ${pct(parts[0].value)}%, ${parts[1].label} ${pct(parts[1].value)}%`}>
            {parts.map((p, i) =>
              p.value > 0 ? <div key={p.label} style={{ width: `${pct(p.value)}%`, background: colors[i] }} /> : null,
            )}
          </div>
          <ul className="flex flex-wrap gap-x-6 gap-y-2">
            {parts.map((p, i) => (
              <li key={p.label} className="flex items-center gap-2 text-[0.94rem]">
                <span className="size-3 rounded-sm" style={{ background: colors[i] }} aria-hidden="true" />
                {p.label}
                <span className="tabular font-semibold">
                  {p.value} ({pct(p.value)}%)
                </span>
              </li>
            ))}
          </ul>
        </>
      )}
    </figure>
  );
}
