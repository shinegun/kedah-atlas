export type DivRow = { key: string; label: string; value: number; display: string; strong?: boolean };

/** Signed bars around a zero line: blue = positive, red = negative (diverging pair). */
export default function Diverging({ rows, posLabel, negLabel }: { rows: DivRow[]; posLabel: string; negLabel: string }) {
  const max = Math.max(...rows.map((r) => Math.abs(r.value)), 0.001);
  return (
    <div className="barlist" role="list">
      {rows.map((r) => {
        const w = (Math.abs(r.value) / max) * 50;
        const pos = r.value >= 0;
        return (
          <div className="barrow" role="listitem" key={r.key} title={`${r.label}: ${r.display}`}>
            <span className="name" style={r.strong ? { color: "var(--ink)", fontWeight: 600 } : undefined}>{r.label}</span>
            <span className="track" aria-hidden="true">
              <span style={{ position: "absolute", left: "50%", top: -4, bottom: -4, width: 1, background: "var(--axis)" }} />
              <span
                className="bar"
                style={{
                  left: pos ? "50%" : `${50 - w}%`,
                  width: `${w}%`,
                  background: pos ? "var(--diverge-pos)" : "var(--diverge-neg)",
                  borderRadius: pos ? "0 4px 4px 0" : "4px 0 0 4px",
                }}
              />
            </span>
            <span className="val" style={r.strong ? { fontWeight: 600 } : undefined}>
              {r.display} <span className="sr-only">{pos ? posLabel : negLabel}</span>
            </span>
          </div>
        );
      })}
    </div>
  );
}
