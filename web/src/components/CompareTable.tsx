"use client";

import Link from "next/link";
import { useState } from "react";
import { formatValue, type FormatSpec, type Locale } from "@/lib/i18n";

export type Column = { key: string; label: string; spec: FormatSpec; estimate?: boolean };
export type Row = { slug: string; name: string; values: Record<string, number> };

export default function CompareTable({ lang, columns, rows, estimateLabel }: { lang: Locale; columns: Column[]; rows: Row[]; estimateLabel: string }) {
  const [sort, setSort] = useState<{ key: string; desc: boolean }>({ key: columns[0].key, desc: true });
  const sorted = [...rows].sort((a, b) =>
    sort.key === "name" ? a.name.localeCompare(b.name) * (sort.desc ? -1 : 1) : (a.values[sort.key] - b.values[sort.key]) * (sort.desc ? -1 : 1),
  );
  const header = (key: string, label: React.ReactNode) => (
    <th key={key} aria-sort={sort.key === key ? (sort.desc ? "descending" : "ascending") : "none"}>
      <button onClick={() => setSort((s) => ({ key, desc: s.key === key ? !s.desc : key !== "name" }))}>
        {label} {sort.key === key ? (sort.desc ? "↓" : "↑") : ""}
      </button>
    </th>
  );
  return (
    <div className="table-wrap">
      <table>
        <thead>
          <tr>
            {header("name", lang === "ms" ? "Daerah" : "District")}
            {columns.map((c) =>
              header(c.key, <>{c.label}{c.estimate && <sup title={estimateLabel}> *</sup>}</>),
            )}
          </tr>
        </thead>
        <tbody>
          {sorted.map((r) => (
            <tr key={r.slug}>
              <td><Link href={`/${lang}/daerah/${r.slug}/`}>{r.name}</Link></td>
              {columns.map((c) => (
                <td key={c.key}>{formatValue(c.spec, r.values[c.key])}</td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
