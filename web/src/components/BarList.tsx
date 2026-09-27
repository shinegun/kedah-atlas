export type BarRow = {
  key: string;
  label: string;
  value: number;
  display: string;
  color?: string;
  low?: number;
  high?: number;
  /** Reference marker (e.g. the Kedah average) drawn as a thin tick. */
  tick?: number;
  title?: string;
};

/** Horizontal bars in HTML: thin bars from one baseline, value at the tip,
 *  optional uncertainty whisker and reference tick. */
export default function BarList({ rows, max, tickLabel }: { rows: BarRow[]; max?: number; tickLabel?: string }) {
  const top = max ?? Math.max(...rows.map((r) => Math.max(r.high ?? r.value, r.tick ?? 0)));
  const pct = (x: number) => `${Math.max(0, Math.min(100, (x / top) * 100))}%`;
  return (
    <div className="barlist" role="list">
      {rows.map((r) => (
        <div className="barrow" role="listitem" key={r.key} title={r.title ?? `${r.label}: ${r.display}`}>
          <span className="name">{r.label}</span>
          <span className="track" aria-hidden="true">
            <span className="bar" style={{ width: pct(r.value), background: r.color ?? "var(--s-1)" }} />
            {r.low !== undefined && r.high !== undefined && (
              <span className="range" style={{ left: pct(r.low), width: `calc(${pct(r.high)} - ${pct(r.low)})` }} />
            )}
            {r.tick !== undefined && <span className="tick" style={{ left: pct(r.tick) }} title={tickLabel} />}
          </span>
          <span className="val">{r.display}</span>
        </div>
      ))}
    </div>
  );
}
