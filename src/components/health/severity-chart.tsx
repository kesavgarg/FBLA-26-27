/**
 * Line chart of symptom severity over time, drawn as plain SVG (no chart
 * library). Points are spaced evenly by entry, oldest on the left, and
 * coloured by the check's outcome. A visually hidden table gives screen
 * readers the same numbers.
 */
import type { SymptomLog } from "@/lib/data/health";

const OUTCOME_COLOR = { EMERGENCY: "#B42318", CONSULT: "#9A6200", SELF_CARE: "#1E7A4F" } as const;

export function SeverityChart({ logs, title, dateLabel }: { logs: SymptomLog[]; title: string; dateLabel: (iso: string) => string }) {
  const points = [...logs].reverse().slice(-14); // oldest → newest, last 14 entries
  if (points.length === 0) return null;

  const width = 640;
  const height = 220;
  const pad = { left: 36, right: 16, top: 16, bottom: 32 };
  const innerW = width - pad.left - pad.right;
  const innerH = height - pad.top - pad.bottom;
  const x = (index: number) => pad.left + (points.length === 1 ? innerW / 2 : (index / (points.length - 1)) * innerW);
  const y = (severity: number) => pad.top + innerH - ((severity - 1) / 9) * innerH;
  const path = points.map((log, index) => `${index === 0 ? "M" : "L"}${x(index)},${y(log.severity)}`).join(" ");

  return (
    <figure className="flex flex-col gap-3">
      <figcaption className="text-sm font-medium text-muted">{title}</figcaption>
      <svg viewBox={`0 0 ${width} ${height}`} className="h-auto w-full" aria-hidden="true">
        {[1, 4, 7, 10].map((level) => (
          <g key={level}>
            <line x1={pad.left} x2={width - pad.right} y1={y(level)} y2={y(level)} stroke="var(--color-line)" />
            <text x={pad.left - 10} y={y(level) + 4} fontSize="12" textAnchor="end" fill="var(--color-muted)">
              {level}
            </text>
          </g>
        ))}
        {/* Consult threshold line (demo value 7) */}
        <line x1={pad.left} x2={width - pad.right} y1={y(7)} y2={y(7)} stroke="#9A6200" strokeDasharray="4 4" opacity="0.6" />
        <path d={path} fill="none" stroke="var(--color-action)" strokeWidth="2.5" strokeLinejoin="round" strokeLinecap="round" />
        {points.map((log, index) => (
          <g key={log.id}>
            <circle cx={x(index)} cy={y(log.severity)} r="6" fill="#fff" stroke={OUTCOME_COLOR[log.triageResult ?? "SELF_CARE"]} strokeWidth="3" />
            {(index === 0 || index === points.length - 1 || points.length <= 6) && (
              <text x={x(index)} y={height - 8} fontSize="12" textAnchor="middle" fill="var(--color-muted)">
                {dateLabel(log.loggedAt)}
              </text>
            )}
          </g>
        ))}
      </svg>
      {/* Tables ignore sr-only's 1px width, so the wrapper hides it instead. */}
      <div className="sr-only">
        <table>
          <caption>{title}</caption>
          <tbody>
            {points.map((log) => (
              <tr key={log.id}>
                <th scope="row">{dateLabel(log.loggedAt)}</th>
                <td>{log.severity}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </figure>
  );
}
