"use client";

import { useId, useMemo, useState } from "react";
import { formatValue, type FormatSpec } from "@/lib/i18n";
import { useWidth } from "@/lib/useWidth";

export type Series = { key: string; label: string; color: string; points: { year: number; value: number }[] };

type Props = {
  series: Series[];
  spec: FormatSpec;
  height?: number;
  /** Force the y-axis to include zero (magnitudes). Leave off for indexes/rates. */
  zero?: boolean;
  ariaLabel: string;
};

const PAD = { top: 12, right: 64, bottom: 26, left: 48 };

function niceTicks(min: number, max: number, count = 4): number[] {
  const span = max - min || Math.abs(max) || 1;
  const step0 = span / count;
  const mag = 10 ** Math.floor(Math.log10(step0));
  const step = [1, 2, 2.5, 5, 10].map((m) => m * mag).find((s) => span / s <= count) ?? 10 * mag;
  const lo = Math.floor(min / step) * step;
  const hi = Math.ceil(max / step) * step;
  const out: number[] = [];
  for (let v = lo; v <= hi + step / 2; v += step) out.push(+v.toFixed(10));
  return out;
}

export default function LineChart({ series, spec, height = 220, zero = false, ariaLabel }: Props) {
  const id = useId();
  const [box, W] = useWidth<HTMLDivElement>(560);
  const format = (v: number) => formatValue(spec, v);
  const [hover, setHover] = useState<number | null>(null);
  const years = useMemo(
    () => Array.from(new Set(series.flatMap((s) => s.points.map((p) => p.year)))).sort((a, b) => a - b),
    [series],
  );
  const values = series.flatMap((s) => s.points.map((p) => p.value));
  const ticks = niceTicks(zero ? Math.min(0, ...values) : Math.min(...values), Math.max(...values));
  const [y0, y1] = [ticks[0], ticks[ticks.length - 1]];
  const H = height;
  const x = (yr: number) =>
    years.length === 1 ? (PAD.left + W - PAD.right) / 2 : PAD.left + ((yr - years[0]) / (years[years.length - 1] - years[0])) * (W - PAD.left - PAD.right);
  const y = (v: number) => PAD.top + (1 - (v - y0) / (y1 - y0)) * (H - PAD.top - PAD.bottom);

  const onMove = (e: React.PointerEvent<SVGSVGElement>) => {
    const svg = e.currentTarget;
    const pt = svg.createSVGPoint();
    pt.x = e.clientX;
    pt.y = e.clientY;
    const loc = pt.matrixTransform(svg.getScreenCTM()!.inverse());
    let best = 0;
    years.forEach((yr, i) => {
      if (Math.abs(x(yr) - loc.x) < Math.abs(x(years[best]) - loc.x)) best = i;
    });
    setHover(best);
  };

  const hy = hover !== null ? years[hover] : null;
  // Long series: label decades only, so axis text never collides.
  const xTicks =
    years.length <= 8
      ? years
      : years[years.length - 1] - years[0] <= 30
        ? years.filter((yr) => yr % 5 === 0)
        : Array.from({ length: 20 }, (_, i) => Math.ceil(years[0] / 10) * 10 + i * 10).filter((yr) => yr <= years[years.length - 1]);

  return (
    <div className="chart rel" ref={box}>
      {series.length > 1 && (
        <ul className="legend" aria-label="Legend">
          {series.map((s) => (
            <li key={s.key}>
              <span className="swatch line" style={{ background: s.color }} />
              {s.label}
            </li>
          ))}
        </ul>
      )}
      <svg
        viewBox={`0 0 ${W} ${H}`}
        role="img"
        aria-labelledby={`${id}-t`}
        onPointerMove={onMove}
        onPointerLeave={() => setHover(null)}
      >
        <title id={`${id}-t`}>{ariaLabel}</title>
        {ticks.map((tk) => (
          <g key={tk}>
            <line className={tk === 0 ? "baseline" : "gridline"} x1={PAD.left} x2={W - PAD.right} y1={y(tk)} y2={y(tk)} />
            <text className="axis-text" x={PAD.left - 8} y={y(tk)} dy="0.32em" textAnchor="end">
              {format(tk)}
            </text>
          </g>
        ))}
        {xTicks.map((yr) => (
          <text key={yr} className="axis-text" x={x(yr)} y={H - 6} textAnchor="middle">
            {yr}
          </text>
        ))}
        {hy !== null && <line className="baseline" x1={x(hy)} x2={x(hy)} y1={PAD.top} y2={H - PAD.bottom} />}
        {series.map((s) => {
          const d = s.points.map((p, i) => `${i ? "L" : "M"}${x(p.year)},${y(p.value)}`).join("");
          const end = s.points[s.points.length - 1];
          return (
            <g key={s.key}>
              <path d={d} fill="none" stroke={s.color} strokeWidth={2} strokeLinejoin="round" strokeLinecap="round" />
              {s.points.length <= 8 &&
                s.points.map((p) => (
                  <circle key={p.year} cx={x(p.year)} cy={y(p.value)} r={hy === p.year ? 5 : 3.5} fill={s.color} stroke="var(--surface)" strokeWidth={2} />
                ))}
              {series.length <= 4 && (
                <text x={x(end.year) + 8} y={y(end.value)} dy="0.32em" className="tnum">
                  {format(end.value)}
                </text>
              )}
            </g>
          );
        })}
      </svg>
      {hy !== null && (
        <div
          className="tooltip"
          style={{ left: `${(x(hy) / W) * 100}%`, top: 0, transform: x(hy) > W * 0.6 ? "translateX(calc(-100% - 12px))" : "translateX(12px)" }}
        >
          <strong>{hy}</strong>
          {series.map((s) => {
            const p = s.points.find((q) => q.year === hy);
            return p ? (
              <div key={s.key} style={{ display: "flex", gap: 8, alignItems: "center" }}>
                <span className="swatch line" style={{ background: s.color }} />
                <span style={{ flex: 1 }}>{s.label}</span>
                <span className="tnum">{format(p.value)}</span>
              </div>
            ) : null;
          })}
        </div>
      )}
    </div>
  );
}
