"use client";

// Actual values as a solid line, then the model's central path dashed inside a
// shaded P10–P90 range. A divider marks where published data ends. Up to two
// forecast series (e.g. baseline and a scenario) share one axis and one legend.

import { useId, useMemo, useState } from "react";
import { formatValue, tx, type FormatSpec, type Locale } from "@/lib/i18n";
import { useWidth } from "@/lib/useWidth";

type Pt = { year: number; value: number };
type Band = { year: number; p10: number; p50: number; p90: number };
export type FanSeries = { key: string; label: string; color: string; actual: Pt[]; forecast: Band[] };

type Props = {
  lang: Locale;
  series: FanSeries[];
  spec: FormatSpec;
  /** last year of published data; the divider sits here */
  knownUntil: number;
  /** optional second divider (e.g. where nowcasts end and projections begin) */
  splitAt?: number;
  height?: number;
  zero?: boolean;
  ariaLabel: string;
};

const PAD = { top: 16, right: 70, bottom: 26, left: 52 };

function niceTicks(min: number, max: number, count = 4): number[] {
  const span = max - min || Math.abs(max) || 1;
  const mag = 10 ** Math.floor(Math.log10(span / count));
  const step = [1, 2, 2.5, 5, 10].map((m) => m * mag).find((s) => span / s <= count) ?? 10 * mag;
  const out: number[] = [];
  for (let v = Math.floor(min / step) * step; v <= Math.ceil(max / step) * step + step / 2; v += step) out.push(+v.toFixed(10));
  return out;
}

export default function FanChart({ lang, series, spec, knownUntil, splitAt, height = 260, zero = false, ariaLabel }: Props) {
  const id = useId();
  const [box, W] = useWidth<HTMLDivElement>(600);
  const [hover, setHover] = useState<number | null>(null);
  const f = (v: number) => formatValue(spec, v);
  const years = useMemo(
    () => Array.from(new Set(series.flatMap((s) => [...s.actual.map((p) => p.year), ...s.forecast.map((p) => p.year)]))).sort((a, b) => a - b),
    [series],
  );
  const vals = series.flatMap((s) => [...s.actual.map((p) => p.value), ...s.forecast.flatMap((p) => [p.p10, p.p90])]);
  const ticks = niceTicks(zero ? 0 : Math.min(...vals), Math.max(...vals));
  const [y0, y1] = [ticks[0], ticks[ticks.length - 1]];
  const H = height;
  const x = (yr: number) => PAD.left + ((yr - years[0]) / (years[years.length - 1] - years[0] || 1)) * (W - PAD.left - PAD.right);
  const y = (v: number) => PAD.top + (1 - (v - y0) / (y1 - y0 || 1)) * (H - PAD.top - PAD.bottom);
  const xTicks = years.filter((yr) => yr % 5 === 0);

  const onMove = (e: React.PointerEvent<SVGSVGElement>) => {
    const pt = e.currentTarget.createSVGPoint();
    pt.x = e.clientX;
    pt.y = e.clientY;
    const loc = pt.matrixTransform(e.currentTarget.getScreenCTM()!.inverse());
    setHover(years.reduce((best, yr) => (Math.abs(x(yr) - loc.x) < Math.abs(x(best) - loc.x) ? yr : best), years[0]));
  };

  return (
    <div className="chart rel fan" ref={box}>
      <ul className="legend" aria-label="Legend">
        {series.map((s) => (
          <li key={s.key}><span className="swatch line" style={{ background: s.color }} />{s.label}</li>
        ))}
        <li><span className="swatch band" />{tx(lang, "Julat P10–P90", "P10–P90 range")}</li>
      </ul>
      <svg viewBox={`0 0 ${W} ${H}`} role="img" aria-labelledby={`${id}-t`} onPointerMove={onMove} onPointerLeave={() => setHover(null)}>
        <title id={`${id}-t`}>{ariaLabel}</title>
        {ticks.map((tk) => (
          <g key={tk}>
            <line className={tk === 0 ? "baseline" : "gridline"} x1={PAD.left} x2={W - PAD.right} y1={y(tk)} y2={y(tk)} />
            <text className="axis-text" x={PAD.left - 8} y={y(tk)} dy="0.32em" textAnchor="end">{f(tk)}</text>
          </g>
        ))}
        {xTicks.map((yr) => (
          <text key={yr} className="axis-text" x={x(yr)} y={H - 6} textAnchor="middle">{yr}</text>
        ))}
        {/* where published data ends */}
        <line className="fan-divider" x1={x(knownUntil)} x2={x(knownUntil)} y1={PAD.top - 6} y2={H - PAD.bottom} />
        <text className="axis-text" x={x(knownUntil) + 4} y={PAD.top} dy="0.2em">
          {splitAt ? tx(lang, "Anggaran →", "Nowcast →") : tx(lang, "Unjuran →", "Projection →")}
        </text>
        {splitAt && (
          <>
            <line className="fan-divider" x1={x(splitAt)} x2={x(splitAt)} y1={PAD.top - 6} y2={H - PAD.bottom} />
            <text className="axis-text" x={x(splitAt) + 4} y={PAD.top} dy="0.2em">{tx(lang, "Unjuran →", "Projection →")}</text>
          </>
        )}
        {series.map((s) => {
          const fc = s.forecast;
          const area = fc.length
            ? `M${fc.map((p) => `${x(p.year)},${y(p.p90)}`).join("L")}L${[...fc].reverse().map((p) => `${x(p.year)},${y(p.p10)}`).join("L")}Z`
            : "";
          const joint = s.actual.length ? [s.actual[s.actual.length - 1]] : [];
          const mid = [...joint.map((p) => ({ year: p.year, v: p.value })), ...fc.map((p) => ({ year: p.year, v: p.p50 }))];
          const end = fc.length ? fc[fc.length - 1] : null;
          return (
            <g key={s.key}>
              {area && <path d={area} fill={s.color} opacity={0.16} />}
              <path d={s.actual.map((p, i) => `${i ? "L" : "M"}${x(p.year)},${y(p.value)}`).join("")} fill="none" stroke={s.color} strokeWidth={2} strokeLinejoin="round" />
              <path d={mid.map((p, i) => `${i ? "L" : "M"}${x(p.year)},${y(p.v)}`).join("")} fill="none" stroke={s.color} strokeWidth={2} strokeDasharray="5 4" />
              {end && series.length <= 3 && (
                <text x={x(end.year) + 8} y={y(end.p50)} dy="0.32em" className="tnum">{f(end.p50)}</text>
              )}
            </g>
          );
        })}
        {hover !== null && <line className="baseline" x1={x(hover)} x2={x(hover)} y1={PAD.top} y2={H - PAD.bottom} />}
      </svg>
      {hover !== null && (
        <div className="tooltip" style={{ left: `${(x(hover) / W) * 100}%`, top: 0, transform: x(hover) > W * 0.6 ? "translateX(calc(-100% - 12px))" : "translateX(12px)" }}>
          <strong>{hover}</strong>
          {series.map((s) => {
            const a = s.actual.find((p) => p.year === hover);
            const b = s.forecast.find((p) => p.year === hover);
            if (!a && !b) return null;
            return (
              <div key={s.key} style={{ display: "flex", gap: 8, alignItems: "baseline" }}>
                <span className="swatch line" style={{ background: s.color }} />
                <span style={{ flex: 1 }}>{s.label}</span>
                <span className="tnum">
                  {a ? f(a.value) : `${f(b!.p50)}`}
                  {!a && b && b.p90 > b.p10 && <span className="muted"> ({f(b.p10)}–{f(b.p90)})</span>}
                </span>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
